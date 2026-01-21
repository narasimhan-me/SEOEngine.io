// Automation event fixtures for Automation Engine v1 tests (scaffolding only).
//
// These helpers construct high-level event payloads that unit/integration tests can
// use when simulating Automation Engine v1 behavior for Shopify Answer Block automations.
//
// Specs referenced:
// - docs/AUTOMATION_ENGINE_SPEC.md (Section 8.7 – Shopify Answer Block Automations)
// - docs/deo-issues-spec.md (answerability-related issues such as not_answer_ready)
// - docs/ENTITLEMENTS_MATRIX.md (Free vs Pro vs Business behavior)
//
// NOTE:
// - The shapes returned here are intentionally generic. They should be aligned later with:
//   - the real queue payloads (e.g., BullMQ/job data)
//   - any domain-level event objects used by Automation Engine v1.
// - TODO markers indicate where additional fields (projectId, productId, issueId, etc.)
//   should be added once concrete event contracts are defined.

export type TestPlanId = 'free' | 'pro' | 'business';

export interface ProductSyncedEventFixture {
  type: 'product_synced';
  plan: TestPlanId;
  product: unknown;
  // TODO: Add projectId, userId, integration metadata when event contract is defined.
}

export interface IssueDetectedEventFixture {
  type: 'issue_detected';
  plan: TestPlanId;
  product: unknown;
  issue: unknown;
  // TODO: Add projectId, issueType, severity, and correlation IDs as needed.
}

export function makeProductSyncedEvent(
  productFixture: unknown,
  plan: TestPlanId
): ProductSyncedEventFixture {
  return {
    type: 'product_synced',
    plan,
    product: productFixture,
  };
}

export function makeIssueDetectedEvent(
  productFixture: unknown,
  issueFixture: unknown,
  plan: TestPlanId
): IssueDetectedEventFixture {
  return {
    type: 'issue_detected',
    plan,
    product: productFixture,
    issue: issueFixture,
  };
}
