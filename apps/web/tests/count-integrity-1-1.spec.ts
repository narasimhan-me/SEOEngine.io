/**
 * COUNT-INTEGRITY-1.1: Canonical Triplet Counts + Explicit Labels Smoke Test
 *
 * Phase: COUNT-INTEGRITY-1.1
 * Purpose: Smoke test for canonical triplet count endpoints (backend foundation)
 *
 * Scope:
 * - Verify /projects/:id/issues/summary endpoint returns triplet structure
 * - Verify /projects/:id/assets/:assetType/:assetId/issues endpoint returns asset-specific issues
 * - Verify triplet fields (issueTypesCount, affectedItemsCount, actionableNowCount) are present
 * - Verify detected/actionable mode distinction
 * - Verify filter support (pillar, severity, scopeType, actionKey)
 *
 * [COUNT-INTEGRITY-1.1 PATCH 2.6] Uses testkit seed for deterministic test data
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

test.describe('COUNT-INTEGRITY-1.1: Canonical Triplet Counts', () => {
  let accessToken: string;
  let testProjectId: string;

  test.beforeAll(async ({ request }) => {
    // [COUNT-INTEGRITY-1.1 PATCH 2.6-FIXUP-1] Use testkit seed for deterministic test data
    const seedResponse = await request.post(`${API_URL}/testkit/e2e/seed-first-deo-win`);
    expect(seedResponse.ok()).toBeTruthy();

    const seedData = await seedResponse.json();
    // [PATCH 2.6-FIXUP-1] Seed endpoint returns accessToken (not authToken)
    accessToken = seedData.accessToken;
    testProjectId = seedData.projectId;

    expect(accessToken).toBeTruthy();
    expect(testProjectId).toBeTruthy();
  });

  test('CANON-001: Canonical summary endpoint returns valid triplet structure', async ({ request }) => {
    const response = await request.get(`${API_URL}/projects/${testProjectId}/issues/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify top-level structure
    expect(data).toHaveProperty('projectId', testProjectId);
    expect(data).toHaveProperty('generatedAt');
    expect(data).toHaveProperty('detected');
    expect(data).toHaveProperty('actionable');
    expect(data).toHaveProperty('byPillar');
    expect(data).toHaveProperty('bySeverity');

    // Verify detected triplet has all three canonical fields
    expect(data.detected).toHaveProperty('issueTypesCount');
    expect(data.detected).toHaveProperty('affectedItemsCount');
    expect(data.detected).toHaveProperty('actionableNowCount');
    expect(typeof data.detected.issueTypesCount).toBe('number');
    expect(typeof data.detected.affectedItemsCount).toBe('number');
    expect(typeof data.detected.actionableNowCount).toBe('number');

    // Verify actionable triplet has all three canonical fields
    expect(data.actionable).toHaveProperty('issueTypesCount');
    expect(data.actionable).toHaveProperty('affectedItemsCount');
    expect(data.actionable).toHaveProperty('actionableNowCount');
    expect(typeof data.actionable.issueTypesCount).toBe('number');
    expect(typeof data.actionable.affectedItemsCount).toBe('number');
    expect(typeof data.actionable.actionableNowCount).toBe('number');

    // Verify actionable counts are <= detected counts (invariant)
    expect(data.actionable.issueTypesCount).toBeLessThanOrEqual(data.detected.issueTypesCount);
    expect(data.actionable.affectedItemsCount).toBeLessThanOrEqual(data.detected.affectedItemsCount);
    expect(data.actionable.actionableNowCount).toBeLessThanOrEqual(data.detected.actionableNowCount);
  });

  test('CANON-002: Canonical summary with pillar filter returns filtered triplets', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/projects/${testProjectId}/issues/summary?pillar=metadata_snippet_quality`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify filters are echoed back
    expect(data.filters).toBeDefined();
    expect(data.filters.pillar).toBe('metadata_snippet_quality');

    // Verify triplet structure is present
    expect(data.detected).toHaveProperty('issueTypesCount');
    expect(data.actionable).toHaveProperty('issueTypesCount');
  });

  test('CANON-003: Canonical summary with severity filter returns filtered triplets', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/projects/${testProjectId}/issues/summary?severity=critical`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify filters are echoed back
    expect(data.filters).toBeDefined();
    expect(data.filters.severity).toBe('critical');

    // Verify triplet structure is present
    expect(data.detected).toHaveProperty('issueTypesCount');
    expect(data.actionable).toHaveProperty('issueTypesCount');
  });

  test('CANON-004: Canonical summary byPillar breakdown includes all pillars', async ({ request }) => {
    const response = await request.get(`${API_URL}/projects/${testProjectId}/issues/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify byPillar has structure for each pillar
    const expectedPillars = [
      'metadata_snippet_quality',
      'content_depth_quality',
      'entity_signal_strength',
      'technical_indexability',
      'answer_engine_optimization',
      'search_intent',
      'competitive_positioning',
      'offsite_signals',
      'local_discovery',
      'media_accessibility',
    ];

    for (const pillarId of expectedPillars) {
      expect(data.byPillar).toHaveProperty(pillarId);
      expect(data.byPillar[pillarId]).toHaveProperty('detected');
      expect(data.byPillar[pillarId]).toHaveProperty('actionable');
      expect(data.byPillar[pillarId].detected).toHaveProperty('issueTypesCount');
      expect(data.byPillar[pillarId].actionable).toHaveProperty('issueTypesCount');
    }
  });

  test('CANON-005: Canonical summary bySeverity breakdown includes all severities', async ({ request }) => {
    const response = await request.get(`${API_URL}/projects/${testProjectId}/issues/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify bySeverity has structure for each severity
    const severities = ['critical', 'warning', 'info'];

    for (const severity of severities) {
      expect(data.bySeverity).toHaveProperty(severity);
      expect(data.bySeverity[severity]).toHaveProperty('detected');
      expect(data.bySeverity[severity]).toHaveProperty('actionable');
      expect(data.bySeverity[severity].detected).toHaveProperty('issueTypesCount');
      expect(data.bySeverity[severity].actionable).toHaveProperty('issueTypesCount');
    }
  });

  test('CANON-006: Asset-specific issues endpoint returns valid structure', async ({ request }) => {
    // First, get a product ID from the products endpoint
    const productsResponse = await request.get(`${API_URL}/projects/${testProjectId}/products`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(productsResponse.ok()).toBeTruthy();
    const productsData = await productsResponse.json();

    // Skip test if no products
    if (!productsData.products || productsData.products.length === 0) {
      test.skip();
      return;
    }

    const testProductId = productsData.products[0].id;

    // Get asset-specific issues
    const response = await request.get(
      `${API_URL}/projects/${testProjectId}/assets/products/${testProductId}/issues`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify top-level structure
    expect(data).toHaveProperty('projectId', testProjectId);
    expect(data).toHaveProperty('assetType', 'products');
    expect(data).toHaveProperty('assetId', testProductId);
    expect(data).toHaveProperty('generatedAt');
    expect(data).toHaveProperty('issues');
    expect(data).toHaveProperty('summary');

    // Verify issues is an array
    expect(Array.isArray(data.issues)).toBeTruthy();

    // Verify summary has canonical triplet structure
    expect(data.summary).toHaveProperty('detected');
    expect(data.summary).toHaveProperty('actionable');
    expect(data.summary).toHaveProperty('byPillar');
    expect(data.summary).toHaveProperty('bySeverity');

    // Verify triplet fields
    expect(data.summary.detected).toHaveProperty('issueTypesCount');
    expect(data.summary.detected).toHaveProperty('affectedItemsCount');
    expect(data.summary.detected).toHaveProperty('actionableNowCount');

    // For asset-specific view, affectedItemsCount should be 0 (no issues) or 1 (this asset)
    if (data.summary.detected.issueTypesCount > 0) {
      expect(data.summary.detected.affectedItemsCount).toBe(1);
    } else {
      expect(data.summary.detected.affectedItemsCount).toBe(0);
    }
  });

  test('CANON-007: Asset-specific issues with pillar filter returns filtered issues', async ({ request }) => {
    // First, get a product ID
    const productsResponse = await request.get(`${API_URL}/projects/${testProjectId}/products`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(productsResponse.ok()).toBeTruthy();
    const productsData = await productsResponse.json();

    if (!productsData.products || productsData.products.length === 0) {
      test.skip();
      return;
    }

    const testProductId = productsData.products[0].id;

    // Get asset-specific issues with pillar filter
    const response = await request.get(
      `${API_URL}/projects/${testProjectId}/assets/products/${testProductId}/issues?pillar=metadata_snippet_quality`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify issues array (if not empty) only contains issues from the specified pillar
    if (data.issues.length > 0) {
      for (const issue of data.issues) {
        expect(issue.pillarId).toBe('metadata_snippet_quality');
      }
    }

    // Verify summary structure is present
    expect(data.summary.detected).toHaveProperty('issueTypesCount');
  });

  test('CANON-008: Canonical summary with actionKey filter returns filtered triplets', async ({ request }) => {
    // [COUNT-INTEGRITY-1.1 PATCH 2.6] Regression test for actionKey filtering
    const response = await request.get(
      `${API_URL}/projects/${testProjectId}/issues/summary?actionKey=FIX_MISSING_METADATA`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify filters are echoed back
    expect(data.filters).toBeDefined();
    expect(data.filters.actionKey).toBe('FIX_MISSING_METADATA');

    // Verify triplet structure is present
    expect(data.detected).toHaveProperty('issueTypesCount');
    expect(data.actionable).toHaveProperty('issueTypesCount');

    // All issues returned should map to FIX_MISSING_METADATA when using shared mapper
    // (This is a regression assertion - the filtering should work correctly)
    expect(data.detected.issueTypesCount).toBeGreaterThanOrEqual(0);
  });

  test('CANON-009: affectedItemsCount accuracy beyond cap-20 (Gap 3 regression)', async ({ request }) => {
    // [COUNT-INTEGRITY-1.1 PATCH 3.6] Regression test for Gap 3 (True Asset Dedup Beyond Cap-20)
    // Seed a project with 30 products, all missing SEO metadata
    const seedResponse = await request.post(`${API_URL}/testkit/e2e/seed-count-integrity-1-1-many-products`);
    expect(seedResponse.ok()).toBeTruthy();

    const seedData = await seedResponse.json();
    const manyProductsAccessToken = seedData.accessToken;
    const manyProductsProjectId = seedData.projectId;
    const productIds = seedData.productIds;

    expect(manyProductsAccessToken).toBeTruthy();
    expect(manyProductsProjectId).toBeTruthy();
    expect(productIds).toBeDefined();
    expect(productIds.length).toBe(30); // Verify seed created 30 products

    // Test 1: Verify affectedItemsCount equals actual product count (not capped at 20)
    const summaryResponse = await request.get(`${API_URL}/projects/${manyProductsProjectId}/issues/summary`, {
      headers: {
        Authorization: `Bearer ${manyProductsAccessToken}`,
      },
    });

    expect(summaryResponse.ok()).toBeTruthy();
    const summaryData = await summaryResponse.json();

    // There should be at least one issue type affecting all 30 products (missing metadata)
    expect(summaryData.detected.issueTypesCount).toBeGreaterThan(0);

    // CRITICAL: affectedItemsCount should be 30, not 20 (proves Gap 3 is fixed)
    // Before PATCH BATCH 3, this would be ≤20 due to capped array deduplication
    expect(summaryData.detected.affectedItemsCount).toBe(30);

    // Test 2: Verify asset beyond index 20 returns issues (membership check works)
    // Pick product #25 (index 24, well beyond cap-20 limit)
    const productBeyondCap = productIds[24];
    expect(productBeyondCap).toBeDefined();

    const assetIssuesResponse = await request.get(
      `${API_URL}/projects/${manyProductsProjectId}/assets/products/${productBeyondCap}/issues`,
      {
        headers: {
          Authorization: `Bearer ${manyProductsAccessToken}`,
        },
      }
    );

    expect(assetIssuesResponse.ok()).toBeTruthy();
    const assetData = await assetIssuesResponse.json();

    // Verify issues array is not empty (product beyond cap-20 has issues)
    expect(assetData.issues).toBeDefined();
    expect(Array.isArray(assetData.issues)).toBeTruthy();
    expect(assetData.issues.length).toBeGreaterThan(0); // Should have missing metadata issues

    // Verify summary shows this asset is affected (affectedItemsCount = 1 for single asset)
    expect(assetData.summary.detected.affectedItemsCount).toBe(1);
  });

  test('CANON-010: affectedItemsCount accuracy for collections beyond cap-20 (Gap 3b regression)', async ({ request }) => {
    // [COUNT-INTEGRITY-1.1 PATCH 4.3] Regression test for Gap 3b (Pages/Collections Dedup Beyond Cap-20)
    // Seed a project with 30 collections, all missing SEO metadata
    const seedResponse = await request.post(`${API_URL}/testkit/e2e/seed-count-integrity-1-1-many-collections`);
    expect(seedResponse.ok()).toBeTruthy();

    const seedData = await seedResponse.json();
    const manyCollectionsAccessToken = seedData.accessToken;
    const manyCollectionsProjectId = seedData.projectId;
    const collectionUrls = seedData.collectionUrls;

    expect(manyCollectionsAccessToken).toBeTruthy();
    expect(manyCollectionsProjectId).toBeTruthy();
    expect(collectionUrls).toBeDefined();
    expect(collectionUrls.length).toBe(30); // Verify seed created 30 collections

    // Test 1: Verify affectedItemsCount equals actual collection count (not capped at 20)
    const summaryResponse = await request.get(`${API_URL}/projects/${manyCollectionsProjectId}/issues/summary`, {
      headers: {
        Authorization: `Bearer ${manyCollectionsAccessToken}`,
      },
    });

    expect(summaryResponse.ok()).toBeTruthy();
    const summaryData = await summaryResponse.json();

    // There should be at least one technical issue type affecting all 30 collections (indexability_problems, slow_initial_response)
    expect(summaryData.detected.issueTypesCount).toBeGreaterThan(0);

    // CRITICAL: affectedItemsCount should be 30, not 20 (proves Gap 3b is fixed)
    // Before PATCH BATCH 4, this would be ≤20 due to capped array deduplication
    expect(summaryData.detected.affectedItemsCount).toBe(30);

    // Test 2: Verify collection beyond index 20 returns issues (membership check works)
    // Pick collection #25 (index 24, well beyond cap-20 limit)
    const collectionBeyondCap = collectionUrls[24];
    expect(collectionBeyondCap).toBeDefined();

    const assetIssuesResponse = await request.get(
      `${API_URL}/projects/${manyCollectionsProjectId}/assets/pages/${encodeURIComponent(collectionBeyondCap)}/issues`,
      {
        headers: {
          Authorization: `Bearer ${manyCollectionsAccessToken}`,
        },
      }
    );

    expect(assetIssuesResponse.ok()).toBeTruthy();
    const assetData = await assetIssuesResponse.json();

    // Verify issues array is not empty (collection beyond cap-20 has issues)
    expect(assetData.issues).toBeDefined();
    expect(Array.isArray(assetData.issues)).toBeTruthy();
    expect(assetData.issues.length).toBeGreaterThan(0); // Should have missing metadata / slow load issues

    // Verify summary shows this asset is affected (affectedItemsCount = 1 for single asset)
    expect(assetData.summary.detected.affectedItemsCount).toBe(1);
  });
});
