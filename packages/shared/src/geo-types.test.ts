import { describe, expect, it } from 'vitest';
import {
  deriveCitationConfidence,
  evaluateGeoAnswerUnit,
  evaluateGeoProduct,
  computeGeoFixWorkKey,
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
