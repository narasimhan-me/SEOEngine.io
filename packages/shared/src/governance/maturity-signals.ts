/**
 * [EA-39] Maturity Signals Shared Types
 *
 * Shared type definitions for platform maturity and governance signals.
 * Used by both API and web packages.
 */

/**
 * Signal status indicating feature availability.
 */
export type MaturitySignalStatus = 'active' | 'available' | 'coming_soon';

/**
 * Categories for organizing maturity signals.
 */
export type MaturitySignalCategory = 'governance' | 'stability' | 'reliability';

/**
 * Definition of a platform maturity signal.
 */
export interface MaturitySignalDefinition {
  id: string;
  label: string;
  status: MaturitySignalStatus;
  category: MaturitySignalCategory;
  description: string;
}

/**
 * Platform stability status.
 */
export type PlatformStabilityStatus = 'operational' | 'degraded' | 'maintenance';

/**
 * Response from stability status endpoint.
 */
export interface StabilityStatusResponse {
  status: PlatformStabilityStatus;
  lastUpdated: string;
  message?: string;
}

/**
 * Default platform maturity signals.
 * These represent the current state of EngineO.ai capabilities.
 */
export const PLATFORM_MATURITY_SIGNALS: MaturitySignalDefinition[] = [
  {
    id: 'role-based-access',
    label: 'Role-Based Access',
    status: 'active',
    category: 'governance',
    description: 'Owner, Editor, and Viewer roles with defined permissions',
  },
  {
    id: 'approval-workflows',
    label: 'Approval Workflows',
    status: 'active',
    category: 'governance',
    description: 'Request and approve changes before applying to Shopify',
  },
  {
    id: 'audit-logging',
    label: 'Audit Logging',
    status: 'active',
    category: 'governance',
    description: 'Track approvals, applies, and share link activity',
  },
  {
    id: 'draft-versioning',
    label: 'Draft Versioning',
    status: 'active',
    category: 'reliability',
    description: 'All changes saved as drafts before applying',
  },
  {
    id: 'secure-share-links',
    label: 'Secure Share Links',
    status: 'active',
    category: 'governance',
    description: 'Time-limited, passcode-protected external sharing',
  },
  {
    id: 'platform-uptime',
    label: '99.9% Uptime Target',
    status: 'active',
    category: 'stability',
    description: 'Designed for high availability and reliability',
  },
];
