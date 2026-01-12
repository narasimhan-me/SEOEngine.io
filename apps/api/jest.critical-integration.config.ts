/**
 * Jest configuration for Critical Integration Test Suite
 *
 * This config runs only the critical integration tests in isolation:
 * - Billing webhook idempotency
 * - Onboarding transitions
 * - Preview → Apply workflow
 * - Auth entitlements
 *
 * Usage: pnpm test:api:critical
 */
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  // Only run tests in the critical directory
  testRegex: 'test/integration/critical/.*\\.(spec|test)\\.ts$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  // Run tests sequentially to avoid database race conditions
  maxWorkers: 1,
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/apps/api/tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/**/*.module.ts',
    '!apps/api/src/main.ts',
  ],
  coverageDirectory: './coverage-critical',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Use compiled dist for @engineo/shared to ensure CommonJS compatibility
    '^@engineo/shared$': '<rootDir>/packages/shared/dist',
    // Map NestJS modules to apps/api node_modules
    '^@nestjs/(.*)$': '<rootDir>/apps/api/node_modules/@nestjs/$1',
  },
  // Resolve modules from both root and apps/api node_modules (pnpm workspace)
  moduleDirectories: ['node_modules', '<rootDir>/node_modules', '<rootDir>/apps/api/node_modules'],
  // Display test names for better visibility
  verbose: true,
  // Tag for CI/CD: critical integration tests
  displayName: 'Critical Integration Tests',
};

export default config;

