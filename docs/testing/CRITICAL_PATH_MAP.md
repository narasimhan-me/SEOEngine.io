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

**Description:** User authentication flows including sign-up, login, logout, session management, sign-out-all, and role-based access control.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/user-profile-and-account-settings.md`, `docs/manual-testing/SELF-SERVICE-1.md`, `docs/manual-testing/SECURITY-LOGIN-QUERY-PARAMS.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/NAV-IA-CONSISTENCY-1.md` |
| **Automated Tests** | `apps/api/test/integration/self-service-1.test.ts`, `apps/web/tests/auth-security.spec.ts`, `apps/web/tests/nav-ia-consistency-1.spec.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] New user sign-up flow
- [ ] Existing user login
- [ ] Session persistence and expiration
- [ ] Logout and session invalidation
- [ ] Protected route access
- [ ] SELF-SERVICE-1: Session tracking with UserSession model
- [ ] SELF-SERVICE-1: Sign-out-all invalidates other sessions via tokenInvalidBefore
- [ ] SELF-SERVICE-1: JWT validation checks session validity and tokenInvalidBefore
- [ ] SELF-SERVICE-1: Session lastSeenAt updates throttled (5-minute cadence)
- [ ] SECURITY: Login page sanitizes password/email from URL query params
- [ ] SECURITY: Signup page sanitizes password/confirmPassword from URL query params
- [ ] SECURITY: Middleware redirects to sanitized URL (server-side)
- [ ] SECURITY: Client-side defense-in-depth sanitization
- [ ] SECURITY: Security message shown when URL was sanitized
- [ ] SECURITY: `next` param preserved for post-login redirect
- [ ] DEO-UX-REFRESH-1: Login page branding (EngineO.ai logo, premium card styling)
- [ ] DEO-UX-REFRESH-1: Login branding does not regress security sanitization
- [ ] NAV-IA-CONSISTENCY-1: "Sign in" terminology (not "Log in")
- [ ] NAV-IA-CONSISTENCY-1: "Create account" terminology (not "Sign up" on buttons)

---

### CP-002: Billing & Limits

**Description:** Stripe subscription management, plan entitlements enforcement, project limits, daily AI usage quotas, and owner-only billing restrictions.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/billing-and-limits.md`, `docs/testing/entitlements-matrix.md`, `docs/testing/plan-definitions.md`, `docs/manual-testing/SELF-SERVICE-1.md`, `docs/manual-testing/BILLING-GTM-1.md` |
| **Automated Tests** | `apps/api/test/integration/self-service-1.test.ts`, `apps/web/tests/self-service-1.spec.ts` |
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
- [ ] SELF-SERVICE-1: Owner-only billing mutations enforced at API level
- [ ] SELF-SERVICE-1: EDITOR/VIEWER cannot create checkout or portal sessions
- [ ] SELF-SERVICE-1: Role-safe billing UI (OWNER sees actions, others see read-only)
- [ ] BILLING-GTM-1: Public pricing page readable without login
- [ ] BILLING-GTM-1: Billing page shows aiUsedRuns (not totalRuns) in quota display
- [ ] BILLING-GTM-1: Trust messaging visible: "APPLY never uses AI", "Runs avoided via reuse"
- [ ] BILLING-GTM-1: Env-driven AI quota limits (AI_USAGE_MONTHLY_RUN_LIMIT_<PLAN>)
- [ ] BILLING-GTM-1: Contextual upgrade prompt on Insights when quota >=80%
- [ ] BILLING-GTM-1: Limit-style toast with Upgrade CTA on Playbooks quota warning
- [ ] BILLING-GTM-1: Marketing pricing aligned with backend limits (no mismatched claims)

---

### CP-003: Product Optimize (AI)

**Description:** AI-powered product optimization including Gemini integration, token tracking, failover logic, and response handling.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/ai-systems.md`, `docs/testing/token-usage-tracking.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/PRODUCTS-LIST-2.0.md`, `docs/manual-testing/DRAFT-CLARITY-AND-ACTION-TRUST-1.md` |
| **Automated Tests** | `apps/web/tests/draft-clarity-and-action-trust-1.spec.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | AI Team |

**Key Scenarios:**
- [ ] Single product optimization
- [ ] Batch optimization
- [ ] Token usage tracking and display
- [ ] Rate limit handling
- [ ] Error recovery and user messaging
- [ ] DEO-UX-REFRESH-1: AI CTA labeling "(uses AI)" on AI-triggering buttons only
- [ ] DEO-UX-REFRESH-1: "Apply to Shopify" / "Apply Fix" never labeled with "(uses AI)"
- [ ] PRODUCTS-LIST-2.0: Health pill per row (3 states: Healthy, Needs Attention, Critical - no numbers)
- [ ] PRODUCTS-LIST-2.0: Recommended action per row (single, deterministic based on severity + pillar priority)
- [ ] PRODUCTS-LIST-2.0: Progressive disclosure (details only on expand, no inline breakdowns by default)
- [ ] PRODUCTS-LIST-2.0: No always-visible "Scan SEO"; "Rescan" only when data is stale
- [ ] PRODUCTS-LIST-2.0: Command Bar with attention count and "Fix in bulk" CTA
- [ ] PRODUCTS-LIST-2.0: Sort by impact uses fixed ladder (Critical: missing metadata > blocking technical > combined; Needs Attention: intent > content > metadata), deterministic and stable across reloads
- [ ] PRODUCTS-LIST-2.0: Bulk action confirmation (3-step flow) — scope listed, AI disclosure on Generate drafts, Apply updates disabled until drafts exist, Apply uses no AI, partial failures handled with retry
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: 3-state draft lifecycle (unsaved → saved → applied)
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Apply button disabled until draft is saved
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Apply never calls AI (uses saved draft values directly)
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: "Add to draft" semantics (not "Apply to editor")
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Inline guidance explains Generate uses AI, Apply does not

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

**Description:** Shopify integration including OAuth, product sync, metadata push, image alt text ingestion, and sync status tracking.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/shopify-integration.md`, `docs/testing/product-sync.md`, `docs/testing/metadata-sync-seo-fields.md`, `docs/testing/sync-status-and-progress-feedback.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`, `docs/manual-testing/phase-shop-api-1-graphql-migration.md`, `docs/manual-testing/phase-shop-ux-cta-1-connect-shopify.md`, `docs/manual-testing/phase-shop-ux-cta-1-1-dedup-connect-shopify.md`, `docs/manual-testing/MEDIA-1.md`, `docs/manual-testing/DRAFT-CLARITY-AND-ACTION-TRUST-1.md`, `docs/manual-testing/SHOPIFY-ASSET-SYNC-COVERAGE-1.md`, `docs/manual-testing/SHOPIFY-SCOPE-RECONSENT-UX-1.md`, `docs/manual-testing/SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1.md`, `docs/manual-testing/BLOGS-ASSET-SYNC-COVERAGE-1.md`, `docs/manual-testing/SHOPIFY-SCOPE-IMPLICATIONS-1.md`, `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md` |
| **Automated Tests** | `packages/shared/src/media-accessibility-types.test.ts` (MEDIA-1), `apps/web/tests/draft-clarity-and-action-trust-1.spec.ts`, `apps/api/test/e2e/shopify-asset-sync.e2e-spec.ts`, `apps/web/tests/shopify-asset-sync-coverage-1.spec.ts`, `apps/web/tests/shopify-integration-lifecycle-integrity-1.spec.ts`, `apps/web/tests/blogs-asset-sync-coverage-1.spec.ts` |
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
- [ ] MEDIA-1: Product images with alt text are synced and stored in ProductImage records
- [ ] MEDIA-1: Image sync does not break existing Product.imageUrls behavior
- [ ] ROLES-3 FIXUP-5: Shopify OWNER-only actions accept any project OWNER member (co-owner), not only Project.userId
- [ ] ROLES-3 FIXUP-5: Co-owner can perform sync-products, ensure-metafield-definitions, install
- [ ] ROLES-3 FIXUP-5: Co-owner can disconnect store (with account OWNER + project OWNER)
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Apply to Shopify uses saved draft values (not AI)
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Issues page Apply uses Shopify API directly
- [ ] BLOGS-ASSET-SYNC-COVERAGE-1: Blog posts (Articles) sync with shopifyPublishedAt for Published/Draft status
- [ ] BLOGS-ASSET-SYNC-COVERAGE-1: Blog posts list shows Published/Draft badges based on publishedAt
- [ ] BLOGS-ASSET-SYNC-COVERAGE-1: blogs_sync capability requires read_content scope
- [ ] BLOGS-ASSET-SYNC-COVERAGE-1: lastBlogsSyncAt tracked in sync status
- [ ] SHOPIFY-SCOPE-IMPLICATIONS-1: write_products satisfies read_products (no false missing scope warnings)
- [ ] SHOPIFY-SCOPE-IMPLICATIONS-1: write_content satisfies read_content (for pages_sync, blogs_sync)
- [ ] SHOPIFY-SCOPE-IMPLICATIONS-1: read scopes do NOT imply write scopes (no reverse implication)
- [ ] SHOPIFY-SCOPE-TRUTH-1: Authoritative granted-scope derivation (oauth_scope vs access_scopes_endpoint fallback)
- [ ] SHOPIFY-SCOPE-TRUTH-1: Stored scopes are normalized (deduplicated, sorted, comma-separated)
- [ ] SHOPIFY-SCOPE-TRUTH-1: Permission notice shows catalog wording when read_products missing
- [ ] SHOPIFY-SCOPE-TRUTH-1: Permission notice shows content wording when read_content missing
- [ ] SHOPIFY-SCOPE-TRUTH-1: Permission notice shows combined wording when both missing
- [ ] SHOPIFY-SCOPE-TRUTH-1 FIXUP-1: Partial/suspicious OAuth scope triggers Access Scopes endpoint fallback (truthSource=access_scopes_endpoint_suspicious)

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

