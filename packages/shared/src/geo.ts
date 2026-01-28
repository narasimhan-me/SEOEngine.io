/**
 * GEO (Generative Engine Optimization) – Foundation Layer
 * GEO provides explainable readiness signals (not predictions) for whether a product's
 * Answer Units (v1: Answer Blocks) are clear, specific, structured, contextual, and readable.
 * Non-negotiables:
 *   - No ranking or citation guarantees.
 *   - Citation Confidence is derived from readiness signals (not predicted).
 *   - GEO never scrapes or simulates AI engine outputs.
 */
import type { SearchIntentType } from './search-intent';
import { SEARCH_INTENT_LABELS, SEARCH_INTENT_TYPES } from './search-intent';
import { getIntentTypeFromAreaId } from './competitors';

export type GeoReadinessSignalType =
  | 'clarity'
  | 'specificity'
  | 'structure'
  | 'context'
  | 'accessibility';

export type GeoSignalStatus = 'pass' | 'needs_improvement';

export interface GeoReadinessSignalResult {
  signal: GeoReadinessSignalType;
  status: GeoSignalStatus;
  why: string;
}

export type GeoCitationConfidenceLevel = 'low' | 'medium' | 'high';

export interface GeoCitationConfidence {
  level: GeoCitationConfidenceLevel;
  because: string;
}

export type GeoIssueType =
  | 'missing_direct_answer'
  | 'answer_too_vague'
  | 'poor_answer_structure'
  | 'answer_overly_promotional'
  | 'missing_examples_or_facts';

export type GeoPillarContext =
  | 'search_intent_fit'
  | 'competitive_positioning'
  | 'media_accessibility';

export const GEO_SIGNAL_LABELS: Record<GeoReadinessSignalType, string> = {
  clarity: 'Clarity',
  specificity: 'Specificity',
  structure: 'Structure',
  context: 'Context',
  accessibility: 'Accessibility',
};

/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] GEO Issue Labels
 * Clear, accessible labels for non-expert users.
 */
export const GEO_ISSUE_LABELS: Record<GeoIssueType, string> = {
  missing_direct_answer: 'Answer needs a clear opening',
  answer_too_vague: 'Answer could use more specifics',
  poor_answer_structure: 'Answer could be easier to read',
  answer_overly_promotional: 'Answer sounds too sales-focused',
  missing_examples_or_facts: 'Answer could use examples or details',
};

/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] GEO Issue Descriptions
 * Clear explanations of what was detected, why it matters, and what to do.
 */
export const GEO_ISSUE_DESCRIPTIONS: Record<GeoIssueType, string> = {
  missing_direct_answer:
    'This answer doesn't start with a clear, direct response. Starting with a straightforward answer helps AI assistants extract and share your content.',
  answer_too_vague:
    'This answer could be more helpful with specific details like numbers, measurements, or examples. Concrete details make your content more useful and trustworthy.',
  poor_answer_structure:
    'This answer is formatted as a large block of text. Breaking it into shorter paragraphs or bullet points makes it easier for customers and AI to find key information.',
  answer_overly_promotional:
    'This answer uses a lot of marketing language. A more neutral, informative tone helps build trust and makes AI assistants more likely to reference your content.',
  missing_examples_or_facts:
    'This answer would be more helpful with a specific example or concrete fact. Real details from your product information make answers more credible and useful.',
};

export interface GeoIssue {
  issueType: GeoIssueType;
  geoSignalType: GeoReadinessSignalType;
  pillarContext: GeoPillarContext;
  recommendedAction: string;
  why: string;
  questionId?: string;
}

export interface GeoAnswerUnitInput {
  unitId: string;
  answer: string;
  questionId?: string;
  factsUsed?: string[];
  pillarContext?: GeoPillarContext;
}

export interface GeoAnswerUnitEvaluation {
  unitId: string;
  questionId?: string;
  signals: GeoReadinessSignalResult[];
  citationConfidence: GeoCitationConfidence;
  issues: GeoIssue[];
}

export interface GeoProductEvaluation {
  citationConfidence: GeoCitationConfidence;
  signals: GeoReadinessSignalResult[];
  answerUnits: GeoAnswerUnitEvaluation[];
  issues: GeoIssue[];
}

