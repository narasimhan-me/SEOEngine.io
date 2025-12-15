# EngineO.ai – Critical Path Map

> Canonical list of critical flows and systems with links to manual testing docs and automated test status.

---

## Purpose

This document tracks all critical paths in EngineO.ai that must be verified before any release. Each critical path:
- Links to at least one manual testing document
- Notes automated test coverage status
- Tracks last verification date (manual and automated)

**Maintenance Rule:** When any PATCH BATCH touches a critical path, the Supervisor must require updates to this document if coverage or verification status changes.

---

## Critical Paths

### CP-001: Authentication & Authorization

**Description:** User authentication flows including sign-up, login, logout, session management, and role-based access control.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/user-profile-and-account-settings.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] New user sign-up flow
- [ ] Existing user login
- [ ] Session persistence and expiration
- [ ] Logout and session invalidation
- [ ] Protected route access

---

### CP-002: Billing & Limits

**Description:** Stripe subscription management, plan entitlements enforcement, project limits, and daily AI usage quotas.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/billing-and-limits.md`, `docs/testing/entitlements-matrix.md`, `docs/testing/plan-definitions.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] New subscription creation
- [ ] Plan upgrade/downgrade
- [ ] Subscription cancellation
- [ ] Project limit enforcement
- [ ] Daily AI limit enforcement
- [ ] Stripe webhook processing

---

### CP-003: Product Optimize (AI)

**Description:** AI-powered product optimization including Gemini integration, token tracking, failover logic, and response handling.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/ai-systems.md`, `docs/testing/token-usage-tracking.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | AI Team |

**Key Scenarios:**
- [ ] Single product optimization
- [ ] Batch optimization
- [ ] Token usage tracking and display
- [ ] Rate limit handling
- [ ] Error recovery and user messaging

---

### CP-004: Crawl Pipeline

**Description:** Product crawling system including queue management, worker processing, progress tracking, and error handling.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/deo-pipeline.md`, `docs/testing/signals-collection.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Pipeline Team |

**Key Scenarios:**
- [ ] Manual crawl trigger
- [ ] Scheduled crawl execution
- [ ] Progress feedback in UI
- [ ] Partial failure handling
- [ ] Crawl completion and signal extraction

---

### CP-005: DEO Score Compute

**Description:** DEO score calculation pipeline including signal aggregation, weighting, score persistence, snapshot history, and v2 explainability layer.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/deo-score-compute-pipeline.md`, `docs/testing/deo-score-snapshots.md`, `docs/manual-testing/phase-2.6-deo-score-v2-explainability.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | 2025-12-08 |
| **Last Verified (Automated)** | N/A |
| **Owner** | DEO Team |

**Key Scenarios:**
- [ ] Score computation after crawl
- [ ] Score display in UI
- [ ] Historical snapshot storage
- [ ] Score change tracking
- [ ] Score breakdown by category (v1)
- [ ] v2 explainability layer computed alongside v1
- [ ] v2 six-component breakdown stored in metadata
- [ ] Top opportunities derived from lowest v2 components
- [ ] Top strengths derived from highest v2 components
- [ ] v1 remains canonical score (v2 is metadata-only)

---

### CP-006: Shopify Sync

**Description:** Shopify integration including OAuth, product sync, metadata push, and sync status tracking.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/shopify-integration.md`, `docs/testing/product-sync.md`, `docs/testing/metadata-sync-seo-fields.md`, `docs/testing/sync-status-and-progress-feedback.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`, `docs/manual-testing/phase-shop-api-1-graphql-migration.md`, `docs/manual-testing/phase-shop-ux-cta-1-connect-shopify.md`, `docs/manual-testing/phase-shop-ux-cta-1-1-dedup-connect-shopify.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Integrations Team |

**Key Scenarios:**
- [ ] Shopify OAuth connection
- [ ] Initial product import
- [ ] Incremental sync
- [ ] Metadata push to Shopify
- [ ] Sync error handling and retry
- [ ] Disconnection flow
- [ ] Answer Blocks synced to Shopify metafields when AEO-2 flag is enabled
- [ ] Shopify product sync and SEO metadata push use Shopify Admin GraphQL APIs (SHOP-API-1)
- [ ] First DEO Win checklist Connect CTA uses direct OAuth with personalized domain (SHOP-UX-CTA-1, SHOP-UX-CTA-1.1)

---

### CP-007: AI Failover Logic

