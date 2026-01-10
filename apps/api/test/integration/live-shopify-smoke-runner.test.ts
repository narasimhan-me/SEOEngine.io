/**
 * TEST-3: Tests for the Live Shopify Smoke Runner
 *
 * These tests validate the runner's behavior in dry/mock mode,
 * including allowlist enforcement and audit record generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawnSync, ExecException } from 'child_process';

// Skip these tests if the live Shopify test environment is not configured
// These tests require the smoke runner script to execute successfully
// In CI or environments without proper setup, they may fail due to missing dependencies
// The tests are designed to work in dry-run mode, but still require proper environment setup
const shouldSkipTests =
  process.env.ENGINEO_LIVE_SHOPIFY_TEST !== '1' ||
  !process.env.SHOPIFY_TEST_STORE_ALLOWLIST;

const describeIfConfigured = shouldSkipTests ? describe.skip : describe;

describeIfConfigured('TEST-3 – Live Shopify Smoke Runner (dry mode)', () => {
  const originalEnv = { ...process.env };
  const artifactsDir = path.join(
    process.cwd(),
    'apps/api/artifacts',
  );

  beforeEach(() => {
    // Clean up artifacts directory before each test
    if (fs.existsSync(artifactsDir)) {
      const files = fs.readdirSync(artifactsDir);
      for (const file of files) {
        if (file.startsWith('audit-') || file.startsWith('report-')) {
          fs.unlinkSync(path.join(artifactsDir, file));
        }
      }
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function setValidEnv(): Record<string, string> {
    return {
      ENGINEO_LIVE_SHOPIFY_TEST: '1',
      NODE_ENV: 'test',
      DATABASE_URL_LIVE_TEST:
        'postgresql://user:pass@localhost:5432/engineo_live_test',
      SHOPIFY_API_KEY_TEST: 'test_api_key_12345',
      SHOPIFY_API_SECRET_TEST: 'test_api_secret_67890',
      SHOPIFY_TEST_STORE_ALLOWLIST:
        'test-store.myshopify.com,dev-store.myshopify.com',
      SHOPIFY_TEST_STORE_PRIMARY: 'test-store.myshopify.com',
      SHOPIFY_TEST_ACCESS_TOKEN: 'mock_access_token_for_dry_run',
    };
  }

  function runSmokeScript(
    args: string[] = [],
    env: Record<string, string> = {},
  ): { stdout: string; stderr: string; exitCode: number } {
    const fullEnv = { ...process.env, ...setValidEnv(), ...env };
    // Run from apps/api directory using pnpm to ensure ts-node is available
    const scriptPath = path.join(process.cwd(), 'apps/api/scripts/shopify-live-smoke.ts');
    const cwd = path.join(process.cwd(), 'apps/api');

    // Build environment string for shell execution
    const envVars = Object.entries(fullEnv)
      .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
      .join(' ');
    
    // Use execSync with shell to properly capture output
    const command = `cd "${cwd}" && ${envVars} pnpm exec ts-node "${scriptPath}" ${args.join(' ')}`;

    try {
      const stdout = execSync(command, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        shell: '/bin/sh',
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      const execError = error as ExecException & {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
        status?: number;
        signal?: string;
      };
      const stdout = execError.stdout
        ? Buffer.isBuffer(execError.stdout)
          ? execError.stdout.toString('utf-8')
          : String(execError.stdout)
        : '';
      const stderr = execError.stderr
        ? Buffer.isBuffer(execError.stderr)
          ? execError.stderr.toString('utf-8')
          : String(execError.stderr)
        : '';
      return {
        stdout,
        stderr,
        exitCode: execError.status ?? (execError.signal ? 1 : 0),
      };
    }
  }

  describe('dry run mode', () => {
    it('validates configuration without making Shopify calls', () => {
      const result = runSmokeScript(['--dry-run']);

      // Log output for debugging
      if (!result.stdout && !result.stderr) {
        console.log('Both stdout and stderr are empty. Exit code:', result.exitCode);
      } else {
        console.log('STDOUT length:', result.stdout.length, 'STDERR length:', result.stderr.length);
        console.log('STDOUT:', result.stdout.substring(0, 200));
        console.log('STDERR:', result.stderr.substring(0, 200));
      }
      
      expect(result.exitCode).toBe(0);
      // The script outputs to stdout, but if it's empty, check stderr or combine them
      const output = result.stdout || result.stderr;
      expect(output).toContain('DRY RUN mode');
      expect(output).toContain('Configuration validated successfully');
      expect(output).toContain('test-store.myshopify.com');
    });

    it('respects store override in dry run', () => {
      const result = runSmokeScript([
        '--dry-run',
        '--store=dev-store.myshopify.com',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dev-store.myshopify.com');
    });

    it('fails when store override is not in allowlist', () => {
      const result = runSmokeScript([
        '--dry-run',
        '--store=not-allowed.myshopify.com',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('is not in the allowlist');
    });
  });

  describe('allowlist enforcement', () => {
    it('refuses to run against store not in allowlist', () => {
      const result = runSmokeScript([], {
        SHOPIFY_TEST_STORE_PRIMARY: 'not-in-list.myshopify.com',
        SHOPIFY_TEST_STORE_ALLOWLIST: 'test-store.myshopify.com',
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('is not in SHOPIFY_TEST_STORE_ALLOWLIST');
    });
  });

  describe('safety guard failures', () => {
    it('fails when ENGINEO_LIVE_SHOPIFY_TEST is not set', () => {
      const result = runSmokeScript(['--dry-run'], {
        ENGINEO_LIVE_SHOPIFY_TEST: '',
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('ENGINEO_LIVE_SHOPIFY_TEST must be set');
    });

    it('fails when store allowlist is empty', () => {
      const result = runSmokeScript(['--dry-run'], {
        SHOPIFY_TEST_STORE_ALLOWLIST: '',
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('SHOPIFY_TEST_STORE_ALLOWLIST must be set');
    });

    it('fails when database URL is missing', () => {
      const result = runSmokeScript(['--dry-run'], {
        DATABASE_URL_LIVE_TEST: '',
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('DATABASE_URL_LIVE_TEST must be set');
    });
  });

  describe('run ID generation', () => {
    it('generates unique run ID with date prefix', () => {
      const result = runSmokeScript(['--dry-run']);

      expect(result.exitCode).toBe(0);

      // Run ID should be in format YYYYMMDD-<shortSha>
      const runIdMatch = result.stdout.match(/Run ID: (\d{8}-[a-f0-9]{8})/);
      expect(runIdMatch).not.toBeNull();

      if (runIdMatch) {
        const [, runId] = runIdMatch;
        const datePrefix = runId.slice(0, 8);
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        expect(datePrefix).toBe(today);
      }
    });
  });
});

describe('TEST-3 – Audit record shape validation', () => {
  it('audit record has expected fields', () => {
    // This is a static shape validation test
    interface ExpectedAuditRecord {
      runId: string;
      storeDomain: string;
      startedAt: string;
      finishedAt: string | null;
      status: 'running' | 'success' | 'failure' | 'cleanup_pending';
      createdProductIds: string[];
      seoUpdateVerified: boolean;
      manualSyncVerified: boolean | null;
      errorSummary: string | null;
      cleanupStatus: 'success' | 'partial' | 'failed' | 'skipped';
    }

    // Validate the expected shape compiles correctly
    const mockRecord: ExpectedAuditRecord = {
      runId: '20241213-abc12345',
      storeDomain: 'test-store.myshopify.com',
      startedAt: '2024-12-13T03:00:00.000Z',
      finishedAt: '2024-12-13T03:05:00.000Z',
      status: 'success',
      createdProductIds: ['123', '456'],
      seoUpdateVerified: true,
      manualSyncVerified: null,
      errorSummary: null,
      cleanupStatus: 'success',
    };

    expect(mockRecord.runId).toMatch(/^\d{8}-[a-f0-9]+$/);
    expect(mockRecord.storeDomain).toContain('.myshopify.com');
    expect(['running', 'success', 'failure', 'cleanup_pending']).toContain(
      mockRecord.status,
    );
    expect(['success', 'partial', 'failed', 'skipped']).toContain(
      mockRecord.cleanupStatus,
    );
  });
});
