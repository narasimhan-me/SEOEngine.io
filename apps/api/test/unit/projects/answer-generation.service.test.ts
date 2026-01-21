/**
 * Unit tests for AnswerGenerationService
 *
 * Tests:
 * - generateAnswersForProduct() generates answers from AI
 * - generateAnswersForProduct() handles AI errors gracefully
 * - generateAnswersForProduct() filters cannotAnswer responses
 * - Prompt building includes product data
 */
import { AnswerGenerationService } from '../../../src/projects/answer-generation.service';
import { ConfigService } from '@nestjs/config';
import { GeminiClient } from '../../../src/ai/gemini.client';
import { AnswerabilityStatus } from '@engineo/shared';

const createConfigMock = (overrides: Record<string, string> = {}) => {
  const defaults = {
    AI_API_KEY: 'test-api-key',
    AI_PROVIDER: 'openai',
  };
  return {
    get: jest.fn((key: string) => overrides[key] || defaults[key] || ''),
  } as unknown as ConfigService;
};

const createGeminiClientMock = () => ({
  generateWithFallback: jest.fn(),
});

describe('AnswerGenerationService', () => {
  let service: AnswerGenerationService;
  let configMock: ConfigService;
  let geminiClientMock: ReturnType<typeof createGeminiClientMock>;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    configMock = createConfigMock();
    geminiClientMock = createGeminiClientMock();
    service = new AnswerGenerationService(
      configMock,
      geminiClientMock as unknown as GeminiClient
    );
    (global as any).fetch = jest.fn();
  });

  describe('generateAnswersForProduct', () => {
    const mockProduct = {
      id: 'prod-1',
      projectId: 'proj-1',
      title: 'Test Product',
      description: 'A test product description',
      seoTitle: 'Test Product',
      seoDescription: 'A test product description',
    };

    const mockAnswerabilityStatus: AnswerabilityStatus = {
      status: 'weak',
      missingQuestions: ['who_is_it_for', 'whats_included'],
      weakQuestions: ['what_is_it'],
      answerabilityScore: 50,
    };

    it('should generate answers successfully with OpenAI', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                answers: [
                  {
                    questionId: 'what_is_it',
                    cannotAnswer: false,
                    answer: 'This is a test product',
                    confidence: 0.9,
                    factsUsed: ['title', 'description'],
                  },
                  {
                    questionId: 'who_is_it_for',
                    cannotAnswer: true,
                    answer: '',
                    confidence: 0,
                    factsUsed: [],
                  },
                ],
              }),
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(1);
      expect(result[0].questionId).toBe('what_is_it');
      expect(result[0].answer).toBe('This is a test product');
      expect(result[0].confidence).toBe(0.9);
    });

    it('should filter out cannotAnswer responses', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                answers: [
                  {
                    questionId: 'what_is_it',
                    cannotAnswer: true,
                    answer: '',
                    confidence: 0,
                    factsUsed: [],
                  },
                  {
                    questionId: 'who_is_it_for',
                    cannotAnswer: true,
                    answer: '',
                    confidence: 0,
                    factsUsed: [],
                  },
                ],
              }),
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(0);
    });

    it('should return empty array on AI provider error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      });

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(0);
    });

    it('should use Gemini provider when configured', async () => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AnswerGenerationService(
        config,
        geminiClientMock as unknown as GeminiClient
      );

      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    answers: [
                      {
                        questionId: 'what_is_it',
                        cannotAnswer: false,
                        answer: 'Gemini answer',
                        confidence: 0.8,
                        factsUsed: ['title'],
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(1);
      expect(geminiClientMock.generateWithFallback).toHaveBeenCalled();
    });

    it('should return empty array when API key is missing', async () => {
      const config = createConfigMock({
        AI_API_KEY: '',
        AI_PROVIDER: 'openai',
      });
      service = new AnswerGenerationService(
        config,
        geminiClientMock as unknown as GeminiClient
      );

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(0);
      // When API key is missing, callOpenAI returns early with empty array, so fetch may not be called
      // The important thing is that we get an empty array
    });

    it('should handle invalid JSON responses gracefully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(0);
    });

    it('should include product data in prompt', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ answers: [] }),
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const prompt = body.messages[0].content;

      // The prompt uses seoTitle/seoDescription when available, falling back to title/description
      expect(prompt).toContain('Test Product');
      expect(prompt).toContain('test product description');
    });
  });
});