**Description:** AI service resilience including primary/fallback provider switching, timeout handling, and graceful degradation.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/ai-systems.md` (Failover section) |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | AI Team |

**Key Scenarios:**
- [ ] Primary provider timeout triggers failover
- [ ] Fallback provider success
- [ ] All providers fail gracefully
- [ ] Recovery to primary when available
- [ ] User notification of degraded state

---

### CP-008: Frontend Global UX Feedback

**Description:** Global UI feedback systems including toast notifications, loading states, error displays, and inline validation.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/frontend-ux-feedback-and-limits.md`, `docs/testing/toast-and-inline-feedback-system.md`, `docs/testing/modal-and-dialog-behavior.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Frontend Team |

**Key Scenarios:**
- [ ] Success toast display and auto-dismiss
- [ ] Error toast with action buttons
- [ ] Loading spinners during async operations
- [ ] Inline validation feedback
- [ ] Modal/dialog accessibility

---

### CP-009: Issue Engine Lite

**Description:** Product-focused DEO issues with actionable fix buttons (AI fix, manual fix, sync fix) and severity filtering.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/issue-engine-lite.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | DEO Team |

**Key Scenarios:**
- [ ] Issues page displays all product issues with severity badges
- [ ] Severity filtering (All/Critical/Warning/Info)
- [ ] Fix with AI action routes to product workspace
- [ ] Manual fix action routes to product page
- [ ] Re-sync action triggers Shopify sync flow
- [ ] Issue counts in Products page header
- [ ] Re-scan button refreshes issues

---

### CP-010: Issue Engine Full (IE-2.0)

**Description:** Rich metadata enrichment for all DEO issues with categories, business impact explanations, fix guidance, AI fixability indicators, and effort estimation.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/phase-ux-8-issue-engine-full.md`, `docs/testing/issue-engine-full-*.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | 2025-12-08 |
| **Last Verified (Automated)** | N/A |
| **Owner** | DEO Team |

**Key Scenarios:**
- [ ] All issues include category field with valid taxonomy value
- [ ] All issues include whyItMatters explanation
- [ ] All issues include recommendedFix guidance
- [ ] All issues include aiFixable boolean indicator
- [ ] All issues include fixCost estimation (one_click/manual/advanced)
- [ ] AI-fixable issues correctly identified (fixType: aiFix)
- [ ] Backward compatibility maintained (all existing fields preserved)

---

### CP-011: Answer Engine (Answer Blocks & Answerability)

**Description:** Answer Engine foundations including Answer Block model, answerability detection implementation, AI-based answer generation, and integration with DEO Score v2 and Issue Engine.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/answer-engine.md`, `docs/manual-testing/phase-ae-1-answer-engine-foundations.md`, `docs/manual-testing/phase-ae-1.1-answer-engine-detection.md`, `docs/manual-testing/phase-ae-1.2-answer-engine-generation-and-ui.md`, `docs/manual-testing/phase-ux-2-product-workspace-aeo-and-automation-ui.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md` |
| **Automated Tests** | `apps/api/test/e2e/answer-engine.e2e-spec.ts`, `apps/api/test/e2e/answer-generation.e2e-spec.ts` |
| **Last Verified (Manual)** | 2025-12-09 |
| **Last Verified (Automated)** | N/A |
| **Owner** | DEO Team |

**Key Scenarios:**
- [ ] Answer Block model consistency (types match spec)
- [ ] Canonical 10-question taxonomy defined
- [ ] Answerability detection rules alignment
- [ ] Non-hallucination rules clearly defined
- [ ] DEO Score v2 integration points documented
- [ ] Issue Engine integration points documented (reserved issue IDs)
- [ ] Shared package builds successfully with Answer Engine types
- [ ] Answerability detection heuristics implemented for products using existing product text fields
- [ ] `/projects/:id/answerability` endpoint returns ProjectAnswerabilityResponse with overall and per-product statuses
- [ ] Detection respects non-hallucination rules (missing data → questions marked missing, no fabricated answers)
- [ ] Unauthorized and cross-project access to answerability endpoint is correctly rejected
- [ ] Answer Engine detection changes do not alter DEO Score v1/v2 API behavior
- [ ] AE-1.2: `POST /ai/product-answers` endpoint returns ProductAnswersResponse with ephemeral answers
- [ ] AE-1.2: AI generation respects non-hallucination rules (cannotAnswer: true for insufficient data)
- [ ] AE-1.2: ProductAnswersPanel displays answers in Product Optimization workspace
- [ ] AE-1.2: Daily AI limit enforcement works for answer generation
- [ ] AE-1.2: Answers include confidence scores and facts-used metadata
- [ ] AE-1.3 / UX-2: Product Workspace AEO / Answers tab displays persisted Answer Blocks per product and supports user edits with plan-aware gating
- [ ] AEO-2: Persisted Answer Blocks can be synced to Shopify metafields (namespace engineo) when enabled in project settings

