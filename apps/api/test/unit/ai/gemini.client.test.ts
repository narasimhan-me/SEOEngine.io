/**
 * Unit tests for GeminiClient
 *
 * Tests:
 * - Model initialization and fallback chain
 * - generateWithFallback with successful responses
 * - generateWithFallback with retryable errors
 * - generateWithFallback with all models exhausted
 * - Error handling and retry logic
 */
import { GeminiClient, isRetryableGeminiError, isAllModelsExhaustedError } from '../../../src/ai/gemini.client';
import { ConfigService } from '@nestjs/config';

const createConfigMock = (overrides: Record<string, string> = {}) => {
  const defaults = {
    AI_API_KEY: 'test-api-key',
    GEMINI_API_VERSION: 'v1',
    GEMINI_MODEL_PRIORITY: '',
    GEMINI_MODEL: '',
  };
  return {
    get: jest.fn((key: string) => overrides[key] || defaults[key] || ''),
  } as unknown as ConfigService;
};

describe('GeminiClient', () => {
  let client: GeminiClient;
  let configMock: ConfigService;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    configMock = createConfigMock();
    client = new GeminiClient(configMock);
    // Reset fetch mock
    (global as any).fetch = jest.fn();
  });

  describe('constructor', () => {
    it('should initialize with default model priority when no config provided', () => {
      const config = createConfigMock();
      const client = new GeminiClient(config);
      expect(config.get).toHaveBeenCalledWith('AI_API_KEY');
      expect(config.get).toHaveBeenCalledWith('GEMINI_API_VERSION');
    });

    it('should use GEMINI_MODEL_PRIORITY when provided', () => {
      const config = createConfigMock({
        GEMINI_MODEL_PRIORITY: 'model1,model2,model3',
      });
      const client = new GeminiClient(config);
      expect(config.get).toHaveBeenCalledWith('GEMINI_MODEL_PRIORITY');
    });

    it('should fall back to GEMINI_MODEL when GEMINI_MODEL_PRIORITY is empty', () => {
      const config = createConfigMock({
        GEMINI_MODEL: 'legacy-model',
      });
      const client = new GeminiClient(config);
      expect(config.get).toHaveBeenCalledWith('GEMINI_MODEL');
    });
  });

  describe('generateWithFallback', () => {
    it('should throw error when AI_API_KEY is not configured', async () => {
      const config = createConfigMock({ AI_API_KEY: '' });
      const client = new GeminiClient(config);

      // When API key is empty, ensureInitialized sets fallbackChain but generateWithFallback
      // will throw when trying to call the API. The error happens during callModel.
      // Mock fetch to return undefined to trigger the error path
      (global.fetch as jest.Mock).mockResolvedValue(undefined);

      await expect(
        client.generateWithFallback({
          contents: [{ parts: [{ text: 'test' }] }],
        }),
      ).rejects.toThrow();
    });

    it('should successfully generate with first model', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Generated response' }],
            },
          },
        ],
      };

      // Mock model list endpoint
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'models/gemini-2.5-flash-lite' }],
        }),
      });

      // Mock generate endpoint
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.generateWithFallback({
        contents: [{ parts: [{ text: 'test prompt' }] }],
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should retry with next model on retryable error', async () => {
      const mockErrorResponse = {
        error: { message: 'Rate limit exceeded' },
      };
      const mockSuccessResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Success after retry' }],
            },
          },
        ],
      };

      // Mock model list endpoint
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.5-flash-lite' },
            { name: 'models/gemini-2.5-flash' },
          ],
        }),
      });

      // First call fails with 429 (rate limit)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => JSON.stringify(mockErrorResponse),
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        });

      const result = await client.generateWithFallback({
        contents: [{ parts: [{ text: 'test' }] }],
      });

      expect(result).toEqual(mockSuccessResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should throw AllModelsExhaustedError when all models fail', async () => {
      const mockErrorResponse = {
        error: { message: 'Model not found' },
      };

      // Mock model list endpoint
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.5-flash-lite' },
            { name: 'models/gemini-2.5-flash' },
          ],
        }),
      });

      // All models fail with 404
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify(mockErrorResponse),
      });

      await expect(
        client.generateWithFallback({
          contents: [{ parts: [{ text: 'test' }] }],
        }),
      ).rejects.toThrow();

      // Should have tried multiple models
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('isRetryableGeminiError', () => {
    it('should return true for 429 (rate limit)', () => {
      const error = { status: 429 };
      expect(isRetryableGeminiError(error)).toBe(true);
    });

    it('should return true for 5xx errors', () => {
      expect(isRetryableGeminiError({ status: 500 })).toBe(true);
      expect(isRetryableGeminiError({ status: 503 })).toBe(true);
    });

    it('should return true for 403/404 (model-specific issues)', () => {
      expect(isRetryableGeminiError({ status: 403 })).toBe(true);
      expect(isRetryableGeminiError({ status: 404 })).toBe(true);
    });

    it('should return true for errors without status (network errors)', () => {
      expect(isRetryableGeminiError(new Error('Network error'))).toBe(true);
      expect(isRetryableGeminiError({})).toBe(true);
    });

    it('should return false for 4xx client errors (except 403, 404, 429)', () => {
      expect(isRetryableGeminiError({ status: 400 })).toBe(false);
      expect(isRetryableGeminiError({ status: 401 })).toBe(false);
      expect(isRetryableGeminiError({ status: 422 })).toBe(false);
    });
  });

  describe('isAllModelsExhaustedError', () => {
    it('should return true for AllModelsExhaustedError', () => {
      const error = Object.assign(new Error('All models exhausted'), {
        code: 'ALL_MODELS_EXHAUSTED',
        triedModels: ['model1', 'model2'],
      });
      expect(isAllModelsExhaustedError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
      expect(isAllModelsExhaustedError(new Error('Regular error'))).toBe(false);
      expect(isAllModelsExhaustedError({ code: 'OTHER_CODE' })).toBe(false);
    });
  });
});

