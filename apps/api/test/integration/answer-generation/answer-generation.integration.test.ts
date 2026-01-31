/**
 * ANSWER-GENERATION-TESTS: Integration tests for Answer Generation Service
 *
 * Tests:
 * - Answer block generation from product data
 * - Provider switching (OpenAI, Anthropic, Gemini)
 * - Error handling and graceful degradation
 * - Answer block structure validation
 *
 * NOTE: These tests mock external AI APIs since actual API calls
 * would require credentials and incur costs.
 */
import { AnswerGenerationService } from '../../../src/projects/answer-generation.service';
import { ConfigService } from '@nestjs/config';
import { GeminiClient } from '../../../src/ai/gemini.client';
import type { AnswerabilityStatus } from '@engineo/shared';

// Skip these tests if not running in E2E mode
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('AnswerGenerationService (integration)', () => {
  let service: AnswerGenerationService;
  let configMock: ConfigService;
  let geminiClientMock: any;
  let originalFetch: typeof fetch;

  const mockProduct = {
    id: 'prod-1',
    projectId: 'proj-1',
    title: 'Premium Widget Pro',
    description: 'A high-quality professional widget for all your needs',
    seoTitle: 'Premium Widget Pro - Best Professional Widget',
    seoDescription: 'Buy the premium widget pro for professional use',
  };

  const mockAnswerabilityStatus: AnswerabilityStatus = {
    status: 'weak',
    missingQuestions: ['who_is_it_for', 'whats_included'],
    weakQuestions: ['what_is_it'],
    answerabilityScore: 50,
  };

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    // Mock ConfigService
    configMock = {
      get: jest.fn((key: string) => {
        if (key === 'AI_API_KEY') return 'test-api-key';
        if (key === 'AI_PROVIDER') return 'openai';
        return '';
      }),
    } as unknown as ConfigService;

    // Mock GeminiClient
    geminiClientMock = {
      generateWithFallback: jest.fn(),
    };

    service = new AnswerGenerationService(configMock, geminiClientMock);

    // Mock fetch
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('OpenAI Provider', () => {
    it('should generate answers using OpenAI provider', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                answers: [
                  {
                    questionId: 'what_is_it',
                    cannotAnswer: false,
                    answer: 'The Premium Widget Pro is a professional-grade widget',
                    confidence: 0.9,
                    factsUsed: ['title', 'description'],
                  },
                  {
                    questionId: 'who_is_it_for',
                    cannotAnswer: false,
                    answer: 'This widget is designed for professionals',
                    confidence: 0.85,
                    factsUsed: ['description'],
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

      expect(result).toHaveLength(2);
      expect(result[0].questionId).toBe('what_is_it');
      expect(result[0].answer).toContain('Premium Widget Pro');
      expect(result[0].sourceType).toBe('generated');
      expect(result[0].version).toBe('ae_v1');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      });

      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(0);
      jest.restoreAllMocks();
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
                    cannotAnswer: false,
                    answer: 'A widget product',
                    confidence: 0.8,
                    factsUsed: ['title'],
                  },
                  {
                    questionId: 'pricing_value',
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
    });
  });

  describe('Anthropic Provider', () => {
    beforeEach(() => {
      configMock = {
        get: jest.fn((key: string) => {
          if (key === 'AI_API_KEY') return 'test-anthropic-key';
          if (key === 'AI_PROVIDER') return 'anthropic';
          return '';
        }),
      } as unknown as ConfigService;

      service = new AnswerGenerationService(configMock, geminiClientMock);
    });

    it('should generate answers using Anthropic provider', async () => {
      const mockResponse = {
        content: [
          {
            text: JSON.stringify({
              answers: [
                {
                  questionId: 'what_is_it',
                  cannotAnswer: false,
                  answer: 'A professional widget from Anthropic',
                  confidence: 0.88,
                  factsUsed: ['title'],
                },
              ],
            }),
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
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.any(Object)
      );
    });
  });

  describe('Gemini Provider', () => {
    beforeEach(() => {
      configMock = {
        get: jest.fn((key: string) => {
          if (key === 'AI_API_KEY') return 'test-gemini-key';
          if (key === 'AI_PROVIDER') return 'gemini';
          return '';
        }),
      } as unknown as ConfigService;

      service = new AnswerGenerationService(configMock, geminiClientMock);
    });

    it('should generate answers using Gemini provider', async () => {
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
                        answer: 'A professional widget from Gemini',
                        confidence: 0.82,
                        factsUsed: ['description'],
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

    it('should handle Gemini API errors gracefully', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('Gemini API Error')
      );

      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(0);
      jest.restoreAllMocks();
    });
  });

  describe('Answer Block Structure', () => {
    it('should include all required fields in generated answers', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                answers: [
                  {
                    questionId: 'what_is_it',
                    cannotAnswer: false,
                    answer: 'A test answer',
                    confidence: 0.75,
                    factsUsed: ['title', 'description'],
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
      const answer = result[0];

      expect(answer.id).toBeDefined();
      expect(answer.projectId).toBe(mockProduct.projectId);
      expect(answer.productId).toBe(mockProduct.id);
      expect(answer.questionId).toBeDefined();
      expect(answer.question).toBeDefined();
      expect(answer.answer).toBeDefined();
      expect(answer.confidence).toBeGreaterThanOrEqual(0);
      expect(answer.confidence).toBeLessThanOrEqual(1);
      expect(answer.sourceType).toBe('generated');
      expect(answer.factsUsed).toBeDefined();
      expect(Array.isArray(answer.factsUsed)).toBe(true);
      expect(answer.version).toBe('ae_v1');
      expect(answer.createdAt).toBeDefined();
      expect(answer.updatedAt).toBeDefined();
    });

    it('should clamp confidence values to valid range', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                answers: [
                  {
                    questionId: 'what_is_it',
                    cannotAnswer: false,
                    answer: 'High confidence',
                    confidence: 1.5, // Too high
                    factsUsed: [],
                  },
                  {
                    questionId: 'who_is_it_for',
                    cannotAnswer: false,
                    answer: 'Negative confidence',
                    confidence: -0.5, // Negative
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

      expect(result).toHaveLength(2);
      expect(result[0].confidence).toBe(1); // Clamped to max
      expect(result[1].confidence).toBe(0); // Clamped to min
    });

    it('should skip invalid question IDs', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                answers: [
                  {
                    questionId: 'what_is_it',
                    cannotAnswer: false,
                    answer: 'Valid answer',
                    confidence: 0.8,
                    factsUsed: [],
                  },
                  {
                    questionId: 'invalid_question_id',
                    cannotAnswer: false,
                    answer: 'Should be skipped',
                    confidence: 0.7,
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
    });
  });

  describe('API Key Handling', () => {
    it('should return empty array when API key is missing', async () => {
      configMock = {
        get: jest.fn((key: string) => {
          if (key === 'AI_API_KEY') return '';
          if (key === 'AI_PROVIDER') return 'openai';
          return '';
        }),
      } as unknown as ConfigService;

      service = new AnswerGenerationService(configMock, geminiClientMock);

      const result = await service.generateAnswersForProduct(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('Fallback Behavior', () => {
    it('should use title when seoTitle is missing', async () => {
      const productWithoutSeo = {
        ...mockProduct,
        seoTitle: null,
        seoDescription: null,
      };

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
        productWithoutSeo,
        mockAnswerabilityStatus
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const prompt = body.messages[0].content;

      expect(prompt).toContain('Premium Widget Pro');
    });

    it('should handle products with null fields', async () => {
      const minimalProduct = {
        id: 'prod-minimal',
        projectId: 'proj-1',
        title: null,
        description: null,
        seoTitle: null,
        seoDescription: null,
      };

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
        minimalProduct,
        mockAnswerabilityStatus
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const prompt = body.messages[0].content;

      expect(prompt).toContain('Unknown Product');
    });
  });
});
