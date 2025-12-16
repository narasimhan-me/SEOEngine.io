import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiClient, GeminiGenerateResponse } from './gemini.client';
import {
  AnswerGenerationService,
  ProductForAnswerGeneration,
} from '../projects/answer-generation.service';
import { AnswerBlock, AnswerabilityStatus } from '@engineo/shared';

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
}
