/**
 * Jest configuration for Unit Tests Only
 *
 * This config runs only unit tests in test/unit/ directory.
 * Excludes integration and e2e tests for fast commit gate execution.
 *
 * Usage: pnpm test:unit
 */
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  // Only run tests in test/unit/ directory
  testRegex: 'test/unit/.*\\.(spec|test)\\.ts$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/test/integration/',
    '/test/e2e/',
    '\\.e2e-spec\\.ts$',
    '/apps/web/', // Exclude web app tests (Playwright)
    '/packages/shared/src/.*\\.test\\.ts$', // Exclude shared package tests (co-located)
  ],
  // Run tests sequentially to avoid race conditions
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
  coverageDirectory: './coverage-unit',
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
  // Tag for CI/CD: unit tests
  displayName: 'Unit Tests',
};

export default config;