---

### CP-012: Automation Engine (Framework & Rules)

**Description:** Automation Engine framework covering automation rule model, trigger/evaluation/execution/log lifecycle, and entitlements-aware automation behavior across DEO systems. Includes Product Automations (AE-2) for metadata, content, drift correction, and Shopify sync.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/automation-engine.md`, `docs/testing/automation-engine-product-automations.md`, `docs/manual-testing/phase-ae-1-automation-engine-foundations.md`, `docs/manual-testing/phase-ae-2-product-automations.md`, `docs/manual-testing/phase-aue-1-automation-new-product-seo-title.md`, `docs/manual-testing/phase-ux-2-product-workspace-aeo-and-automation-ui.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`, `docs/manual-testing/phase-automation-1-playbooks.md`, `docs/manual-testing/auto-pb-1-1-playbooks-hardening.md`, `docs/manual-testing/auto-pb-1-2-playbooks-ux-coherence.md` |
| **Automated Tests** | `apps/api/test/e2e/automation-new-product-seo-title.e2e-spec.ts`, `apps/api/test/e2e/automation-playbooks.e2e-spec.ts`, `apps/web/tests/first-deo-win.spec.ts` |
| **Last Verified (Manual)** | 2025-12-14 |
| **Last Verified (Automated)** | N/A |
| **Owner** | DEO Team |

**Key Scenarios:**
- [ ] Automation rule model and lifecycle documented and aligned with shared types
- [ ] Entitlement and limit interactions for automations specified
- [ ] Integration points with crawl pipeline and existing AutomationService documented
- [ ] Non-destructive behavior defined for failed or skipped automations
- [ ] Shared package builds successfully with Automation Engine types
- [ ] Product Automations (AE-2): Metadata automation categories defined
- [ ] Product Automations (AE-2): Content automation categories defined
- [ ] Product Automations (AE-2): Drift correction system specified
- [ ] Product Automations (AE-2): Shopify sync automations specified
- [ ] Product Automations (AE-2): Safety and no-hallucination rules documented
- [ ] AE-2.1: Auto-apply for missing metadata works for Pro/Business users
- [ ] AE-2.1: Free users receive suggestions only (no auto-apply)
- [ ] AE-2.1: appliedAt timestamp recorded when auto-apply occurs
- [ ] AE-2.1: "Applied by Automation Engine" badge displays correctly
- [ ] AE-2.1: Automation Activity page shows applied/pending suggestions
- [ ] AUE-1: `AUTO_GENERATE_METADATA_ON_NEW_PRODUCT` triggers on Shopify product sync
- [ ] AUE-1: New product with missing SEO creates AutomationSuggestion
- [ ] AUE-1: New product with existing SEO skips automation
- [ ] AUE-1: Pro/Business users get metadata auto-applied
- [ ] AUE-1: Free users get suggestion only (no auto-apply)
- [ ] AUE-1: AI usage recorded via `recordAiUsage`
- [ ] AUE-1: Daily AI limit enforced; automation skips when limit reached
- [ ] AUE-1: Automation failure doesn't block Shopify sync
- [ ] AUE-2 / UX-2: Product Workspace Automation History panel surfaces per-product Answer Block automation runs (triggerType, action, status, errors)
- [ ] AEO-2: After Answer Block automations succeed, answer_blocks_synced_to_shopify log entries reflect metafield sync success/failure when the project flag is enabled
- [ ] AUTO-PB-1: Automation Playbooks v1 preview → estimate → apply flow
- [ ] AUTO-PB-1: Playbook estimate shows affected count and token estimates
- [ ] AUTO-PB-1: Playbook apply respects daily AI limits
- [ ] AUTO-PB-1: Free plan users blocked from bulk playbook apply
- [ ] AUTO-PB-1.1: Per-item results displayed after playbook apply (UPDATED/SKIPPED/FAILED/LIMIT_REACHED)
- [ ] AUTO-PB-1.1: "Stopped safely" banner shown when playbook stops early (limit or error)
- [ ] AUTO-PB-1.1: stoppedAtProductId displayed with link to product workspace
- [ ] AUTO-PB-1.1: Preview label shows "Sample preview (showing up to 3 products)"
- [ ] AUTO-PB-1.1: Rate limit retry with bounded retries (up to 2)
- [ ] AUTO-PB-1.1: Daily AI limit reached stops playbook with LIMIT_REACHED status
- [ ] AUTO-PB-1.2: Playbooks wizard enforces eligibility gating, single primary actions, navigation safety, and post-apply results persistence (including Back to Playbook results from Products)

---

## Coverage Summary

| Critical Path | Manual Docs | Auto Tests | Status |
|---------------|-------------|------------|--------|
| CP-001: Auth | ✅ | Planned | 🟡 Manual Only |
| CP-002: Billing & Limits | ✅ | Planned | 🟡 Manual Only |
| CP-003: Product Optimize (AI) | ✅ | Planned | 🟡 Manual Only |
| CP-004: Crawl Pipeline | ✅ | Planned | 🟡 Manual Only |
| CP-005: DEO Score Compute | ✅ | Planned | 🟡 Manual Only |
| CP-006: Shopify Sync | ✅ | Planned | 🟡 Manual Only |
| CP-007: AI Failover Logic | ✅ | Planned | 🟡 Manual Only |
| CP-008: Frontend Global UX Feedback | ✅ | Planned | 🟡 Manual Only |
| CP-009: Issue Engine Lite | ✅ | Planned | 🟡 Manual Only |
| CP-010: Issue Engine Full | ✅ | Planned | 🟡 Manual Only |
| CP-011: Answer Engine | ✅ | Planned | 🟡 Manual Only |
| CP-012: Automation Engine | ✅ | Planned | 🟡 Manual Only |

**Legend:**
- 🟢 Full Coverage (Manual + Automated)
- 🟡 Manual Only
- 🔴 No Coverage

---

## Maintenance Rules

1. **When adding a new critical path:**
   - Add a new section with all required fields
   - Ensure at least one manual testing doc exists
   - Update the Coverage Summary table

2. **When a PATCH BATCH touches a critical path:**
   - Update "Last Verified (Manual)" after manual testing
   - Update "Last Verified (Automated)" when auto tests pass
   - Add/remove key scenarios as implementation changes

3. **When automated tests are added:**
   - Change "Automated Tests" from "Planned" to test file location
   - Update status in Coverage Summary

4. **Before any release:**
   - All critical paths must show recent verification dates
   - Refer to `docs/testing/RELEASE_VERIFICATION_GATE.md` for release criteria

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Initial] | Created with 8 critical paths as part of v3.4 verification layer |
| 1.1 | 2025-12-08 | Added CP-009: Issue Engine Lite (Phase UX-7) |
| 1.2 | 2025-12-08 | Added CP-010: Issue Engine Full (Phase UX-8) |
| 1.3 | 2025-12-08 | Added CP-011: Answer Engine (Phase AE-1) |
| 1.4 | 2025-12-08 | Added CP-012: Automation Engine (Phase AE-1 Framework) |
| 1.5 | 2025-12-08 | Added AE-2.1 key scenarios to CP-012 (Metadata Product Automations implementation) |
| 1.6 | 2025-12-08 | Updated CP-005 with DEO Score v2 explainability scenarios (Phase 2.6) |
| 1.7 | 2025-12-09 | Added AE-1.1 Answer Engine detection implementation scenarios and manual testing doc to CP-011 |
| 1.8 | 2025-12-09 | Added AE-1.2 Answer Engine generation and UI scenarios to CP-011 (POST /ai/product-answers, ProductAnswersPanel) |
| 1.9 | 2025-12-09 | Added AUE-1 Automation Engine Vertical Slice scenarios to CP-012 (AUTO_GENERATE_METADATA_ON_NEW_PRODUCT) |
| 2.0 | 2025-12-11 | Added SHOP-API-1 GraphQL migration scenario and manual testing doc to CP-006 (Shopify Sync) |
| 2.1 | 2025-12-13 | Added SHOP-UX-CTA-1 and SHOP-UX-CTA-1.1 Connect Shopify CTA improvements to CP-006 (Shopify Sync) |
| 2.2 | 2025-12-14 | Added AUTO-PB-1 and AUTO-PB-1.1 Automation Playbooks scenarios to CP-012, added E2E tests and manual testing docs |
| 2.3 | 2025-12-15 | Added AUTO-PB-1.2 UX coherence and navigation safety scenarios to CP-012, including new manual testing doc and Playwright coverage |
