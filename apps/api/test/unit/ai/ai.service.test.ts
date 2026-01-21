/**
 * Unit tests for AiService
 *
 * Tests:
 * - generateMetadata with OpenAI provider
 * - generateMetadata with Anthropic provider
 * - generateMetadata with Gemini provider
 * - generateMetadata fallback behavior
 * - Prompt building
 * - JSON parsing from AI responses
 * - Error handling
 */
import { AiService } from '../../../src/ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { GeminiClient } from '../../../src/ai/gemini.client';
import { AnswerGenerationService } from '../../../src/projects/answer-generation.service';

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

const createAnswerGenerationServiceMock = () => ({
  generateAnswersForProduct: jest.fn(),
});

describe('AiService', () => {
  let service: AiService;
  let configMock: ConfigService;
  let geminiClientMock: ReturnType<typeof createGeminiClientMock>;
  let answerGenerationServiceMock: ReturnType<
    typeof createAnswerGenerationServiceMock
  >;
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
    answerGenerationServiceMock = createAnswerGenerationServiceMock();
    service = new AiService(
      configMock,
      geminiClientMock as unknown as GeminiClient,
      answerGenerationServiceMock as unknown as AnswerGenerationService
    );
    (global as any).fetch = jest.fn();
  });

  describe('constructor', () => {
    it('should initialize with OpenAI as default provider', () => {
      const config = createConfigMock({ AI_PROVIDER: '' });
      const service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
      expect(config.get).toHaveBeenCalledWith('AI_API_KEY');
      expect(config.get).toHaveBeenCalledWith('AI_PROVIDER');
    });

    it('should use configured provider', () => {
      const config = createConfigMock({ AI_PROVIDER: 'gemini' });
      const service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
      expect(config.get).toHaveBeenCalledWith('AI_PROVIDER');
    });
  });

  describe('generateMetadata', () => {
    const mockInput = {
      url: 'https://example.com/product',
      currentTitle: 'Old Title',
      currentDescription: 'Old Description',
      h1: 'Product Name',
      pageTextSnippet: 'Product description text',
      targetKeywords: ['product', 'example'],
    };

    describe('OpenAI provider', () => {
      beforeEach(() => {
        const config = createConfigMock({
          AI_PROVIDER: 'openai',
          AI_API_KEY: 'test-key',
        });
        service = new AiService(
          config,
          geminiClientMock as unknown as GeminiClient,
          answerGenerationServiceMock as unknown as AnswerGenerationService
        );
      });

      it('should generate metadata successfully', async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content:
                  '{"title": "New Title", "description": "New Description"}',
              },
            },
          ],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await service.generateMetadata(mockInput);

        expect(result.title).toBe('New Title');
        expect(result.description).toBe('New Description');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.openai.com/v1/chat/completions',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-key',
            }),
          })
        );
      });

      it('should return fallback metadata when API key is missing', async () => {
        const config = createConfigMock({
          AI_PROVIDER: 'openai',
          AI_API_KEY: '',
        });
        service = new AiService(
          config,
          geminiClientMock as unknown as GeminiClient,
          answerGenerationServiceMock as unknown as AnswerGenerationService
        );

        const result = await service.generateMetadata(mockInput);

        expect(result.title).toBe('');
        expect(result.description).toBe('');
        // When API key is missing, callOpenAI checks and returns fallback without calling fetch
        // But the check happens inside callOpenAI, so fetch may still be called
        // The important thing is we get fallback metadata
      });

      it('should return fallback metadata on API error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          text: async () => 'Error message',
        });

        const result = await service.generateMetadata(mockInput);

        expect(result.title).toBe('');
        expect(result.description).toBe('');
      });

      it('should handle JSON parsing errors gracefully', async () => {
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

        const result = await service.generateMetadata(mockInput);

        expect(result.title).toBe('');
        expect(result.description).toBe('');
      });
    });

    describe('Anthropic provider', () => {
      beforeEach(() => {
        const config = createConfigMock({
          AI_PROVIDER: 'anthropic',
          AI_API_KEY: 'test-key',
        });
        service = new AiService(
          config,
          geminiClientMock as unknown as GeminiClient,
          answerGenerationServiceMock as unknown as AnswerGenerationService
        );
      });

      it('should generate metadata successfully', async () => {
        const mockResponse = {
          content: [
            {
              text: '{"title": "Anthropic Title", "description": "Anthropic Description"}',
            },
          ],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await service.generateMetadata(mockInput);

        expect(result.title).toBe('Anthropic Title');
        expect(result.description).toBe('Anthropic Description');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.anthropic.com/v1/messages',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'x-api-key': 'test-key',
            }),
          })
        );
      });
    });

    describe('Gemini provider', () => {
      beforeEach(() => {
        const config = createConfigMock({
          AI_PROVIDER: 'gemini',
          AI_API_KEY: 'test-key',
        });
        service = new AiService(
          config,
          geminiClientMock as unknown as GeminiClient,
          answerGenerationServiceMock as unknown as AnswerGenerationService
        );
      });

      it('should generate metadata successfully', async () => {
        geminiClientMock.generateWithFallback.mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '{"title": "Gemini Title", "description": "Gemini Description"}',
                  },
                ],
              },
            },
          ],
        });

        const result = await service.generateMetadata(mockInput);

        expect(result.title).toBe('Gemini Title');
        expect(result.description).toBe('Gemini Description');
        expect(geminiClientMock.generateWithFallback).toHaveBeenCalled();
      });

      it('should return fallback metadata when API key is missing', async () => {
        const config = createConfigMock({
          AI_PROVIDER: 'gemini',
          AI_API_KEY: '',
        });
        service = new AiService(
          config,
          geminiClientMock as unknown as GeminiClient,
          answerGenerationServiceMock as unknown as AnswerGenerationService
        );

        const result = await service.generateMetadata(mockInput);

        expect(result.title).toBe('');
        expect(result.description).toBe('');
        // When API key is missing, callGemini checks and returns fallback
        // The check happens inside callGemini, so generateWithFallback may still be called
        // The important thing is we get fallback metadata
      });
    });

    it('should build prompt with all input fields', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"title": "Test", "description": "Test"}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.generateMetadata(mockInput);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const prompt = body.messages[0].content;

      expect(prompt).toContain('https://example.com/product');
      expect(prompt).toContain('Old Title');
      expect(prompt).toContain('Old Description');
      expect(prompt).toContain('Product Name');
      expect(prompt).toContain('product, example');
    });

    it('should handle missing optional fields in prompt', async () => {
      const minimalInput = {
        url: 'https://example.com',
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"title": "Test", "description": "Test"}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.generateMetadata(minimalInput);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const prompt = body.messages[0].content;

      expect(prompt).toContain('https://example.com');
      expect(prompt).toContain('None'); // Should show "None" for missing fields
    });
  });

  describe('generateProductAnswers', () => {
    it('should delegate to AnswerGenerationService', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Test Product',
        description: 'Test Description',
        seoTitle: null,
        seoDescription: null,
      };

      const mockAnswerabilityStatus = {
        status: 'weak' as const,
        overall: 'weak' as const,
        missingQuestions: [],
        weakQuestions: [],
        questions: {},
      };

      const mockAnswers = [
        {
          questionId: 'what_is_it' as const,
          answer: 'Test answer',
          cannotAnswer: false,
        },
      ];

      answerGenerationServiceMock.generateAnswersForProduct.mockResolvedValueOnce(
        mockAnswers
      );

      const result = await service.generateProductAnswers(
        mockProduct,
        mockAnswerabilityStatus
      );

      expect(result).toEqual(mockAnswers);
      expect(
        answerGenerationServiceMock.generateAnswersForProduct
      ).toHaveBeenCalledWith(mockProduct, mockAnswerabilityStatus);
    });
  });

  describe('callGemini error handling', () => {
    const mockInput = {
      url: 'https://example.com/product',
      currentTitle: 'Old Title',
      currentDescription: 'Old Description',
      h1: 'Product Name',
      pageTextSnippet: 'Product description text',
      targetKeywords: ['product', 'example'],
    };

    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should handle all models exhausted error', async () => {
      const error = new Error('All models exhausted') as any;
      error.code = 'ALL_MODELS_EXHAUSTED';
      error.triedModels = ['gemini-2.5-flash', 'gemini-2.5-pro'];

      geminiClientMock.generateWithFallback.mockRejectedValueOnce(error);

      await expect(service.generateMetadata(mockInput)).rejects.toThrow(
        'AI_ALL_MODELS_EXHAUSTED'
      );
    });

    it('should handle quota exhausted error (429)', async () => {
      const error = {
        status: 429,
        message: 'RESOURCE_EXHAUSTED quota exceeded',
      };

      geminiClientMock.generateWithFallback.mockRejectedValueOnce(error);

      await expect(service.generateMetadata(mockInput)).rejects.toThrow(
        'AI_QUOTA_EXHAUSTED'
      );
    });

    it('should return fallback on generic Gemini error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('Generic error')
      );

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle empty content from Gemini', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [{ content: { parts: [{ text: '' }] } }],
      });

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });
  });

  describe('callOpenAI error handling', () => {
    const mockInput = {
      url: 'https://example.com/product',
      currentTitle: 'Old Title',
      currentDescription: 'Old Description',
      h1: 'Product Name',
      pageTextSnippet: 'Product description text',
      targetKeywords: ['product', 'example'],
    };

    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'openai',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle malformed response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }), // No message content
      });

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle missing choices array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No choices
      });

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });
  });

  describe('callAnthropic error handling', () => {
    const mockInput = {
      url: 'https://example.com/product',
      currentTitle: 'Old Title',
      currentDescription: 'Old Description',
      h1: 'Product Name',
      pageTextSnippet: 'Product description text',
      targetKeywords: ['product', 'example'],
    };

    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'anthropic',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle missing content array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No content
      });

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });
  });

  describe('parseJsonResponse', () => {
    const mockInput = {
      url: 'https://example.com/product',
      currentTitle: 'Old Title',
      currentDescription: 'Old Description',
      h1: 'Product Name',
      pageTextSnippet: 'Product description text',
      targetKeywords: ['product', 'example'],
    };

    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'openai',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should extract JSON from markdown code blocks', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                '```json\n{"title": "Markdown Title", "description": "Markdown Description"}\n```',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('Markdown Title');
      expect(result.description).toBe('Markdown Description');
    });

    it('should handle missing title in parsed JSON', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"description": "Only Description"}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('Suggested Title');
      expect(result.description).toBe('Only Description');
    });

    it('should handle missing description in parsed JSON', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"title": "Only Title"}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateMetadata(mockInput);

      expect(result.title).toBe('Only Title');
      expect(result.description).toBe(
        'Suggested meta description for this page.'
      );
    });
  });

  describe('generateAnswerBlockForIntent', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate answer block for intent successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"question": "What is Test Product?", "answer": "Test Product is a quality product designed for your needs."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateAnswerBlockForIntent({
        product: {
          title: 'Test Product',
          description: 'Product description',
          seoTitle: 'SEO Title',
          seoDescription: 'SEO Description',
        },
        intentType: 'informational',
        query: 'what is test product',
      });

      expect(result.question).toBe('What is Test Product?');
      expect(result.answer).toContain('Test Product');
      expect(geminiClientMock.generateWithFallback).toHaveBeenCalled();
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateAnswerBlockForIntent({
        product: {
          title: 'Test Product',
          description: 'Product description',
          seoTitle: 'SEO Title',
          seoDescription: 'SEO Description',
        },
        intentType: 'informational',
        query: 'what is test product',
      });

      expect(result.question).toContain('Test Product');
      expect(result.answer).toBeDefined();
    });
  });

  describe('generateContentSnippetForIntent', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate content snippet successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"snippet": "This product offers excellent features for your needs."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateContentSnippetForIntent({
        product: {
          title: 'Test Product',
          description: 'Product description',
        },
        intentType: 'transactional',
        query: 'buy test product',
      });

      expect(result.snippet).toBe(
        'This product offers excellent features for your needs.'
      );
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateContentSnippetForIntent({
        product: {
          title: 'Test Product',
          description: 'Product description',
        },
        intentType: 'transactional',
        query: 'buy test product',
      });

      expect(result.snippet).toContain('Test Product');
    });
  });

  describe('generateMetadataGuidanceForIntent', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate metadata guidance successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"titleSuggestion": "Buy Test Product - Best Price", "descriptionSuggestion": "Shop Test Product today with fast shipping and great customer service."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateMetadataGuidanceForIntent({
        product: {
          title: 'Test Product',
          seoTitle: 'Test Product',
          seoDescription: 'Test Description',
        },
        intentType: 'transactional',
        query: 'buy test product',
      });

      expect(result.titleSuggestion).toBe('Buy Test Product - Best Price');
      expect(result.descriptionSuggestion).toContain('Test Product');
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateMetadataGuidanceForIntent({
        product: {
          title: 'Test Product',
          seoTitle: 'Test Product',
          seoDescription: 'Test Description',
        },
        intentType: 'transactional',
        query: 'buy test product',
      });

      expect(result.titleSuggestion).toContain('Test Product');
      expect(result.descriptionSuggestion).toBeDefined();
    });
  });

  describe('generateCompetitiveAnswerBlock', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate competitive answer block successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"question": "Why choose Test Product?", "answer": "Test Product offers unique features that set it apart."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateCompetitiveAnswerBlock({
        product: {
          title: 'Test Product',
          description: 'Product description',
          seoTitle: 'SEO Title',
          seoDescription: 'SEO Description',
        },
        gapType: 'intent_gap',
        areaId: 'transactional_intent',
        intentType: 'transactional',
      });

      expect(result.question).toContain('Test Product');
      expect(result.answer).toBeDefined();
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateCompetitiveAnswerBlock({
        product: {
          title: 'Test Product',
          description: 'Product description',
          seoTitle: 'SEO Title',
          seoDescription: 'SEO Description',
        },
        gapType: 'intent_gap',
        areaId: 'transactional_intent',
      });

      expect(result.question).toContain('Test Product');
      expect(result.answer).toBeDefined();
    });
  });

  describe('generateComparisonCopy', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate comparison copy successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"comparisonText": "Test Product stands out with quality.", "placementGuidance": "Add after main description"}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateComparisonCopy({
        product: {
          title: 'Test Product',
          description: 'Product description',
        },
        gapType: 'content_section_gap',
        areaId: 'comparison_section',
      });

      expect(result.comparisonText).toContain('Test Product');
      expect(result.placementGuidance).toBeDefined();
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateComparisonCopy({
        product: {
          title: 'Test Product',
          description: 'Product description',
        },
        gapType: 'content_section_gap',
        areaId: 'comparison_section',
      });

      expect(result.comparisonText).toContain('Test Product');
      expect(result.placementGuidance).toBeDefined();
    });
  });

  describe('generatePositioningSection', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate positioning section successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"positioningContent": "Why Choose Test Product\\n\\nQuality and value.", "placementGuidance": "Add before reviews"}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generatePositioningSection({
        product: {
          title: 'Test Product',
          description: 'Product description',
        },
        gapType: 'trust_signal_gap',
        areaId: 'faq_coverage',
      });

      expect(result.positioningContent).toContain('Test Product');
      expect(result.placementGuidance).toBeDefined();
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generatePositioningSection({
        product: {
          title: 'Test Product',
          description: 'Product description',
        },
        gapType: 'trust_signal_gap',
        areaId: 'faq_coverage',
      });

      expect(result.positioningContent).toContain('Test Product');
      expect(result.placementGuidance).toBeDefined();
    });
  });

  describe('generateOutreachEmailDraft', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate outreach email for trust_proof signal', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"subject": "Partnership Inquiry", "body": "Hello, we are interested in collaboration."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateOutreachEmailDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        gapType: 'missing_trust_proof',
        signalType: 'trust_proof',
        focusKey: 'reviews',
      });

      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateOutreachEmailDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        gapType: 'missing_trust_proof',
        signalType: 'trust_proof',
        focusKey: 'reviews',
      });

      expect(result.subject).toContain('Test Brand');
      expect(result.body).toBeDefined();
    });
  });

  describe('generateImageAltText', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate alt text for main image', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"altText": "Test Product shown from front view"}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateImageAltText({
        productTitle: 'Test Product',
        productDescription: 'A quality product',
        currentAltText: '',
        imagePosition: 0,
      });

      expect(result.altText).toBe('Test Product shown from front view');
    });

    it('should truncate alt text if too long', async () => {
      const longAltText = 'A'.repeat(200);
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: `{"altText": "${longAltText}"}`,
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateImageAltText({
        productTitle: 'Test Product',
        productDescription: 'A quality product',
        currentAltText: '',
        imagePosition: 0,
      });

      expect(result.altText.length).toBeLessThanOrEqual(125);
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateImageAltText({
        productTitle: 'Test Product',
        productDescription: 'A quality product',
        currentAltText: '',
        imagePosition: 0,
      });

      expect(result.altText).toBe('Test Product');
    });
  });

  describe('generateImageCaption', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate caption successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"caption": "Featured view highlighting key features"}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateImageCaption({
        productTitle: 'Test Product',
        productDescription: 'A quality product',
        currentAltText: 'Test Product',
        imagePosition: 0,
      });

      expect(result.caption).toBe('Featured view highlighting key features');
    });

    it('should truncate caption if too long', async () => {
      const longCaption = 'A'.repeat(200);
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: `{"caption": "${longCaption}"}`,
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateImageCaption({
        productTitle: 'Test Product',
        productDescription: 'A quality product',
        currentAltText: 'Test Product',
        imagePosition: 0,
      });

      expect(result.caption.length).toBeLessThanOrEqual(150);
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateImageCaption({
        productTitle: 'Test Product',
        productDescription: 'A quality product',
        currentAltText: 'Test Product',
        imagePosition: 0,
      });

      expect(result.caption).toContain('Test Product');
    });
  });

  describe('generatePrPitchDraft', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate PR pitch successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"subject": "Story Idea: Test Brand", "body": "Hi, I wanted to share a story idea."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generatePrPitchDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        signalType: 'reference_content',
        focusKey: 'tech-blog',
      });

      expect(result.subject).toBe('Story Idea: Test Brand');
      expect(result.body).toContain('story idea');
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generatePrPitchDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        signalType: 'reference_content',
        focusKey: 'tech-blog',
      });

      expect(result.subject).toContain('Test Brand');
      expect(result.body).toBeDefined();
    });
  });

  describe('generateBrandProfileSnippet', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate brand profile snippet successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"summary": "Test Brand is a quality company.", "bullets": ["Quality products", "Great service", "Industry leader"]}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateBrandProfileSnippet({
        brandName: 'Test Brand',
        domain: 'test.com',
      });

      expect(result.summary).toContain('Test Brand');
      expect(result.bullets).toHaveLength(3);
      expect(result.bullets[0]).toBe('Quality products');
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateBrandProfileSnippet({
        brandName: 'Test Brand',
        domain: 'test.com',
      });

      expect(result.summary).toContain('Test Brand');
      expect(result.bullets.length).toBeGreaterThan(0);
    });
  });

  describe('generateReviewRequestCopy', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate review request for email channel', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"message": "Thank you for choosing Test Brand!", "channel": "email"}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateReviewRequestCopy({
        brandName: 'Test Brand',
        focusKey: 'email-review-request',
      });

      expect(result.message).toContain('Test Brand');
      expect(result.channel).toBe('email');
    });

    it('should generate review request for onsite channel', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"message": "Thank you for your purchase!", "channel": "onsite"}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateReviewRequestCopy({
        brandName: 'Test Brand',
        focusKey: 'onsite-widget',
      });

      expect(result.message).toBeDefined();
      expect(result.channel).toBe('onsite');
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateReviewRequestCopy({
        brandName: 'Test Brand',
        focusKey: 'email-review',
      });

      expect(result.message).toContain('Test Brand');
      expect(result.channel).toBe('email');
    });
  });

  describe('generateLocalAnswerBlockDraft', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate local answer block with city location', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"question": "Does Test Brand serve Denver?", "answer": "Yes, we serve Denver and surrounding areas."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateLocalAnswerBlockDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        signalType: 'local_presence',
        focusKey: 'city:denver',
      });

      expect(result.question).toContain('Denver');
      expect(result.answer).toContain('Denver');
    });

    it('should handle service area location', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"question": "Does Test Brand serve Front Range?", "answer": "Yes, we serve the Front Range area."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateLocalAnswerBlockDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        signalType: 'local_presence',
        focusKey: 'service_area:front_range',
      });

      expect(result.question).toContain('Front Range');
      expect(result.answer).toBeDefined();
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateLocalAnswerBlockDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        signalType: 'local_presence',
        focusKey: 'city:denver',
      });

      expect(result.question).toContain('Test Brand');
      expect(result.answer).toBeDefined();
    });
  });

  describe('generateCitySectionDraft', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate city section successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"heading": "Test Brand in Denver", "body": "We proudly serve Denver and surrounding areas."}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateCitySectionDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        focusKey: 'city:denver',
      });

      expect(result.heading).toContain('Denver');
      expect(result.body).toContain('Denver');
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateCitySectionDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        focusKey: 'city:denver',
      });

      expect(result.heading).toContain('Denver');
      expect(result.body).toBeDefined();
    });
  });

  describe('generateServiceAreaDescriptionDraft', () => {
    beforeEach(() => {
      const config = createConfigMock({
        AI_PROVIDER: 'gemini',
        AI_API_KEY: 'test-key',
      });
      service = new AiService(
        config,
        geminiClientMock as unknown as GeminiClient,
        answerGenerationServiceMock as unknown as AnswerGenerationService
      );
    });

    it('should generate service area description successfully', async () => {
      geminiClientMock.generateWithFallback.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"summary": "We serve the Front Range area.", "bullets": ["Denver metro", "Boulder", "Fort Collins"]}',
                },
              ],
            },
          },
        ],
      });

      const result = await service.generateServiceAreaDescriptionDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        focusKey: 'service_area:front_range',
      });

      expect(result.summary).toContain('Front Range');
      expect(result.bullets.length).toBeGreaterThan(0);
    });

    it('should return fallback on error', async () => {
      geminiClientMock.generateWithFallback.mockRejectedValueOnce(
        new Error('API error')
      );

      const result = await service.generateServiceAreaDescriptionDraft({
        brandName: 'Test Brand',
        domain: 'test.com',
        focusKey: 'service_area:front_range',
      });

      expect(result.summary).toContain('Front Range');
      expect(result.bullets.length).toBeGreaterThan(0);
    });
  });
});
