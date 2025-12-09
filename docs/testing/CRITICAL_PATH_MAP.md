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

**Description:** DEO score calculation pipeline including signal aggregation, weighting, score persistence, and snapshot history.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/deo-score-compute-pipeline.md`, `docs/testing/deo-score-snapshots.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | DEO Team |

**Key Scenarios:**
- [ ] Score computation after crawl
- [ ] Score display in UI
- [ ] Historical snapshot storage
- [ ] Score change tracking
- [ ] Score breakdown by category

---

### CP-006: Shopify Sync

**Description:** Shopify integration including OAuth, product sync, metadata push, and sync status tracking.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/shopify-integration.md`, `docs/testing/product-sync.md`, `docs/testing/metadata-sync-seo-fields.md`, `docs/testing/sync-status-and-progress-feedback.md` |
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
