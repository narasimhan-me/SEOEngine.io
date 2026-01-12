/**
 * [DRAFT-REVIEW-ISOLATION-1] No-AI Import Guard Test
 * [DRAFT-FIELD-COVERAGE-1] Updated to target AssetDraftsTab (generalized from ProductDraftsTab)
 *
 * This test ensures the AssetDraftsTab module maintains its NON-AI BOUNDARY
 * by failing if forbidden AI-related imports or tokens are detected.
 *
 * The guard prevents accidental AI creep into the Draft Review surface,
 * enforcing the locked statement: "Draft Review stays human-only."
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve the path to AssetDraftsTab.tsx robustly.
 * Handles Playwright running with cwd at repo root or apps/web.
 */
function resolveAssetDraftsTabPath(): string {
  const possiblePaths = [
    // From repo root
    path.join(process.cwd(), 'apps/web/src/components/products/AssetDraftsTab.tsx'),
    // From apps/web
    path.join(process.cwd(), 'src/components/products/AssetDraftsTab.tsx'),
    // Absolute fallback using __dirname
    path.resolve(__dirname, '../src/components/products/AssetDraftsTab.tsx'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    `AssetDraftsTab.tsx not found. Searched:\n${possiblePaths.join('\n')}`
  );
}

test.describe('DRAFT-REVIEW-ISOLATION-1: No-AI Import Guard', () => {
  /**
   * DRI1-001: AssetDraftsTab must not contain forbidden AI imports
   *
   * Forbidden tokens (minimum set):
   * - aiApi
   * - ProductAiSuggestionsPanel
   * - suggestProductMetadata
   * - generateProductAnswers
   * - AI_DAILY_LIMIT_REACHED
   */
  test('DRI1-001: AssetDraftsTab contains no forbidden AI imports', async () => {
    const filePath = resolveAssetDraftsTabPath();
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Forbidden tokens that indicate AI functionality
    const forbiddenTokens = [
      'aiApi',
      'ProductAiSuggestionsPanel',
      'suggestProductMetadata',
      'generateProductAnswers',
      'AI_DAILY_LIMIT_REACHED',
    ];

    for (const token of forbiddenTokens) {
      // Use regex to find actual usage (not just in comments describing the guard)
      // Skip matches that are in the NON-AI BOUNDARY header comment
      const lines = fileContent.split('\n');
      let foundForbidden = false;
      let foundLine = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip lines that are part of the NON-AI BOUNDARY comment block (first ~15 lines)
        if (i < 15 && (line.includes('* -') || line.includes('* FORBIDDEN'))) {
          continue;
        }
        // Check for actual import or usage
        if (line.includes(token) && !line.trim().startsWith('*') && !line.trim().startsWith('//')) {
          foundForbidden = true;
          foundLine = i + 1;
          break;
        }
      }

      expect(
        foundForbidden,
        `Forbidden AI token "${token}" found in AssetDraftsTab.tsx at line ${foundLine}. ` +
        `This violates the NON-AI BOUNDARY contract. Draft Review must remain human-only.`
      ).toBe(false);
    }
  });

  /**
   * DRI1-002: AssetDraftsTab must contain the NON-AI BOUNDARY header
   *
   * The header comment serves as documentation and a reminder for developers.
   */
  test('DRI1-002: AssetDraftsTab contains NON-AI BOUNDARY header', async () => {
    const filePath = resolveAssetDraftsTabPath();
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // The exact header that must be present
    const requiredHeader = 'NON-AI BOUNDARY: Draft Review is human-only';

    expect(
      fileContent.includes(requiredHeader),
      `AssetDraftsTab.tsx must contain the NON-AI BOUNDARY header comment: "${requiredHeader}". ` +
      `This header documents the isolation contract.`
    ).toBe(true);
  });

  /**
   * DRI1-003: AssetDraftsTab must not import from AI modules
   *
   * Check that no AI-related module imports exist.
   */
  test('DRI1-003: AssetDraftsTab has no AI module imports', async () => {
    const filePath = resolveAssetDraftsTabPath();
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // AI-related import patterns
    const forbiddenImportPatterns = [
      /import\s+.*aiApi.*from/,
      /import\s+.*ProductAiSuggestionsPanel.*from/,
      /from\s+['"].*\/ai['"]/,
      /from\s+['"]@\/lib\/ai['"]/,
    ];

    for (const pattern of forbiddenImportPatterns) {
      const match = fileContent.match(pattern);
      expect(
        match,
        `Forbidden AI import pattern found: ${match?.[0]}. ` +
        `AssetDraftsTab must not import AI-related modules.`
      ).toBeNull();
    }
  });
});
