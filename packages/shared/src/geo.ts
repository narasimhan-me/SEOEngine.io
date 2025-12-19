/**
 * GEO (Generative Engine Optimization) – Foundation Layer
 * GEO provides explainable readiness signals (not predictions) for whether a product's
 * Answer Units (v1: Answer Blocks) are clear, specific, structured, contextual, and readable.
 * Non-negotiables:
 *   - No ranking or citation guarantees.
 *   - Citation Confidence is derived from readiness signals (not predicted).
 *   - GEO never scrapes or simulates AI engine outputs.
 */

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

export const GEO_ISSUE_LABELS: Record<GeoIssueType, string> = {
  missing_direct_answer: 'Missing direct answer',
  answer_too_vague: 'Answer is too vague',
  poor_answer_structure: 'Poor answer structure',
  answer_overly_promotional: 'Answer is overly promotional',
  missing_examples_or_facts: 'Missing examples or concrete facts',
};

export const GEO_ISSUE_DESCRIPTIONS: Record<GeoIssueType, string> = {
  missing_direct_answer:
    'The answer does not provide a concise, direct response early on.',
  answer_too_vague:
    'The answer lacks concrete details that make it verifiable and useful.',
  poor_answer_structure:
    'The answer is hard to scan (long blocks, weak formatting, unclear sections).',
  answer_overly_promotional:
    'The answer uses marketing-heavy language that reduces neutrality and trust.',
  missing_examples_or_facts:
    'The answer would benefit from specific examples or grounded facts (without inventing new claims).',
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
  return lines.some((l) => /^[-*•]\s+/.test(l)) || lines.some((l) => /^\d+.\s+/.test(l));
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
  signals: GeoReadinessSignalResult[],
): GeoCitationConfidence {
  const failing = signals.filter((s) => s.status === 'needs_improvement').map((s) => s.signal);
  const failCount = failing.length;
  const hasCoreGap = failing.includes('clarity') || failing.includes('structure');

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

export function evaluateGeoReadinessSignalsForUnit(input: GeoAnswerUnitInput): GeoReadinessSignalResult[] {
  const answer = input.answer || '';
  const normalized = norm(answer);
  const wc = wordCount(normalized);
  const sentences = splitSentences(normalized);
  const pillarContext: GeoPillarContext = input.pillarContext ?? 'search_intent_fit';

  const clarityPass =
    wc >= 20 &&
    (sentences.length >= 1) &&
    !/^(discover|introducing|meet|experience|unleash|elevate|transform)\b/i.test(normalized);

  const structurePass =
    wc <= 120 ||
    hasBulletsOrLineBreakStructure(answer) ||
    sentences.length <= 4;

  const specificityPass = hasConcreteDetail(answer, input.factsUsed);

  const contextPass =
    /\b(for|ideal for|designed for|use|used to|works with|helps)\b/i.test(normalized) ||
    pillarContext !== 'search_intent_fit';

  const maxSentenceWords = sentences.reduce((max, s) => Math.max(max, wordCount(s)), 0);
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

export function evaluateGeoAnswerUnit(input: GeoAnswerUnitInput): GeoAnswerUnitEvaluation {
  const pillarContext: GeoPillarContext = input.pillarContext ?? 'search_intent_fit';
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

export function evaluateGeoProduct(answerUnits: GeoAnswerUnitInput[]): GeoProductEvaluation {
  if (!Array.isArray(answerUnits) || answerUnits.length === 0) {
    const signals: GeoReadinessSignalResult[] = [
      { signal: 'clarity', status: 'needs_improvement', why: 'No Answer Units exist for this product yet.' },
      { signal: 'specificity', status: 'needs_improvement', why: 'No Answer Units exist for this product yet.' },
      { signal: 'structure', status: 'needs_improvement', why: 'No Answer Units exist for this product yet.' },
      { signal: 'context', status: 'needs_improvement', why: 'No Answer Units exist for this product yet.' },
      { signal: 'accessibility', status: 'needs_improvement', why: 'No Answer Units exist for this product yet.' },
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

  const allSignalsByType = new Map<GeoReadinessSignalType, GeoReadinessSignalResult[]>();
  for (const ue of unitEvals) {
    for (const s of ue.signals) {
      const existing = allSignalsByType.get(s.signal) ?? [];
      existing.push(s);
      allSignalsByType.set(s.signal, existing);
    }
  }

  const productSignals: GeoReadinessSignalResult[] = ([
    'clarity',
    'specificity',
    'structure',
    'context',
    'accessibility',
  ] as GeoReadinessSignalType[]).map((signal) => {
    const signalResults = allSignalsByType.get(signal) ?? [];
    const failing = signalResults.filter((r) => r.status === 'needs_improvement').length;
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
  answerBlockUpdatedAtIso: string,
): string {
  return `geo-fix:${projectId}:${productId}:${questionId}:${issueType}:${answerBlockUpdatedAtIso}`;
}
