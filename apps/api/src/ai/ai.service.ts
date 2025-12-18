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
}
