// Jest setup file for e2e tests
import { assertTestEnv } from '../src/config/test-env-guard';

process.env.NODE_ENV = 'test';
process.env.ENGINEO_ENV = process.env.ENGINEO_ENV || 'test';

// Validate that we are pointing at a safe test database before any tests run
assertTestEnv('jest-setup');
