/**
 * ICONS-LOCAL-LIBRARY-1 - Material Symbols Manifest
 *
 * Maps semantic icon keys to raw Material Symbol names.
 * This manifest is the source of truth for available icons.
 *
 * Naming convention:
 * - Semantic keys are grouped by domain (nav, utility, status, workflow, playbook)
 * - Raw icon names are the exact Material Symbols Outlined names
 * - UI code should use semantic keys, never raw icon names directly
 *
 * To add an icon:
 * 1. Run extraction script on Stitch HTML to discover names
 * 2. Add raw SVG under apps/web/public/icons/material-symbols/svg/
 * 3. Regenerate sprite via build-material-symbols-sprite.mjs
 * 4. Add semantic alias in this manifest
 */

/**
 * Raw Material Symbol names extracted from Stitch design system HTML.
 * These are the actual icon names used in the sprite.
 */
export const MATERIAL_SYMBOL_RAW_NAMES = [
  'admin_panel_settings',
  'analytics',
  'article',
  'auto_awesome',
  'auto_fix_high',
  'award_star',
  'block',
  'calculate',
  'campaign',
  'check',
  'check_circle',
  'data_object',
  'deployed_code',
  'download',
  'error',
  'health_and_safety',
  'history',
  'home',
  'hub',
  'inventory_2',
  'memory',
  'monitoring',
  'orders',
  'preview',
  'publish',
  'search',
  'settings',
  'settings_suggest',
  'settings_voice',
  'target',
  'title',
  'visibility',
  'warning',
] as const;

export type MaterialSymbolRawName = (typeof MATERIAL_SYMBOL_RAW_NAMES)[number];

/**
 * Semantic icon manifest mapping domain-specific keys to raw icon names.
 * UI components should reference these semantic keys.
 */
export const ICON_MANIFEST = {
  // =========================================================================
  // Global Navigation Icons
  // =========================================================================
  nav: {
    /** Dashboard / Home */
    dashboard: 'home',
    /** Projects / Inventory */
    projects: 'inventory_2',
    /** Settings */
    settings: 'settings',
    /** Help / Campaign */
    help: 'campaign',
    /** Admin Panel */
    admin: 'admin_panel_settings',
    /** Store Health */
    storeHealth: 'health_and_safety',
    /** Automations */
    automations: 'settings_suggest',
    /** Insights / Monitoring */
    insights: 'monitoring',
    /** Orders */
    orders: 'orders',
    /** Analytics */
    analytics: 'analytics',
    /** Brand / App Logo */
    brand: 'deployed_code',
  },

  // =========================================================================
  // Utility Icons
  // =========================================================================
  utility: {
    /** Search */
    search: 'search',
    /** Download */
    download: 'download',
    /** Semantic / Knowledge Graph */
    semantic: 'hub',
    /** Technical / Memory */
    technical: 'memory',
    /** Schema / Data Object */
    schema: 'data_object',
    /** Visibility / Read-only */
    visibility: 'visibility',
  },

  // =========================================================================
  // Status Indicator Icons
  // =========================================================================
  status: {
    /** Critical / Error */
    critical: 'error',
    /** Warning */
    warning: 'warning',
    /** Healthy / Success */
    healthy: 'check_circle',
    /** AI Fixable */
    aiFixable: 'auto_fix_high',
    /** Check / Complete */
    check: 'check',
    /** Blocked / Forbidden */
    blocked: 'block',
  },

  // =========================================================================
  // Workflow Icons
  // =========================================================================
  workflow: {
    /** AI / Auto Awesome */
    ai: 'auto_awesome',
    /** Preview */
    preview: 'preview',
    /** Estimate / Calculate */
    estimate: 'calculate',
    /** Apply / Publish */
    apply: 'publish',
    /** History */
    history: 'history',
  },

  // =========================================================================
  // Playbook / Action Icons
  // =========================================================================
  playbook: {
    /** Title */
    title: 'title',
    /** Content / Article */
    content: 'article',
    /** Intent / Target */
    intent: 'target',
    /** Metadata / Data Object */
    metadata: 'data_object',
    /** Authority / Award */
    authority: 'award_star',
    /** Voice Search */
    voice: 'settings_voice',
  },
} as const;

/**
 * Type for semantic icon keys (e.g., 'nav.dashboard', 'status.critical')
 */
export type IconManifestKey =
  | `nav.${keyof typeof ICON_MANIFEST.nav}`
  | `utility.${keyof typeof ICON_MANIFEST.utility}`
  | `status.${keyof typeof ICON_MANIFEST.status}`
  | `workflow.${keyof typeof ICON_MANIFEST.workflow}`
  | `playbook.${keyof typeof ICON_MANIFEST.playbook}`;

/**
 * Resolves a semantic icon key to its raw Material Symbol name.
 * @param key Semantic key like 'nav.dashboard' or 'status.critical'
 * @returns Raw icon name like 'home' or 'error'
 */
export function resolveIconName(key: IconManifestKey): MaterialSymbolRawName {
  const [category, name] = key.split('.') as [
    keyof typeof ICON_MANIFEST,
    string,
  ];
  const categoryManifest = ICON_MANIFEST[category] as Record<
    string,
    MaterialSymbolRawName
  >;
  return categoryManifest[name];
}

/**
 * Gets all raw icon names that need to be included in the sprite.
 */
export function getAllRawIconNames(): MaterialSymbolRawName[] {
  return [...MATERIAL_SYMBOL_RAW_NAMES];
}
