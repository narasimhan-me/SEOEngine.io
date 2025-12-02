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

// DEO Score types
export * from './deo-score';
