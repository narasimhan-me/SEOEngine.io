/**
 * OFFSITE-1-TESTS: Unit tests for Off-site Signals shared types and helper functions.
 *
 * Tests:
 * - getOffsitePresenceStatusFromScore correctly classifies scores
 * - calculateOffsiteSeverity returns correct severity based on signal/gap types
 * - computeOffsiteFixWorkKey generates deterministic keys
 * - getGapTypeForMissingSignal maps signal types to gap types
 * - Type constants are correctly defined
 */
import {
  getOffsitePresenceStatusFromScore,
  calculateOffsiteSeverity,
  computeOffsiteFixWorkKey,
  getGapTypeForMissingSignal,
  OFFSITE_SIGNAL_WEIGHTS,
  OFFSITE_SIGNAL_LABELS,
  OFFSITE_GAP_LABELS,
  OFFSITE_FIX_DRAFT_LABELS,
  OFFSITE_SIGNAL_TYPES,
  OffsiteSignalType,
  OffsiteGapType,
} from '@engineo/shared';

describe('Off-site Signals Types and Helpers', () => {
  describe('getOffsitePresenceStatusFromScore', () => {
    it('should return "Low" for scores 0-39', () => {
      expect(getOffsitePresenceStatusFromScore(0)).toBe('Low');
      expect(getOffsitePresenceStatusFromScore(20)).toBe('Low');
      expect(getOffsitePresenceStatusFromScore(39)).toBe('Low');
    });

    it('should return "Medium" for scores 40-69', () => {
      expect(getOffsitePresenceStatusFromScore(40)).toBe('Medium');
      expect(getOffsitePresenceStatusFromScore(55)).toBe('Medium');
      expect(getOffsitePresenceStatusFromScore(69)).toBe('Medium');
    });

    it('should return "Strong" for scores 70-100', () => {
      expect(getOffsitePresenceStatusFromScore(70)).toBe('Strong');
      expect(getOffsitePresenceStatusFromScore(85)).toBe('Strong');
      expect(getOffsitePresenceStatusFromScore(100)).toBe('Strong');
    });

    it('should handle edge cases at boundaries', () => {
      // Boundary at 40
      expect(getOffsitePresenceStatusFromScore(39)).toBe('Low');
      expect(getOffsitePresenceStatusFromScore(40)).toBe('Medium');

      // Boundary at 70
      expect(getOffsitePresenceStatusFromScore(69)).toBe('Medium');
      expect(getOffsitePresenceStatusFromScore(70)).toBe('Strong');
    });
  });

  describe('calculateOffsiteSeverity', () => {
    it('should return "critical" for trust_proof gaps (weight 10)', () => {
      expect(
        calculateOffsiteSeverity('trust_proof', 'missing_trust_proof')
      ).toBe('critical');
      expect(
        calculateOffsiteSeverity('trust_proof', 'competitor_has_offsite_signal')
      ).toBe('critical');
    });

    it('should return "critical" for authoritative_listing gaps (weight 9)', () => {
      expect(
        calculateOffsiteSeverity(
          'authoritative_listing',
          'missing_authoritative_listing'
        )
      ).toBe('critical');
    });

    it('should return "warning" for brand_mention gaps (weight 7)', () => {
      expect(
        calculateOffsiteSeverity('brand_mention', 'missing_brand_mentions')
      ).toBe('warning');
    });

    it('should return "warning" for competitor gaps on brand_mention (weight 7)', () => {
      expect(
        calculateOffsiteSeverity(
          'brand_mention',
          'competitor_has_offsite_signal'
        )
      ).toBe('warning');
    });

    it('should return "info" for reference_content gaps (weight 6)', () => {
      expect(
        calculateOffsiteSeverity('reference_content', 'missing_brand_mentions')
      ).toBe('info');
    });

    it('should return "info" for competitor gaps on reference_content (weight 6)', () => {
      expect(
        calculateOffsiteSeverity(
          'reference_content',
          'competitor_has_offsite_signal'
        )
      ).toBe('info');
    });
  });

  describe('computeOffsiteFixWorkKey', () => {
    it('should generate deterministic keys', () => {
      const key1 = computeOffsiteFixWorkKey(
        'proj-1',
        'missing_trust_proof',
        'trust_proof',
        'reviews/trustpilot',
        'outreach_email'
      );

      const key2 = computeOffsiteFixWorkKey(
        'proj-1',
        'missing_trust_proof',
        'trust_proof',
        'reviews/trustpilot',
        'outreach_email'
      );

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = computeOffsiteFixWorkKey(
        'proj-1',
        'missing_trust_proof',
        'trust_proof',
        'reviews/trustpilot',
        'outreach_email'
      );

      const key2 = computeOffsiteFixWorkKey(
        'proj-2', // Different project
        'missing_trust_proof',
        'trust_proof',
        'reviews/trustpilot',
        'outreach_email'
      );

      const key3 = computeOffsiteFixWorkKey(
        'proj-1',
        'missing_brand_mentions', // Different gap type
        'brand_mention',
        'reviews/trustpilot',
        'outreach_email'
      );

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('should include all parameters in the key format', () => {
      const key = computeOffsiteFixWorkKey(
        'proj-123',
        'missing_trust_proof',
        'trust_proof',
        'reviews/g2',
        'pr_pitch'
      );

      expect(key).toBe(
        'offsite-fix:proj-123:missing_trust_proof:trust_proof:reviews/g2:pr_pitch'
      );
    });
  });

  describe('getGapTypeForMissingSignal', () => {
    it('should map brand_mention to missing_brand_mentions', () => {
      expect(getGapTypeForMissingSignal('brand_mention')).toBe(
        'missing_brand_mentions'
      );
    });

    it('should map authoritative_listing to missing_authoritative_listing', () => {
      expect(getGapTypeForMissingSignal('authoritative_listing')).toBe(
        'missing_authoritative_listing'
      );
    });

    it('should map trust_proof to missing_trust_proof', () => {
      expect(getGapTypeForMissingSignal('trust_proof')).toBe(
        'missing_trust_proof'
      );
    });

    it('should map reference_content to missing_brand_mentions (grouped)', () => {
      // Reference content gaps are grouped with brand mentions per spec
      expect(getGapTypeForMissingSignal('reference_content')).toBe(
        'missing_brand_mentions'
      );
    });
  });

  describe('Type Constants', () => {
    describe('OFFSITE_SIGNAL_WEIGHTS', () => {
      it('should have trust_proof as highest weight (10)', () => {
        expect(OFFSITE_SIGNAL_WEIGHTS.trust_proof).toBe(10);
      });

      it('should have authoritative_listing as second highest (9)', () => {
        expect(OFFSITE_SIGNAL_WEIGHTS.authoritative_listing).toBe(9);
      });

      it('should have brand_mention weight (7)', () => {
        expect(OFFSITE_SIGNAL_WEIGHTS.brand_mention).toBe(7);
      });

      it('should have reference_content as lowest weight (6)', () => {
        expect(OFFSITE_SIGNAL_WEIGHTS.reference_content).toBe(6);
      });

      it('should have weights for all signal types', () => {
        const signalTypes: OffsiteSignalType[] = [
          'trust_proof',
          'authoritative_listing',
          'brand_mention',
          'reference_content',
        ];

        for (const type of signalTypes) {
          expect(OFFSITE_SIGNAL_WEIGHTS[type]).toBeDefined();
          expect(typeof OFFSITE_SIGNAL_WEIGHTS[type]).toBe('number');
        }
      });
    });

    describe('OFFSITE_SIGNAL_LABELS', () => {
      it('should have human-readable labels for all signal types', () => {
        expect(OFFSITE_SIGNAL_LABELS.trust_proof).toBe('Trust Proof');
        expect(OFFSITE_SIGNAL_LABELS.authoritative_listing).toBe(
          'Authoritative Listing'
        );
        expect(OFFSITE_SIGNAL_LABELS.brand_mention).toBe('Brand Mention');
        expect(OFFSITE_SIGNAL_LABELS.reference_content).toBe(
          'Reference Content'
        );
      });
    });

    describe('OFFSITE_GAP_LABELS', () => {
      it('should have human-readable labels for all gap types', () => {
        expect(OFFSITE_GAP_LABELS.missing_brand_mentions).toBe(
          'Missing Brand Mentions'
        );
        expect(OFFSITE_GAP_LABELS.missing_trust_proof).toBe(
          'Missing Trust Proof'
        );
        expect(OFFSITE_GAP_LABELS.missing_authoritative_listing).toBe(
          'Missing Authoritative Listing'
        );
        expect(OFFSITE_GAP_LABELS.competitor_has_offsite_signal).toBe(
          'Competitors Have This Signal'
        );
      });
    });

    describe('OFFSITE_FIX_DRAFT_LABELS', () => {
      it('should have human-readable labels for all draft types', () => {
        expect(OFFSITE_FIX_DRAFT_LABELS.outreach_email).toBe('Outreach Email');
        expect(OFFSITE_FIX_DRAFT_LABELS.pr_pitch).toBe('PR Pitch');
        expect(OFFSITE_FIX_DRAFT_LABELS.brand_profile_snippet).toBe(
          'Brand Profile Snippet'
        );
        expect(OFFSITE_FIX_DRAFT_LABELS.review_request_copy).toBe(
          'Review Request Copy'
        );
      });
    });

    describe('OFFSITE_SIGNAL_TYPES', () => {
      it('should be ordered by priority (highest impact first)', () => {
        expect(OFFSITE_SIGNAL_TYPES[0]).toBe('trust_proof');
        expect(OFFSITE_SIGNAL_TYPES[1]).toBe('authoritative_listing');
        expect(OFFSITE_SIGNAL_TYPES[2]).toBe('brand_mention');
        expect(OFFSITE_SIGNAL_TYPES[3]).toBe('reference_content');
      });

      it('should contain exactly 4 signal types', () => {
        expect(OFFSITE_SIGNAL_TYPES).toHaveLength(4);
      });
    });
  });
});
