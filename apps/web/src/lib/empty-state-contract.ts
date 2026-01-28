/**
 * EA-25: EPIC 19 — EMPTY-STATE-CONTRACT-1
 *
 * Defines a consistent contract for empty and zero-data states across the application.
 * This contract ensures all empty states communicate three things:
 * 1. Why the state is empty
 * 2. That this is expected behavior
 * 3. What action the user can take next
 */

export type EmptyStateCategory =
  | 'initial'       // First-time use, never had data
  | 'filtered'      // User applied filters that returned no results
  | 'not_analyzed'  // Content exists but hasn't been analyzed yet
  | 'no_results'    // Search or query returned nothing
  | 'cleared'       // Data was removed or cleared
  | 'success';      // Successfully completed, nothing left to do

export type EmptyStateIcon =
  | 'search'
  | 'document'
  | 'folder'
  | 'check-circle'
  | 'inbox'
  | 'database'
  | 'package'
  | 'users'
  | 'settings'
  | 'chart'
  | 'clock'
  | 'filter'
  | 'sparkles';

export interface EmptyStateConfig {
  category: EmptyStateCategory;
  icon: EmptyStateIcon;
  title: string;
  message: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  compact?: boolean;
}

/**
 * Standard icon mappings for common empty state scenarios
 */
export const EMPTY_STATE_ICONS: Record<EmptyStateIcon, string> = {
  'search': '🔍',
  'document': '📄',
  'folder': '📁',
  'check-circle': '✅',
  'inbox': '📥',
  'database': '💾',
  'package': '📦',
  'users': '👥',
  'settings': '⚙️',
  'chart': '📊',
  'clock': '🕐',
  'filter': '🔽',
  'sparkles': '✨'
};

/**
 * Preset configurations for common empty state scenarios
 */
export const EmptyStatePresets = {
  filteredNoResults: (entityName: string = 'items'): Omit<EmptyStateConfig, 'onAction' | 'actionHref'> => ({
    category: 'filtered',
    icon: 'filter',
    title: 'No matching results',
    message: `No ${entityName} match your current filters. Try adjusting your filters to see more results.`,
    actionText: 'Clear filters'
  }),

  neverSynced: (entityName: string = 'content'): EmptyStateConfig => ({
    category: 'initial',
    icon: 'database',
    title: `No ${entityName} synced yet`,
    message: `Connect your data source to start syncing ${entityName}.`
  }),

  notConnected: (serviceName: string): EmptyStateConfig => ({
    category: 'initial',
    icon: 'package',
    title: `${serviceName} not connected`,
    message: `Connect ${serviceName} to view and manage your content.`,
    actionText: `Connect ${serviceName}`
  }),

  allCaughtUp: (): EmptyStateConfig => ({
    category: 'success',
    icon: 'check-circle',
    title: 'All caught up!',
    message: 'There are no pending items at the moment.'
  }),

  noIssuesDetected: (): EmptyStateConfig => ({
    category: 'success',
    icon: 'check-circle',
    title: 'No issues detected',
    message: 'Your content is looking good.',
    compact: true
  }),

  notAnalyzedYet: (): EmptyStateConfig => ({
    category: 'not_analyzed',
    icon: 'clock',
    title: 'Not analyzed yet',
    message: 'This content will be analyzed when it\'s next synced.',
    compact: true
  }),

  noDraftsSaved: (): EmptyStateConfig => ({
    category: 'initial',
    icon: 'document',
    title: 'No drafts saved',
    message: 'Your draft changes will appear here before publishing.'
  }),

  noRecentActivity: (): EmptyStateConfig => ({
    category: 'cleared',
    icon: 'clock',
    title: 'No recent activity',
    message: 'Actions you apply will appear here.'
  }),

  searchNoResults: (searchTerm?: string): EmptyStateConfig => ({
    category: 'no_results',
    icon: 'search',
    title: 'No results found',
    message: searchTerm
      ? `No results found for "${searchTerm}". Try a different search term.`
      : 'Try a different search term.'
  }),

  // [EA-16: ERROR-&-BLOCKED-STATE-UX-1] Blocked state presets aligned with canonical reasons
  permissionsMissing: (): EmptyStateConfig => ({
    category: 'initial',
    icon: 'users',
    title: 'Missing permissions',
    message: 'This action requires additional permissions you do not currently have.',
    actionText: 'Contact project owner'
  }),

  shopifyScopeMissing: (): EmptyStateConfig => ({
    category: 'initial',
    icon: 'package',
    title: 'Shopify access required',
    message: 'This action requires Shopify OAuth scopes that have not been granted.',
    actionText: 'Reconnect Shopify'
  }),

  syncPending: (): EmptyStateConfig => ({
    category: 'not_analyzed',
    icon: 'clock',
    title: 'Sync in progress',
    message: 'Data is not yet available because a sync is currently in progress. Please wait for the sync to complete.',
    compact: true
  }),

  destinationUnavailable: (): EmptyStateConfig => ({
    category: 'initial',
    icon: 'folder',
    title: 'Action unavailable',
    message: 'No valid action route exists for this item in the current context.',
    compact: true
  }),

  systemError: (): EmptyStateConfig => ({
    category: 'cleared',
    icon: 'settings',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again later or contact support if the problem persists.',
    actionText: 'Try again'
  })
};

/**
 * Validates that an empty state configuration meets the contract requirements
 */
export function validateEmptyState(config: EmptyStateConfig): boolean {
  // Must have a category
  if (!config.category) return false;

  // Must have an icon
  if (!config.icon) return false;

  // Must have a title
  if (!config.title || config.title.trim().length === 0) return false;

  // Must have a message that explains why empty and/or what to do next
  if (!config.message || config.message.trim().length === 0) return false;

  // If actionText is provided, must have either actionHref or onAction
  if (config.actionText && !config.actionHref && !config.onAction) return false;

  return true;
}
