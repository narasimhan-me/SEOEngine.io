import { describe, expect, it } from 'vitest';
import {
  deriveCitationConfidence,
  evaluateGeoAnswerUnit,
  evaluateGeoProduct,
  computeGeoFixWorkKey,
  deriveGeoAnswerIntentMapping,
  computeGeoReuseStats,
  computeGeoIntentCoverageCounts,
} from './geo';

describe('GEO-FOUNDATION-1: Answer readiness & citation confidence', () => {
  it('derives High when all signals pass', () => {
    const conf = deriveCitationConfidence([
      { signal: 'clarity', status: 'pass', why: '' },
      { signal: 'specificity', status: 'pass', why: '' },
      { signal: 'structure', status: 'pass', why: '' },
      { signal: 'context', status: 'pass', why: '' },
      { signal: 'accessibility', status: 'pass', why: '' },
    ]);
    expect(conf.level).toBe('high');
  });

  it('derives Medium for minor non-core gaps (1–2 signals)', () => {
    const conf = deriveCitationConfidence([
      { signal: 'clarity', status: 'pass', why: '' },
      { signal: 'specificity', status: 'needs_improvement', why: '' },
      { signal: 'structure', status: 'pass', why: '' },
      { signal: 'context', status: 'needs_improvement', why: '' },
      { signal: 'accessibility', status: 'pass', why: '' },
    ]);
    expect(conf.level).toBe('medium');
  });

  it('derives Low when a core gap exists (clarity or structure)', () => {
    const conf = deriveCitationConfidence([
      { signal: 'clarity', status: 'needs_improvement', why: '' },
      { signal: 'specificity', status: 'pass', why: '' },
      { signal: 'structure', status: 'pass', why: '' },
      { signal: 'context', status: 'pass', why: '' },
      { signal: 'accessibility', status: 'pass', why: '' },
    ]);
    expect(conf.level).toBe('low');
  });

  it('flags promotional language as a GEO issue', () => {
    const evalUnit = evaluateGeoAnswerUnit({
      unitId: 'u1',
      questionId: 'what_is_it',
      answer: 'The ultimate best product ever! Premium results guaranteed.',
      factsUsed: [],
    });
    const issueTypes = evalUnit.issues.map((i) => i.issueType);
    expect(issueTypes).toContain('answer_overly_promotional');
  });

  it('returns Low when product has no Answer Units', () => {
    const evalProd = evaluateGeoProduct([]);
    expect(evalProd.citationConfidence.level).toBe('low');
    expect(evalProd.issues.length).toBeGreaterThan(0);
  });

  it('computeGeoFixWorkKey is deterministic for same inputs', () => {
    const k1 = computeGeoFixWorkKey(
      'p1',
      'prod1',
      'what_is_it',
      'poor_answer_structure',
      '2025-01-01T00:00:00.000Z',
    );
    const k2 = computeGeoFixWorkKey(
      'p1',
      'prod1',
      'what_is_it',
      'poor_answer_structure',
      '2025-01-01T00:00:00.000Z',
    );
    expect(k1).toBe(k2);
  });
});

describe('GEO-INSIGHTS-2: Answer–intent mapping & reuse metrics', () => {
  it('derives intent from factsUsed intent:<type> tag', () => {
    const mapping = deriveGeoAnswerIntentMapping({
      questionId: 'intent_TRANSACTIONAL_123',
      factsUsed: ['intent:transactional', 'query:buy acme widget'],
      signals: [{ signal: 'clarity', status: 'pass', why: '' }],
    });
    expect(mapping.mappedIntents).toEqual(['transactional']);
    expect(mapping.source).toBe('explicit_intent');
  });

  it('maps canonical multi-intent answer only when clarity+structure pass', () => {
    const poor = evaluateGeoAnswerUnit({
      unitId: 'u1',
      questionId: 'why_choose_this',
      answer:
        'This is a long, hard-to-scan paragraph that keeps going without structure. ' +
        'It has many sentences so it should fail structure in the heuristic. ' +
        'It continues with more filler content to push the word count above the threshold. ' +
        'Another sentence adds length and ambiguity without giving a clear structure. ' +
        'Yet another sentence adds more words and makes the block harder to scan. ' +
        'Finally, this ends after enough words to exceed the limit.',
      factsUsed: [],
    });
    const poorMapping = deriveGeoAnswerIntentMapping({
      questionId: poor.questionId,
      factsUsed: [],
      signals: poor.signals,
    });
    expect(poorMapping.potentialIntents.length).toBeGreaterThanOrEqual(2);
    expect(poorMapping.mappedIntents.length).toBe(1);

    const good = evaluateGeoAnswerUnit({
      unitId: 'u2',
      questionId: 'why_choose_this',
      answer:
        'Choose this when you need a clear, comparable option for a specific use case.\n\n' +
        '- Works well for common scenarios\n' +
        '- Uses plain language and concrete details (e.g., 2-step setup)\n',
      factsUsed: ['e.g.'],
    });
    const goodMapping = deriveGeoAnswerIntentMapping({
      questionId: good.questionId,
      factsUsed: [],
      signals: good.signals,
    });
    expect(goodMapping.mappedIntents.length).toBeGreaterThanOrEqual(2);
  });

  it('computes reuse stats from mapped intent counts', () => {
    const stats = computeGeoReuseStats([
      { mappedIntents: ['informational'] },
      { mappedIntents: ['comparative', 'trust_validation'] },
      { mappedIntents: ['transactional', 'informational'] },
    ]);
    expect(stats.totalAnswers).toBe(3);
    expect(stats.multiIntentAnswers).toBe(2);
    expect(stats.reuseRatePercent).toBe(67);
  });

  it('computes intent coverage counts and missing intents', () => {
    const cov = computeGeoIntentCoverageCounts([
      { mappedIntents: ['informational'] },
      { mappedIntents: ['comparative', 'trust_validation'] },
    ]);
    expect(cov.byIntent.informational).toBe(1);
    expect(cov.byIntent.comparative).toBe(1);
    expect(cov.byIntent.trust_validation).toBe(1);
    expect(cov.missingIntents).toContain('transactional');
  });
});
