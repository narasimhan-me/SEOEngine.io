/**
 * TEST-PB-RULES-1: Unit tests for rules engine semantics
 *
 * These tests lock the pure rules semantics implemented in AutomationPlaybooksService:
 * - normalizeRules
 * - computeRulesHash
 * - applyRulesToText
 *
 * Rule evaluation order: Find/Replace → Prefix → Suffix → Max Length → Forbidden phrase detection
 */
import { AutomationPlaybooksService } from '../../../apps/api/src/projects/automation-playbooks.service';

// Minimal stubs for dependencies that are never used in these unit tests
const prismaStub = {} as any;
const entitlementsStub = {} as any;
const tokenUsageStub = {} as any;
const aiServiceStub = {} as any;
const projectsServiceStub = {} as any;
const productIssueFixServiceStub = {} as any;

describe('Playbook Rules Engine', () => {
  let svc: AutomationPlaybooksService;
  let applyRulesToText: (
    field: 'seoTitle' | 'seoDescription',
    value: string,
    rules: any,
    ruleWarnings: string[],
  ) => string;
  let computeRulesHash: (rules?: any) => string;
  let normalizeRules: (rules?: any) => any;

  beforeAll(() => {
    svc = new AutomationPlaybooksService(
      prismaStub,
      entitlementsStub,
      tokenUsageStub,
      aiServiceStub,
      projectsServiceStub,
      productIssueFixServiceStub,
    );
    applyRulesToText = (svc as any).applyRulesToText.bind(svc);
    computeRulesHash = (svc as any).computeRulesHash.bind(svc);
    normalizeRules = (svc as any).normalizeRules.bind(svc);
  });

  describe('normalizeRules', () => {
    it('returns default disabled rules when input is undefined', () => {
      const result = normalizeRules(undefined);
      expect(result.enabled).toBe(false);
      expect(result.mode).toBe('enforce');
      expect(result.findReplace).toBeUndefined();
      expect(result.prefix).toBeUndefined();
      expect(result.suffix).toBeUndefined();
      expect(result.maxLength).toBeUndefined();
      expect(result.forbiddenPhrases).toBeUndefined();
    });

    it('returns default disabled rules when input is null', () => {
      const result = normalizeRules(null);
      expect(result.enabled).toBe(false);
      expect(result.mode).toBe('enforce');
    });

    it('normalizes enabled field to boolean', () => {
      expect(normalizeRules({ enabled: 1 }).enabled).toBe(true);
      expect(normalizeRules({ enabled: 'yes' }).enabled).toBe(true);
      expect(normalizeRules({ enabled: false }).enabled).toBe(false);
      expect(normalizeRules({ enabled: 0 }).enabled).toBe(false);
      expect(normalizeRules({ enabled: '' }).enabled).toBe(false);
    });

    it('strips findReplace when find is empty', () => {
      const result = normalizeRules({
        enabled: true,
        findReplace: { find: '', replace: 'test' },
      });
      expect(result.findReplace).toBeUndefined();
    });

    it('preserves findReplace when find is non-empty', () => {
      const result = normalizeRules({
        enabled: true,
        findReplace: { find: 'AI', replace: 'EngineO', caseSensitive: true },
      });
      expect(result.findReplace).toEqual({
        find: 'AI',
        replace: 'EngineO',
        caseSensitive: true,
      });
    });

    it('handles maxLength <= 0 as undefined', () => {
      expect(normalizeRules({ enabled: true, maxLength: 0 }).maxLength).toBeUndefined();
      expect(normalizeRules({ enabled: true, maxLength: -1 }).maxLength).toBeUndefined();
      expect(normalizeRules({ enabled: true, maxLength: 10 }).maxLength).toBe(10);
    });

    it('preserves forbidden phrases array as-is (no filtering)', () => {
      const result = normalizeRules({
        enabled: true,
        forbiddenPhrases: ['click here', '', '  ', 'best ever'],
      });
      // Note: The implementation does not filter empty strings - it preserves all values
      expect(result.forbiddenPhrases).toEqual(['click here', '', '  ', 'best ever']);
    });
  });

  describe('applyRulesToText - Rule Type Tests (Isolation)', () => {
    describe('Find / Replace', () => {
      it('replaces all occurrences case-insensitively by default', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'AI beats AI',
          { enabled: true, findReplace: { find: 'AI', replace: 'EngineO', caseSensitive: false } },
          warnings,
        );
        expect(result).toBe('EngineO beats EngineO');
        expect(warnings).toEqual([]);
      });

      it('replaces case-sensitively when caseSensitive is true', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'AI beats ai',
          { enabled: true, findReplace: { find: 'AI', replace: 'EngineO', caseSensitive: true } },
          warnings,
        );
        expect(result).toBe('EngineO beats ai');
        expect(warnings).toEqual([]);
      });

      it('handles special regex characters in find string', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'Price: $50 (sale)',
          { enabled: true, findReplace: { find: '$50 (sale)', replace: '$40 (deal)', caseSensitive: false } },
          warnings,
        );
        expect(result).toBe('Price: $40 (deal)');
      });
    });

    describe('Prefix', () => {
      it('adds prefix to the beginning', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'Classic Snowboard',
          { enabled: true, prefix: 'EngineO | ' },
          warnings,
        );
        expect(result).toBe('EngineO | Classic Snowboard');
        expect(warnings).toEqual([]);
      });

      it('does not add prefix when prefix is empty', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'Classic Snowboard',
          { enabled: true, prefix: '' },
          warnings,
        );
        expect(result).toBe('Classic Snowboard');
      });
    });

    describe('Suffix', () => {
      it('adds suffix to the end', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'Classic Snowboard',
          { enabled: true, suffix: ' | Official Store' },
          warnings,
        );
        expect(result).toBe('Classic Snowboard | Official Store');
        expect(warnings).toEqual([]);
      });
    });

    describe('Max Length', () => {
      it('trims text to maxLength and adds warning', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          '123456789012345', // 15 chars
          { enabled: true, maxLength: 10 },
          warnings,
        );
        expect(result).toBe('1234567890');
        expect(result.length).toBe(10);
        expect(warnings).toContain('trimmed_to_max_length');
      });

      it('does not trim when text is within maxLength', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          '12345',
          { enabled: true, maxLength: 10 },
          warnings,
        );
        expect(result).toBe('12345');
        expect(warnings).not.toContain('trimmed_to_max_length');
      });

      it('does not trim when text equals maxLength exactly', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          '1234567890',
          { enabled: true, maxLength: 10 },
          warnings,
        );
        expect(result).toBe('1234567890');
        expect(warnings).not.toContain('trimmed_to_max_length');
      });
    });

    describe('Forbidden Phrases', () => {
      it('detects forbidden phrases and adds warning without modifying text', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'Click here for the best ever board.',
          { enabled: true, forbiddenPhrases: ['click here', 'best ever'] },
          warnings,
        );
        expect(result).toBe('Click here for the best ever board.');
        expect(warnings).toContain('forbidden_phrase_detected');
      });

      it('detects forbidden phrases case-insensitively', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'CLICK HERE now',
          { enabled: true, forbiddenPhrases: ['click here'] },
          warnings,
        );
        expect(result).toBe('CLICK HERE now');
        expect(warnings).toContain('forbidden_phrase_detected');
      });

      it('does not add warning when no forbidden phrases are found', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'Great product for you',
          { enabled: true, forbiddenPhrases: ['click here', 'best ever'] },
          warnings,
        );
        expect(result).toBe('Great product for you');
        expect(warnings).not.toContain('forbidden_phrase_detected');
      });
    });

    describe('Disabled rules', () => {
      it('returns text unchanged when rules are disabled', () => {
        const warnings: string[] = [];
        const result = applyRulesToText(
          'seoTitle',
          'Original text',
          { enabled: false, prefix: 'Should not apply: ' },
          warnings,
        );
        expect(result).toBe('Original text');
        expect(warnings).toEqual([]);
      });

      it('returns text unchanged when rules are undefined', () => {
        const warnings: string[] = [];
        const result = applyRulesToText('seoTitle', 'Original text', undefined, warnings);
        expect(result).toBe('Original text');
      });
    });
  });

  describe('applyRulesToText - Rule Combination + Order', () => {
    it('applies rules in order: Find/Replace → Prefix → Suffix → Max Length → Forbidden phrase detection', () => {
      const warnings: string[] = [];
      // Input: 'AI'
      // After Find/Replace (AI → Snowboard): 'Snowboard'
      // After Prefix ('EngineO | '): 'EngineO | Snowboard'
      // After Suffix (' | Shop'): 'EngineO | Snowboard | Shop' (26 chars)
      // After maxLength(20): 'EngineO | Snowboard ' (20 chars)
      const result = applyRulesToText(
        'seoTitle',
        'AI',
        {
          enabled: true,
          findReplace: { find: 'AI', replace: 'Snowboard', caseSensitive: false },
          prefix: 'EngineO | ',
          suffix: ' | Shop',
          maxLength: 20,
        },
        warnings,
      );
      expect(result).toBe('EngineO | Snowboard ');
      expect(result.length).toBe(20);
      expect(warnings).toContain('trimmed_to_max_length');
    });

    it('trims after prefix and suffix are applied', () => {
      const warnings: string[] = [];
      // Input: 'Test'
      // After Prefix ('Pre-'): 'Pre-Test'
      // After Suffix ('-Suf'): 'Pre-Test-Suf' (12 chars)
      // After maxLength(8): 'Pre-Test' (8 chars)
      const result = applyRulesToText(
        'seoTitle',
        'Test',
        {
          enabled: true,
          prefix: 'Pre-',
          suffix: '-Suf',
          maxLength: 8,
        },
        warnings,
      );
      expect(result).toBe('Pre-Test');
      expect(warnings).toContain('trimmed_to_max_length');
    });

    it('detects forbidden phrase after all transforms', () => {
      const warnings: string[] = [];
      // Input: 'Buy now'
      // After Prefix ('Click here: '): 'Click here: Buy now'
      // Forbidden phrase 'click here' should be detected in the final text
      const result = applyRulesToText(
        'seoTitle',
        'Buy now',
        {
          enabled: true,
          prefix: 'Click here: ',
          forbiddenPhrases: ['click here'],
        },
        warnings,
      );
      expect(result).toBe('Click here: Buy now');
      expect(warnings).toContain('forbidden_phrase_detected');
    });

    it('combines all rules correctly', () => {
      const warnings: string[] = [];
      // Input: 'AI Product AI'
      // After Find/Replace (AI → SEO): 'SEO Product SEO'
      // After Prefix ('Best '): 'Best SEO Product SEO'
      // After Suffix (' Ever'): 'Best SEO Product SEO Ever' (25 chars)
      // After maxLength(30): no trimming (25 < 30)
      // Forbidden phrase 'best' detected
      const result = applyRulesToText(
        'seoTitle',
        'AI Product AI',
        {
          enabled: true,
          findReplace: { find: 'AI', replace: 'SEO', caseSensitive: false },
          prefix: 'Best ',
          suffix: ' Ever',
          maxLength: 30,
          forbiddenPhrases: ['best'],
        },
        warnings,
      );
      expect(result).toBe('Best SEO Product SEO Ever');
      expect(warnings).toContain('forbidden_phrase_detected');
      expect(warnings).not.toContain('trimmed_to_max_length');
    });
  });

  describe('computeRulesHash - Determinism', () => {
    it('produces identical hash for identical rules object', () => {
      const rules = {
        enabled: true,
        prefix: 'EngineO | ',
        maxLength: 60,
        forbiddenPhrases: ['click here'],
      };
      const hash1 = computeRulesHash(rules);
      const hash2 = computeRulesHash(rules);
      expect(hash1).toBe(hash2);
    });

    it('produces identical hash for deep-cloned rules', () => {
      const rules = {
        enabled: true,
        prefix: 'EngineO | ',
        maxLength: 60,
        forbiddenPhrases: ['click here', 'best ever'],
      };
      const cloned = JSON.parse(JSON.stringify(rules));
      const hash1 = computeRulesHash(rules);
      const hash2 = computeRulesHash(cloned);
      expect(hash1).toBe(hash2);
    });

    it('produces different hash when semantic change occurs (prefix)', () => {
      const rulesA = { enabled: true, prefix: 'EngineO | ' };
      const rulesB = { enabled: true, prefix: 'EngineO SEO | ' };
      const hashA = computeRulesHash(rulesA);
      const hashB = computeRulesHash(rulesB);
      expect(hashA).not.toBe(hashB);
    });

    it('produces different hash when maxLength changes', () => {
      const rulesA = { enabled: true, maxLength: 60 };
      const rulesB = { enabled: true, maxLength: 50 };
      const hashA = computeRulesHash(rulesA);
      const hashB = computeRulesHash(rulesB);
      expect(hashA).not.toBe(hashB);
    });

    it('produces different hash when forbidden phrases change', () => {
      const rulesA = { enabled: true, forbiddenPhrases: ['click here'] };
      const rulesB = { enabled: true, forbiddenPhrases: ['click here', 'best ever'] };
      const hashA = computeRulesHash(rulesA);
      const hashB = computeRulesHash(rulesB);
      expect(hashA).not.toBe(hashB);
    });

    it('produces different hash when forbidden phrase order changes', () => {
      const rulesC = { enabled: true, forbiddenPhrases: ['click here', 'best ever'] };
      const rulesD = { enabled: true, forbiddenPhrases: ['best ever', 'click here'] };
      const hashC = computeRulesHash(rulesC);
      const hashD = computeRulesHash(rulesD);
      // Arrays are order-sensitive, so different order = different hash
      expect(hashC).not.toBe(hashD);
    });

    it('produces identical hash regardless of property declaration order (key order robustness)', () => {
      const rules1 = { enabled: true, prefix: 'A', suffix: 'B' };
      const rules2 = { suffix: 'B', enabled: true, prefix: 'A' };
      const hash1 = computeRulesHash(rules1);
      const hash2 = computeRulesHash(rules2);
      expect(hash1).toBe(hash2);
    });

    it('produces consistent hash for undefined vs null vs empty rules', () => {
      const hashUndefined = computeRulesHash(undefined);
      const hashNull = computeRulesHash(null);
      // Both should normalize to the same default rules
      expect(hashUndefined).toBe(hashNull);
    });

    it('hash is 16 characters hex string', () => {
      const hash = computeRulesHash({ enabled: true, prefix: 'Test' });
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input text', () => {
      const warnings: string[] = [];
      const result = applyRulesToText(
        'seoTitle',
        '',
        { enabled: true, prefix: 'Pre-', suffix: '-Suf' },
        warnings,
      );
      expect(result).toBe('Pre--Suf');
    });

    it('handles whitespace-only input', () => {
      const warnings: string[] = [];
      const result = applyRulesToText(
        'seoTitle',
        '   ',
        { enabled: true, prefix: 'Pre-' },
        warnings,
      );
      expect(result).toBe('Pre-   ');
    });

    it('handles findReplace with empty replace string', () => {
      const warnings: string[] = [];
      const result = applyRulesToText(
        'seoTitle',
        'Remove AI from text',
        { enabled: true, findReplace: { find: 'AI ', replace: '', caseSensitive: false } },
        warnings,
      );
      expect(result).toBe('Remove from text');
    });

    it('handles multiple forbidden phrases - only one warning', () => {
      const warnings: string[] = [];
      const result = applyRulesToText(
        'seoTitle',
        'Click here for the best ever deal',
        { enabled: true, forbiddenPhrases: ['click here', 'best ever'] },
        warnings,
      );
      // Both phrases are present, but we only get one warning
      expect(warnings.filter((w) => w === 'forbidden_phrase_detected').length).toBe(1);
    });
  });
});
