import {
  DEO_SCORE_VERSION,
  DEO_SCORE_WEIGHTS,
  DEO_SCORE_WEIGHTS_V2,
  type DeoScoreComponents,
  type DeoScoreV2Components,
} from './deo-score-config';
import { type DeoScoreBreakdown, type DeoScoreSignals, type DeoScoreV2Breakdown } from './deo-score';

/**
 * Normalize a 0–1 score into 0–100, with a safe fallback.
 */
function normalize01To100(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(clamped * 100);
}

/**
 * Helper: average a list of optional 0–1 scores, ignoring null/undefined.
 * Returns null if no usable values.
 */
function averageNullable(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return sum / valid.length;
}

/**
 * Public helper to normalize a single 0–1 signal into a 0–100 score.
 * This wraps the internal normalize01To100 utility.
 */
export function normalizeSignal(value: number | null | undefined): number {
  return normalize01To100(value);
}

/**
 * Compute component scores (0–100) from raw DEO signals.
 * This is a simple v1 heuristics-based model.
 */
export function computeDeoComponentsFromSignals(
  signals: DeoScoreSignals,
): DeoScoreComponents {
  // Content: coverage, depth, freshness
  const content = normalizeSignal(
    averageNullable([
      signals.contentCoverage,
      signals.contentDepth,
      signals.contentFreshness,
    ]),
  );

  // Entities: coverage, accuracy, linkage
  const entities = normalizeSignal(
    averageNullable([
      signals.entityCoverage,
      signals.entityAccuracy,
      signals.entityLinkage,
    ]),
  );

  // Technical: crawl health, CWV, indexability
  const technical = normalizeSignal(
    averageNullable([
      signals.crawlHealth,
      signals.coreWebVitals,
      signals.indexability,
    ]),
  );

  // Visibility: SERP, answer surfaces, brand
  const visibility = normalizeSignal(
    averageNullable([
      signals.serpPresence,
      signals.answerSurfacePresence,
      signals.brandNavigationalStrength,
    ]),
  );

  return { content, entities, technical, visibility };
}

/**
 * Compute a single component score (0–100) from raw DEO signals.
 */
export function computeDeoComponentScore(
  signals: DeoScoreSignals,
  component: keyof DeoScoreComponents,
): number {
  const components = computeDeoComponentsFromSignals(signals);
  return components[component];
}

/**
 * Compute the overall DEO score (0–100) from component scores using DEO_SCORE_WEIGHTS.
 */
export function computeOverallDeoScore(components: DeoScoreComponents): number {
  return Math.round(
    components.content * DEO_SCORE_WEIGHTS.content +
      components.entities * DEO_SCORE_WEIGHTS.entities +
      components.technical * DEO_SCORE_WEIGHTS.technical +
      components.visibility * DEO_SCORE_WEIGHTS.visibility,
  );
}

/**
 * Compute overall DEO score and breakdown from signals using DEO_SCORE_WEIGHTS.
 */
export function computeDeoScoreFromSignals(
  signals: DeoScoreSignals,
): DeoScoreBreakdown {
  const components = computeDeoComponentsFromSignals(signals);
  const overall = computeOverallDeoScore(components);

  return {
    overall,
    content: components.content,
    entities: components.entities,
    technical: components.technical,
    visibility: components.visibility,
  };
}

export { DEO_SCORE_VERSION };

// ============================================================================
// DEO Score v2 Helpers – Explainable AI Visibility Index
// ============================================================================

/**
 * Compute v2 component scores (0–100) from raw DEO signals.
 * Maps existing signals to six v2 components using heuristic averages.
 */
export function computeDeoComponentsV2FromSignals(
  signals: DeoScoreSignals,
): DeoScoreV2Components {
  // Entity Strength: how clearly the product/page defines what it is
  const entityStrength = normalizeSignal(
    averageNullable([
      signals.entityCoverage,
      signals.entityAccuracy,
      signals.entityHintCoverage,
      signals.entityStructureAccuracy,
      signals.entityLinkage,
      signals.entityLinkageDensity,
    ]),
  );

  // Intent Match Quality: how well metadata/content align with user/buyer intent
  const intentMatch = normalizeSignal(
    averageNullable([
      signals.contentCoverage,
      signals.contentDepth,
      signals.serpPresence,
      signals.answerSurfacePresence,
      signals.brandNavigationalStrength,
    ]),
  );

  // Answerability: how easily an AI assistant can answer core buyer questions
  const answerability = normalizeSignal(
    averageNullable([
      signals.contentDepth,
      signals.contentCoverage,
      signals.answerSurfacePresence,
      signals.thinContentQuality,
    ]),
  );

  // AI Visibility Factors: cleanliness and consistency of signals used by AI assistants
  const aiVisibility = normalizeSignal(
    averageNullable([
      signals.serpPresence,
      signals.answerSurfacePresence,
      signals.brandNavigationalStrength,
      signals.indexability,
    ]),
  );

  // Content Completeness: presence of core content elements
  const contentCompleteness = normalizeSignal(
    averageNullable([
      signals.contentCoverage,
      signals.contentDepth,
      signals.contentFreshness,
      signals.entityCoverage,
    ]),
  );

  // Technical Quality: basic technical health
  const technicalQuality = normalizeSignal(
    averageNullable([
      signals.crawlHealth,
      signals.indexability,
      signals.htmlStructuralQuality,
      signals.thinContentQuality,
      signals.coreWebVitals,
    ]),
  );

  return {
    entityStrength,
    intentMatch,
    answerability,
    aiVisibility,
    contentCompleteness,
    technicalQuality,
  };
}

/**
 * Compute the overall v2 DEO score (0–100) from v2 component scores.
 */
export function computeOverallDeoScoreV2(components: DeoScoreV2Components): number {
  return Math.round(
    components.entityStrength * DEO_SCORE_WEIGHTS_V2.entityStrength +
      components.intentMatch * DEO_SCORE_WEIGHTS_V2.intentMatch +
      components.answerability * DEO_SCORE_WEIGHTS_V2.answerability +
      components.aiVisibility * DEO_SCORE_WEIGHTS_V2.aiVisibility +
      components.contentCompleteness * DEO_SCORE_WEIGHTS_V2.contentCompleteness +
      components.technicalQuality * DEO_SCORE_WEIGHTS_V2.technicalQuality,
  );
}

/**
 * Compute overall v2 DEO score and breakdown from signals.
 */
export function computeDeoScoreV2FromSignals(
  signals: DeoScoreSignals,
): DeoScoreV2Breakdown {
  const components = computeDeoComponentsV2FromSignals(signals);
  const overall = computeOverallDeoScoreV2(components);

  return {
    overall,
    entityStrength: components.entityStrength,
    intentMatch: components.intentMatch,
    answerability: components.answerability,
    aiVisibility: components.aiVisibility,
    contentCompleteness: components.contentCompleteness,
    technicalQuality: components.technicalQuality,
  };
}

