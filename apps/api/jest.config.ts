import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  testRegex: '.*\\.(spec|test)\\.ts$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.e2e-spec\\.ts$',
    '/apps/web/', // Exclude web app tests (Playwright)
    '/packages/shared/src/.*\\.test\\.ts$', // Exclude shared package tests (co-located)
    '/tests/e2e/', // Exclude Playwright e2e tests
  ],
  // Run tests sequentially to avoid database race conditions with shared test DB
  maxWorkers: 1,
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/apps/api/tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Use source files for @engineo/shared (ts-jest will compile them)
    '^@engineo/shared$': '<rootDir>/packages/shared/src',
    // Map NestJS modules to apps/api node_modules
    '^@nestjs/(.*)$': '<rootDir>/apps/api/node_modules/@nestjs/$1',
  },
  // Resolve modules from both root and apps/api node_modules (pnpm workspace)
  moduleDirectories: [
    'node_modules',
    '<rootDir>/node_modules',
    '<rootDir>/apps/api/node_modules',
  ],
};

export default config;
