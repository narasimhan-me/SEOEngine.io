export { GovernanceSettingsSection } from './GovernanceSettingsSection';

/**
 * [EA-39] Governance Components
 *
 * Read-only components for surfacing platform maturity and governance signals.
 */

export {
  MaturitySignalsPanel,
  DEFAULT_MATURITY_SIGNALS,
  type MaturitySignal,
  type MaturitySignalsPanelProps,
} from './MaturitySignalsPanel';

export {
  StabilityIndicator,
  useStabilityStatus,
  type StabilityStatus,
  type StabilityIndicatorProps,
} from './StabilityIndicator';

export {
  GovernanceReadinessCard,
  type GovernanceReadinessCardProps,
} from './GovernanceReadinessCard';
