export type DeoScoreBreakdown = {
  overall: number;
  content?: number | null;
  entities?: number | null;
  technical?: number | null;
  visibility?: number | null;
};

/**
 * DEO Score v2 Breakdown - Explainable AI Visibility Index
 * Six components with weights defined in deo-score-config.ts
 */
export type DeoScoreV2Breakdown = {
  overall: number;
  entityStrength: number;
  intentMatch: number;
  answerability: number;
  aiVisibility: number;
  contentCompleteness: number;
  technicalQuality: number;
};

export type DeoScoreSnapshot = {
  id: string;
  projectId: string;
  version: string;
  computedAt: string; // ISO timestamp
  breakdown: DeoScoreBreakdown;
  metadata?: Record<string, unknown>;
};

export type DeoScoreLatestResponse = {
  projectId: string;
  latestScore: DeoScoreBreakdown | null;
  latestSnapshot: DeoScoreSnapshot | null;
};

export type DeoScoreSignals = {
  // Content quality & coverage
  contentCoverage?: number | null; // 0–1, fraction of critical intents covered
  contentDepth?: number | null; // 0–1, depth/quality of answers
  contentFreshness?: number | null; // 0–1, recency of key content

  // Entities & knowledge graph (v1 components)
  entityCoverage?: number | null; // 0–1, fraction of key entities modeled
  entityAccuracy?: number | null; // 0–1, correctness of entity facts/schemas
  entityLinkage?: number | null; // 0–1, internal cross-link and schema linking

  // Technical & crawl (v1 components)
  crawlHealth?: number | null; // 0–1, crawl success rate / errors
  coreWebVitals?: number | null; // 0–1, LCP/FID/CLS normalized
  indexability?: number | null; // 0–1, indexability of critical URLs

  // Visibility (SEO / AEO / PEO / VEO)
  serpPresence?: number | null; // 0–1, presence in organic results/snippets
  answerSurfacePresence?: number | null; // 0–1, presence in AI/assistant answers
  brandNavigationalStrength?: number | null; // 0–1, brand queries success

  // Technical detail signals (Phase 2.4)
  htmlStructuralQuality?: number | null; // 0–1, inverse structural issues from crawl
  thinContentQuality?: number | null; // 0–1, inverse thin content rate

  // Entity detail signals (Phase 2.4)
  entityHintCoverage?: number | null; // 0–1, pages with title + H1
  entityStructureAccuracy?: number | null; // 0–1, clamped inverse of entity structure issues
  entityLinkageDensity?: number | null; // 0–1, internal link density proxy (or word-count fallback)
};

/**
 * Returns a placeholder DEO score breakdown.
 * Used in Phase 2.0 before real signal-based computation is implemented.
 */
export function computePlaceholderDeoScore(): DeoScoreBreakdown {
  return {
    overall: 50,
    content: null,
    entities: null,
    technical: null,
    visibility: null,
  };
}