**Description:** Global UI feedback systems including toast notifications, loading states, error displays, inline validation, design tokens, theme support, trust-safe issue routing, and count integrity between Work Queue and Issues page.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/frontend-ux-feedback-and-limits.md`, `docs/testing/toast-and-inline-feedback-system.md`, `docs/testing/modal-and-dialog-behavior.md`, `docs/manual-testing/NAV-IA-CONSISTENCY-1.md`, `docs/manual-testing/DRAFT-CLARITY-AND-ACTION-TRUST-1.md`, `docs/manual-testing/ISSUE-TO-FIX-PATH-1.md`, `docs/manual-testing/COUNT-INTEGRITY-1.md`, `docs/manual-testing/COUNT-INTEGRITY-1.1.md` ✅, `docs/manual-testing/ZERO-AFFECTED-SUPPRESSION-1.md`, `docs/manual-testing/ISSUE-FIX-KIND-CLARITY-1.md` ✅ |
| **Automated Tests** | `apps/web/tests/nav-ia-consistency-1.spec.ts`, `apps/web/tests/draft-clarity-and-action-trust-1.spec.ts`, `apps/web/tests/issue-to-fix-path-1.spec.ts`, `apps/web/tests/count-integrity-1.spec.ts` ✅, `apps/web/tests/count-integrity-1-1.spec.ts` ✅ (backend API), `apps/web/tests/count-integrity-1-1.ui.spec.ts` ✅ (UI smoke test), `apps/web/tests/zero-affected-suppression-1.spec.ts` ✅, `apps/web/tests/issue-fix-kind-clarity-1.spec.ts` ✅, `apps/web/tests/list-actions-clarity-1.spec.ts` (LAC1-002b) |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Frontend Team |

**Key Scenarios:**
- [ ] Success toast display and auto-dismiss
- [ ] Error toast with action buttons
- [ ] Loading spinners during async operations
- [ ] Inline validation feedback
- [ ] Modal/dialog accessibility
- [ ] NAV-IA-CONSISTENCY-1: Design tokens (bg-background, text-foreground, etc.)
- [ ] NAV-IA-CONSISTENCY-1: Dark mode toggle with localStorage persistence
- [ ] NAV-IA-CONSISTENCY-1: Token-based styling on marketing pages
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Draft state banner shows 3 states (unsaved, saved, applied)
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Unsaved changes navigation blocking dialog
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: GEO collapsible explainers (What is GEO?, What is Citation Confidence?)
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Automation history filters (Status, Initiator)
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: Human-readable skip reason explanations
- [ ] DRAFT-CLARITY-AND-ACTION-TRUST-1: No internal ID leakage in issue displays
- [ ] ISSUE-TO-FIX-PATH-1: Issue click lands on visible fix surface with context banner
- [ ] ISSUE-TO-FIX-PATH-1: Issue counts reflect ONLY actionable issues (badge == rows)
- [ ] ISSUE-TO-FIX-PATH-1: Orphan issues display "Informational — no action required" badge
- [ ] ISSUE-TO-FIX-PATH-1: Work Queue shows issue fix context banner when issueId is present
- [ ] ISSUE-TO-FIX-PATH-1: No internal ID leakage via getSafeIssueTitle/Description
- [ ] ISSUE-TO-FIX-PATH-1 FIXUP-1: Issue-fix mode triggers on issueId alone (not from=issues)
- [ ] ISSUE-TO-FIX-PATH-1 FIXUP-1: Overview Top blockers shows actionable issues only
- [ ] ISSUE-TO-FIX-PATH-1 FIXUP-1: DEO page pillar scorecards use actionable issues only
- [ ] ISSUE-TO-FIX-PATH-1 FIXUP-1: Project Issues page severity counts are actionable-only
- [ ] ISSUE-TO-FIX-PATH-1 FIXUP-1: Origin preserved in buildIssueFixHref (from=overview/deo/issues)
- [ ] COUNT-INTEGRITY-1: Work Queue card counts EXACTLY match Issues page filtered list counts (click integrity)
- [ ] COUNT-INTEGRITY-1: Work Queue ASSET_OPTIMIZATION bundles route to Issues page with actionKey, scopeType, mode, pillar query params
- [ ] COUNT-INTEGRITY-1: Work Queue card shows detected count in parentheses when different from actionable (e.g., "3 actionable (5 detected)")
- [ ] COUNT-INTEGRITY-1: Work Queue card shows "Informational — no action required" when scopeCount = 0
- [ ] ZERO-AFFECTED-SUPPRESSION-1: Work Queue suppresses automation/playbook tiles when eligible count is 0 (no dead-end CTAs)
- [ ] COUNT-INTEGRITY-1: Issues page URL contract preserved (actionKey + scopeType + mode + pillar)
- [ ] COUNT-INTEGRITY-1: Preview list shows issue titles (not asset titles) for ASSET_OPTIMIZATION bundles
- [ ] COUNT-INTEGRITY-1: scopeCount = actionable issue-group count, scopeDetectedCount = detected issue-group count
- [x] COUNT-INTEGRITY-1.1: Backend complete (actionKey filtering, asset endpoint working, all asset types dedup verified via CANON-009 + CANON-010) ✅ **BACKEND COMPLETE (PATCH BATCH 4 + FIXUP)**
- [x] COUNT-INTEGRITY-1.1: Canonical triplet endpoints (`/summary`) return triplet counts with all filters working
- [x] COUNT-INTEGRITY-1.1: affectedItemsCount accurate for products (verified by CANON-009 with 30 products) and pages/collections (verified by CANON-010 with 30 collections beyond cap-20)
- [x] COUNT-INTEGRITY-1.1: UI displays labeled triplet counts ("Issue types", "Items affected", "Actionable now") ✅ **GAP 6 COMPLETE (PATCH 5-8)**
- [x] COUNT-INTEGRITY-1.1: Cross-surface UI smoke test (Store Health → Work Queue → Issues → Product Detail) ✅ **GAP 7 COMPLETE (PATCH 9)**
- [x] ISSUE-FIX-KIND-CLARITY-1: DIAGNOSTIC issues show "Review" CTA (not "Fix") in Issues Engine
- [x] ISSUE-FIX-KIND-CLARITY-1: DIAGNOSTIC arrival callout uses blue styling (not yellow/indigo)
- [x] ISSUE-FIX-KIND-CLARITY-1: DIAGNOSTIC callout shows "View related issues" CTA (routes to Issues Engine)
- [x] ISSUE-FIX-KIND-CLARITY-1: DEO Overview shows correct CTA for DIAGNOSTIC issues
- [x] ISSUE-FIX-KIND-CLARITY-1: fixKind derived from config only (never URL param)
- [x] ISSUE-FIX-KIND-CLARITY-1-FIXUP-2: Products list shows "Review" CTA for DIAGNOSTIC-topped products
- [x] ISSUE-FIX-KIND-CLARITY-1-FIXUP-2: Work Queue shows blue review banner for DIAGNOSTIC issueId

---

### CP-009: Issue Engine Lite

**Description:** Product-focused DEO issues with actionable fix buttons (AI fix, manual fix, sync fix) and severity filtering. Includes MEDIA pillar issues and role-based actionability semantics.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/issue-engine-lite.md`, `docs/manual-testing/MEDIA-1.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/COUNT-INTEGRITY-1.md`, `docs/manual-testing/COUNT-INTEGRITY-1.1.md`, `docs/manual-testing/DIAGNOSTIC-GUIDANCE-1.md` ✅ |
| **Automated Tests** | `packages/shared/src/media-accessibility-types.test.ts` (MEDIA-1), `apps/web/tests/count-integrity-1.spec.ts` ✅, `apps/web/tests/count-integrity-1-1.spec.ts` ✅ (backend API), `apps/web/tests/count-integrity-1-1.ui.spec.ts` ✅ (UI smoke test) |
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
- [ ] MEDIA-1: MEDIA pillar issues appear with correct pillarId and imageCountAffected
- [ ] MEDIA-1: missing_image_alt_text, generic_image_alt_text, insufficient_image_coverage, missing_media_context issues generated
- [ ] DEO-UX-REFRESH-1: Product details Issues tab shows issue count consistent with products list
- [ ] DEO-UX-REFRESH-1: Issues grouped by pillar with "Fix next" guidance
- [ ] COUNT-INTEGRITY-1: Technical issues appear as "detected" with informational badge
- [ ] COUNT-INTEGRITY-1: Technical issues are NOT clickable (no dead-click risk)
- [ ] COUNT-INTEGRITY-1: Detected vs actionable semantics consistent across all UI surfaces
- [ ] COUNT-INTEGRITY-1: VIEWER role sees all issues as detected (actionableCount = 0)
- [ ] COUNT-INTEGRITY-1: Role-based actionability based on canGenerateDrafts OR canRequestApproval OR canApply
- [ ] COUNT-INTEGRITY-1: issue.isActionableNow determines clickability (not href-based check)
- [x] COUNT-INTEGRITY-1.1: Backend canonical triplet endpoints complete (products + pages/collections dedup verified) ✅ **BACKEND COMPLETE (PATCH BATCH 4 + FIXUP)**
- [x] COUNT-INTEGRITY-1.1: Issues Engine displays labeled triplets ("Issue types", "Items affected", "Actionable now") ✅ **GAP 6 COMPLETE (PATCH 5)**
- [x] COUNT-INTEGRITY-1.1: affectedItemsCount accurate for products (Gap 3a resolved, verified by CANON-009) and pages/collections (Gap 3b resolved, verified by CANON-010 with 30 collections beyond cap-20)
- [ ] DIAGNOSTIC-GUIDANCE-1: Outside-control issues (actionability='informational') show "Informational — outside EngineO.ai control" badge
- [ ] DIAGNOSTIC-GUIDANCE-1: Outside-control issues show "How to address this" guidance block with 4 bullets
- [ ] DIAGNOSTIC-GUIDANCE-1: Outside-control issues have no Fix/Apply/Fix with AI CTAs (no dead-clicks)
- [ ] DIAGNOSTIC-GUIDANCE-1: Orphan issues (no valid fixHref) still show "Informational — no action required" badge