const DEFAULT_RECOMMENDED_ACTION =
  'Preview an improvement draft (uses AI), then apply it to update the Answer Block (apply never uses AI).';

const PROMOTIONAL_PATTERNS: RegExp[] = [
  /\b(best|ultimate|world[-\s]?class|premium|revolutionary|game[-\s]?changer|guaranteed)\b/i,
  /\b(must[-\s]?have|unmatched|top[-\s]?tier|cutting[-\s]?edge)\b/i,
  /!/,
];

function norm(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function wordCount(text: string): number {
  const t = norm(text);
  if (!t) return 0;
  return t.split(' ').filter(Boolean).length;
}

function splitSentences(text: string): string[] {
  const t = norm(text);
  if (!t) return [];
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasBulletsOrLineBreakStructure(text: string): boolean {
  const raw = text || '';
  if (raw.includes('\n\n')) return true;
  const lines = raw.split('\n').map((l) => l.trim());
  return (
    lines.some((l) => /^[-*•]\s+/.test(l)) ||
    lines.some((l) => /^\d+.\s+/.test(l))
  );
}

function isOverlyPromotional(text: string): boolean {
  const t = text || '';
  return PROMOTIONAL_PATTERNS.some((re) => re.test(t));
}

function hasConcreteDetail(text: string, factsUsed?: string[]): boolean {
  const t = text || '';
  if (Array.isArray(factsUsed) && factsUsed.length > 0) return true;
  if (/\b\d+(.\d+)?\b/.test(t)) return true;
  if (/%/.test(t)) return true;
  if (/\b(e.g.|for example|for instance)\b/i.test(t)) return true;
  if (hasBulletsOrLineBreakStructure(t)) return true;
  return false;
}

export function deriveCitationConfidence(
  signals: GeoReadinessSignalResult[]
): GeoCitationConfidence {
  const failing = signals
    .filter((s) => s.status === 'needs_improvement')
    .map((s) => s.signal);
  const failCount = failing.length;
  const hasCoreGap =
    failing.includes('clarity') || failing.includes('structure');

  let level: GeoCitationConfidenceLevel = 'low';
  if (failCount === 0) level = 'high';
  else if (!hasCoreGap && failCount <= 2) level = 'medium';
  else level = 'low';

  if (level === 'high') {
    return {
      level,
      because:
        'High citation confidence because answers are clear, specific, structured, contextual, and easy to read.',
    };
  }
  if (level === 'medium') {
    return {
      level,
      because: `Medium citation confidence because minor gaps remain in: ${failing.join(', ')}.`,
    };
  }
  return {
    level,
    because: hasCoreGap
      ? `Low citation confidence because core gaps remain in: ${failing.join(', ')}.`
      : `Low citation confidence because multiple readiness gaps remain in: ${failing.join(', ')}.`,
  };
}

export function evaluateGeoReadinessSignalsForUnit(
  input: GeoAnswerUnitInput
): GeoReadinessSignalResult[] {
  const answer = input.answer || '';
  const normalized = norm(answer);
  const wc = wordCount(normalized);
  const sentences = splitSentences(normalized);
  const pillarContext: GeoPillarContext =
    input.pillarContext ?? 'search_intent_fit';

  const clarityPass =
    wc >= 20 &&
    sentences.length >= 1 &&
    !/^(discover|introducing|meet|experience|unleash|elevate|transform)\b/i.test(
      normalized
    );

  const structurePass =
    wc <= 120 ||
    hasBulletsOrLineBreakStructure(answer) ||
    sentences.length <= 4;

  const specificityPass = hasConcreteDetail(answer, input.factsUsed);

  const contextPass =
    /\b(for|ideal for|designed for|use|used to|works with|helps)\b/i.test(
      normalized
    ) || pillarContext !== 'search_intent_fit';

  const maxSentenceWords = sentences.reduce(
    (max, s) => Math.max(max, wordCount(s)),
    0
  );
  const accessibilityPass = wc <= 140 && maxSentenceWords <= 28;

  const signals: GeoReadinessSignalResult[] = [
    {
      signal: 'clarity',
      status: clarityPass ? 'pass' : 'needs_improvement',
      why: clarityPass
        ? 'Answer provides a direct, concise response without obvious ambiguity.'
        : 'Add a direct 1–2 sentence answer early (avoid lead-in marketing language).',
    },
    {
      signal: 'specificity',
      status: specificityPass ? 'pass' : 'needs_improvement',
      why: specificityPass
        ? 'Answer includes concrete details (facts, examples, or structured specifics).'
        : 'Add concrete facts or a short example grounded in existing product data (no new claims).',
    },
    {
      signal: 'structure',
      status: structurePass ? 'pass' : 'needs_improvement',
      why: structurePass
        ? 'Answer is scannable (short paragraphs, bullets, or limited sentence count).'
        : 'Break into short paragraphs or bullets; reduce long blocks and improve scanability.',
    },
    {
      signal: 'context',
      status: contextPass ? 'pass' : 'needs_improvement',
      why: contextPass
        ? 'Answer is grounded in use-case or audience context.'
        : 'Add product/use-case grounding (who it is for, when to use it, what problem it solves).',
    },
    {
      signal: 'accessibility',
      status: accessibilityPass ? 'pass' : 'needs_improvement',
      why: accessibilityPass
        ? 'Answer is readable (plain language, reasonable sentence length).'
        : 'Simplify sentences and reduce length to improve readability.',
    },
  ];

  return signals;
}

export function evaluateGeoAnswerUnit(
  input: GeoAnswerUnitInput
): GeoAnswerUnitEvaluation {
  const pillarContext: GeoPillarContext =
    input.pillarContext ?? 'search_intent_fit';
  const signals = evaluateGeoReadinessSignalsForUnit(input);
  const confidence = deriveCitationConfidence(signals);

  const promo = isOverlyPromotional(input.answer || '');
  const concrete = hasConcreteDetail(input.answer || '', input.factsUsed);

  const bySignal = new Map<GeoReadinessSignalType, GeoReadinessSignalResult>();
  for (const s of signals) bySignal.set(s.signal, s);

  const issues: GeoIssue[] = [];

  if (bySignal.get('clarity')?.status === 'needs_improvement') {
    issues.push({
      issueType: 'missing_direct_answer',
      geoSignalType: 'clarity',
      pillarContext,
      recommendedAction: DEFAULT_RECOMMENDED_ACTION,
      why: 'The answer does not start with a clear, direct response.',
      questionId: input.questionId,
    });
  }

  if (bySignal.get('specificity')?.status === 'needs_improvement') {
    issues.push({
      issueType: 'answer_too_vague',
      geoSignalType: 'specificity',
      pillarContext,
      recommendedAction: DEFAULT_RECOMMENDED_ACTION,
      why: 'The answer lacks concrete details that make it verifiable.',
      questionId: input.questionId,
    });
  }

  if (bySignal.get('structure')?.status === 'needs_improvement') {
    issues.push({
      issueType: 'poor_answer_structure',
      geoSignalType: 'structure',
      pillarContext,
      recommendedAction: DEFAULT_RECOMMENDED_ACTION,
      why: 'The answer is hard to scan (long blocks or weak formatting).',
      questionId: input.questionId,
    });
  }

  if (promo) {
    issues.push({
      issueType: 'answer_overly_promotional',
      geoSignalType: 'clarity',
      pillarContext,
      recommendedAction: DEFAULT_RECOMMENDED_ACTION,
      why: 'The answer contains marketing-heavy language; keep tone neutral and factual.',
      questionId: input.questionId,
    });
  }

  if (!concrete) {
    issues.push({
      issueType: 'missing_examples_or_facts',
      geoSignalType: 'specificity',
      pillarContext,
      recommendedAction: DEFAULT_RECOMMENDED_ACTION,
      why: 'Add a short example or concrete fact grounded in existing product data (do not invent).',
      questionId: input.questionId,
    });
  }

  return {
    unitId: input.unitId,
    questionId: input.questionId,
    signals,
    citationConfidence: confidence,
    issues,
  };
}

export function evaluateGeoProduct(
  answerUnits: GeoAnswerUnitInput[]
): GeoProductEvaluation {
  if (!Array.isArray(answerUnits) || answerUnits.length === 0) {
    const signals: GeoReadinessSignalResult[] = [
      {
        signal: 'clarity',
        status: 'needs_improvement',
        why: 'No Answer Units exist for this product yet.',
      },
      {
        signal: 'specificity',
        status: 'needs_improvement',
        why: 'No Answer Units exist for this product yet.',
      },
      {
        signal: 'structure',
        status: 'needs_improvement',
        why: 'No Answer Units exist for this product yet.',
      },
      {
        signal: 'context',
        status: 'needs_improvement',
        why: 'No Answer Units exist for this product yet.',
      },
      {
        signal: 'accessibility',
        status: 'needs_improvement',
        why: 'No Answer Units exist for this product yet.',
      },
    ];
    return {
      citationConfidence: deriveCitationConfidence(signals),
      signals,
      answerUnits: [],
      issues: [
        {
          issueType: 'missing_direct_answer',
          geoSignalType: 'clarity',
          pillarContext: 'search_intent_fit',
          recommendedAction: DEFAULT_RECOMMENDED_ACTION,
          why: 'Create Answer Units (v1: Answer Blocks) so engines can extract clear answers.',
        },
      ],
    };
  }

  const unitEvals = answerUnits.map((u) => evaluateGeoAnswerUnit(u));

  const allSignalsByType = new Map<
    GeoReadinessSignalType,
    GeoReadinessSignalResult[]
  >();
  for (const ue of unitEvals) {
    for (const s of ue.signals) {
      const existing = allSignalsByType.get(s.signal) ?? [];
      existing.push(s);
      allSignalsByType.set(s.signal, existing);
    }
  }

  const productSignals: GeoReadinessSignalResult[] = (
    [
      'clarity',
      'specificity',
      'structure',
      'context',
      'accessibility',
    ] as GeoReadinessSignalType[]
  ).map((signal) => {
    const signalResults = allSignalsByType.get(signal) ?? [];
    const failing = signalResults.filter(
      (r) => r.status === 'needs_improvement'
    ).length;
    const passing = signalResults.length - failing;
    const pass = failing === 0;
    return {
      signal,
      status: pass ? 'pass' : 'needs_improvement',
      why: pass
        ? `All Answer Units pass ${signal}.`
        : `${failing} Answer Unit(s) need improvement on ${signal} (${passing} pass).`,
    };
  });

  const confidence = deriveCitationConfidence(productSignals);
  const issues = unitEvals.flatMap((u) => u.issues);

  return {
    citationConfidence: confidence,
    signals: productSignals,
    answerUnits: unitEvals,
    issues,
  };
}

/**
 * Deterministic work key for GEO fix preview drafts (CACHE/REUSE v2).
 * Note: This does not claim collision resistance; it is a practical deterministic key.
 */
export function computeGeoFixWorkKey(
  projectId: string,
  productId: string,
  questionId: string,
  issueType: GeoIssueType,
  answerBlockUpdatedAtIso: string
): string {
  return `geo-fix:${projectId}:${productId}:${questionId}:${issueType}:${answerBlockUpdatedAtIso}`;
}

// =============================================================================
// GEO-INSIGHTS-2: Answer–Intent mapping & reuse metrics (derived-only)
// =============================================================================

/**
 * Canonical mapping of Answer Engine question IDs to SEARCH-INTENT intent types.
 * Explainability note: This mapping is deterministic and internal; it is not based on
 * external engine outputs and does not imply ranking/citation guarantees.
 */
export const GEO_CANONICAL_ANSWER_INTENT_MAP: Record<
  string,
  SearchIntentType[]
> = {
  what_is_it: ['informational'],
  who_is_it_for: ['problem_use_case', 'informational'],
  why_choose_this: ['comparative', 'trust_validation'],
  key_features: ['transactional', 'informational'],
  how_is_it_used: ['problem_use_case', 'informational'],
  problems_it_solves: ['problem_use_case', 'informational'],
  what_makes_it_different: ['comparative', 'trust_validation'],
  whats_included: ['transactional', 'informational'],
  materials_and_specs: ['trust_validation', 'informational'],
  care_safety_instructions: ['trust_validation', 'informational'],
};

export type GeoAnswerIntentMappingSource =
  | 'explicit_intent'
  | 'competitive_area'
  | 'intent_question_id'
  | 'canonical_answer_question'
  | 'unknown';

export interface GeoAnswerIntentMapping {
  baseIntent: SearchIntentType | null;
  potentialIntents: SearchIntentType[];
  mappedIntents: SearchIntentType[];
  blockedBySignals: GeoReadinessSignalType[];
  source: GeoAnswerIntentMappingSource;
  why: string;
}

function uniqIntents(intents: SearchIntentType[]): SearchIntentType[] {
  const seen = new Set<SearchIntentType>();
  const out: SearchIntentType[] = [];
  for (const i of intents) {
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(i);
  }
  return out;
}

function normalizeSearchIntentType(value: string): SearchIntentType | null {
  const t = String(value || '')
    .trim()
    .toLowerCase();
  if (t === 'informational') return 'informational';
  if (t === 'comparative') return 'comparative';
  if (t === 'transactional') return 'transactional';
  if (t === 'problem_use_case') return 'problem_use_case';
  if (t === 'trust_validation') return 'trust_validation';
  return null;
}

function findFactValue(
  factsUsed: string[] | undefined,
  prefix: string
): string | null {
  if (!Array.isArray(factsUsed)) return null;
  const found = factsUsed.find(
    (f) => typeof f === 'string' && f.startsWith(prefix)
  );
  if (!found) return null;
  return found.slice(prefix.length).trim() || null;
}

function getSignalStatus(
  signals: GeoReadinessSignalResult[] | undefined,
  signal: GeoReadinessSignalType
): GeoSignalStatus | null {
  if (!Array.isArray(signals)) return null;
  const found = signals.find((s) => s.signal === signal);
  return (found?.status as GeoSignalStatus | undefined) ?? null;
}

/**
 * Derive Answer Unit → intent mapping using internal metadata only.
 * Sources (in priority order):
 *   1. factsUsed marker: intent:<type> (SEARCH-INTENT apply)
 *   2. factsUsed marker: areaId:<..._intent> (COMPETITORS apply)
 *   3. questionId prefix: intent_<PRISMA_INTENT>_<timestamp> (SEARCH-INTENT apply)
 *   4. Canonical Answer Engine question IDs (Answer Blocks)
 * Multi-intent reuse rule (explainable):
 *   If an Answer Unit has multiple potential intents (canonical mapping),
 *   we only count it as covering multiple intents when clarity and structure pass.
 */
export function deriveGeoAnswerIntentMapping(input: {
  questionId?: string;
  factsUsed?: string[];
  signals?: GeoReadinessSignalResult[];
}): GeoAnswerIntentMapping {
  const questionId = input.questionId;
  const factsUsed = input.factsUsed ?? [];
  const signals = input.signals;

  // 1) SEARCH-INTENT marker: intent:<type>
  const intentFact = findFactValue(factsUsed, 'intent:');
  if (intentFact) {
    const parsed = normalizeSearchIntentType(intentFact);
    if (parsed) {
      return {
        baseIntent: parsed,
        potentialIntents: [parsed],
        mappedIntents: [parsed],
        blockedBySignals: [],
        source: 'explicit_intent',
        why: `Mapped to ${SEARCH_INTENT_LABELS[parsed]} because this Answer Unit is tagged with intent:${parsed}.`,
      };
    }
  }

  // 2) COMPETITORS marker: areaId:<..._intent>
  const areaId = findFactValue(factsUsed, 'areaId:');
  if (areaId) {
    const parsed = getIntentTypeFromAreaId(areaId as any) ?? null;
    if (parsed) {
      return {
        baseIntent: parsed,
        potentialIntents: [parsed],
        mappedIntents: [parsed],
        blockedBySignals: [],
        source: 'competitive_area',
        why: `Mapped to ${SEARCH_INTENT_LABELS[parsed]} because this Answer Unit came from a competitive intent area (${areaId}).`,
      };
    }
  }

  // 3) SEARCH-INTENT questionId: intent_<PRISMA_INTENT>_<timestamp>
  if (typeof questionId === 'string' && questionId.startsWith('intent_')) {
    const m = questionId.match(/^intent_([^_]+)/);
    const raw = m?.[1] ?? null;
    const parsed = raw ? normalizeSearchIntentType(raw) : null;
    if (parsed) {
      return {
        baseIntent: parsed,
        potentialIntents: [parsed],
        mappedIntents: [parsed],
        blockedBySignals: [],
        source: 'intent_question_id',
        why: `Mapped to ${SEARCH_INTENT_LABELS[parsed]} because questionId encodes intent (${questionId}).`,
      };
    }
  }

  // 4) Canonical Answer Engine question IDs
  if (
    typeof questionId === 'string' &&
    GEO_CANONICAL_ANSWER_INTENT_MAP[questionId]
  ) {
    const potentialIntents = uniqIntents(
      GEO_CANONICAL_ANSWER_INTENT_MAP[questionId]
    );
    const baseIntent = potentialIntents[0] ?? null;

    // If it is a multi-intent canonical answer, only count multi-intent mapping when clarity+structure pass.
    const isMultiIntent = potentialIntents.length >= 2;
    const clarity = getSignalStatus(signals, 'clarity');
    const structure = getSignalStatus(signals, 'structure');

    if (isMultiIntent && clarity && structure) {
      const blocked: GeoReadinessSignalType[] = [];
      if (clarity === 'needs_improvement') blocked.push('clarity');
      if (structure === 'needs_improvement') blocked.push('structure');

      if (blocked.length > 0) {
        const mapped = baseIntent ? [baseIntent] : potentialIntents.slice(0, 1);
        return {
          baseIntent,
          potentialIntents,
          mappedIntents: mapped,
          blockedBySignals: blocked,
          source: 'canonical_answer_question',
          why: `Mapped to a single intent because ${blocked.join(' and ')} need improvement for multi-intent reuse.`,
        };
      }

      return {
        baseIntent,
        potentialIntents,
        mappedIntents: potentialIntents,
        blockedBySignals: [],
        source: 'canonical_answer_question',
        why: `Mapped to multiple intents because clarity and structure pass for this canonical Answer Block.`,
      };
    }

    return {
      baseIntent,
      potentialIntents,
      mappedIntents: baseIntent ? [baseIntent] : potentialIntents,
      blockedBySignals: [],
      source: 'canonical_answer_question',
      why: `Mapped using canonical Answer Block → intent mapping for ${questionId}.`,
    };
  }

  return {
    baseIntent: null,
    potentialIntents: [],
    mappedIntents: [],
    blockedBySignals: [],
    source: 'unknown',
    why: 'No internal intent mapping could be derived for this Answer Unit.',
  };
}

export interface GeoReuseStats {
  totalAnswers: number;
  multiIntentAnswers: number;
  reuseRate: number; // 0..1
  reuseRatePercent: number; // 0..100
}

export function computeGeoReuseStats(
  mappings: Array<{ mappedIntents: SearchIntentType[] }>
): GeoReuseStats {
  const totalAnswers = Array.isArray(mappings) ? mappings.length : 0;
  const multiIntentAnswers = (mappings ?? []).filter(
    (m) => (m.mappedIntents?.length ?? 0) >= 2
  ).length;
  const reuseRate = totalAnswers > 0 ? multiIntentAnswers / totalAnswers : 0;
  return {
    totalAnswers,
    multiIntentAnswers,
    reuseRate,
    reuseRatePercent: Math.round(reuseRate * 100),
  };
}

export interface GeoIntentCoverageCounts {
  byIntent: Record<SearchIntentType, number>;
  missingIntents: SearchIntentType[];
}

export function computeGeoIntentCoverageCounts(
  mappings: Array<{ mappedIntents: SearchIntentType[] }>
): GeoIntentCoverageCounts {
  const byIntent = Object.fromEntries(
    SEARCH_INTENT_TYPES.map((t) => [t, 0])
  ) as Record<SearchIntentType, number>;

  for (const m of mappings ?? []) {
    for (const intent of m.mappedIntents ?? []) {
      byIntent[intent] = (byIntent[intent] ?? 0) + 1;
    }
  }

  const missingIntents = SEARCH_INTENT_TYPES.filter(
    (t) => (byIntent[t] ?? 0) === 0
  );
  return { byIntent, missingIntents };
}
