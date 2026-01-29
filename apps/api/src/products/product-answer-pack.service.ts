import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { ShopifyService } from '../shopify/shopify.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { AnswerBlockService } from './answer-block.service';
import { GeminiClient } from '../ai/gemini.client';

import {
  type ComplianceMode,
  type AnswerPackGenerateOptions,
  type AnswerPackPublishOptions,
} from './product-answer-pack.types';

@Injectable()
export class ProductAnswerPackService {
  private readonly logger = new Logger(ProductAnswerPackService.name);
  private readonly apiKey: string;
  private readonly provider: 'openai' | 'anthropic' | 'gemini';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly shopify: ShopifyService,
    private readonly roles: RoleResolutionService,
    private readonly answerBlocks: AnswerBlockService,
    private readonly gemini: GeminiClient
  ) {
    this.apiKey = this.config.get<string>('AI_API_KEY') || '';
    this.provider =
      (this.config.get<string>('AI_PROVIDER') as
        | 'openai'
        | 'anthropic'
        | 'gemini') || 'openai';
  }

  async generateDraft(productId: string, userId: string, opts: AnswerPackGenerateOptions) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { project: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    // membership-aware: user must be able to view project
    await this.roles.assertProjectAccess(product.projectId, userId);

    const descriptionHtml = await this.generateProductDescription(product, opts);
    const blocks = await this.generateFaqAnswerBlocks(product, opts);

    return {
      productId,
      complianceMode: opts.complianceMode,
      descriptionHtml,
      answerBlocks: blocks,
    };
  }

  async generateAndPublish(
    productId: string,
    userId: string,
    opts: AnswerPackPublishOptions
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { project: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.roles.assertProjectAccess(product.projectId, userId);

    const draft = await this.generateDraft(productId, userId, opts);

    // Save original + generated for rollback
    const originalHtml = product.description || '';
    await this.prisma.productDescriptionVersion.create({
      data: {
        productId,
        originalHtml,
        generatedHtml: draft.descriptionHtml,
        status: opts.dryRun ? 'DRAFT' : 'PUBLISHED',
        publishedByUserId: opts.dryRun ? null : userId,
        publishedAt: opts.dryRun ? null : new Date(),
      },
    });

    if (!opts.dryRun) {
      // Overwrite Shopify body_html
      await this.shopify.updateProductBodyHtml(
        productId,
        draft.descriptionHtml,
        userId
      );

      // Persist answer blocks in DB
      await this.answerBlocks.createOrUpdateAnswerBlocks(productId, draft.answerBlocks);

      // Optional: If project wants metafield sync, reuse existing sync method
      try {
        await this.shopify.syncAnswerBlocksToShopify(productId);
      } catch (err: any) {
        this.logger.warn(
          `Answer blocks metafield sync failed for product ${productId}: ${err?.message || err}`
        );
      }

      // Update local product.description to match (keeps UI consistent)
      await this.prisma.product.update({
        where: { id: productId },
        data: { description: draft.descriptionHtml },
      });
    }

    return {
      productId,
      dryRun: opts.dryRun,
      published: !opts.dryRun,
      descriptionHtml: draft.descriptionHtml,
      answerBlocksCount: draft.answerBlocks.length,
    };
  }



  async restoreLatest(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { project: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.roles.assertProjectAccess(product.projectId, userId);

    const latest = await this.prisma.productDescriptionVersion.findFirst({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      throw new BadRequestException('No prior description version found');
    }

    await this.shopify.updateProductBodyHtml(productId, latest.originalHtml, userId);

    await this.prisma.product.update({
      where: { id: productId },
      data: { description: latest.originalHtml },
    });

    return { ok: true };
  }

  async bulkGenerateAndPublish(
    productIds: string[],
    userId: string,
    opts: AnswerPackPublishOptions
  ) {
    const results: Array<{ productId: string; ok: boolean; error?: string }> = [];
    for (const pid of productIds) {
      try {
        await this.generateAndPublish(pid, userId, opts);
        results.push({ productId: pid, ok: true });
      } catch (err: any) {
        results.push({ productId: pid, ok: false, error: err?.message || String(err) });
      }
    }
    return { count: results.length, results };
  }

  private async generateFaqAnswerBlocks(product: any, opts: AnswerPackGenerateOptions) {
    // Use existing AnswerEngine question list via shared constants indirectly.
    // We generate a minimal set here using an existing AnswerBlockService shape.

    const prompt = this.buildFaqPrompt(product, opts);
    const data = await this.callAiJson(prompt);

    const answers = Array.isArray(data?.answers) ? data.answers : [];
    const trimmed = answers.slice(0, opts.questionCount);

    return trimmed
      .filter((a: any) => a && a.questionId && a.question && a.answer)
      .map((a: any) => ({
        questionId: String(a.questionId),
        questionText: String(a.question),
        answerText: String(a.answer),
        confidenceScore:
          typeof a.confidence === 'number'
            ? a.confidence
            : Number(a.confidence) || 0.7,
        sourceFieldsUsed: Array.isArray(a.factsUsed) ? a.factsUsed : [],
      }));
  }

  private async generateProductDescription(product: any, opts: AnswerPackGenerateOptions) {
    const prompt = this.buildDescriptionPrompt(product, opts);
    const data = await this.callAiJson(prompt);
    const html = String(data?.descriptionHtml || '').trim();
    if (!html) throw new BadRequestException('AI did not return descriptionHtml');

    const marker = `<!-- EngineO:answer-pack v=1 compliance=${opts.complianceMode} -->`;
    return `${marker}\n${html}`;
  }

  private buildDescriptionPrompt(product: any, opts: AnswerPackGenerateOptions): string {
    const compliance = opts.complianceMode === 'supplements_us'
      ? `US SUPPLEMENTS COMPLIANCE MODE:
- Do NOT claim to treat, cure, prevent, or diagnose any disease.
- Avoid medical promises and guaranteed outcomes.
- Use cautious language ("may support", "designed to support").
- Include a short "Cautions" section with consult-physician guidance.
`
      : '';

    return `You are an expert ecommerce conversion copywriter for Shopify supplement brands.

${compliance}

Given this product data, rewrite the product description into clean Shopify-compatible HTML.
Return STRICT JSON ONLY with this shape:
{
  "descriptionHtml": "<div>...</div>"
}

Rules:
- Use these sections in order: Overview, Benefits, How to use, Key ingredients, Who it's for, Cautions.
- Keep it factual based only on provided info.
- Do not invent ingredients, certifications, or claims.
- If information is missing, omit that detail rather than guessing.

PRODUCT:
Title: ${product.title}
Handle: ${product.handle || ''}
Existing description (may be empty): ${product.description || ''}
SEO title: ${product.seoTitle || ''}
SEO description: ${product.seoDescription || ''}
`; 
  }

  private buildFaqPrompt(product: any, opts: AnswerPackGenerateOptions): string {
    const compliance = opts.complianceMode === 'supplements_us'
      ? `US SUPPLEMENTS COMPLIANCE MODE: no disease claims, no guaranteed outcomes.
`
      : '';

    return `You are an expert customer support agent + ecommerce copywriter.

${compliance}
Generate a FAQ list for this Shopify product.
Return STRICT JSON ONLY:
{
  "answers": [
    {
      "questionId": "dosage",
      "question": "How do I take it?",
      "answer": "...",
      "confidence": 0.8,
      "factsUsed": ["title","description"]
    }
  ]
}

Rules:
- Produce ${opts.questionCount} items.
- Keep answers short (1-3 sentences).
- Do not invent facts. If unknown, say what is known and advise contacting support.

PRODUCT:
Title: ${product.title}
Existing description: ${product.description || ''}
`; 
  }

  private async callAiJson(prompt: string): Promise<any> {
    const content = await this.callAi(prompt);
    // best-effort JSON extraction
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new BadRequestException('AI response was not JSON');
    }
    const jsonStr = content.slice(start, end + 1);
    try {
      return JSON.parse(jsonStr);
    } catch {
      throw new BadRequestException('AI JSON parse failed');
    }
  }

  private async callAi(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new BadRequestException('AI_API_KEY not configured');
    }

    if (this.provider === 'anthropic') {
      const model = this.config.get<string>('AI_ANTHROPIC_MODEL') || 'claude-3-opus-20240229';
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!resp.ok) {
        throw new BadRequestException(
          `Anthropic API error: ${resp.status} ${await resp.text()}`
        );
      }
      const data = (await resp.json()) as any;
      const text = data?.content?.[0]?.text || '';
      return String(text);
    }

    if (this.provider === 'gemini') {
      const resp = await this.gemini.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        },
      });
      const text =
        resp?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ||
        '';
      return String(text);
    }

    const model = this.config.get<string>('AI_OPENAI_MODEL') || 'gpt-4o-mini';
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) {
      throw new BadRequestException(
        `OpenAI API error: ${resp.status} ${await resp.text()}`
      );
    }

    const data = (await resp.json()) as any;
    return String(data?.choices?.[0]?.message?.content || '');
  }
}
