import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeminiGenerateRequest {
  contents: Array<{
    parts: Array<{ text?: string } & Record<string, unknown>>;
  }>;
  generationConfig?: Record<string, unknown>;
  safetySettings?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  [key: string]: unknown;
}

interface GeminiApiError extends Error {
  status?: number;
}

export interface AllModelsExhaustedError extends Error {
  code: 'ALL_MODELS_EXHAUSTED';
  triedModels: string[];
  lastError?: unknown;
}

export function isAllModelsExhaustedError(err: unknown): err is AllModelsExhaustedError {
  return (
    err instanceof Error &&
    (err as AllModelsExhaustedError).code === 'ALL_MODELS_EXHAUSTED'
  );
}

export const DEFAULT_GEMINI_MODEL_PRIORITY: string[] = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
];

export function isRetryableGeminiError(err: unknown): boolean {
  const anyErr = err as { status?: unknown } | null | undefined;
  const status =
    anyErr && typeof anyErr.status === 'number' ? anyErr.status : undefined;

  // Network / transport errors from fetch lack a numeric status but are safe to retry
  if (typeof status !== 'number') {
    return true;
  }

  // Quota / rate limit
  if (status === 429) {
    return true;
  }

  // Model/permission issues that may be model-specific
  if (status === 403 || status === 404) {
    return true;
  }

  // Provider-side transient failures
  if (status >= 500 && status <= 599) {
    return true;
  }

  // 4xx request errors (e.g., invalid input) are treated as non-retryable
  return false;
}

@Injectable()
export class GeminiClient {
  private readonly apiKey: string;
  private readonly apiVersion: string;
  private readonly desiredModels: string[];

  private availableModels: string[] | null = null;
  private fallbackChain: string[] | null = null;
  private initialized = false;
  private initializingPromise: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
    this.apiVersion =
      this.configService.get<string>('GEMINI_API_VERSION') || 'v1';

    const priorityEnv =
      this.configService.get<string>('GEMINI_MODEL_PRIORITY') || '';
    const legacyModel = this.configService.get<string>('GEMINI_MODEL') || '';

    let priority = DEFAULT_GEMINI_MODEL_PRIORITY;

    if (priorityEnv.trim()) {
      priority = priorityEnv
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
    } else if (legacyModel) {
      priority = [legacyModel, ...DEFAULT_GEMINI_MODEL_PRIORITY].filter(
        (value, index, self) => self.indexOf(value) === index,
      );
    }

