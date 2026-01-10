import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeminiClient,
  GeminiGenerateResponse,
  isAllModelsExhaustedError,
} from './gemini.client';
import {
  AnswerGenerationService,
  ProductForAnswerGeneration,
} from '../projects/answer-generation.service';
import {
  AnswerBlock,
  AnswerabilityStatus,
  SearchIntentType,
  SEARCH_INTENT_LABELS,
  CompetitorGapType,
  CompetitiveCoverageAreaId,
  COMPETITOR_GAP_LABELS,
  OffsiteGapType,
  OffsiteSignalType,
  OFFSITE_SIGNAL_LABELS,
  OFFSITE_GAP_LABELS,
} from '@engineo/shared';

interface MetadataInput {
  url: string;
  currentTitle?: string;
  currentDescription?: string;
  pageTextSnippet?: string;
  h1?: string;
  targetKeywords?: string[];
}

interface MetadataOutput {
  title: string;
  description: string;
}

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly provider: 'openai' | 'anthropic' | 'gemini';

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiClient: GeminiClient,
    private readonly answerGenerationService: AnswerGenerationService,
  ) {
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
    this.provider =
      (this.configService.get<string>('AI_PROVIDER') as 'openai' | 'anthropic' | 'gemini') ||
      'openai';
  }

  async generateMetadata(input: MetadataInput): Promise<MetadataOutput> {
    const prompt = this.buildPrompt(input);

    if (this.provider === 'anthropic') {
      return this.callAnthropic(prompt);
    }
    if (this.provider === 'gemini') {
      return this.callGemini(prompt);
    }
    return this.callOpenAI(prompt);
  }

  private buildPrompt(input: MetadataInput): string {
    const keywordsText = input.targetKeywords?.length
      ? `Target keywords: ${input.targetKeywords.join(', ')}`
      : '';

    return `You are an SEO assistant. Generate an SEO-friendly title (max 60 characters) and meta description (max 155 characters) for a webpage.

URL: ${input.url}
Current Title: ${input.currentTitle || 'None'}
Current Meta Description: ${input.currentDescription || 'None'}
H1: ${input.h1 || 'None'}
Page Content Snippet: ${input.pageTextSnippet || 'Not available'}
${keywordsText}

Requirements:
- Title should be compelling and include primary keyword naturally
- Meta description should summarize the page and include a call-to-action
- Both should be optimized for click-through rate

Respond in JSON format only:
{"title": "your suggested title", "description": "your suggested meta description"}`;
  }

  private async callOpenAI(prompt: string): Promise<MetadataOutput> {
    if (!this.apiKey) {
      return this.getFallbackMetadata();
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', await response.text());
        return this.getFallbackMetadata();
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content || '';

      return this.parseJsonResponse(content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getFallbackMetadata();
    }
  }

  private async callAnthropic(prompt: string): Promise<MetadataOutput> {
    if (!this.apiKey) {
      return this.getFallbackMetadata();
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        console.error('Anthropic API error:', await response.text());
        return this.getFallbackMetadata();
      }

      const data = (await response.json()) as {
        content?: Array<{ text?: string }>;
      };
      const content = data.content?.[0]?.text || '';

      return this.parseJsonResponse(content);
    } catch (error) {
      console.error('Anthropic API error:', error);
      return this.getFallbackMetadata();
    }
  }

  private async callGemini(prompt: string): Promise<MetadataOutput> {
    if (!this.apiKey) {
      return this.getFallbackMetadata();
    }

    try {
      const data: GeminiGenerateResponse =
        await this.geminiClient.generateWithFallback({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          },
        });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // eslint-disable-next-line no-console
      console.log('[AI][Gemini] Raw response content:', {
        hasContent: !!content,
        contentLength: content.length,
        contentPreview: content.substring(0, 500),
      });

      return this.parseJsonResponse(content);
    } catch (error) {
      console.error('Gemini API error:', error);

      // Check if all models have been exhausted
      if (isAllModelsExhaustedError(error)) {
        throw new Error(
          `AI_ALL_MODELS_EXHAUSTED: All AI models have been tried and all are currently unavailable. Tried ${error.triedModels.length} models: ${error.triedModels.join(', ')}. Please wait a few minutes and try again.`,
        );
      }

      // Check if this is a quota exhaustion error (429) and propagate it
      // so the user gets a meaningful error message
      const anyError = error as { status?: number; message?: string };
      if (anyError.status === 429) {
        const isQuotaExhausted =
          anyError.message?.includes('quota') ||
          anyError.message?.includes('RESOURCE_EXHAUSTED');
        if (isQuotaExhausted) {
          throw new Error(
            'AI_QUOTA_EXHAUSTED: The AI service quota has been exceeded. Please wait a few minutes and try again, or contact support if this persists.',
          );
        }
      }

      return this.getFallbackMetadata();
    }
  }

  private parseJsonResponse(content: string): MetadataOutput {
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      // eslint-disable-next-line no-console
      console.log('[AI][Parse] JSON extraction:', {
        hasMatch: !!jsonMatch,
        matchedJson: jsonMatch?.[0]?.substring(0, 300),
      });
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // eslint-disable-next-line no-console
        console.log('[AI][Parse] Parsed result:', {
          title: parsed.title,
          description: parsed.description,
        });
        return {
          title: parsed.title || 'Suggested Title',
          description: parsed.description || 'Suggested meta description for this page.',
        };
      }
    } catch (err) {
      console.error('Failed to parse AI response:', content, err);
    }
    // eslint-disable-next-line no-console
    console.log('[AI][Parse] Returning fallback metadata');
    return this.getFallbackMetadata();
  }

  private getFallbackMetadata(): MetadataOutput {
    return {
      title: '',
      description: '',
    };
  }

  /**
   * Generates AI Answer Blocks for a product.
   * Delegates to AnswerGenerationService for actual generation.
   *
   * @param product Product data for answer generation
   * @param answerabilityStatus Detection results from AnswerEngineService
   * @returns Array of generated AnswerBlock objects (ephemeral)
   */
  async generateProductAnswers(
    product: ProductForAnswerGeneration,
    answerabilityStatus: AnswerabilityStatus,
  ): Promise<AnswerBlock[]> {
    return this.answerGenerationService.generateAnswersForProduct(
      product,
      answerabilityStatus,
    );
  }

  // ============================================================================
  // Search Intent Fix Generation (SEARCH-INTENT-1)
  // ============================================================================

  /**
   * Generate an Answer Block draft for a specific intent/query gap.
   */
  async generateAnswerBlockForIntent(input: {
    product: {
      title: string;
      description: string;
      seoTitle: string;
      seoDescription: string;
    };
    intentType: SearchIntentType;
    query: string;
  }): Promise<{ question: string; answer: string }> {
    const intentLabel = SEARCH_INTENT_LABELS[input.intentType];

    const prompt = `You are an SEO and Answer Engine optimization specialist. Generate a FAQ-style question and answer for a product that addresses a specific search intent.

Product: ${input.product.title}
Description: ${input.product.description || 'Not provided'}
SEO Title: ${input.product.seoTitle || 'Not provided'}
SEO Description: ${input.product.seoDescription || 'Not provided'}

Search Intent Type: ${intentLabel}
Target Query: "${input.query}"

Requirements:
- Generate a natural FAQ question that captures the user's intent
- Provide a factual, helpful answer based on the product information
- Answer should be 2-4 sentences, concise but informative
- For transactional intents, include purchasing-relevant information
- For comparative intents, highlight unique features or differentiators
- For informational intents, explain features or usage clearly

Respond in JSON format only:
{"question": "Your generated question", "answer": "Your detailed answer"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          question: parsed.question || `What is ${input.product.title}?`,
          answer:
            parsed.answer ||
            `${input.product.title} is a product designed to meet your needs.`,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateAnswerBlockForIntent error:', error);
    }

    // Fallback
    return {
      question: `What is ${input.product.title}?`,
      answer: input.product.description || `${input.product.title} is a quality product.`,
    };
  }

  /**
   * Generate a content snippet draft for a specific intent/query gap.
   */
  // ============================================================================
  // GEO Fix Preview Generation (GEO-FOUNDATION-1)
  // ============================================================================

  async generateGeoAnswerImprovement(input: {
    product: {
      title: string;
      description: string;
      seoTitle: string;
      seoDescription: string;
    };
    questionText: string;
    questionId: string;
    currentAnswer: string;
    issueType:
      | 'missing_direct_answer'
      | 'answer_too_vague'
      | 'poor_answer_structure'
      | 'answer_overly_promotional'
      | 'missing_examples_or_facts';
    factsUsed?: string[];
  }): Promise<{ improvedAnswer: string }> {
    const facts = Array.isArray(input.factsUsed) && input.factsUsed.length > 0
      ? input.factsUsed.join(', ')
      : 'None provided';

    const prompt = `You are helping improve an Answer Block for "Answer Readiness" and "Citation Confidence".

Trust & Safety rules (non-negotiable):
- Do NOT invent facts or claims.
- Use ONLY the product info provided below (and the factsUsed list if present).
- Keep tone neutral and factual (no hype, no guarantees, no superlatives).
- No SEO stuffing.
- Prefer short paragraphs or bullets.
- If the provided product info is insufficient for concrete facts, stay generic and suggest what detail is missing rather than inventing.

Product title: ${input.product.title}
Product description: ${input.product.description || 'Not provided'}
SEO title: ${input.product.seoTitle || 'Not provided'}
SEO description: ${input.product.seoDescription || 'Not provided'}
factsUsed (keys/hints): ${facts}

Answer Block question (${input.questionId}): ${input.questionText}
Current answer:
${input.currentAnswer || '(empty)'}

Issue to fix: ${input.issueType}

Output requirements:
- 2–5 short sentences OR 3–6 bullets (choose what best fits the issue).
- Direct answer first (first sentence should answer the question).
- No new product claims beyond provided info.

Respond in JSON only:
{"improvedAnswer":"..."}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 350,
        },
      });
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed?.improvedAnswer && typeof parsed.improvedAnswer === 'string') {
          return { improvedAnswer: parsed.improvedAnswer.trim() };
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateGeoAnswerImprovement error:', error);
    }
    return {
      improvedAnswer: (input.currentAnswer || '').trim(),
    };
  }

  async generateContentSnippetForIntent(input: {
    product: {
      title: string;
      description: string;
    };
    intentType: SearchIntentType;
    query: string;
  }): Promise<{ snippet: string }> {
    const intentLabel = SEARCH_INTENT_LABELS[input.intentType];

    const prompt = `You are an SEO copywriter. Generate a content snippet for a product page that addresses a specific search intent.

Product: ${input.product.title}
Current Description: ${input.product.description || 'Not provided'}

Search Intent Type: ${intentLabel}
Target Query: "${input.query}"

Requirements:
- Generate a 2-3 sentence paragraph that naturally addresses the search query
- Should integrate well with existing product description content
- For transactional intents, emphasize value proposition and purchasing benefits
- For comparative intents, highlight differentiators
- For informational intents, provide helpful educational content
- Use natural, conversational language

Respond in JSON format only:
{"snippet": "Your generated content snippet"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          snippet:
            parsed.snippet ||
            `${input.product.title} offers excellent features for your needs.`,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateContentSnippetForIntent error:', error);
    }

    // Fallback
    return {
      snippet: `${input.product.title} is designed to provide you with exactly what you're looking for. Explore the features and benefits that make this product stand out.`,
    };
  }

  /**
   * Generate metadata guidance for a specific intent/query gap.
   */
  async generateMetadataGuidanceForIntent(input: {
    product: {
      title: string;
      seoTitle: string;
      seoDescription: string;
    };
    intentType: SearchIntentType;
    query: string;
  }): Promise<{ titleSuggestion: string; descriptionSuggestion: string }> {
    const intentLabel = SEARCH_INTENT_LABELS[input.intentType];

    const prompt = `You are an SEO specialist. Suggest improved SEO title and meta description for a product page that better addresses a specific search intent.

Product: ${input.product.title}
Current SEO Title: ${input.product.seoTitle || 'Not set'}
Current SEO Description: ${input.product.seoDescription || 'Not set'}

Search Intent Type: ${intentLabel}
Target Query: "${input.query}"

Requirements:
- SEO Title: max 60 characters, include relevant keywords naturally
- Meta Description: max 155 characters, compelling and intent-matching
- For transactional intents, include buying signals (prices, availability, CTA)
- For comparative intents, highlight unique selling points
- For informational intents, promise clear answers/information

Respond in JSON format only:
{"titleSuggestion": "Your suggested SEO title", "descriptionSuggestion": "Your suggested meta description"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          titleSuggestion:
            parsed.titleSuggestion ||
            `${input.product.title} - Shop Now`,
          descriptionSuggestion:
            parsed.descriptionSuggestion ||
            `Discover ${input.product.title}. Find out why customers love it and shop with confidence today.`,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateMetadataGuidanceForIntent error:', error);
    }

    // Fallback
    return {
      titleSuggestion: `${input.product.title} - Shop Now`,
      descriptionSuggestion: `Discover ${input.product.title}. Find out why customers love it and shop with confidence today.`,
    };
  }

  // ============================================================================
  // Competitive Positioning Fix Generation (COMPETITORS-1)
  // ============================================================================

  /**
   * Human-readable labels for coverage areas.
   */
  private readonly COVERAGE_AREA_LABELS: Record<CompetitiveCoverageAreaId, string> = {
    transactional_intent: 'Transactional Intent',
    comparative_intent: 'Comparative Intent',
    problem_use_case_intent: 'Problem/Use Case Intent',
    trust_validation_intent: 'Trust/Validation Intent',
    informational_intent: 'Informational Intent',
    comparison_section: 'Product Comparison',
    why_choose_section: 'Why Choose Us',
    buying_guide_section: 'Buying Guide',
    feature_benefits_section: 'Features & Benefits',
    faq_coverage: 'FAQ Coverage',
    reviews_section: 'Reviews & Testimonials',
    guarantee_section: 'Guarantees & Warranties',
  };

  /**
   * Generate an Answer Block draft for a competitive gap.
   * Used when the gap is an intent gap that competitors cover but merchant doesn't.
   */
  async generateCompetitiveAnswerBlock(input: {
    product: {
      title: string;
      description: string;
      seoTitle: string;
      seoDescription: string;
    };
    gapType: CompetitorGapType;
    areaId: CompetitiveCoverageAreaId;
    intentType?: SearchIntentType;
  }): Promise<{ question: string; answer: string }> {
    const gapLabel = COMPETITOR_GAP_LABELS[input.gapType];
    const areaLabel = this.COVERAGE_AREA_LABELS[input.areaId] || input.areaId;
    const intentLabel = input.intentType ? SEARCH_INTENT_LABELS[input.intentType] : '';

    const prompt = `You are an SEO and competitive positioning specialist. Generate a FAQ-style question and answer for a product that addresses a competitive gap.

Product: ${input.product.title}
Description: ${input.product.description || 'Not provided'}
SEO Title: ${input.product.seoTitle || 'Not provided'}
SEO Description: ${input.product.seoDescription || 'Not provided'}

Competitive Gap Type: ${gapLabel}
Coverage Area: ${areaLabel}
${intentLabel ? `Intent Type: ${intentLabel}` : ''}

Requirements:
- Generate a natural FAQ question that helps the product compete better in this area
- Provide a factual, helpful answer based on the product information
- Answer should be 2-4 sentences, concise but compelling
- Focus on differentiating the product from competitors WITHOUT mentioning specific competitor names
- Use only information from the product itself - do NOT invent features
- For intent gaps, address the specific intent type buyers would have
- For content section gaps, provide the missing content naturally

IMPORTANT: Only use information from the product description. Do not invent features, specifications, or claims not present in the source material.

Respond in JSON format only:
{"question": "Your generated question", "answer": "Your detailed answer"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          question: parsed.question || `Why choose ${input.product.title}?`,
          answer:
            parsed.answer ||
            `${input.product.title} offers quality and value that stands out in the market.`,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateCompetitiveAnswerBlock error:', error);
    }

    // Fallback
    return {
      question: `Why choose ${input.product.title}?`,
      answer: input.product.description || `${input.product.title} delivers quality you can trust.`,
    };
  }

  /**
   * Generate comparison copy for a competitive content section gap.
   * Creates "Why choose us vs alternatives" style content.
   */
  async generateComparisonCopy(input: {
    product: {
      title: string;
      description: string;
    };
    gapType: CompetitorGapType;
    areaId: CompetitiveCoverageAreaId;
  }): Promise<{ comparisonText: string; placementGuidance: string }> {
    const areaLabel = this.COVERAGE_AREA_LABELS[input.areaId] || input.areaId;

    const prompt = `You are an SEO copywriter specializing in competitive differentiation. Generate comparison copy for a product page.

Product: ${input.product.title}
Current Description: ${input.product.description || 'Not provided'}

Coverage Area to Address: ${areaLabel}

Requirements:
- Generate 2-3 paragraphs of compelling comparison copy
- Focus on the product's strengths WITHOUT naming specific competitors
- Use phrases like "unlike typical alternatives" or "compared to standard options"
- Highlight unique value propositions based on the product description
- Write in a confident but not aggressive tone
- DO NOT invent features not present in the product description
- Include a brief suggestion for where this content should be placed on the page

IMPORTANT: Only use information from the product description. Do not invent features or make unsubstantiated claims.

Respond in JSON format only:
{"comparisonText": "Your comparison copy paragraphs", "placementGuidance": "Brief suggestion for content placement"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          comparisonText:
            parsed.comparisonText ||
            `${input.product.title} stands out from typical alternatives with its quality and attention to detail.`,
          placementGuidance:
            parsed.placementGuidance ||
            'Add after the main product description, before customer reviews.',
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateComparisonCopy error:', error);
    }

    // Fallback
    return {
      comparisonText: `${input.product.title} offers distinct advantages that set it apart from typical alternatives. When comparing options in this category, consider the value and quality this product delivers.`,
      placementGuidance: 'Add after the main product description.',
    };
  }

  /**
   * Generate positioning section content for trust signal or feature gaps.
   * Creates "Why Choose [Product]" style section content.
   */
  async generatePositioningSection(input: {
    product: {
      title: string;
      description: string;
    };
    gapType: CompetitorGapType;
    areaId: CompetitiveCoverageAreaId;
  }): Promise<{ positioningContent: string; placementGuidance: string }> {
    const gapLabel = COMPETITOR_GAP_LABELS[input.gapType];
    const areaLabel = this.COVERAGE_AREA_LABELS[input.areaId] || input.areaId;

    const prompt = `You are an SEO copywriter specializing in product positioning. Generate a "Why Choose Us" style section for a product page.

Product: ${input.product.title}
Current Description: ${input.product.description || 'Not provided'}

Gap Type: ${gapLabel}
Coverage Area: ${areaLabel}

Requirements:
- Generate a compelling section with a heading and 2-3 supporting points
- For trust signal gaps (FAQ, reviews, guarantees), emphasize trust-building elements
- For content section gaps, provide informative content that addresses buyer questions
- Use the product's actual features and benefits from the description
- Write in a professional, trustworthy tone
- DO NOT invent features, guarantees, or claims not present in the description
- Include guidance for where to place this content

IMPORTANT: Only reference features and benefits explicitly mentioned in the product description. Do not fabricate warranties, guarantees, or features.

Respond in JSON format only:
{"positioningContent": "Your section content with heading and bullet points", "placementGuidance": "Brief placement suggestion"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          positioningContent:
            parsed.positioningContent ||
            `Why Choose ${input.product.title}\n\n${input.product.title} delivers on quality and value, giving you confidence in your purchase.`,
          placementGuidance:
            parsed.placementGuidance ||
            'Add as a dedicated section before customer reviews.',
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generatePositioningSection error:', error);
    }

    // Fallback
    return {
      positioningContent: `Why Choose ${input.product.title}\n\nThis product stands out with its commitment to quality and customer satisfaction. When you choose ${input.product.title}, you're choosing a product designed with your needs in mind.`,
      placementGuidance: 'Add as a dedicated section on the product page.',
    };
  }

  // ============================================================================
  // Off-site Signals Fix Generation (OFFSITE-1)
  // ============================================================================

  /**
   * Generate an outreach email draft for requesting inclusion, mentions, or reviews.
   * Creates professional, ethical outreach copy that requires human review.
   *
   * ETHICAL BOUNDARIES:
   * - Neutral, ethical, and non-manipulative language
   * - Avoids false promises or spammy language
   * - Requires human review before sending
   */
  async generateOutreachEmailDraft(input: {
    brandName: string;
    domain: string;
    gapType: OffsiteGapType;
    signalType: OffsiteSignalType;
    focusKey: string;
  }): Promise<{ subject: string; body: string }> {
    const gapLabel = OFFSITE_GAP_LABELS[input.gapType];
    const signalLabel = OFFSITE_SIGNAL_LABELS[input.signalType];

    // Determine the purpose based on signal type
    let purpose = 'brand inclusion';
    if (input.signalType === 'trust_proof') {
      purpose = 'review or testimonial consideration';
    } else if (input.signalType === 'authoritative_listing') {
      purpose = 'directory or listing inclusion';
    } else if (input.signalType === 'reference_content') {
      purpose = 'content collaboration or citation';
    }

    const prompt = `You are a professional outreach copywriter. Generate a polite, ethical outreach email for a brand seeking ${purpose}.

Brand Name: ${input.brandName}
Website: ${input.domain || 'Not provided'}
Gap Type: ${gapLabel}
Signal Type: ${signalLabel}
Target Opportunity: ${input.focusKey}

Requirements:
- Write a professional, friendly subject line (max 60 characters)
- Write a concise email body (3-4 paragraphs max)
- Be polite and non-pushy — this is a request, not a demand
- Explain briefly why inclusion/mention would be relevant
- DO NOT make false promises or unsubstantiated claims
- DO NOT use manipulative language or pressure tactics
- Include a clear but soft call-to-action
- The recipient should feel respected, not spammed

IMPORTANT: This email will be reviewed by a human before sending. Generate professional, ethical copy that represents the brand well.

Respond in JSON format only:
{"subject": "Your suggested subject line", "body": "Your email body text"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          subject: parsed.subject || `Partnership Inquiry from ${input.brandName}`,
          body:
            parsed.body ||
            `Hello,\n\nI'm reaching out on behalf of ${input.brandName}. We're interested in exploring opportunities for collaboration.\n\nWould you be open to a brief conversation?\n\nBest regards`,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateOutreachEmailDraft error:', error);
    }

    // Fallback
    return {
      subject: `Partnership Inquiry from ${input.brandName}`,
      body: `Hello,\n\nI'm reaching out on behalf of ${input.brandName}. We're exploring opportunities for brand visibility and thought leadership in our industry.\n\nWe'd love to connect and explore how we might work together.\n\nBest regards,\n${input.brandName} Team`,
    };
  }

  /**
   * Generate a PR pitch draft for promoting reference content or getting featured.
   * Creates professional pitch copy suitable for publications or blogs.
   */
  async generatePrPitchDraft(input: {
    brandName: string;
    domain: string;
    signalType: OffsiteSignalType;
    focusKey: string;
  }): Promise<{ subject: string; body: string }> {
    const signalLabel = OFFSITE_SIGNAL_LABELS[input.signalType];

    const prompt = `You are a PR specialist. Generate a brief, professional pitch for a brand seeking media coverage or inclusion.

Brand Name: ${input.brandName}
Website: ${input.domain || 'Not provided'}
Signal Type: ${signalLabel}
Target Opportunity: ${input.focusKey}

Requirements:
- Write a compelling subject line that catches editor attention (max 60 characters)
- Write a concise pitch (2-3 paragraphs max)
- Focus on what makes this brand newsworthy or relevant
- DO NOT make false claims or exaggerate
- Be professional and respectful of the recipient's time
- Include a soft ask/call-to-action
- Suggest what angle or story hook might be interesting

IMPORTANT: This pitch will be reviewed and customized by a human before sending.

Respond in JSON format only:
{"subject": "Your pitch subject line", "body": "Your pitch body text"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          subject: parsed.subject || `Story Idea: ${input.brandName}`,
          body:
            parsed.body ||
            `Hi,\n\nI wanted to share a potential story idea featuring ${input.brandName}.\n\nWe'd be happy to provide more information if you're interested.\n\nBest regards`,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generatePrPitchDraft error:', error);
    }

    // Fallback
    return {
      subject: `Story Idea: ${input.brandName}`,
      body: `Hi,\n\nI'm reaching out from ${input.brandName} with a potential story idea that might interest your readers.\n\nOur brand offers a unique perspective on the industry, and we'd love to share our story.\n\nWould you be interested in learning more?\n\nBest regards,\n${input.brandName} Team`,
    };
  }

  /**
   * Generate a brand profile snippet for directory listings or About pages.
   * Creates reusable brand copy that can be adapted for various platforms.
   */
  async generateBrandProfileSnippet(input: {
    brandName: string;
    domain: string;
  }): Promise<{ summary: string; bullets: string[] }> {
    const prompt = `You are a brand copywriter. Generate a concise brand profile snippet for directory listings and About pages.

Brand Name: ${input.brandName}
Website: ${input.domain || 'Not provided'}

Requirements:
- Write a compelling 2-3 sentence brand summary
- Include 3-4 bullet points highlighting key brand attributes
- Keep language professional but approachable
- Focus on brand identity and value proposition
- DO NOT invent specific products, awards, or statistics
- The content should be adaptable for various directory listings

IMPORTANT: This is a template that will be reviewed and customized by the brand.

Respond in JSON format only:
{"summary": "Your brand summary text", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary:
            parsed.summary ||
            `${input.brandName} is committed to delivering quality and value to customers.`,
          bullets: parsed.bullets || [
            'Dedicated to customer satisfaction',
            'Quality products and services',
            'Industry expertise',
          ],
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateBrandProfileSnippet error:', error);
    }

    // Fallback
    return {
      summary: `${input.brandName} is dedicated to providing exceptional products and services. Our commitment to quality and customer satisfaction sets us apart in the industry.`,
      bullets: [
        'Committed to quality and excellence',
        'Customer-focused approach',
        'Industry expertise and knowledge',
        'Trusted by customers',
      ],
    };
  }

  /**
   * Generate polite, ethical review request copy.
   * Creates copy that can be used for email or on-site review solicitation.
   *
   * ETHICAL BOUNDARIES:
   * - Polite and non-manipulative
   * - Does not offer incentives for positive reviews
   * - Respects customer autonomy
   */
  async generateReviewRequestCopy(input: {
    brandName: string;
    focusKey: string;
  }): Promise<{ message: string; channel: string }> {
    // Determine suggested channel from focusKey
    const channel = input.focusKey.includes('email') ? 'email' : 'onsite';

    const prompt = `You are a customer communications specialist. Generate a polite, ethical review request message.

Brand Name: ${input.brandName}
Preferred Channel: ${channel}
Target Platform/Context: ${input.focusKey}

Requirements:
- Write a friendly, non-pushy review request (2-3 sentences max)
- Be grateful and respectful of the customer's time
- DO NOT offer incentives for positive reviews (this is unethical)
- DO NOT pressure customers or make them feel obligated
- Make it clear that honest feedback is valued
- Keep the tone warm and appreciative

IMPORTANT: This copy follows ethical review solicitation practices. No incentives, no manipulation.

Respond in JSON format only:
{"message": "Your review request message", "channel": "${channel}"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          message:
            parsed.message ||
            `Thank you for choosing ${input.brandName}! If you have a moment, we'd love to hear about your experience. Your honest feedback helps us improve.`,
          channel: parsed.channel || channel,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AI] generateReviewRequestCopy error:', error);
    }

    // Fallback
    return {
      message: `Thank you for being a ${input.brandName} customer! We'd really appreciate it if you could take a moment to share your honest experience. Your feedback helps us serve you better.`,
      channel,
    };
  }

  // ============================================================================
  // LOCAL-1: Local Discovery Draft Generation Methods
  // ============================================================================

  /**
   * Generate a local answer block draft for local intent queries.
   * Creates Q&A content suitable for "near me" or city-specific queries.
   */
  async generateLocalAnswerBlockDraft(input: {
    brandName: string;
    domain: string;
    signalType: string;
    focusKey: string;
  }): Promise<{ question: string; answer: string }> {
    // Parse focusKey to extract location info (e.g., "city:denver" or "service_area:front_range")
    const [locationType, locationValue] = input.focusKey.split(':');
    const locationDisplay = locationValue
      ? locationValue.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'your area';

    const prompt = `You are a local SEO specialist. Generate a Q&A Answer Block for a business with local presence.

Brand Name: ${input.brandName}
Website: ${input.domain || 'Not provided'}
Location Type: ${locationType || 'general'}
Location: ${locationDisplay}
Signal Type: ${input.signalType}

Requirements:
- Write a natural question that a local customer would ask (e.g., "Do you serve [location]?", "Where is [brand] located?")
- Write a clear, helpful answer (2-3 sentences)
- Include the location name naturally in both question and answer
- Focus on being informative and helpful for local customers
- Avoid promotional language; be factual and service-oriented

Respond in JSON format only:
{"question": "Your question", "answer": "Your answer"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          question:
            parsed.question || `Does ${input.brandName} serve ${locationDisplay}?`,
          answer:
            parsed.answer ||
            `Yes, ${input.brandName} proudly serves customers in ${locationDisplay}. Visit our website or contact us for more information about our local services.`,
        };
      }
    } catch (error) {
      console.error('[AI] generateLocalAnswerBlockDraft error:', error);
    }

    // Fallback
    return {
      question: `Does ${input.brandName} serve ${locationDisplay}?`,
      answer: `Yes, ${input.brandName} serves customers in ${locationDisplay}. We're committed to providing excellent service to our local community. Contact us to learn more about what we offer in your area.`,
    };
  }

  /**
   * Generate a city/region section draft for location-specific content.
   * Creates heading and body content suitable for city landing pages or location sections.
   */
  async generateCitySectionDraft(input: {
    brandName: string;
    domain: string;
    focusKey: string;
  }): Promise<{ heading: string; body: string }> {
    // Parse focusKey to extract location info
    const [locationType, locationValue] = input.focusKey.split(':');
    const locationDisplay = locationValue
      ? locationValue.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Your City';

    const prompt = `You are a local content specialist. Generate a city/region section for a business webpage.

Brand Name: ${input.brandName}
Website: ${input.domain || 'Not provided'}
Location Type: ${locationType || 'city'}
Location: ${locationDisplay}

Requirements:
- Write an engaging heading that includes the location name (e.g., "[Brand] in [Location]" or "Serving [Location]")
- Write 2-3 paragraphs of body content
- Naturally mention the location and surrounding areas
- Focus on how the business serves local customers
- Include local-friendly language without being overly promotional
- Keep content factual and helpful

Respond in JSON format only:
{"heading": "Your heading", "body": "Your body paragraphs"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          heading: parsed.heading || `${input.brandName} in ${locationDisplay}`,
          body:
            parsed.body ||
            `${input.brandName} is proud to serve the ${locationDisplay} community. We understand the unique needs of local customers and are committed to providing exceptional service.\n\nWhether you're a long-time resident or new to the area, we're here to help. Contact us today to learn more about how we can serve you.`,
        };
      }
    } catch (error) {
      console.error('[AI] generateCitySectionDraft error:', error);
    }

    // Fallback
    return {
      heading: `${input.brandName} in ${locationDisplay}`,
      body: `${input.brandName} is dedicated to serving customers in ${locationDisplay} and the surrounding areas. Our team understands the local community and is committed to meeting your needs.\n\nWe take pride in being part of the ${locationDisplay} community. Contact us to learn more about our services and how we can help you.`,
    };
  }

  /**
   * Generate a service area description draft.
   * Creates summary and bullet points describing the service area coverage.
   */
  async generateServiceAreaDescriptionDraft(input: {
    brandName: string;
    domain: string;
    focusKey: string;
  }): Promise<{ summary: string; bullets: string[] }> {
    // Parse focusKey to extract service area info
    const [areaType, areaValue] = input.focusKey.split(':');
    const areaDisplay = areaValue
      ? areaValue.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Our Service Area';

    const prompt = `You are a local business content specialist. Generate a service area description for a business.

Brand Name: ${input.brandName}
Website: ${input.domain || 'Not provided'}
Area Type: ${areaType || 'service_area'}
Area: ${areaDisplay}

Requirements:
- Write a brief summary paragraph (2-3 sentences) about the service area
- Provide 3-5 bullet points highlighting key aspects of the service area coverage
- Be specific about geographic coverage where possible
- Focus on customer benefits of local service
- Keep language professional and informative

Respond in JSON format only:
{"summary": "Your summary paragraph", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary:
            parsed.summary ||
            `${input.brandName} proudly serves customers throughout ${areaDisplay}. Our local presence means faster service and better support for our community.`,
          bullets: parsed.bullets || [
            `Serving ${areaDisplay} and surrounding areas`,
            'Local expertise and community knowledge',
            'Fast response times for local customers',
          ],
        };
      }
    } catch (error) {
      console.error('[AI] generateServiceAreaDescriptionDraft error:', error);
    }

    // Fallback
    return {
      summary: `${input.brandName} serves customers throughout ${areaDisplay}. Our commitment to the local community means you get personalized service from a team that knows your area.`,
      bullets: [
        `Comprehensive coverage across ${areaDisplay}`,
        'Dedicated local customer support',
        'Quick response times for local needs',
        'Community-focused service approach',
      ],
    };
  }

  // ============================================================================
  // MEDIA-1: Media & Accessibility Draft Generation Methods
  // ============================================================================

  /**
   * Generate descriptive alt text for a product image.
   *
   * DESIGN PRINCIPLES:
   * - Uses only product metadata (title, description) — no heavy CV/vision pipeline
   * - Generated alt text must NOT hallucinate content not visible in the image
   * - Alt text should be descriptive, neutral, and accessibility-focused
   * - No keyword stuffing
   */
  async generateImageAltText(input: {
    productTitle: string;
    productDescription: string;
    currentAltText: string;
    imagePosition: number;
  }): Promise<{ altText: string }> {
    const positionContext =
      input.imagePosition === 0
        ? 'main product image'
        : `product image ${input.imagePosition + 1}`;

    const prompt = `You are an accessibility specialist. Generate descriptive alt text for a product image.

Product Title: ${input.productTitle}
Product Description: ${input.productDescription || 'Not provided'}
Current Alt Text: ${input.currentAltText || 'None'}
Image Position: ${positionContext}

Requirements:
- Write descriptive alt text (max 125 characters) that helps visually impaired users understand the image
- Focus on what would likely be VISIBLE in a product image: the product itself, its appearance, color, shape, context
- For the main image, describe the product prominently
- For secondary images, suggest possible alternate views (side view, detail shot, product in use)
- DO NOT invent specific visual details you cannot know
- DO NOT use phrases like "image of" or "picture of" — just describe the content
- DO NOT keyword stuff or include promotional language
- Keep language neutral and factual

CRITICAL: You cannot see the image. Base your description on the product metadata and reasonable assumptions about typical product photography. Use phrases like "likely shows" or describe based on product type.

Respond in JSON format only:
{"altText": "Your descriptive alt text"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 150,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Ensure alt text isn't too long
        let altText = parsed.altText || `${input.productTitle} product view`;
        if (altText.length > 125) {
          altText = altText.substring(0, 122) + '...';
        }
        return { altText };
      }
    } catch (error) {
      console.error('[AI] generateImageAltText error:', error);
    }

    // Fallback: simple product-based alt text
    const fallback =
      input.imagePosition === 0
        ? `${input.productTitle}`
        : `${input.productTitle} - view ${input.imagePosition + 1}`;
    return { altText: fallback.substring(0, 125) };
  }

  /**
   * Generate a caption for a product image.
   *
   * DESIGN PRINCIPLES:
   * - Captions provide context about the image (what's shown, usage context)
   * - Uses product metadata only — no vision inference
   * - Captions should complement alt text, not duplicate it
   */
  async generateImageCaption(input: {
    productTitle: string;
    productDescription: string;
    currentAltText: string;
    imagePosition: number;
  }): Promise<{ caption: string }> {
    const positionContext =
      input.imagePosition === 0
        ? 'main product image'
        : `product image ${input.imagePosition + 1}`;

    const prompt = `You are a product content specialist. Generate a short caption for a product image.

Product Title: ${input.productTitle}
Product Description: ${input.productDescription || 'Not provided'}
Current Alt Text: ${input.currentAltText || 'None'}
Image Position: ${positionContext}

Requirements:
- Write a brief caption (1-2 sentences, max 150 characters)
- Captions should provide CONTEXT (why this view matters, what to notice)
- For the main image, highlight key product features or appeal
- For secondary images, describe what angle or detail is shown
- Be informative but concise
- DO NOT repeat the alt text verbatim — complement it
- DO NOT make claims you cannot verify from the product info

CRITICAL: You cannot see the image. Base your caption on reasonable assumptions about the image position and product type.

Respond in JSON format only:
{"caption": "Your image caption"}`;

    try {
      const data = await this.geminiClient.generateWithFallback({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 150,
        },
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        let caption = parsed.caption || `${input.productTitle} shown in detail.`;
        if (caption.length > 150) {
          caption = caption.substring(0, 147) + '...';
        }
        return { caption };
      }
    } catch (error) {
      console.error('[AI] generateImageCaption error:', error);
    }

    // Fallback
    const fallback =
      input.imagePosition === 0
        ? `Featured view of ${input.productTitle}.`
        : `Additional view of ${input.productTitle}.`;
    return { caption: fallback.substring(0, 150) };
  }
}
