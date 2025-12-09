// packages/shared/src/deo-score-config.ts

// Versioned DEO Score model
export const DEO_SCORE_VERSION = 'v1';

// Weighting for each component score. Must sum to 1.0.
export const DEO_SCORE_WEIGHTS = {
  content: 0.3,
  entities: 0.25,
  technical: 0.25,
  visibility: 0.2,
} as const;

export type DeoScoreComponentKey = keyof typeof DEO_SCORE_WEIGHTS;

export type DeoScoreComponents = {
  content: number; // 0–100
  entities: number; // 0–100
  technical: number; // 0–100
  visibility: number; // 0–100
};

// ============================================================================
// DEO Score v2 Model – Explainable AI Visibility Index
// ============================================================================

/**
 * DEO Score v2 model version identifier.
 */
export const DEO_SCORE_MODEL_V2 = 'v2';

/**
 * DEO Score v2 component weights. Must sum to 1.0.
 * Six components designed for AI visibility explainability.
 */
export const DEO_SCORE_WEIGHTS_V2 = {
  entityStrength: 0.2,
  intentMatch: 0.2,
  answerability: 0.2,
  aiVisibility: 0.2,
  contentCompleteness: 0.15,
  technicalQuality: 0.05,
} as const;

export type DeoScoreV2ComponentKey = keyof typeof DEO_SCORE_WEIGHTS_V2;

export type DeoScoreV2Components = {
  entityStrength: number; // 0–100
  intentMatch: number; // 0–100
  answerability: number; // 0–100
  aiVisibility: number; // 0–100
  contentCompleteness: number; // 0–100
  technicalQuality: number; // 0–100
};