---

### CP-010: Issue Engine Full (IE-2.0)

**Description:** Rich metadata enrichment for all DEO issues with categories, business impact explanations, fix guidance, AI fixability indicators, and effort estimation. Includes MEDIA pillar issue enrichment.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/phase-ux-8-issue-engine-full.md`, `docs/testing/issue-engine-full-*.md`, `docs/manual-testing/MEDIA-1.md` |
| **Automated Tests** | `packages/shared/src/media-accessibility-types.test.ts` (MEDIA-1) |
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
- [ ] MEDIA-1: MEDIA issues include whyItMatters and recommendedFix aligned with accessibility/discovery framing
- [ ] MEDIA-1: MEDIA issues include correct aiFixable and fixCost metadata
- [ ] MEDIA-1: Issues resolve deterministically when alt text/captions are fixed

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
| **Manual Testing Doc(s)** | `docs/testing/automation-engine.md`, `docs/testing/automation-engine-product-automations.md`, `docs/manual-testing/phase-ae-1-automation-engine-foundations.md`, `docs/manual-testing/phase-ae-2-product-automations.md`, `docs/manual-testing/phase-aue-1-automation-new-product-seo-title.md`, `docs/manual-testing/phase-ux-2-product-workspace-aeo-and-automation-ui.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`, `docs/manual-testing/phase-automation-1-playbooks.md`, `docs/manual-testing/auto-pb-1-1-playbooks-hardening.md`, `docs/manual-testing/auto-pb-1-2-playbooks-ux-coherence.md`, `docs/manual-testing/AUTOMATION-ENTRY-1.md`, `docs/manual-testing/ZERO-AFFECTED-SUPPRESSION-1.md`, `docs/manual-testing/PLAYBOOK-STEP-CONTINUITY-1.md` |
| **Automated Tests** | `apps/api/test/e2e/automation-new-product-seo-title.e2e-spec.ts`, `apps/api/test/e2e/automation-playbooks.e2e-spec.ts`, `apps/web/tests/first-deo-win.spec.ts`, `apps/web/tests/automation-entry-1.spec.ts`, `apps/web/tests/zero-affected-suppression-1.spec.ts` ✅ |
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
- [ ] ZERO-AFFECTED-SUPPRESSION-1: Playbooks 0-eligible state hides stepper + Apply CTAs and shows calm empty state
- [ ] AUTO-PB-1.3 (Planned): Preview Persistence & Cross-Surface Drafts – persistent AI drafts survive navigation, reused across Playbooks and Product detail surfaces
- [ ] AUTOMATION-ENTRY-1: Entry points limited to Products bulk, Product Details, and Playbooks "Create playbook"
- [ ] AUTOMATION-ENTRY-1: Scope visible before any AI configuration
- [ ] AUTOMATION-ENTRY-1: Scrollable product list shown for scope verification
- [ ] AUTOMATION-ENTRY-1: Sample preview required before enablement ("Sample draft — not applied")
- [ ] AUTOMATION-ENTRY-1: Enable persists only (no immediate execution; no auto-apply)
- [ ] AUTOMATION-ENTRY-1: Single-product entry scopes to exactly one product end-to-end
- [ ] AUTOMATION-ENTRY-1: Disable playbook always available and immediate
- [ ] AUTOMATION-ENTRY-1: Apply does not use AI when a valid draft exists (AUTO-PB-1.3 invariant)
- [ ] ROLES-3: Multi-user projects do NOT auto-apply; owner approval required before apply
- [ ] PLAYBOOK-STEP-CONTINUITY-1: Step 2 → Step 3 transition is deterministic (no silent stalls)
- [ ] PLAYBOOK-STEP-CONTINUITY-1: Explicit terminal outcomes at Step 2 (Ready/NoItems/Blocked/DraftInvalid)
- [ ] PLAYBOOK-STEP-CONTINUITY-1: Draft expired/failed shows blocker panel with Regenerate CTA
- [ ] PLAYBOOK-STEP-CONTINUITY-1: Permission blocked shows role notice with resolution CTA link

---

### CP-013: Admin Operations Dashboard

**Description:** Internal-only operational control plane for Support Agents, Ops Admins, and Management/CEO with role-based access control, read-only impersonation, quota resets, safe resyncs, and immutable audit logging.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/ADMIN-OPS-1.md`, `docs/ADMIN_OPS.md` |
| **Automated Tests** | `apps/api/test/integration/admin-ops-1.test.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] Internal admin role gating (role=ADMIN + adminRole required)
- [ ] SUPPORT_AGENT can perform read + support actions (impersonation)
- [ ] OPS_ADMIN can perform read + support + ops actions (quota reset, plan override, safe resync)
- [ ] MANAGEMENT_CEO has read-only access (no support or ops actions)
- [ ] Read-only impersonation blocks all write actions (POST/PUT/PATCH/DELETE)
- [ ] Impersonation token allows read actions
- [ ] Quota reset creates offset record without deleting ledger
- [ ] Safe resync triggers Shopify sync without AI automation
- [ ] All admin actions logged immutably to AdminAuditLog
- [ ] Audit log displays correct actor, action, and target
- [ ] Overview dashboard shows APPLY invariant red alert (APPLY runs with aiUsed=true)
- [ ] User detail page shows subscription, quota, and action buttons
- [ ] System health endpoint returns platform metrics

---

### CP-014: Customer Self-Service Control Plane

**Description:** Customer self-service account management including profile, preferences, organization settings, AI usage visibility, session management, and role-based access control (OWNER/EDITOR/VIEWER).

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/SELF-SERVICE-1.md`, `docs/SELF_SERVICE.md` |
| **Automated Tests** | `apps/api/test/integration/self-service-1.test.ts`, `apps/web/tests/self-service-1.spec.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] Profile management (name, avatar, timezone, locale)
- [ ] Preferences persistence (notification toggles, default behaviors)
- [ ] Organization name editing (OWNER/EDITOR only)
- [ ] Connected stores list and disconnect (OWNER only)
- [ ] AI usage visibility (runs, quota, reuse metrics)
- [ ] Session list and sign-out-all functionality
- [ ] CustomerAccountRole access control (OWNER/EDITOR/VIEWER)
- [ ] VIEWER read-only restrictions across all settings
- [ ] Account menu navigation in TopNav
- [ ] Settings hub page displays all settings cards
- [ ] APPLY invariant messaging on AI Usage page

---

### CP-015: Guided Onboarding & First DEO Win

**Description:** Trust-safe guided onboarding flow that helps new users complete their first DEO fix within 5-10 minutes. Uses derived state for issue recommendations, never triggers AI without explicit consent, and records canonical APPLY runs for completion tracking.

**Implementation Status:** Docs Complete; Implementation Pending

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/GTM-ONBOARD-1.md`, `docs/GTM_ONBOARDING.md` |
| **Automated Tests** | Planned |
| **Last Verified (Manual)** | N/A (Implementation Pending) |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] Onboarding eligibility (Shopify connected + no APPLY run)
- [ ] Issue selection ladder (Search & Intent > Media > Metadata)
- [ ] Start/advance/skip persistence per user+project
- [ ] Completion detection via AutomationPlaybookRun APPLY row
- [ ] Banner visibility under /projects/[id]/* routes only
- [ ] Session dismissal (sessionStorage) vs persistent skip
- [ ] Deep-link focus without auto-AI (trust contract)
- [ ] Preview requires explicit user click (no auto-preview)
- [ ] Apply records canonical AutomationPlaybookRun (aiUsed=false)
- [ ] Celebration copy varies (guided vs non-guided completion)
- [ ] Analytics events emitted at correct points
- [ ] Help Hub "Get your first DEO win" restart entry point

---

### CP-016: Project Insights Dashboard

**Description:** Read-only derived insights dashboard showing DEO progress, AI efficiency metrics, issue resolution, opportunity signals, and GEO insights. Never triggers AI or mutations. Extended by ENTERPRISE-GEO-1 for governance-aware share links.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/INSIGHTS-1.md`, `docs/manual-testing/GEO-INSIGHTS-2.md`, `docs/manual-testing/ENTERPRISE-GEO-1.md`, `docs/IMPLEMENTATION_PLAN.md` |
| **Automated Tests** | `apps/api/test/integration/geo-insights-2.test.ts`, `apps/api/test/integration/enterprise-geo-1.test.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] Insights endpoint returns ProjectInsightsResponse (read-only)
- [ ] DEO score trend visualization with sparklines
- [ ] AI efficiency metrics (runs used, avoided, reuse rate)
- [ ] Trust invariant display: "Apply never uses AI" (applyAiRuns = 0)
- [ ] Issue resolution by pillar (open/resolved counts)
- [ ] High-impact open issues list
- [ ] Opportunity signals prioritized by impact
- [ ] Read-only methods do not trigger AI or recomputation
- [ ] Cached-only issue computation for offsite/local pillars
- [ ] Navigation via ProjectSideNav links correctly
- [ ] Subnav tabs navigate between insight pages
- [ ] GEO-INSIGHTS-2: geoInsights block included in response
- [ ] GEO-INSIGHTS-2: coverage.byIntent includes all 5 SearchIntentTypes
- [ ] GEO-INSIGHTS-2: trustTrajectory reflects ProductGeoFixApplication improvements
- [ ] GEO-INSIGHTS-2: GEO Insights tab visible in subnav
- [ ] ENTERPRISE-GEO-1: Share link creation with passcode (8-char A-Z 0-9)
- [ ] ENTERPRISE-GEO-1: Passcode shown only once at creation (modal with acknowledgement)
- [ ] ENTERPRISE-GEO-1: Passcode verification via POST /share/geo-report/:token/verify
- [ ] ENTERPRISE-GEO-1: Public share view is mutation-free (no DB writes on view/print)
- [ ] ENTERPRISE-GEO-1: Report assembly is read-only (no side effects)

---

### CP-017: GEO Answer Readiness & Citation Confidence

**Description:** GEO (Generative Engine Optimization) foundation layer providing explainable answer readiness signals (Clarity, Specificity, Structure, Context, Accessibility) and derived Citation Confidence (Low/Medium/High). Includes Preview/Apply flow for answer improvements. Extended by ENTERPRISE-GEO-1 for governance approval gating.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/GEO-FOUNDATION-1.md`, `docs/GEO_FOUNDATION.md`, `docs/GEO_INSIGHTS.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/GEO-EXPORT-1.md`, `docs/manual-testing/ENTERPRISE-GEO-1.md` |
| **Automated Tests** | `packages/shared/src/geo-types.test.ts`, `apps/api/test/integration/geo-insights-2.test.ts`, `apps/api/test/integration/enterprise-geo-1.test.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | DEO Team |

**Key Scenarios:**
- [ ] GEO readiness signals evaluate Answer Blocks correctly
- [ ] Citation Confidence derived from signals (High/Medium/Low)
- [ ] GEO issues generated and integrated into Issue Engine
- [ ] Preview endpoint generates AI improvements (respects quota)
- [ ] Apply endpoint updates Answer Block (no AI usage)
- [ ] Draft reuse via aiWorkKey prevents redundant AI calls
- [ ] GEO_FIX_PREVIEW run type recorded in AI usage ledger
- [ ] Promotional language detection flags overly-promotional answers
- [ ] Product-level GEO evaluation aggregates Answer Unit signals
- [ ] No ranking or citation guarantees (readiness signals only)
- [ ] GEO-INSIGHTS-2: Answer-intent mapping derives intents from questionId and factsUsed
- [ ] GEO-INSIGHTS-2: Multi-intent answers only when clarity+structure pass
- [ ] GEO-INSIGHTS-2: Reuse stats computed from mapped intents
- [ ] DEO-UX-REFRESH-1: Shared GEO report includes EngineO.ai branding (logo/wordmark)
- [ ] DEO-UX-REFRESH-1: "Shared Report" and "Read-only" badges visible
- [ ] DEO-UX-REFRESH-1: Expiration date shown in header
- [ ] DEO-UX-REFRESH-1: "Generated by EngineO.ai" footer present
- [ ] DEO-UX-REFRESH-1: Error states show correct messaging (expired/revoked/not_found)
- [ ] DEO-UX-REFRESH-1: Print/PDF has white background, proper margins, no cut-off sections
- [ ] ENTERPRISE-GEO-1: Governance policy CRUD (GET/PUT /projects/:id/governance/policy)
- [ ] ENTERPRISE-GEO-1: Approval workflow: request → approve/reject → consume
- [ ] ENTERPRISE-GEO-1: Approval required check gates GEO fix apply
- [ ] ENTERPRISE-GEO-1: Approval required check gates Answer Block sync
- [ ] ENTERPRISE-GEO-1: Audit events logged for all governance actions
- [ ] ENTERPRISE-GEO-1: PII toggle always false (API rejects true, UI shows locked)

---

### CP-018: Project Roles & Approval Foundations (ROLES-2)

**Description:** Role-based access control foundations with single-user emulation support. Extends approval workflow to Playbooks apply with role-aware UI affordances.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/ROLES-2.md` |
| **Automated Tests** | `apps/api/test/integration/roles-2.test.ts`, `apps/web/tests/roles-2.spec.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] ROLES-2: OWNER can approve and apply playbooks when approval required
- [ ] ROLES-2: Approval creates audit event (APPROVAL_APPROVED)
- [ ] ROLES-2: Apply blocked with APPROVAL_REQUIRED error when missing approval (HTTP 400, structured error)
- [ ] ROLES-2: VIEWER (simulated via accountRole) cannot apply
- [ ] ROLES-2: VIEWER (simulated) cannot approve approval requests
- [ ] ROLES-2: Preview and estimate remain accessible for VIEWER
- [ ] ROLES-2: No mutations on preview/export-only navigation
- [ ] ROLES-2: Role visibility label shows on playbooks page
- [ ] ROLES-2: "Approve and apply" button appears when approval required
- [ ] ROLES-2: Governance settings copy includes Playbooks
- [ ] ROLES-2 FIXUP-2: APPROVAL_REQUIRED error surfaces correct message/code without auth redirect
- [ ] ROLES-2 FIXUP-3: VIEWER apply denial returns 403 with message containing "Viewer role cannot apply"
- [ ] ROLES-2 FIXUP-3: EDITOR apply denial returns 403 with message containing "Editor role cannot apply"

---

### CP-019: True Multi-User Projects (ROLES-3)

**Description:** True multi-user projects with explicit membership management. Extends ROLES-2 with ProjectMember model, OWNER-only apply enforcement, approval chains, and multi-user auto-apply blocking.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/ROLES-3.md` |
| **Automated Tests** | `apps/api/test/integration/roles-3.test.ts`, `apps/web/tests/roles-3.spec.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] ROLES-3: Non-owner member can view project (via ProjectMember)
- [ ] ROLES-3: EDITOR cannot apply automation playbooks (OWNER-only)
- [ ] ROLES-3: VIEWER cannot generate drafts or apply
- [ ] ROLES-3: Approval chain: EDITOR requests → OWNER approves → OWNER applies
- [ ] ROLES-3: Multi-user projects block auto-apply (CP-012 invariant preserved)
- [ ] ROLES-3: Single-user projects preserve existing auto-apply behavior
- [ ] ROLES-3: Membership management: add/remove/role-change (OWNER-only)
- [ ] ROLES-3: Cannot remove last OWNER from project
- [ ] ROLES-3: Non-owner cannot manage members
- [ ] ROLES-3: Migration backfills existing projects with OWNER membership
- [ ] ROLES-3: Audit events logged for PROJECT_MEMBER_ADDED/REMOVED/ROLE_CHANGED
- [ ] ROLES-3: GET /projects includes projects where user is a member
- [ ] ROLES-3: GET /projects/:id/role returns user's role + capabilities + isMultiUserProject
- [ ] ROLES-3 FIXUP-2: Multi-user OWNER cannot create approval requests (must apply directly)
- [ ] ROLES-3 FIXUP-2: Single-user OWNER can create approval requests (ROLES-2 compat)
- [ ] ROLES-3 FIXUP-2: accountRole ignored in multi-user projects (ProjectMember authoritative)
- [ ] ROLES-3 FIXUP-2: Answer Block mutations OWNER-only (GET membership-readable)
- [ ] ROLES-3 FIXUP-2: Members page uses "Add member" wording (not "Invite")
- [ ] ROLES-3 FIXUP-3: Frontend uses derived state from pendingApproval (no ephemeral flags)
- [ ] ROLES-3 FIXUP-3: EDITOR can NEVER apply, even if approval status is APPROVED
- [ ] ROLES-3 FIXUP-3: EDITOR "Apply" click creates/shows approval request status
- [ ] ROLES-3 FIXUP-3: Multi-user OWNER cannot self-request (shows "Add an Editor" message)
- [ ] ROLES-3 FIXUP-3: Single-user OWNER can create + approve + apply in one flow
- [ ] ROLES-3 FIXUP-3: Button states derive from pendingApproval?.status ('PENDING_APPROVAL' | 'APPROVED' | 'REJECTED')
- [ ] ROLES-3 FIXUP-3 PATCH 4.6: Approval status prefetched when Step 3 visible (auto, no CTA click)
- [ ] ROLES-3 FIXUP-3 PATCH 4.6: Switching playbooks clears stale approval state
- [ ] ROLES-3 FIXUP-3 PATCH 4.6: Disabling approval requirement clears approval state
- [ ] ROLES-3 FIXUP-4: AI usage endpoints (GET) accessible by all ProjectMembers
- [ ] ROLES-3 FIXUP-4: AI draft generation requires OWNER or EDITOR (VIEWER blocked)
- [ ] ROLES-3 FIXUP-4: Integrations GET accessible by all members, POST/PUT/DELETE OWNER-only
- [ ] ROLES-3 FIXUP-4: SEO scan results accessible by all members, startScan OWNER-only
- [ ] ROLES-3 FIXUP-4: Shopify SEO update OWNER-only
- [ ] ROLES-3 FIXUP-4: Apply fix from issue OWNER-only
- [ ] ROLES-3 FIXUP-4: Non-member blocked from all project-scoped endpoints (403)
- [ ] ROLES-3 FIXUP-5: Secondary OWNER (co-owner) can perform Shopify OWNER-only actions
- [ ] ROLES-3 FIXUP-5: Co-owner can sync-products, ensure-metafield-definitions, install
- [ ] ROLES-3 FIXUP-5: Co-owner can disconnect store (account OWNER + project OWNER)
- [ ] ROLES-3 FIXUP-5: Legacy Project.userId owner still works (backward compat)
- [ ] ROLES-3 PENDING-1: Approval attribution shows requester identity + timestamp
- [ ] ROLES-3 PENDING-1: Approval attribution shows approver identity + timestamp when approved
- [ ] ROLES-3 PENDING-1: Attribution hidden when approval not required

---

## Coverage Summary

| Critical Path | Manual Docs | Auto Tests | Status |
|---------------|-------------|------------|--------|
| CP-001: Auth | ✅ | ✅ | 🟢 Full Coverage |
| CP-002: Billing & Limits | ✅ | ✅ | 🟢 Full Coverage |
| CP-003: Product Optimize (AI) | ✅ | Planned | 🟡 Manual Only |
| CP-004: Crawl Pipeline | ✅ | Planned | 🟡 Manual Only |
| CP-005: DEO Score Compute | ✅ | Planned | 🟡 Manual Only |
| CP-006: Shopify Sync | ✅ | Planned | 🟡 Manual Only |
| CP-007: AI Failover Logic | ✅ | Planned | 🟡 Manual Only |
| CP-008: Frontend Global UX Feedback | ✅ | ✅ | 🟢 Full Coverage |
| CP-009: Issue Engine Lite | ✅ | ✅ | 🟢 Full Coverage |
| CP-010: Issue Engine Full | ✅ | Planned | 🟡 Manual Only |
| CP-011: Answer Engine | ✅ | Planned | 🟡 Manual Only |
| CP-012: Automation Engine | ✅ | Planned | 🟡 Manual Only |
| CP-013: Admin Operations | ✅ | ✅ | 🟢 Full Coverage |
| CP-014: Self-Service Control Plane | ✅ | ✅ | 🟢 Full Coverage |
| CP-015: Guided Onboarding | ✅ | Planned | 🟡 Manual Only (Impl Pending) |
| CP-016: Project Insights | ✅ | ✅ | 🟢 Full Coverage |
| CP-017: GEO Answer Readiness | ✅ | ✅ | 🟢 Full Coverage |
| CP-018: ROLES-2 Project Roles | ✅ | ✅ | 🟢 Full Coverage |
| CP-019: ROLES-3 Multi-User Projects | ✅ | ✅ | 🟢 Full Coverage |

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
| 2.4 | 2025-12-15 | Added AUTO-PB-1.3 (Planned) Preview Persistence & Cross-Surface Drafts scenario to CP-012 |
| 2.5 | 2025-12-18 | Added MEDIA-1 scenarios to CP-006 (Shopify Sync), CP-009 (Issue Engine Lite), CP-010 (Issue Engine Full) for Media & Accessibility pillar |
| 2.6 | 2025-12-19 | Added CP-013: Admin Operations Dashboard (ADMIN-OPS-1) with internal admin roles, impersonation, quota reset, and audit logging |
| 2.7 | 2025-12-19 | Added CP-014: Customer Self-Service Control Plane (SELF-SERVICE-1) with profile, preferences, sessions, and role-based access; updated CP-001 and CP-002 with SELF-SERVICE-1 scenarios |
| 2.8 | 2025-12-19 | Added CP-015: Guided Onboarding & First DEO Win (GTM-ONBOARD-1) - Docs Complete; Implementation Pending. Added manual testing guide and spec documentation. |
| 2.9 | 2025-12-19 | Added CP-016: Project Insights Dashboard (INSIGHTS-1) - Read-only derived insights with DEO progress, AI efficiency, issue resolution, and opportunity signals. |
| 3.0 | 2025-12-19 | Added BILLING-GTM-1 scenarios to CP-002: env-driven AI quota, trust messaging, contextual upgrade prompts, and marketing alignment. Added manual testing doc and Playwright test file. |
| 3.1 | 2025-12-19 | SECURITY: Added auth URL sanitization to CP-001. Middleware + client-side defense-in-depth prevents passwords in URL query params. Added manual testing doc and Playwright coverage. |
| 3.2 | 2025-12-19 | Added CP-017: GEO Answer Readiness & Citation Confidence (GEO-FOUNDATION-1) - Explainable readiness signals, derived citation confidence, Preview/Apply flow for answer improvements. |
| 3.3 | 2025-12-19 | GEO-INSIGHTS-2: Updated CP-016 and CP-017 with GEO Insights scenarios, added integration tests, upgraded CP-016 to Full Coverage. |
| 3.4 | 2025-12-20 | DEO-UX-REFRESH-1: Updated CP-001 (login branding), CP-003 (products list CTA/chips, AI labeling), CP-009 (issues tab consistency), CP-017 (shared report branding, print quality). Added manual testing doc. |
| 3.5 | 2025-12-21 | ENTERPRISE-GEO-1: Extended CP-016 and CP-017 with enterprise governance scenarios (passcode share links, mutation-free views, approval workflows, audit logging). No new CP introduced—governance extends existing GEO paths. |
| 3.6 | 2025-12-21 | PRODUCTS-LIST-2.0: Updated CP-003 with decision-first Products list scenarios (Health pill, recommended action, progressive disclosure, Rescan gating, Command Bar). Replaced DEO-UX-REFRESH-1 product-list bullets. Added manual testing doc. |
| 3.7 | 2025-12-21 | PRODUCTS-LIST-2.0: Added Sort by impact scenario to CP-003 (authoritative ladder, deterministic, stable). |
| 3.8 | 2025-12-21 | PRODUCTS-LIST-2.0: Added Bulk action confirmation scenario to CP-003 (3-step flow, AI disclosure, Apply uses no AI, partial failure handling). |
| 3.9 | 2025-12-23 | ROLES-2: Added CP-018 for Project Roles & Approval Foundations. Single-user role emulation, approval gating on Playbooks apply, role-aware UI. Added integration tests and Playwright coverage. |
| 4.0 | 2025-12-23 | ROLES-2 FIXUP-1: Fixed approval gating correctness (hasValidApproval returns object), changed to BadRequestException for APPROVAL_REQUIRED, consume approval after successful apply. Updated integration tests (400 status), Playwright tests (real seed endpoints), frontend (resolve role from profile, approve-and-apply flow). |
| 4.1 | 2025-12-23 | ROLES-3: Added CP-019 for True Multi-User Projects. ProjectMember model, OWNER-only apply enforcement, membership management API, multi-user auto-apply blocking. Updated CP-012 with multi-user auto-apply blocking scenario. |
| 4.2 | 2025-12-23 | ROLES-2 FIXUP-2: Frontend structured error parsing for NestJS nested error payloads (e.g., BadRequestException with object message). Prevents "Bad Request" generic message, preserves error codes like APPROVAL_REQUIRED. Added key scenario to CP-018. |
| 4.3 | 2025-12-23 | ROLES-3 FIXUP-2: Strict approval-chain matrix enforcement. Multi-user OWNER cannot create approval requests (must apply directly), accountRole ignored in multi-user projects (ProjectMember authoritative), isMultiUserProject in API response, Answer Block mutations OWNER-only, Members page "Add member" wording. Updated CP-019 scenarios. |
| 4.4 | 2025-12-23 | ROLES-3 FIXUP-3: Frontend correction for strict approval-chain matrix. Removed ephemeral approvalRequested flag in favor of derived state from server-sourced pendingApproval object. EDITOR can NEVER apply even if approved—only requests approval. Multi-user OWNER cannot self-request (must wait for EDITOR). Single-user OWNER preserves ROLES-2 convenience (create + approve + apply). Button states and notices derive from pendingApproval?.status. Updated CP-019 with FIXUP-3 test scenarios. |
| 4.5 | 2025-12-24 | ROLES-3 FIXUP-3 PATCH 4.6: Approval status prefetch and stale-state reset. Approval status auto-fetched when Step 3 visible (no CTA click needed). Stale approval cleared when switching playbooks or when policy changes. Includes stale-response guard for rapid playbook changes. Updated CP-019 verification scenario "UI derives from server state". |
| 4.6 | 2025-12-24 | ROLES-3 FIXUP-4: Membership + Role Enforcement Beyond projects/*. Eliminated legacy project.userId ownership gates in AI controller, ProductIssueFixService, SEO scan, Integrations, and Shopify services. Replaced with RoleResolutionService assertions (assertProjectAccess, assertOwnerRole, assertCanGenerateDrafts). Added integration tests for AI usage, integrations, and SEO scan endpoints. Updated CP-019 with FIXUP-4 scenarios. |
| 4.7 | 2025-12-24 | ROLES-3 FIXUP-5: Co-Owner Support for Shopify Actions. Shopify validateProjectOwnership uses RoleResolutionService (supports co-owners). Account disconnectStore uses assertOwnerRole for project-level check. Co-owner can perform install, sync-products, ensure-metafield-definitions, disconnect store. Added integration tests for multi-owner Shopify actions. Updated CP-006 and CP-019 with FIXUP-5 scenarios. |
| 4.8 | 2025-12-24 | ROLES-2 FIXUP-3: Role-specific apply denial messages. VIEWER apply denial returns "Viewer role cannot apply automation playbooks. Preview and export remain available." EDITOR apply denial returns "Editor role cannot apply automation playbooks. Request approval from an owner." Aligns backend messages with test expectations and manual testing docs. Updated CP-018 with FIXUP-3 scenarios. |
| 4.9 | 2025-12-24 | ROLES-3 PENDING-1: Approval attribution UI + doc alignment. Playbooks Step 3 shows requester/approver identity + timestamp. Updated CP-019 Auto Tests field (roles-3.test.ts present), Coverage Summary to Full Coverage. Added attribution scenarios to CP-019. |
| 5.0 | 2025-12-24 | ROLES-3-HARDEN-1: Added Playwright E2E tests (roles-3.spec.ts). Test A: EDITOR+OWNER approval workflow. Test B: VIEWER read-only gating. Test C: Multi-user project detection. Removed (planned) designation from CP-019 Auto Tests. |
| 5.1 | 2026-01-06 | NAV-IA-CONSISTENCY-1: Updated CP-001 with auth terminology scenarios ("Sign in" not "Log in", "Create account" not "Sign up"). Updated CP-008 with design tokens, dark mode toggle, and token-based styling. Added nav-ia-consistency-1.spec.ts automated tests. Added manual testing doc. |
| 5.2 | 2026-01-07 | DRAFT-CLARITY-AND-ACTION-TRUST-1: Updated CP-003 with 3-state draft lifecycle, Apply button gating, and inline guidance scenarios. Updated CP-006 with Apply uses saved draft (not AI) scenarios. Updated CP-008 with draft state banner, navigation blocking, GEO explainers, automation history filters, skip explanations, and internal ID leakage prevention scenarios. Added draft-clarity-and-action-trust-1.spec.ts E2E tests. Added manual testing doc. |
| 5.3 | 2026-01-07 | ISSUE-TO-FIX-PATH-1: Updated CP-008 with trust-safe issue routing scenarios (issue click lands on visible fix with context banner, actionable count parity, orphan suppression, Work Queue context banner). Added issue-to-fix-path-1.spec.ts E2E tests. Added manual testing doc. |
| 5.4 | 2026-01-07 | ISSUE-TO-FIX-PATH-1 FIXUP-1: Added CP-008 scenarios for circular import fix + orphan/dead-end cleanup. Issue-fix mode triggers on issueId alone, Overview/DEO use actionable-only, Project Issues severity counts are actionable-only, buildIssueFixHref preserves origin (from=overview/deo/issues). Updated ISSUE-TO-FIX-PATH-1.md manual testing doc. |
| 5.5 | 2026-01-07 | ISSUE-TO-FIX-PATH-1 FIXUP-2: Trust hardening — href-based actionability, dead-click prevention test, ID leakage prevention via safe title helpers. |
| 5.6 | 2026-01-07 | ISSUE-TO-FIX-PATH-1 FIXUP-3: Doc/test alignment — Work Queue issue-fix banner triggers on issueId (from optional); updated Playwright + manual testing; corrected CP-008 wording. |
| 5.7 | 2026-01-08 | COUNT-INTEGRITY-1: Updated CP-008 and CP-009 with count integrity scenarios (Work Queue → Issues click integrity, detected vs actionable semantics, role-based actionability, informational issue rendering). Added COUNT-INTEGRITY-1.md manual testing doc and planned count-integrity-1.spec.ts automated tests. |
| 5.8 | 2026-01-08 | COUNT-INTEGRITY-1 COMPLETE: Implemented all patches (PATCH 6 FIXUP, 7, 9). Created count-integrity-1.spec.ts with 3 smoke tests (click integrity, technical informational, viewer role). Updated Store Health & Work Queue banner terminology. Issues Engine UI corrections (effectiveMode, isClickableIssue semantics, countsSummary for pillar badges, pillar filter alignment). Marked test status as ✅ complete in CP-008 and CP-009. |
| 5.9 | 2026-01-08 | COUNT-INTEGRITY-1.1 BACKEND COMPLETE: PATCH BATCH 4 + FIXUP resolved Gap 3b (pages/collections dedup beyond cap-20). Updated 7 technical builders to populate full keys (PATCH 4.1), created collections seed with collectionIds (PATCH 4.2-FIXUP-1), added CANON-010 regression test with crawlResult IDs and scopeType=collections filter (PATCH 4.3-FIXUP-1 + FIXUP-2), comprehensive docs sweep (PATCH 4.4-FIXUP-1). Backend verified for all asset types via CANON-009 (products) + CANON-010 (collections). Updated CP-008 and CP-009 with Gap 3b verification. UI migration (Gap 6) + UI smoke test (Gap 7) remain pending. |
| 6.0 | 2026-01-08 | COUNT-INTEGRITY-1.1 COMPLETE: PATCH 5-10 resolved Gap 6 (UI Migration) and Gap 7 (UI Smoke Test). PATCH 5: Issues Engine filter-aligned canonical summary with TripletDisplay data-testid attributes. PATCH 6: Product detail uses assetIssues endpoint with triplet summary. PATCH 7: Store Health tiles use canonical counts. PATCH 8: Work Queue AI badge trust copy ("Does not use AI", "AI used for drafts only"). PATCH 9: Created count-integrity-1-1.ui.spec.ts with 6 cross-surface UI smoke tests. PATCH 10: Documentation updates. Removed ⚠️ warnings from CP-008 and CP-009, marked all COUNT-INTEGRITY-1.1 scenarios complete. |
| 6.1 | 2026-01-09 | COUNT-INTEGRITY-1.1 UI HARDEN + AUDIT FIX: Multi-action filtering via actionKeys (OR across keys), pillar-aware triplet display (currentTriplet from byPillar), severity-aligned canonical summary (passes severity to API), pillar-aware hasActionableIssues/hasDetectedIssues checks. Fixed UI smoke test auth (localStorage only) and product selection shape ({ products: [...] }). Verification complete (NO-OP) — all audit fixes confirmed implemented. |
| 6.2 | 2026-01-14 | ISSUE-FIX-KIND-CLARITY-1: Added CP-008 scenarios for DIAGNOSTIC vs EDIT/AI issue CTA semantics. DIAGNOSTIC issues show "Review" CTA (not "Fix"), blue arrival callout (not yellow/indigo), "View related issues" routes to Issues Engine. fixKind derived from config only (never URL). Added issue-fix-kind-clarity-1.spec.ts (7 tests) + LAC1-002b in list-actions-clarity-1.spec.ts. Added manual testing doc. FIXUP-2: Products list shows "Review" for DIAGNOSTIC-topped products, Work Queue shows blue review banner for DIAGNOSTIC issueId. |
| 6.3 | 2026-01-19 | PLAYBOOK-STEP-CONTINUITY-1: Added CP-012 scenarios for Step 2 → Step 3 deterministic transitions with explicit terminal outcomes. Added draftStatus/draftCounts to estimate response for draft validity reasoning. Added PLAYBOOK_DRAFT_EXPIRED explicit error code for apply. Added PLAYBOOK-STEP-CONTINUITY-1.md manual testing doc. |
| 6.4 | 2026-01-19 | DIAGNOSTIC-GUIDANCE-1: Added CP-009 scenarios for diagnostic guidance pattern on outside-control issues (actionability='informational'). Issues show "Informational — outside EngineO.ai control" badge, explanation text, and "How to address this" guidance block. No Fix/Apply CTAs on these issues. Added DIAGNOSTIC-GUIDANCE-1.md manual testing doc. |
| 6.5 | 2026-01-20 | SHOPIFY-SCOPE-IMPLICATIONS-1: Added CP-006 scenarios for scope implication rules. write_products satisfies read_products, write_content satisfies read_content, write_themes satisfies read_themes (no false missing scope warnings). Regression: read scopes do NOT imply write. Added SHOPIFY-SCOPE-IMPLICATIONS-1.md manual testing doc, updated SHOPIFY_SCOPES_MATRIX.md. |
| 6.6 | 2026-01-20 | SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1: Added CP-006 scenarios for authoritative granted-scope derivation (oauth_scope vs access_scopes_endpoint fallback), normalized scope storage (deduplicated, sorted), and capability-aware permission notice copy (catalog vs content vs combined wording). Added SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md manual testing doc. |
