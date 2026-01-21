import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { GeminiClient, GeminiGenerateResponse } from '../ai/gemini.client';
import {
  AnswerBlock,
  AnswerBlockQuestionId,
  AnswerabilityStatus,
  ANSWER_QUESTION_IDS,
  ANSWER_QUESTION_LABELS,
} from '@engineo/shared';

/**
 * Product data used for answer generation.
 */
export interface ProductForAnswerGeneration {
  id: string;
  projectId: string;
  title: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

/**
 * AI response structure for a single question answer.
 */
interface AiAnswerResponse {
  questionId: string;
  cannotAnswer: boolean;
  answer: string;
  confidence: number;
  factsUsed: string[];
}

/**
 * Full AI response structure for product answers.
 */
interface AiProductAnswersResponse {
  answers: AiAnswerResponse[];
}

/**
 * AnswerGenerationService - Generates AI Answer Blocks for products.
 *
 * Uses the configured AI provider (OpenAI/Anthropic/Gemini) to generate
 * factual, structured answers based on existing product data.
 *
 * Key behaviors:
 * - Non-hallucination: AI must return cannotAnswer=true if data is insufficient
 * - Ephemeral answers: Returned for display but not yet persisted (AE-1.2)
 * - Entitlement-aware: Caller must check limits before invoking
 */
@Injectable()
export class AnswerGenerationService {
  private readonly apiKey: string;
  private readonly provider: 'openai' | 'anthropic' | 'gemini';

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiClient: GeminiClient
  ) {
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
    this.provider =
      (this.configService.get<string>('AI_PROVIDER') as
        | 'openai'
        | 'anthropic'
        | 'gemini') || 'openai';
  }

  /**
   * Generates Answer Blocks for a product based on its existing data.
   * Returns ephemeral AnswerBlock objects (not persisted).
   *
   * @param product Product data for answer generation
   * @param answerabilityStatus Detection results from AnswerEngineService
   * @returns Array of generated AnswerBlock objects
   */
  async generateAnswersForProduct(
    product: ProductForAnswerGeneration,
    answerabilityStatus: AnswerabilityStatus
  ): Promise<AnswerBlock[]> {
    // Build the prompt for AI generation
    const prompt = this.buildPrompt(product, answerabilityStatus);

    // Call the AI provider
    let aiResponse: AiProductAnswersResponse;
    try {
      if (this.provider === 'anthropic') {
        aiResponse = await this.callAnthropic(prompt);
      } else if (this.provider === 'gemini') {
        aiResponse = await this.callGemini(prompt);
      } else {
        aiResponse = await this.callOpenAI(prompt);
      }
    } catch (error) {
      console.error('[AnswerGeneration] AI provider error:', error);
      // Return empty array on provider failure
      return [];
    }

    // Convert AI responses to AnswerBlock format
    const now = new Date().toISOString();
    const answers: AnswerBlock[] = [];

    for (const aiAnswer of aiResponse.answers) {
      // Skip questions where AI couldn't answer
      if (aiAnswer.cannotAnswer) {
        continue;
      }

      const questionId = aiAnswer.questionId as AnswerBlockQuestionId;
      if (!ANSWER_QUESTION_IDS.includes(questionId)) {
        continue;
      }

      answers.push({
        id: randomUUID(),
        projectId: product.projectId,
        productId: product.id,
        questionId,
        question: ANSWER_QUESTION_LABELS[questionId],
        answer: aiAnswer.answer,
        confidence: Math.min(1, Math.max(0, aiAnswer.confidence)),
        sourceType: 'generated',
        factsUsed: aiAnswer.factsUsed || [],
        version: 'ae_v1',
        createdAt: now,
        updatedAt: now,
      });
    }

    return answers;
  }

  /**
   * Builds the AI prompt for answer generation.
   */
  private buildPrompt(
    product: ProductForAnswerGeneration,
    answerabilityStatus: AnswerabilityStatus
  ): string {
    const title = product.seoTitle || product.title || 'Unknown Product';
    const description = product.seoDescription || product.description || '';

    // Build list of questions to attempt answering
    const questionsToAnswer = ANSWER_QUESTION_IDS.map((qId) => ({
      id: qId,
      label: ANSWER_QUESTION_LABELS[qId],
      isMissing: answerabilityStatus.missingQuestions.includes(qId),
      isWeak: answerabilityStatus.weakQuestions.includes(qId),
    }));

    const questionsJson = JSON.stringify(questionsToAnswer, null, 2);

    return `You are an Answer Engine that generates factual, AI-readable answers for product pages.

PRODUCT DATA:
Title: ${title}
Description: ${description}

QUESTIONS TO ANSWER:
${questionsJson}

CRITICAL RULES - FOLLOW EXACTLY:
1. NO HALLUCINATION: Only use facts explicitly present in the product data above.
2. If the product data does NOT contain enough information to answer a question, you MUST set "cannotAnswer": true for that question.
3. Never infer, assume, or fabricate information.
4. Each answer should be 30-80 words, factual, and non-promotional.
5. For confidence: 1.0 = fact directly stated, 0.7-0.9 = reasonably inferred, below 0.7 = set cannotAnswer to true.
6. List the facts used (attribute names like "title", "description") in factsUsed array.

RESPONSE FORMAT (JSON only, no markdown):
{
  "answers": [
    {
      "questionId": "what_is_it",
      "cannotAnswer": false,
      "answer": "The factual answer here...",
      "confidence": 0.9,
      "factsUsed": ["title", "description"]
    },
    {
      "questionId": "who_is_it_for",
      "cannotAnswer": true,
      "answer": "",
      "confidence": 0,
      "factsUsed": []
    }
  ]
}

Generate answers for ALL 10 questions. Set cannotAnswer: true for any question where the product data is insufficient.`;
  }

  /**
   * Calls OpenAI API for answer generation.
   */
  private async callOpenAI(prompt: string): Promise<AiProductAnswersResponse> {
    if (!this.apiKey) {
      return { answers: [] };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error(
        '[AnswerGeneration] OpenAI API error:',
        await response.text()
      );
      return { answers: [] };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content || '';

    return this.parseJsonResponse(content);
  }

  /**
   * Calls Anthropic API for answer generation.
   */
  private async callAnthropic(
    prompt: string
  ): Promise<AiProductAnswersResponse> {
    if (!this.apiKey) {
      return { answers: [] };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error(
        '[AnswerGeneration] Anthropic API error:',
        await response.text()
      );
      return { answers: [] };
    }

    const data = (await response.json()) as {
      content?: Array<{ text?: string }>;
    };
    const content = data.content?.[0]?.text || '';

    return this.parseJsonResponse(content);
  }

  /**
   * Calls Gemini API for answer generation.
   */
  private async callGemini(prompt: string): Promise<AiProductAnswersResponse> {
    if (!this.apiKey) {
      return { answers: [] };
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
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return this.parseJsonResponse(content);
    } catch (error) {
      console.error('[AnswerGeneration] Gemini API error:', error);
      return { answers: [] };
    }
  }

  /**
   * Parses JSON response from AI provider.
   */
  private parseJsonResponse(content: string): AiProductAnswersResponse {
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as AiProductAnswersResponse;
        if (parsed.answers && Array.isArray(parsed.answers)) {
          return parsed;
        }
      }
    } catch {
      console.error('[AnswerGeneration] Failed to parse AI response:', content);
    }
    return { answers: [] };
  }
}
