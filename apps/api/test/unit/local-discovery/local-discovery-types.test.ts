/**
 * LOCAL-1-TESTS: Unit tests for Local Discovery shared types and helper functions.
 *
 * Tests:
 * - isLocalApplicableFromReasons correctly identifies applicable/not-applicable reasons
 * - getLocalCoverageStatusFromScore correctly classifies scores
 * - calculateLocalSeverity returns correct severity based on signal/gap types
 * - computeLocalFixWorkKey generates deterministic keys
 * - getLocalGapTypeForMissingSignal maps signal types to gap types
 * - Type constants are correctly defined
 */
import {
  isLocalApplicableFromReasons,
  getLocalCoverageStatusFromScore,
  calculateLocalSeverity,
  computeLocalFixWorkKey,
  getLocalGapTypeForMissingSignal,
  LOCAL_SIGNAL_WEIGHTS,
  LOCAL_SIGNAL_LABELS,
  LOCAL_SIGNAL_DESCRIPTIONS,
  LOCAL_SIGNAL_TYPES,
  LOCAL_GAP_LABELS,
  LOCAL_FIX_DRAFT_LABELS,
  LocalSignalType,
  LocalGapType,
  LocalApplicabilityReason,
} from '@engineo/shared';

describe('Local Discovery Types and Helpers', () => {
  describe('isLocalApplicableFromReasons', () => {
    it('should return true for merchant_declared_physical_presence', () => {
      expect(
        isLocalApplicableFromReasons(['merchant_declared_physical_presence'])
      ).toBe(true);
    });

    it('should return true for local_intent_product_category', () => {
      expect(
        isLocalApplicableFromReasons(['local_intent_product_category'])
      ).toBe(true);
    });

    it('should return true for content_mentions_regions', () => {
      expect(isLocalApplicableFromReasons(['content_mentions_regions'])).toBe(
        true
      );
    });

    it('should return true for manual_override_enabled', () => {
      expect(isLocalApplicableFromReasons(['manual_override_enabled'])).toBe(
        true
      );
    });

    it('should return true when any applicable reason is present', () => {
      expect(
        isLocalApplicableFromReasons([
          'no_local_indicators',
          'merchant_declared_physical_presence',
        ])
      ).toBe(true);
    });

    it('should return false for no_local_indicators', () => {
      expect(isLocalApplicableFromReasons(['no_local_indicators'])).toBe(false);
    });

    it('should return false for global_only_config', () => {
      expect(isLocalApplicableFromReasons(['global_only_config'])).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isLocalApplicableFromReasons([])).toBe(false);
    });

    it('should return false when only non-applicable reasons present', () => {
      expect(
        isLocalApplicableFromReasons([
          'no_local_indicators',
          'global_only_config',
        ])
      ).toBe(false);
    });
  });

  describe('getLocalCoverageStatusFromScore', () => {
    it('should return "weak" for scores 0-39', () => {
      expect(getLocalCoverageStatusFromScore(0)).toBe('weak');
      expect(getLocalCoverageStatusFromScore(20)).toBe('weak');
      expect(getLocalCoverageStatusFromScore(39)).toBe('weak');
    });

    it('should return "needs_improvement" for scores 40-69', () => {
      expect(getLocalCoverageStatusFromScore(40)).toBe('needs_improvement');
      expect(getLocalCoverageStatusFromScore(55)).toBe('needs_improvement');
      expect(getLocalCoverageStatusFromScore(69)).toBe('needs_improvement');
    });

    it('should return "strong" for scores 70-100', () => {
      expect(getLocalCoverageStatusFromScore(70)).toBe('strong');
      expect(getLocalCoverageStatusFromScore(85)).toBe('strong');
      expect(getLocalCoverageStatusFromScore(100)).toBe('strong');
    });

    it('should handle edge cases at boundaries', () => {
      // Boundary at 40
      expect(getLocalCoverageStatusFromScore(39)).toBe('weak');
      expect(getLocalCoverageStatusFromScore(40)).toBe('needs_improvement');

      // Boundary at 70
      expect(getLocalCoverageStatusFromScore(69)).toBe('needs_improvement');
      expect(getLocalCoverageStatusFromScore(70)).toBe('strong');
    });
  });

  describe('calculateLocalSeverity', () => {
    it('should return "critical" for location_presence gaps (weight 10)', () => {
      expect(
        calculateLocalSeverity('location_presence', 'missing_location_content')
      ).toBe('critical');
    });

    it('should return "critical" for local_intent_coverage gaps (weight 9)', () => {
      expect(
        calculateLocalSeverity(
          'local_intent_coverage',
          'missing_local_intent_coverage'
        )
      ).toBe('critical');
    });

    it('should return "warning" for local_trust_signals gaps (weight 7)', () => {
      expect(
        calculateLocalSeverity(
          'local_trust_signals',
          'missing_local_trust_signal'
        )
      ).toBe('warning');
    });

    it('should return "warning" for local_schema_readiness gaps (weight 6)', () => {
      expect(
        calculateLocalSeverity('local_schema_readiness', 'unclear_service_area')
      ).toBe('warning');
    });

    it('should return "warning" for missing_location_content gap type regardless of signal', () => {
      // The gap type override for location content should result in warning
      expect(
        calculateLocalSeverity(
          'local_trust_signals',
          'missing_location_content'
        )
      ).toBe('warning');
    });

    it('should return "warning" for unclear_service_area gap type', () => {
      expect(
        calculateLocalSeverity('local_trust_signals', 'unclear_service_area')
      ).toBe('warning');
    });
  });

  describe('computeLocalFixWorkKey', () => {
    it('should generate deterministic keys', () => {
      const key1 = computeLocalFixWorkKey(
        'proj-1',
        null,
        'missing_location_content',
        'location_presence',
        'city:denver',
        'local_answer_block'
      );

      const key2 = computeLocalFixWorkKey(
        'proj-1',
        null,
        'missing_location_content',
        'location_presence',
        'city:denver',
        'local_answer_block'
      );

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = computeLocalFixWorkKey(
        'proj-1',
        null,
        'missing_location_content',
        'location_presence',
        'city:denver',
        'local_answer_block'
      );

      const key2 = computeLocalFixWorkKey(
        'proj-2', // Different project
        null,
        'missing_location_content',
        'location_presence',
        'city:denver',
        'local_answer_block'
      );

      const key3 = computeLocalFixWorkKey(
        'proj-1',
        null,
        'missing_local_intent_coverage', // Different gap type
        'local_intent_coverage',
        'city:denver',
        'local_answer_block'
      );

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('should include all parameters in the key format', () => {
      const key = computeLocalFixWorkKey(
        'proj-123',
        null,
        'missing_location_content',
        'location_presence',
        'city:boulder',
        'city_section'
      );

      expect(key).toBe(
        'local-fix:proj-123:project:missing_location_content:location_presence:city:boulder:city_section'
      );
    });

    it('should include productId when provided', () => {
      const key = computeLocalFixWorkKey(
        'proj-123',
        'prod-456',
        'missing_local_intent_coverage',
        'local_intent_coverage',
        'near_me',
        'local_answer_block'
      );

      expect(key).toBe(
        'local-fix:proj-123:prod-456:missing_local_intent_coverage:local_intent_coverage:near_me:local_answer_block'
      );
    });

    it('should use "project" placeholder when productId is null', () => {
      const key = computeLocalFixWorkKey(
        'proj-123',
        null,
        'unclear_service_area',
        'local_schema_readiness',
        'service_area:front_range',
        'service_area_description'
      );

      expect(key).toContain(':project:');
    });
  });

  describe('getLocalGapTypeForMissingSignal', () => {
    it('should map location_presence to missing_location_content', () => {
      expect(getLocalGapTypeForMissingSignal('location_presence')).toBe(
        'missing_location_content'
      );
    });

    it('should map local_intent_coverage to missing_local_intent_coverage', () => {
      expect(getLocalGapTypeForMissingSignal('local_intent_coverage')).toBe(
        'missing_local_intent_coverage'
      );
    });

    it('should map local_trust_signals to missing_local_trust_signal', () => {
      expect(getLocalGapTypeForMissingSignal('local_trust_signals')).toBe(
        'missing_local_trust_signal'
      );
    });

    it('should map local_schema_readiness to unclear_service_area', () => {
      expect(getLocalGapTypeForMissingSignal('local_schema_readiness')).toBe(
        'unclear_service_area'
      );
    });
  });

  describe('Type Constants', () => {
    describe('LOCAL_SIGNAL_WEIGHTS', () => {
      it('should have location_presence as highest weight (10)', () => {
        expect(LOCAL_SIGNAL_WEIGHTS.location_presence).toBe(10);
      });

      it('should have local_intent_coverage as second highest (9)', () => {
        expect(LOCAL_SIGNAL_WEIGHTS.local_intent_coverage).toBe(9);
      });

      it('should have local_trust_signals weight (7)', () => {
        expect(LOCAL_SIGNAL_WEIGHTS.local_trust_signals).toBe(7);
      });

      it('should have local_schema_readiness as lowest weight (6)', () => {
        expect(LOCAL_SIGNAL_WEIGHTS.local_schema_readiness).toBe(6);
      });

      it('should have weights for all signal types', () => {
        const signalTypes: LocalSignalType[] = [
          'location_presence',
          'local_intent_coverage',
          'local_trust_signals',
          'local_schema_readiness',
        ];

        for (const type of signalTypes) {
          expect(LOCAL_SIGNAL_WEIGHTS[type]).toBeDefined();
          expect(typeof LOCAL_SIGNAL_WEIGHTS[type]).toBe('number');
        }
      });
    });

    describe('LOCAL_SIGNAL_LABELS', () => {
      it('should have human-readable labels for all signal types', () => {
        expect(LOCAL_SIGNAL_LABELS.location_presence).toBe('Location Presence');
        expect(LOCAL_SIGNAL_LABELS.local_intent_coverage).toBe(
          'Local Intent Coverage'
        );
        expect(LOCAL_SIGNAL_LABELS.local_trust_signals).toBe(
          'Local Trust Signals'
        );
        expect(LOCAL_SIGNAL_LABELS.local_schema_readiness).toBe(
          'Local Schema Readiness'
        );
      });
    });

    describe('LOCAL_SIGNAL_DESCRIPTIONS', () => {
      it('should have descriptions for all signal types', () => {
        const signalTypes: LocalSignalType[] = [
          'location_presence',
          'local_intent_coverage',
          'local_trust_signals',
          'local_schema_readiness',
        ];

        for (const type of signalTypes) {
          expect(LOCAL_SIGNAL_DESCRIPTIONS[type]).toBeDefined();
          expect(typeof LOCAL_SIGNAL_DESCRIPTIONS[type]).toBe('string');
          expect(LOCAL_SIGNAL_DESCRIPTIONS[type].length).toBeGreaterThan(10);
        }
      });
    });

    describe('LOCAL_GAP_LABELS', () => {
      it('should have human-readable labels for all gap types', () => {
        expect(LOCAL_GAP_LABELS.missing_local_intent_coverage).toBe(
          'Missing Local Intent Coverage'
        );
        expect(LOCAL_GAP_LABELS.missing_location_content).toBe(
          'Missing Location Content'
        );
        expect(LOCAL_GAP_LABELS.unclear_service_area).toBe(
          'Unclear Service Area'
        );
        expect(LOCAL_GAP_LABELS.missing_local_trust_signal).toBe(
          'Missing Local Trust Signal'
        );
      });
    });

    describe('LOCAL_FIX_DRAFT_LABELS', () => {
      it('should have human-readable labels for all draft types', () => {
        expect(LOCAL_FIX_DRAFT_LABELS.local_answer_block).toBe(
          'Local Answer Block'
        );
        expect(LOCAL_FIX_DRAFT_LABELS.city_section).toBe('City/Region Section');
        expect(LOCAL_FIX_DRAFT_LABELS.service_area_description).toBe(
          'Service Area Description'
        );
      });
    });

    describe('LOCAL_SIGNAL_TYPES', () => {
      it('should be ordered by priority (highest impact first)', () => {
        expect(LOCAL_SIGNAL_TYPES[0]).toBe('location_presence');
        expect(LOCAL_SIGNAL_TYPES[1]).toBe('local_intent_coverage');
        expect(LOCAL_SIGNAL_TYPES[2]).toBe('local_trust_signals');
        expect(LOCAL_SIGNAL_TYPES[3]).toBe('local_schema_readiness');
      });

      it('should contain exactly 4 signal types', () => {
        expect(LOCAL_SIGNAL_TYPES).toHaveLength(4);
      });
    });
  });
});
