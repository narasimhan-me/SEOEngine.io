/**
 * Shared types and interfaces for SEOEngine.io
 */

// User DTOs
export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

// Project DTOs
export interface ProjectDTO {
  id: string;
  userId: string;
  name: string;
  domain?: string;
  connectedType: 'website' | 'shopify';
  createdAt: string;
}

// Common response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Health check response
export interface HealthResponse {
  status: 'ok' | 'error';
}

// DEO pillars - explicit named exports for better tree-shaking and module resolution
export {
  DEO_PILLARS,
  getDeoPillarById,
  getActiveDeoPillars,
  type DeoPillarId,
  type DeoPillar,
} from './deo-pillars';

// DEO Score types
export * from './deo-score';

// DEO job types
export * from './deo-jobs';

// DEO score config and engine
export * from './deo-score-config';
export * from './deo-score-engine';

// DEO issues types (depends on deo-pillars)
export * from './deo-issues';

// Search Intent types (SEARCH-INTENT-1)
export * from './search-intent';

// Competitive Positioning types (COMPETITORS-1)
export * from './competitors';

// Answer Engine types
export * from './answer-engine';

// Automation Engine types
export * from './automation-engine';