    this.desiredModels = priority;
  }

  /**
   * Public entry point for callers needing Gemini generateContent with
   * automatic model discovery and failover.
   */
  async generateWithFallback(
    request: GeminiGenerateRequest,
  ): Promise<GeminiGenerateResponse> {
    if (!this.apiKey) {
      throw new Error(
        '[Gemini] AI_API_KEY is not configured; cannot call Gemini API.',
      );
    }

    await this.ensureInitialized();

    const chain =
      (this.fallbackChain && this.fallbackChain.length > 0
        ? this.fallbackChain
        : this.desiredModels) || this.desiredModels;

    // High-level observability for each generate call
    // eslint-disable-next-line no-console
    console.log('[Gemini] generateWithFallback start', {
      fallbackChain: chain,
      chainLength: chain.length,
    });

    let lastError: unknown;

    for (let attemptIndex = 0; attemptIndex < chain.length; attemptIndex++) {
      const model = chain[attemptIndex];

      // eslint-disable-next-line no-console
      console.log('[Gemini] generateWithFallback attempt', {
        model,
        attemptIndex,
      });

      try {
        const result = await this.callModel(model, request);

        // eslint-disable-next-line no-console
        console.log('[Gemini] generateWithFallback success', {
          model,
          attemptIndex,
          usedFallback: attemptIndex > 0,
        });

        return result;
      } catch (error) {
        lastError = error;
        const retryable = isRetryableGeminiError(error);

        if (retryable && attemptIndex < chain.length - 1) {
          // eslint-disable-next-line no-console
          console.warn('[Gemini] Retryable model error; failing over to next model', {
            model,
            attemptIndex,
          });
          continue;
        }

        // Non-retryable, or retryable but at end of chain: stop here.
        // eslint-disable-next-line no-console
        console.error(
          '[Gemini] generateWithFallback terminating due to non-retryable error or end of chain',
          {
            model,
            attemptIndex,
            retryable,
          },
        );
        throw error;
      }
    }

    // eslint-disable-next-line no-console
    console.error('[Gemini] generateWithFallback exhausted all models', {
      fallbackChain: chain,
      attempts: chain.length,
    });

    // Create a specific error for all models exhausted
    const exhaustedError = new Error(
      `[Gemini] All ${chain.length} models in fallback chain failed. Tried: ${chain.join(', ')}. Please try again later or contact support.`,
    ) as AllModelsExhaustedError;
    exhaustedError.code = 'ALL_MODELS_EXHAUSTED';
    exhaustedError.triedModels = [...chain];
    exhaustedError.lastError = lastError;

    throw exhaustedError;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.apiKey) {
      // No API key configured – nothing to initialize.
      this.initialized = true;
      this.fallbackChain = this.desiredModels;
      return;
    }

    if (this.initialized) {
      return;
    }

    if (this.initializingPromise) {
      await this.initializingPromise;
      return;
    }

    this.initializingPromise = this.loadAvailableModels();
    await this.initializingPromise;
  }

  private async loadAvailableModels(): Promise<void> {
    try {
      const url = `https://generativelanguage.googleapis.com/${this.apiVersion}/models?key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        const body = await response.text();
        // eslint-disable-next-line no-console
        console.error(
          `[Gemini] Failed to list models (status ${response.status}): ${body}`,
        );
        this.availableModels = null;
        this.fallbackChain = this.desiredModels;
        return;
      }

      const data = (await response.json()) as {
        models?: Array<{
          name: string;
          supportedGenerationMethods?: string[];
        }>;
      };
      const models = data.models ?? [];

      const usable = models.filter((model) =>
        (model.supportedGenerationMethods || []).includes('generateContent'),
      );

      // Normalize model names from "models/gemini-1.5-flash" → "gemini-1.5-flash"
      this.availableModels = usable.map((m) =>
        m.name.startsWith('models/') ? m.name.replace(/^models\//, '') : m.name,
      );

      const availableSet = new Set(this.availableModels);
      let chain = this.desiredModels.filter((m) => availableSet.has(m));

      // Safe fallback models that should always be included even if not in the
      // API's model list (they may not be advertised but still work reliably).
      // Use versioned model names (e.g., gemini-2.0-flash-lite-001) as these
      // tend to be more stable fallbacks when unversioned names hit rate limits.
      const safeFallbacks = ['gemini-2.0-flash-lite-001', 'gemini-2.0-flash-001'];

      // Ensure safe fallbacks are always at the end of the chain
      for (const safeModel of safeFallbacks) {
        if (!chain.includes(safeModel)) {
          chain.push(safeModel);
        }
      }

      const safeDefault = 'gemini-1.5-flash';
      if (chain.length === 0) {
        // No desired models are currently available – select a safe default if possible.
        if (availableSet.has(safeDefault)) {
          chain = [safeDefault];
          // eslint-disable-next-line no-console
          console.warn(
            '[Gemini] No desired models matched available models. Falling back to safe default model:',
            safeDefault,
          );
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            '[Gemini] No desired models matched available models and safe default is unavailable. Using desired priority list as-is; calls may still fail.',
          );
          chain = this.desiredModels;
        }
      }

      this.fallbackChain = chain;

      // eslint-disable-next-line no-console
      console.log('[Gemini] Model discovery complete', {
        desiredModels: this.desiredModels,
        availableModels: this.availableModels,
        fallbackChain: this.fallbackChain,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Gemini] Error while listing models:', error);
      this.availableModels = null;
      this.fallbackChain = this.desiredModels;
    } finally {
      this.initialized = true;
    }
  }

  private async callModel(
    model: string,
    request: GeminiGenerateRequest,
  ): Promise<GeminiGenerateResponse> {
    const url = `https://generativelanguage.googleapis.com/${this.apiVersion}/models/${model}:generateContent?key=${this.apiKey}`;

    // eslint-disable-next-line no-console
    console.log('[Gemini] Calling generateContent with model:', model);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const body = await response.text();
      const error: GeminiApiError = new Error(
        `[Gemini] generateContent error (status ${response.status}) for model ${model}: ${body}`,
      );
      error.status = response.status;
      throw error;
    }

    return (await response.json()) as GeminiGenerateResponse;
  }
}

