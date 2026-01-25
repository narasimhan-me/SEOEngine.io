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

| Field                         | Value                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/user-profile-and-account-settings.md`, `docs/manual-testing/SELF-SERVICE-1.md`, `docs/manual-testing/SECURITY-LOGIN-QUERY-PARAMS.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/NAV-IA-CONSISTENCY-1.md` |
| **Automated Tests**           | `apps/api/test/integration/self-service-1.test.ts`, `apps/web/tests/auth-security.spec.ts`, `apps/web/tests/nav-ia-consistency-1.spec.ts`                                                                                                    |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                                                                                                                                                                 |
| **Last Verified (Automated)** | N/A                                                                                                                                                                                                                                          |
| **Owner**                     | Core Team                                                                                                                                                                                                                                    |

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

| Field                         | Value                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Manual Testing Doc(s)**     | `docs/testing/billing-and-limits.md`, `docs/testing/entitlements-matrix.md`, `docs/testing/plan-definitions.md`, `docs/manual-testing/SELF-SERVICE-1.md`, `docs/manual-testing/BILLING-GTM-1.md` |
| **Automated Tests**           | `apps/api/test/integration/self-service-1.test.ts`, `apps/web/tests/self-service-1.spec.ts`                                                                                                      |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                                                                                                                     |
| **Last Verified (Automated)** | N/A                                                                                                                                                                                              |
| **Owner**                     | Core Team                                                                                                                                                                                        |

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
- [ ] BILLING-GTM-1: Env-driven AI quota limits (AI*USAGE_MONTHLY_RUN_LIMIT*<PLAN>)
- [ ] BILLING-GTM-1: Contextual upgrade prompt on Insights when quota >=80%
- [ ] BILLING-GTM-1: Limit-style toast with Upgrade CTA on Playbooks quota warning
- [ ] BILLING-GTM-1: Marketing pricing aligned with backend limits (no mismatched claims)

---

### CP-003: Product Optimize (AI)

**Description:** AI-powered product optimization including Gemini integration, token tracking, failover logic, and response handling.

| Field                         | Value                                                                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/ai-systems.md`, `docs/testing/token-usage-tracking.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/PRODUCTS-LIST-2.0.md`, `docs/manual-testing/DRAFT-CLARITY-AND-ACTION-TRUST-1.md`, `docs/manual-testing/PRODUCTS-SHELL-REMOUNT-1.md` |
| **Automated Tests**           | `apps/web/tests/draft-clarity-and-action-trust-1.spec.ts`                                                                                                                                                              |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                                                                                                                                           |
| **Last Verified (Automated)** | N/A                                                                                                                                                                                                                    |
| **Owner**                     | AI Team                                                                                                                                                                                                                |

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
- [ ] PRODUCTS-SHELL-REMOUNT-1: Products list renders as canonical DataTable (columns: Product, Status, Actions)
- [ ] PRODUCTS-SHELL-REMOUNT-1: Row click expands/collapses (progressive disclosure, does NOT navigate)
- [ ] PRODUCTS-SHELL-REMOUNT-1: Action buttons do NOT trigger row expansion (data-no-row-click)
- [ ] PRODUCTS-SHELL-REMOUNT-1: Dark mode uses token-based styling (no white backgrounds)
- [ ] PRODUCTS-SHELL-REMOUNT-1: Loading states use container-relative positioning (py-12, not min-h-screen)
- [ ] PRODUCTS-SHELL-REMOUNT-1: Command Palette "Go to Products" navigation command works (project context aware)
- [ ] PRODUCTS-SHELL-REMOUNT-1: Eye icon opens RCP with product details (kind: 'product' descriptor)
- [ ] PRODUCTS-SHELL-REMOUNT-1: Enter/Space on focused row expands/collapses (rowEnterKeyBehavior='rowClick')

---

### CP-004: Crawl Pipeline

**Description:** Product crawling system including queue management, worker processing, progress tracking, and error handling.

| Field                         | Value                                                                |
| ----------------------------- | -------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/deo-pipeline.md`, `docs/testing/signals-collection.md` |
| **Automated Tests**           | Planned                                                              |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                         |
| **Last Verified (Automated)** | N/A                                                                  |
| **Owner**                     | Pipeline Team                                                        |

**Key Scenarios:**

- [ ] Manual crawl trigger
- [ ] Scheduled crawl execution
- [ ] Progress feedback in UI
- [ ] Partial failure handling
- [ ] Crawl completion and signal extraction

---

### CP-005: DEO Score Compute

**Description:** DEO score calculation pipeline including signal aggregation, weighting, score persistence, snapshot history, and v2 explainability layer.

| Field                         | Value                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/deo-score-compute-pipeline.md`, `docs/testing/deo-score-snapshots.md`, `docs/manual-testing/phase-2.6-deo-score-v2-explainability.md` |
| **Automated Tests**           | Planned                                                                                                                                             |
| **Last Verified (Manual)**    | 2025-12-08                                                                                                                                          |
| **Last Verified (Automated)** | N/A                                                                                                                                                 |
| **Owner**                     | DEO Team                                                                                                                                            |

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
| **Manual Testing Doc(s)** | `docs/testing/shopify-integration.md`, `docs/testing/product-sync.md`, `docs/testing/metadata-sync-seo-fields.md`, `docs/testing/sync-status-and-progress-feedback.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`, `docs/manual-testing/phase-shop-api-1-graphql-migration.md`, `docs/manual-testing/phase-shop-ux-cta-1-connect-shopify.md`, `docs/manual-testing/phase-shop-ux-cta-1-1-dedup-connect-shopify.md`, `docs/manual-testing/MEDIA-1.md`, `docs/manual-testing/DRAFT-CLARITY-AND-ACTION-TRUST-1.md`, `docs/manual-testing/SHOPIFY-ASSET-SYNC-COVERAGE-1.md`, `docs/manual-testing/SHOPIFY-SCOPE-RECONSENT-UX-1.md`, `docs/manual-testing/SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1.md`, `docs/manual-testing/BLOGS-ASSET-SYNC-COVERAGE-1.md`, `docs/manual-testing/SHOPIFY-SCOPE-IMPLICATIONS-1.md`, `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md`, `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1-FIXUP-2.md`, `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1-FIXUP-4.md`, `docs/manual-testing/SHOPIFY-EMBEDDED-SHELL-1.md` |
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
- [ ] SHOPIFY-SCOPE-TRUTH-1 FIXUP-2: Reconnect cannot downgrade existing scope storage (existing_scope_retained fallback)
- [ ] SHOPIFY-SCOPE-TRUTH-1 FIXUP-2: Never persist empty scopes (SHOPIFY_SCOPE_VERIFICATION_FAILED error)
- [ ] SHOPIFY-SCOPE-TRUTH-1 FIXUP-2: verify_failed UI shows clear error message with retry button
- [ ] SHOPIFY-SCOPE-TRUTH-1 FIXUP-3: verify_failed UI suppresses missing-scope list (no fake "Missing permission: ..." warnings)
- [ ] SHOPIFY-SCOPE-TRUTH-1 FIXUP-4: Suspicious OAuth + Access Scopes fails + existing scope = existing retained (no downgrade)
- [ ] SHOPIFY-SCOPE-TRUTH-1 FIXUP-4: Suspicious OAuth + Access Scopes fails + fresh install = verify_failed (explicit failure)
- [ ] SHOPIFY-SCOPE-TRUTH-1 FIXUP-4: Non-suspicious OAuth + Access Scopes fails = OAuth scope trusted as fallback
- [ ] SHOPIFY-SCOPE-PARSE-ROBUSTNESS-1: Legacy scope storage formats (JSON array / whitespace-delimited) must not cause false missing-scope blocks
- [ ] SHOPIFY-SCOPE-PARSE-ROBUSTNESS-1: Collections page does not show "Missing permission: read_products" when write_products is stored in any format
- [ ] SHOPIFY-SCOPE-PARSE-ROBUSTNESS-1: Pages/Blogs pages do not show "Missing permission: read_content" when read_content is stored in any format
- [ ] SHOPIFY-EMBEDDED-SHELL-1: App loads from Shopify Admin iframe without blank screens
- [ ] SHOPIFY-EMBEDDED-SHELL-1: Embedded context detection (embedded=1, host param, or stored host)
- [ ] SHOPIFY-EMBEDDED-SHELL-1: Host/shop persisted to sessionStorage for navigation continuity
- [ ] SHOPIFY-EMBEDDED-SHELL-1: URL auto-repaired when host missing but stored (router.replace)
- [ ] SHOPIFY-EMBEDDED-SHELL-1: Auth required fallback shows "Connecting to Shopify..." + Reconnect button
- [ ] SHOPIFY-EMBEDDED-SHELL-1: Missing context fallback shows "Please reopen from Shopify Admin" + Retry
- [ ] SHOPIFY-EMBEDDED-SHELL-1: Bootstrap error fallback shows "Open in EngineO.ai" standalone link
- [ ] SHOPIFY-EMBEDDED-SHELL-1: Login `next` param redirects to embedded URL after auth
- [ ] SHOPIFY-EMBEDDED-SHELL-1: 2FA flow preserves and uses stored next URL
- [ ] SHOPIFY-EMBEDDED-SHELL-1: frame-ancestors CSP header allows admin.shopify.com + *.myshopify.com
- [ ] SHOPIFY-EMBEDDED-SHELL-1: Standalone access unchanged (no embedded UI/notices)
- [ ] SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1: frame-ancestors CSP present for all app routes (unconditional, not query-param dependent)
- [ ] SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1: Embedded deep link + hard refresh never blanks (CSP always present)

---

### CP-007: AI Failover Logic

**Description:** AI service resilience including primary/fallback provider switching, timeout handling, and graceful degradation.

| Field                         | Value                                           |
| ----------------------------- | ----------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/ai-systems.md` (Failover section) |
| **Automated Tests**           | Planned                                         |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                    |
| **Last Verified (Automated)** | N/A                                             |
| **Owner**                     | AI Team                                         |

**Key Scenarios:**

- [ ] Primary provider timeout triggers failover
- [ ] Fallback provider success
- [ ] All providers fail gracefully
- [ ] Recovery to primary when available
- [ ] User notification of degraded state

---

### CP-008: Frontend Global UX Feedback

**Description:** Global UI feedback systems including toast notifications, loading states, error displays, inline validation, design tokens, theme support, trust-safe issue routing, and count integrity between Work Queue and Issues page.

| Field                         | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/frontend-ux-feedback-and-limits.md`, `docs/testing/toast-and-inline-feedback-system.md`, `docs/testing/modal-and-dialog-behavior.md`, `docs/manual-testing/NAV-IA-CONSISTENCY-1.md`, `docs/manual-testing/DRAFT-CLARITY-AND-ACTION-TRUST-1.md`, `docs/manual-testing/ISSUE-TO-FIX-PATH-1.md`, `docs/manual-testing/COUNT-INTEGRITY-1.md`, `docs/manual-testing/COUNT-INTEGRITY-1.1.md` ✅, `docs/manual-testing/ZERO-AFFECTED-SUPPRESSION-1.md`, `docs/manual-testing/ISSUE-FIX-KIND-CLARITY-1.md` ✅, `docs/manual-testing/DARK-MODE-SYSTEM-1.md` |
| **Automated Tests**           | `apps/web/tests/nav-ia-consistency-1.spec.ts`, `apps/web/tests/draft-clarity-and-action-trust-1.spec.ts`, `apps/web/tests/issue-to-fix-path-1.spec.ts`, `apps/web/tests/count-integrity-1.spec.ts` ✅, `apps/web/tests/count-integrity-1-1.spec.ts` ✅ (backend API), `apps/web/tests/count-integrity-1-1.ui.spec.ts` ✅ (UI smoke test), `apps/web/tests/zero-affected-suppression-1.spec.ts` ✅, `apps/web/tests/issue-fix-kind-clarity-1.spec.ts` ✅, `apps/web/tests/list-actions-clarity-1.spec.ts` (LAC1-002b) |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Last Verified (Automated)** | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Owner**                     | Frontend Team                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

**Key Scenarios:**

- [ ] Success toast display and auto-dismiss
- [ ] Error toast with action buttons
- [ ] Loading spinners during async operations
- [ ] Inline validation feedback
- [ ] Modal/dialog accessibility
- [ ] NAV-IA-CONSISTENCY-1: Design tokens (bg-background, text-foreground, etc.)
- [ ] NAV-IA-CONSISTENCY-1: Dark mode toggle with localStorage persistence
- [ ] NAV-IA-CONSISTENCY-1: Token-based styling on marketing pages
- [ ] DARK-MODE-SYSTEM-1: 3-mode theme selector (System/Light/Dark) with checkmark on selected mode
- [ ] DARK-MODE-SYSTEM-1: Theme preference persists across refresh and navigation (localStorage key: engineo_theme)
- [ ] DARK-MODE-SYSTEM-1: No flash of unstyled content (FOUC) on page load via early theme init script
- [ ] DARK-MODE-SYSTEM-1: System mode follows OS theme and reacts to OS theme changes
- [ ] DARK-MODE-SYSTEM-1: Dark mode coverage across Projects, Products, Issues, Playbooks, Settings
- [ ] DARK-MODE-SYSTEM-1: Semantic banners (error/warning/success/info) readable in dark mode
- [ ] DARK-MODE-SYSTEM-1: Theme toggle works in Shopify embedded iframe context
- [ ] DARK-MODE-SYSTEM-1: Light theme remains unchanged (regression check)
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

| Field                         | Value                                                                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/issue-engine-lite.md`, `docs/manual-testing/MEDIA-1.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/COUNT-INTEGRITY-1.md`, `docs/manual-testing/COUNT-INTEGRITY-1.1.md`, `docs/manual-testing/DIAGNOSTIC-GUIDANCE-1.md`, `docs/manual-testing/ISSUES-ENGINE-REMOUNT-1.md`, `docs/manual-testing/ISSUE-TO-ACTION-GUIDANCE-1.md`, `docs/manual-testing/ISSUE-FIX-ROUTE-INTEGRITY-1.md` ✅ |
| **Automated Tests**           | `packages/shared/src/media-accessibility-types.test.ts` (MEDIA-1), `apps/web/tests/count-integrity-1.spec.ts` ✅, `apps/web/tests/count-integrity-1-1.spec.ts` ✅ (backend API), `apps/web/tests/count-integrity-1-1.ui.spec.ts` ✅ (UI smoke test), `apps/web/tests/issue-fix-route-integrity-1.spec.ts` ✅           |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                                                                                                                                                                                  |
| **Last Verified (Automated)** | N/A                                                                                                                                                                                                                                                           |
| **Owner**                     | DEO Team                                                                                                                                                                                                                                                      |

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
- [ ] ISSUES-ENGINE-REMOUNT-1: Issues list rendered in canonical DataTable with hover/focus states
- [ ] ISSUES-ENGINE-REMOUNT-1: Row click opens RCP with issue details; eye icon opens RCP
- [ ] ISSUES-ENGINE-REMOUNT-1: PANEL-DEEP-LINKS-1 for issues (URL updates, copy/paste restores, back/forward)
- [ ] ISSUES-ENGINE-REMOUNT-1: Invalid entityId in deep-link shows safe "Issue not found." state
- [ ] ISSUES-ENGINE-REMOUNT-1: Token-only styling (no bg-white/gray-* flashes in dark mode)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-3: RCP Issue Details includes Issue summary (title + description)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-3: RCP Issue Details includes Why this matters with truthful fallback ("Not available for this issue.")
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-3: RCP Issue Details includes Actionability section with guidance (informational/blocked/actionable)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-3: RCP Issue Details includes Affected assets list when available (max 6 + overflow)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-3: Issue selection updates RCP without navigation (no route change)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-3/FIXUP-4: Blocked issue shows "Blocked — not actionable in this context" guidance (non-speculative, no Fix/Apply language)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-3: Informational issue shows "Informational — outside EngineO.ai control" guidance (no urgency language)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-5: Three-section hierarchy (Actionable now → Blocked → Informational) with section data-testids
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-5: Actionable now section dominance + <5s "what next" readability (comfortable density, strong header contrast)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-5: Blocked + Informational separation and de-emphasis (dense, collapsible in actionable mode)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-5: Action column semantics (Fix now / Review / Blocked non-clickable pill)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-5: Status column removed (section membership communicates status)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-5: Severity displayed as dot+label (not pill badge)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-5: Issue column compact meta line (severity + fixability + impact) for priority at-a-glance
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-5: TripletDisplay token-only (no text-gray-* literals), "Actionable now" first with bg-primary/10 emphasis
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-7: Issues preview Apply button reads "Apply saved draft to Shopify" (trust copy tightening, no behavior change)
- [ ] ISSUES-ENGINE-REMOUNT-1 FIXUP-8: Doc/Playwright alignment (manual testing docs updated, Playwright selectors hardened against copy drift, playwright.config.ts testDir corrected)
- [ ] ISSUE-TO-ACTION-GUIDANCE-1: RCP Issue Details shows informational guidance when mapping exists (no CTAs/links per RIGHT-CONTEXT-PANEL-AUTONOMY-1)
- [ ] ISSUE-TO-ACTION-GUIDANCE-1 FIXUP-1: Blocked/informational issues show "Automation Guidance" section (no "Recommended" language when nothing to recommend)
- [ ] ISSUE-TO-ACTION-GUIDANCE-1: Issues list shows subtle indicator (icon) for issues with playbook options (no buttons/links)
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Panel contains no in-body navigation links; guidance is informational only
- [ ] ISSUE-FIX-ROUTE-INTEGRITY-1: Actionable issue with AI preview shows Fix button (data-testid="issue-fix-next-button") that opens inline preview (no navigation)
- [ ] ISSUE-FIX-ROUTE-INTEGRITY-1: Direct fix link (data-testid="issue-fix-button") navigates to valid product workspace (no 404)
- [ ] ISSUE-FIX-ROUTE-INTEGRITY-1: "View affected" button (data-testid="issue-view-affected-button") routes to filtered Products list with issueType param
- [ ] ISSUE-FIX-ROUTE-INTEGRITY-1: Blocked issues show "Blocked" chip (data-testid="issue-blocked-chip") with tooltip and NO Fix CTAs
- [ ] ISSUE-FIX-ROUTE-INTEGRITY-1: Row click opens RCP; action button click does NOT open RCP (stopPropagation enforced via data-no-row-click)
- [ ] ISSUE-FIX-ROUTE-INTEGRITY-1: External "Open" links (data-testid="issue-open-button") have target="_blank" and rel="noopener noreferrer" with external icon
- [ ] ISSUE-FIX-ROUTE-INTEGRITY-1: Destination map (issueActionDestinations.ts) uses proper DeoIssue typing with optional shopifyAdminUrl
- [ ] ISSUE-FIX-ROUTE-INTEGRITY-1: Dev-time guardrail logs console warning for actionable issues with no fix destination (mapping gap detection)

---

### CP-010: Issue Engine Full (IE-2.0)

**Description:** Rich metadata enrichment for all DEO issues with categories, business impact explanations, fix guidance, AI fixability indicators, and effort estimation. Includes MEDIA pillar issue enrichment.

| Field                         | Value                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Manual Testing Doc(s)**     | `docs/manual-testing/phase-ux-8-issue-engine-full.md`, `docs/testing/issue-engine-full-*.md`, `docs/manual-testing/MEDIA-1.md` |
| **Automated Tests**           | `packages/shared/src/media-accessibility-types.test.ts` (MEDIA-1)                                                              |
| **Last Verified (Manual)**    | 2025-12-08                                                                                                                     |
| **Last Verified (Automated)** | N/A                                                                                                                            |
| **Owner**                     | DEO Team                                                                                                                       |

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

| Field                         | Value                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/answer-engine.md`, `docs/manual-testing/phase-ae-1-answer-engine-foundations.md`, `docs/manual-testing/phase-ae-1.1-answer-engine-detection.md`, `docs/manual-testing/phase-ae-1.2-answer-engine-generation-and-ui.md`, `docs/manual-testing/phase-ux-2-product-workspace-aeo-and-automation-ui.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md` |
| **Automated Tests**           | `apps/api/test/e2e/answer-engine.e2e-spec.ts`, `apps/api/test/e2e/answer-generation.e2e-spec.ts`                                                                                                                                                                                                                                                                                |
| **Last Verified (Manual)**    | 2025-12-09                                                                                                                                                                                                                                                                                                                                                                      |
| **Last Verified (Automated)** | N/A                                                                                                                                                                                                                                                                                                                                                                             |
| **Owner**                     | DEO Team                                                                                                                                                                                                                                                                                                                                                                        |

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

| Field                         | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/testing/automation-engine.md`, `docs/testing/automation-engine-product-automations.md`, `docs/manual-testing/phase-ae-1-automation-engine-foundations.md`, `docs/manual-testing/phase-ae-2-product-automations.md`, `docs/manual-testing/phase-aue-1-automation-new-product-seo-title.md`, `docs/manual-testing/phase-ux-2-product-workspace-aeo-and-automation-ui.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`, `docs/manual-testing/phase-automation-1-playbooks.md`, `docs/manual-testing/auto-pb-1-1-playbooks-hardening.md`, `docs/manual-testing/auto-pb-1-2-playbooks-ux-coherence.md`, `docs/manual-testing/AUTOMATION-ENTRY-1.md`, `docs/manual-testing/ZERO-AFFECTED-SUPPRESSION-1.md`, `docs/manual-testing/PLAYBOOK-STEP-CONTINUITY-1.md`, `docs/manual-testing/AUTOMATION-TRIGGER-TRUTHFULNESS-1.md`, `docs/manual-testing/PLAYBOOKS-SHELL-REMOUNT-1.md`, `docs/manual-testing/ISSUE-TO-ACTION-GUIDANCE-1.md` |
| **Automated Tests**           | `apps/api/test/e2e/automation-new-product-seo-title.e2e-spec.ts`, `apps/api/test/e2e/automation-playbooks.e2e-spec.ts`, `apps/web/tests/first-deo-win.spec.ts`, `apps/web/tests/automation-entry-1.spec.ts`, `apps/web/tests/zero-affected-suppression-1.spec.ts` ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Last Verified (Manual)**    | 2025-12-14                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Last Verified (Automated)** | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Owner**                     | DEO Team                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

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
- [ ] AUTOMATION-TRIGGER-TRUTHFULNESS-1: Page load never triggers AI (DEO issues GET is read-only)
- [ ] AUTOMATION-TRIGGER-TRUTHFULNESS-1: Project-level setting `autoGenerateAnswerBlocksOnProductSync` (default OFF)
- [ ] AUTOMATION-TRIGGER-TRUTHFULNESS-1: Setting gate suppresses Answer Block generation when OFF
- [ ] AUTOMATION-TRIGGER-TRUTHFULNESS-1: DB-backed idempotency via AnswerBlockAutomationRun model
- [ ] AUTOMATION-TRIGGER-TRUTHFULNESS-1: Sync CTA label shows "+ Generate Answer Blocks" only when setting ON + paid plan
- [ ] AUTOMATION-TRIGGER-TRUTHFULNESS-1: Playbooks Sync CTAs use same deterministic labeling
- [ ] AUTOMATION-TRIGGER-TRUTHFULNESS-1: Worker marks run state (QUEUED → RUNNING → SUCCEEDED/SKIPPED/FAILED)
- [ ] AUTOMATION-TRIGGER-TRUTHFULNESS-1: Diagnostic safety logs with suppressedReason for debugging
- [ ] PLAYBOOKS-SHELL-REMOUNT-1: Playbooks list remounted to canonical DataTable
- [ ] PLAYBOOKS-SHELL-REMOUNT-1: Row selection highlights playbook (no navigation)
- [ ] PLAYBOOKS-SHELL-REMOUNT-1: Eye icon opens RCP with playbook details (read-only)
- [ ] PLAYBOOKS-SHELL-REMOUNT-1: Deep-link restores panel state + selection alignment
- [ ] PLAYBOOKS-SHELL-REMOUNT-1: Preview → Estimate → Apply continuity preserved
- [ ] PLAYBOOKS-SHELL-REMOUNT-1: Zero-actionable estimate shows "No applicable changes" (no silent stall)
- [ ] PLAYBOOKS-SHELL-REMOUNT-1: Blocked messaging (Free plan) is truthful and non-urgent
- [ ] PLAYBOOKS-SHELL-REMOUNT-1: Shopify embedded iframe check (no horizontal overflow; RCP usable)
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: No "View playbook" CTA exists in Issue RCP (removed; guidance is informational only)
- [ ] PLAYBOOKS-SHELL-REMOUNT-1 FIXUP-2: RCP header external-link for playbooks uses canonical /playbooks/:playbookId route

---

### CP-013: Admin Operations Dashboard

**Description:** Internal-only operational control plane for Support Agents, Ops Admins, and Management/CEO with role-based access control, read-only impersonation, quota resets, safe resyncs, and immutable audit logging.

| Field                         | Value                                                     |
| ----------------------------- | --------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/manual-testing/ADMIN-OPS-1.md`, `docs/ADMIN_OPS.md` |
| **Automated Tests**           | `apps/api/test/integration/admin-ops-1.test.ts`           |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                              |
| **Last Verified (Automated)** | N/A                                                       |
| **Owner**                     | Core Team                                                 |

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

| Field                         | Value                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/manual-testing/SELF-SERVICE-1.md`, `docs/SELF_SERVICE.md`                             |
| **Automated Tests**           | `apps/api/test/integration/self-service-1.test.ts`, `apps/web/tests/self-service-1.spec.ts` |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                |
| **Last Verified (Automated)** | N/A                                                                                         |
| **Owner**                     | Core Team                                                                                   |

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

| Field                         | Value                                                            |
| ----------------------------- | ---------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/manual-testing/GTM-ONBOARD-1.md`, `docs/GTM_ONBOARDING.md` |
| **Automated Tests**           | Planned                                                          |
| **Last Verified (Manual)**    | N/A (Implementation Pending)                                     |
| **Last Verified (Automated)** | N/A                                                              |
| **Owner**                     | Core Team                                                        |

**Key Scenarios:**

- [ ] Onboarding eligibility (Shopify connected + no APPLY run)
- [ ] Issue selection ladder (Search & Intent > Media > Metadata)
- [ ] Start/advance/skip persistence per user+project
- [ ] Completion detection via AutomationPlaybookRun APPLY row
- [ ] Banner visibility under /projects/[id]/\* routes only
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

| Field                         | Value                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Manual Testing Doc(s)**     | `docs/manual-testing/INSIGHTS-1.md`, `docs/manual-testing/GEO-INSIGHTS-2.md`, `docs/manual-testing/ENTERPRISE-GEO-1.md`, `docs/IMPLEMENTATION_PLAN.md` |
| **Automated Tests**           | `apps/api/test/integration/geo-insights-2.test.ts`, `apps/api/test/integration/enterprise-geo-1.test.ts`                                               |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                                                                           |
| **Last Verified (Automated)** | N/A                                                                                                                                                    |
| **Owner**                     | Core Team                                                                                                                                              |

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

| Field                         | Value                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Manual Testing Doc(s)**     | `docs/manual-testing/GEO-FOUNDATION-1.md`, `docs/GEO_FOUNDATION.md`, `docs/GEO_INSIGHTS.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/GEO-EXPORT-1.md`, `docs/manual-testing/ENTERPRISE-GEO-1.md` |
| **Automated Tests**           | `packages/shared/src/geo-types.test.ts`, `apps/api/test/integration/geo-insights-2.test.ts`, `apps/api/test/integration/enterprise-geo-1.test.ts`                                                                        |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                                                                                                                                             |
| **Last Verified (Automated)** | N/A                                                                                                                                                                                                                      |
| **Owner**                     | DEO Team                                                                                                                                                                                                                 |

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

| Field                         | Value                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/manual-testing/ROLES-2.md`                                              |
| **Automated Tests**           | `apps/api/test/integration/roles-2.test.ts`, `apps/web/tests/roles-2.spec.ts` |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                  |
| **Last Verified (Automated)** | N/A                                                                           |
| **Owner**                     | Core Team                                                                     |

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

| Field                         | Value                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------- |
| **Manual Testing Doc(s)**     | `docs/manual-testing/ROLES-3.md`                                              |
| **Automated Tests**           | `apps/api/test/integration/roles-3.test.ts`, `apps/web/tests/roles-3.spec.ts` |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                  |
| **Last Verified (Automated)** | N/A                                                                           |
| **Owner**                     | Core Team                                                                     |

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

### CP-020: UI Shell & Right Context Panel (Structural)

**Description:** Foundational UI shell (Top Bar + Collapsible Left Nav + Center Work Canvas) and Right Context Panel per Design System v1.5. Provides the canonical layout frame for all authenticated pages with scroll containment, nav persistence, and contextual details panel.

| Field                         | Value                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Manual Testing Doc(s)**     | `docs/manual-testing/LAYOUT-SHELL-IMPLEMENTATION-1.md`, `docs/manual-testing/RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md`, `docs/manual-testing/TABLES-&-LISTS-ALIGNMENT-1.md`, `docs/manual-testing/COMMAND-PALETTE-IMPLEMENTATION-1.md`, `docs/manual-testing/NAV-HIERARCHY-POLISH-1.md`, `docs/manual-testing/RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md`, `docs/manual-testing/PANEL-DEEP-LINKS-1.md`, `docs/manual-testing/UI-POLISH-&-CLARITY-1.md`, `docs/manual-testing/RIGHT-CONTEXT-PANEL-AUTONOMY-1.md`, `docs/manual-testing/CENTER-PANE-NAV-REMODEL-1.md`, `docs/manual-testing/WORK-CANVAS-ARCHITECTURE-LOCK-1.md`, `docs/manual-testing/ICONS-LOCAL-LIBRARY-1.md` |
| **Automated Tests**           | Planned                                                                                                                                                            |
| **Last Verified (Manual)**    | [YYYY-MM-DD]                                                                                                                                                       |
| **Last Verified (Automated)** | N/A                                                                                                                                                                |
| **Owner**                     | Core Team                                                                                                                                                          |

**Key Scenarios:**

- [ ] LAYOUT-SHELL-1: Top Bar remains visible and does not scroll away
- [ ] LAYOUT-SHELL-1: Left Nav remains visible and does not scroll away
- [ ] LAYOUT-SHELL-1: Only Center Work Canvas scrolls (scroll containment)
- [ ] ~~LAYOUT-SHELL-1: Left Nav collapse/expand transitions cleanly~~ (OBSOLETE - removed per WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1)
- [ ] ~~LAYOUT-SHELL-1: Left Nav collapse state persists across page refresh (localStorage)~~ (OBSOLETE - removed per WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1)
- [ ] LAYOUT-SHELL-1: No unexpected white surfaces in dark mode
- [ ] LAYOUT-SHELL-1: Hover states do not turn white in dark mode
- [ ] LAYOUT-SHELL-1: Shell renders correctly in Shopify embedded iframe
- [ ] LAYOUT-SHELL-1: No double scrollbars in Shopify embedded context
- [ ] LAYOUT-SHELL-1: Common laptop widths (1024px) do not cause overlap
- [ ] RIGHT-CONTEXT-PANEL-1: Panel closes via close button click
- [ ] RIGHT-CONTEXT-PANEL-1: Panel closes via ESC key (when no modal dialog open)
- [ ] RIGHT-CONTEXT-PANEL-1: ESC key does NOT close panel when modal dialog is open
- [ ] RIGHT-CONTEXT-PANEL-1: Panel auto-closes when navigating to different nav section
- [ ] RIGHT-CONTEXT-PANEL-1: Desktop (≥1024px) shows pinned panel (pushes content)
- [ ] RIGHT-CONTEXT-PANEL-1: Narrow (<1024px) shows overlay panel with scrim
- [ ] RIGHT-CONTEXT-PANEL-1: Clicking scrim closes panel in overlay mode
- [ ] RIGHT-CONTEXT-PANEL-1: Focus returns to trigger element when panel closes
- [ ] RIGHT-CONTEXT-PANEL-1: Panel surfaces dark mode safe (no white backgrounds)
- [ ] RIGHT-CONTEXT-PANEL-1: Panel works in Shopify embedded iframe context
- [ ] RIGHT-CONTEXT-PANEL-1-FIXUP-4: admin/users Details trigger opens panel with correct descriptor fields (role, accountStatus, quotaPercent numeric-only)
- [ ] RIGHT-CONTEXT-PANEL-1-FIXUP-4: Work Queue Details trigger opens panel with scopeActionable/scopeDetected and aiDisclosureText
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Panel header displays entity name/title (not raw entityId) after detail data loads (products/pages/collections/playbooks)
- [ ] TABLES-LISTS-1: DataTable/DataList hover states dark-mode safe (no white)
- [ ] TABLES-LISTS-1: DataTable/DataList focus ring visible in dark mode
- [ ] TABLES-LISTS-1: Explicit "View details" action opens RCP (row click does not)
- [ ] TABLES-LISTS-1: Switching rows updates RCP content without navigation or flicker
- [ ] TABLES-LISTS-1: Tab into table/list enters row focus
- [ ] TABLES-LISTS-1: ArrowUp/ArrowDown moves focus between rows
- [ ] TABLES-LISTS-1: Enter/Space opens RCP for focused row
- [ ] TABLES-LISTS-1: Shopify embedded: no horizontal overflow on tables/lists
- [ ] TABLES-LISTS-1-FIXUP-3: /projects uses canonical DataTable (token-only styling)
- [ ] TABLES-LISTS-1-FIXUP-3: /dashboard uses canonical DataTable (token-only styling)
- [ ] TABLES-LISTS-1-FIXUP-3: /admin/users uses canonical DataTable with RCP integration
- [ ] TABLES-LISTS-1-FIXUP-3: /admin/runs uses canonical DataTable with filter selects
- [ ] TABLES-LISTS-1-FIXUP-3: /admin/ai-usage uses canonical DataTable for top consumers
- [ ] TABLES-LISTS-1-FIXUP-3: /admin/subscriptions uses canonical DataTable with in-row selects
- [ ] TABLES-LISTS-1-FIXUP-3: Keyboard guard prevents hijacking a/button/input/textarea/select/[contenteditable]/[data-no-row-keydown]
- [ ] TABLES-LISTS-1-FIXUP-4: /admin/audit-log uses canonical DataTable (columns: Time, Actor, Role, Action, Target)
- [ ] TABLES-LISTS-1-FIXUP-4: /admin/governance-audit uses canonical DataTable (columns: Time, Event Type, Actor, Project, Resource, Details)
- [ ] TABLES-LISTS-1-FIXUP-4: /admin/projects uses canonical DataTable (columns: User, Project, Shopify, DEO, Products, Last Sync, Last Run, Actions)
- [ ] TABLES-LISTS-1-FIXUP-4: /admin/users/[id] Recent Runs uses canonical DataTable (columns: Run Type, Status, AI Used, Created)
- [ ] TABLES-LISTS-1-FIXUP-4: /projects/[id]/assets/pages uses canonical DataTable (columns: Health, Path, Title, Action)
- [ ] TABLES-LISTS-1-FIXUP-4: /projects/[id]/assets/collections uses canonical DataTable (columns: Health, Handle, Title, Action)
- [ ] TABLES-LISTS-1-FIXUP-4: /projects/[id]/assets/blogs uses canonical DataTable (columns: Status, Handle, Title, Updated, Open)
- [ ] TABLES-LISTS-1-FIXUP-4: /projects/[id]/settings/governance Approvals tab uses canonical DataTable
- [ ] TABLES-LISTS-1-FIXUP-4: /projects/[id]/settings/governance Audit tab uses canonical DataTable
- [ ] TABLES-LISTS-1-FIXUP-4: /projects/[id]/settings/governance Sharing tab uses canonical DataTable
- [ ] TABLES-LISTS-1-FIXUP-4: /projects/[id]/automation/playbooks per-product results - initial token-based styling (superseded by FIXUP-5)
- [ ] TABLES-LISTS-1-FIXUP-5: /projects/[id]/automation/playbooks per-product results uses canonical DataTable (dense), with no legacy `<table>` markup
- [ ] TABLES-LISTS-1-FIXUP-6: /projects/[id]/automation/playbooks per-product results DataTable renders rows correctly (columns use DataTableColumn.cell, not render)
- [ ] COMMAND-PALETTE-1: Cmd+K / Ctrl+K opens command palette
- [ ] COMMAND-PALETTE-1: ESC closes command palette
- [ ] COMMAND-PALETTE-1: Outside click (scrim) closes command palette
- [ ] COMMAND-PALETTE-1: Focus restores to opener element on close
- [ ] COMMAND-PALETTE-1: Navigation commands route deterministically (project context vs fallback)
- [ ] COMMAND-PALETTE-1: No destructive/write/apply/run/generate commands present
- [ ] COMMAND-PALETTE-1: Admin command role-gated (hidden for non-admins)
- [ ] COMMAND-PALETTE-1: Shopify embedded: overlay contained, no overflow
- [ ] NAV-HIERARCHY-POLISH-1: Global Nav reads as strongest navigational tier (font-semibold active, primary color)
- [ ] NAV-HIERARCHY-POLISH-1: Section Nav reads as secondary tier (font-medium heading, neutral active state, no primary color)
- [ ] NAV-HIERARCHY-POLISH-1: Entity Tabs read as view switchers (token-only border-primary, no primary background)
- [ ] NAV-HIERARCHY-POLISH-1: RCP reads as auxiliary non-navigational (slides in, does not compete with nav hierarchy)
- [ ] NAV-HIERARCHY-POLISH-1: Mobile drawer uses token-only surfaces (bg-foreground/50 scrim, surface-raised panel)
- [ ] NAV-HIERARCHY-POLISH-1: Dark mode contrast preserved across all navigation tiers
- [ ] RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: No in-body navigation links in RCP (header external-link only)
- [ ] RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: Asset summary renders (Type/Status/Last synced/Last applied) for product/page/collection
- [ ] RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: Issues drilldown truthfulness + empty/loading states
- [ ] RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: Pillar-to-category mapping (Metadata/Content/Search Intent/Technical/Other)
- [ ] RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: "Why this matters" uses server-provided fields (whyItMatters else description)
- [ ] RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: Action preview is read-only and non-clickable (shows labels only when metadata present)
- [ ] RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: AI assist hints are collapsible and non-blocking (collapsed by default, no links, no chat)
- [ ] RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: Shopify embedded iframe safe (no overflow, scroll contained)
- [ ] PANEL-DEEP-LINKS-1: UI open updates URL (replaceState semantics, panel/entityType/entityId/entityTitle params)
- [ ] PANEL-DEEP-LINKS-1: Copy/paste deep link reproduces same panel state in new tab
- [ ] PANEL-DEEP-LINKS-1: Close panel removes all panel params from URL
- [ ] PANEL-DEEP-LINKS-1: Back/forward restores panel state when navigating between routes (replaceState does not create history entries for panel-only changes)
- [ ] PANEL-DEEP-LINKS-1: Invalid params (bad entityId/entityType/panel) fail safely, no crash
- [ ] PANEL-DEEP-LINKS-1: Shopify embedded query params preserved (shop, host) throughout panel open/close
- [ ] PANEL-DEEP-LINKS-1: Project-scoped deep link on non-project route shows "Unavailable in this project context." and does not fetch project data
- [ ] UI-POLISH-&-CLARITY-1: DataTable/DataList density padding py-2.5 (dense) / py-3.5 (comfortable)
- [ ] UI-POLISH-&-CLARITY-1: DataTable header text uses text-foreground/80 (not text-muted-foreground)
- [ ] UI-POLISH-&-CLARITY-1: DataTable/DataList hover uses bg-[hsl(var(--surface-raised))] (dark mode safe)
- [ ] UI-POLISH-&-CLARITY-1: ProjectSideNav active item has accent bar (before: pseudo-element, primary/60)
- [ ] UI-POLISH-&-CLARITY-1: ProjectSideNav inactive items use text-foreground/70 (increased contrast)
- [ ] UI-POLISH-&-CLARITY-1: LayoutShell breadcrumbs display (Projects > {name} > {section})
- [ ] UI-POLISH-&-CLARITY-1: RightContextPanel header py-3.5, content p-5 (increased spacing)
- [ ] UI-POLISH-&-CLARITY-1: ContextPanelContentRenderer sections use space-y-5 (increased separation)
- [ ] UI-POLISH-&-CLARITY-1: All styling is token-only (no literal palette classes)
- [ ] UI-POLISH-&-CLARITY-1: Dark mode shows no unexpected white backgrounds
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-1: RowStatusChip (common) uses token-only semantic backgrounds/foregrounds (no bg-green-*, bg-yellow-*, etc.)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-1: ProductIssuesPanel AI fixable badge is neutral token-only (no purple)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-1: ProductTable healthPillClasses fallback is token-only (no literal palette)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-1: Product detail header actions (Automate secondary, Apply success primary) are token-only
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-1: Playbooks "Playbook rules" block inputs/toggle are token-only and more breathable (px-3 py-2)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-2: Issue fix callout containers are token-only (no bg-*-50/border-*-200 literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-2: Issue fix highlight outline uses hsl(var(--primary)/alpha) (no raw rgb)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-2: Product detail: preview/expired/optimization/success/error banners use token-only styling
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-2: Product detail: metadata draft banner uses token-only semantic backgrounds/foregrounds
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-2: Playbooks: preview validity badge uses token-only warning/success tokens; preview sample blocks use token-only surfaces/links
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Issue fix anchors commented example block uses hsl(var(--primary)) (matches runtime HIGHLIGHT_CSS)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Product detail tab headers use text-foreground/text-muted-foreground/text-primary (no gray-900/gray-500/blue-600 literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Product detail AI diagnostic toggle button uses token-only styling (border-border, surface-card, ring-primary)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Product detail SEO editor highlight ring uses ring-primary ring-offset-background (no literal blue)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks page has ZERO remaining literal palette classes (no bg-gray/blue/amber/red/green/yellow-*, text-*-*, border-*-*, focus:ring-blue-*, text-white literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks draft status badges use token-only success/warning backgrounds (no green-100/yellow-100 literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks eligibility badges use token-only success/muted backgrounds (no green-100 literal)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks saved preview callout uses token-only info tokens (no blue-* literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks continue blocked panel uses token-only warning tokens (no amber-* literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks draft blocker panels (EXPIRED/FAILED/missing) use token-only warning/danger/neutral tokens
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks apply inline error banners use token-only warning tokens (no amber-* literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks apply result summary uses token-only success tokens (no green-* literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks stopped safely/skipped products banners use token-only warning tokens
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks status column badges use token-only success/warning/danger/muted tokens (no green/amber/red-100 literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks approval status messages use token-only success/warning foregrounds (no green-600/amber-600 literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks checkbox uses token-only primary (no border-gray-300 text-blue-600 focus:ring-blue-500 literals)
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-3: Playbooks generate/apply buttons use token-only primary/warning/danger styling
- [ ] UI-POLISH-&-CLARITY-1 FIXUP-4: Playbooks "AI usage this month" callout uses token-only styling (no purple-* literals)
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Panel auto-opens on entity detail routes (products, pages, collections, playbooks)
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Panel auto-closes on contextless list routes (projects list, dashboard, list pages without selection)
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Manual dismissal (X, ESC, scrim click) respected until context meaningfully changes
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: URL params (panel, entityType, entityId) written on auto-open (replaceState semantics)
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Deep-links (PANEL-DEEP-LINKS-1) continue to work correctly
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Shell-level Action/Details grouped control removed (only breadcrumbs + title in header)
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Pin toggle removed from RCP header
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Width toggle removed from RCP header
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: View tabs (Details/Recommendations/History/Help) removed
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Cmd/Ctrl + '.' shortcut removed
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: No in-body navigation links exist anywhere in RCP body
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Header external-link is the only navigation affordance
- [ ] RIGHT-CONTEXT-PANEL-AUTONOMY-1: Shopify embedded iframe safe (no overflow, scroll contained)
- [ ] CENTER-PANE-NAV-REMODEL-1: Standardized header structure (breadcrumbs/title/description/actions) on Issues page
- [ ] CENTER-PANE-NAV-REMODEL-1: Standardized header structure (breadcrumbs/title/description/actions) on Playbooks page
- [ ] CENTER-PANE-NAV-REMODEL-1: Product detail shows only one header (hideHeader: true; no duplicate shell header)
- [ ] CENTER-PANE-NAV-REMODEL-1: Product detail has no in-canvas breadcrumbs nav block
- [ ] CENTER-PANE-NAV-REMODEL-1: ProjectSideNav demoted to low-emphasis contextual index (lighter typography, tighter spacing, subtle active state)
- [ ] CENTER-PANE-NAV-REMODEL-1: RCP remains autonomous (no new toggles/modes in shell header)
- [ ] CENTER-PANE-NAV-REMODEL-1: Shopify embedded iframe sanity (no overflow/regressions)
- [ ] CENTER-PANE-NAV-REMODEL-1-FIXUP-1: Pillar pages (keywords, performance, media, competitors, local) use shell header integration
- [ ] CENTER-PANE-NAV-REMODEL-1-FIXUP-1: Pillar pages have no in-canvas breadcrumbs nav or h1 header blocks
- [ ] CENTER-PANE-NAV-REMODEL-1-FIXUP-1: Members settings page uses shell header (breadcrumbs/title/description)
- [ ] CENTER-PANE-NAV-REMODEL-1-FIXUP-1: New Playbook entry page uses shell header (breadcrumbs/title/description)
- [ ] CENTER-PANE-NAV-REMODEL-1-FIXUP-1: Content Workspace page uses shell header (breadcrumbs/title/description)
- [ ] CENTER-PANE-NAV-REMODEL-1-FIXUP-1: /media route activates "Insights" item in ProjectSideNav (insightsPillarRoutes includes 'media')
- [ ] CENTER-PANE-NAV-REMODEL-1-FIXUP-2: GEO Insights page has no in-canvas breadcrumb `<nav>` and no duplicated in-canvas header row; shell header owns title/actions
- [ ] CENTER-PANE-NAV-REMODEL-1-FIXUP-3: GEO Insights breadcrumbs show real project name (no placeholder override)
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Left rail icon-only always (no collapse/expand toggle) [FIXUP-1]
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Left rail has no badges, counters, or status indicators
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Persistent vertical border between left rail and center pane (border-border token)
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Persistent vertical border between center pane and RCP (border-border token)
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Center pane reads as first-class work canvas (bg-background distinct from side surfaces)
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: No ambiguous global "Action" button in center-pane header
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Scoped nav (ProjectSideNav) wrapped in distinct container surface (border + surface-card bg)
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Scoped nav active state strengthened (more visible accent bar + font-semibold)
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Scoped nav has no icons or counters/badges
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: RCP has no navigation or mode switching controls
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: RCP header external-link is the only navigation affordance
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Title hierarchy: center pane title > RCP title
- [ ] WORK-CANVAS-ARCHITECTURE-LOCK-1: Shopify embedded iframe sanity (no overflow, no nested-frame feel)
- [ ] ICONS-LOCAL-LIBRARY-1: No requests to Google Fonts/CDN for icons (DevTools Network tab verification)
- [ ] ICONS-LOCAL-LIBRARY-1: sprite.svg loaded from `/icons/material-symbols/sprite.svg`
- [ ] ICONS-LOCAL-LIBRARY-1: Icons render offline (after initial cache)
- [ ] ICONS-LOCAL-LIBRARY-1: Left rail nav shows Icon component icons (home, inventory_2, settings, campaign, admin_panel_settings)
- [ ] ICONS-LOCAL-LIBRARY-1: Search icon renders in command palette trigger (desktop bar + mobile icon button)
- [ ] ICONS-LOCAL-LIBRARY-1: RowStatusChip shows Icon + clean label (no emoji prefix in rendered text)
- [ ] ICONS-LOCAL-LIBRARY-1: Decorative icons have aria-hidden="true"
- [ ] ICONS-LOCAL-LIBRARY-1: Nav items have aria-label for accessibility (icons decorative, label on parent)
- [ ] ICONS-LOCAL-LIBRARY-1: No console errors about missing icons or failed sprite loads
- [ ] ICONS-LOCAL-LIBRARY-1 FIXUP-1: auto_fix_high icon is viewBox-safe (no clipped right edge)

---

## Coverage Summary

| Critical Path                       | Manual Docs | Auto Tests | Status                        |
| ----------------------------------- | ----------- | ---------- | ----------------------------- |
| CP-001: Auth                        | ✅          | ✅         | 🟢 Full Coverage              |
| CP-002: Billing & Limits            | ✅          | ✅         | 🟢 Full Coverage              |
| CP-003: Product Optimize (AI)       | ✅          | Planned    | 🟡 Manual Only                |
| CP-004: Crawl Pipeline              | ✅          | Planned    | 🟡 Manual Only                |
| CP-005: DEO Score Compute           | ✅          | Planned    | 🟡 Manual Only                |
| CP-006: Shopify Sync                | ✅          | Planned    | 🟡 Manual Only                |
| CP-007: AI Failover Logic           | ✅          | Planned    | 🟡 Manual Only                |
| CP-008: Frontend Global UX Feedback | ✅          | ✅         | 🟢 Full Coverage              |
| CP-009: Issue Engine Lite           | ✅          | ✅         | 🟢 Full Coverage              |
| CP-010: Issue Engine Full           | ✅          | Planned    | 🟡 Manual Only                |
| CP-011: Answer Engine               | ✅          | Planned    | 🟡 Manual Only                |
| CP-012: Automation Engine           | ✅          | Planned    | 🟡 Manual Only                |
| CP-013: Admin Operations            | ✅          | ✅         | 🟢 Full Coverage              |
| CP-014: Self-Service Control Plane  | ✅          | ✅         | 🟢 Full Coverage              |
| CP-015: Guided Onboarding           | ✅          | Planned    | 🟡 Manual Only (Impl Pending) |
| CP-016: Project Insights            | ✅          | ✅         | 🟢 Full Coverage              |
| CP-017: GEO Answer Readiness        | ✅          | ✅         | 🟢 Full Coverage              |
| CP-018: ROLES-2 Project Roles       | ✅          | ✅         | 🟢 Full Coverage              |
| CP-019: ROLES-3 Multi-User Projects | ✅          | ✅         | 🟢 Full Coverage              |
| CP-020: UI Shell & Right Context Panel | ✅       | Planned    | 🟡 Manual Only                |

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
| 6.7 | 2026-01-20 | SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-2: Added CP-006 scenarios for empty-scope persistence guard (reconnect cannot downgrade, never persist empty scopes, verify_failed UI). Added SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1-FIXUP-2.md manual testing doc. |
| 6.8 | 2026-01-20 | SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-3: Added CP-006 scenario for verify_failed UI suppressing missing-scope list (no fake warnings from empty data). |
| 6.9 | 2026-01-20 | SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-4: Added CP-006 scenarios for suspicious OAuth downgrade prevention. Suspicious OAuth + Access Scopes fails + existing = retain existing (no downgrade). Suspicious OAuth + Access Scopes fails + fresh install = verify_failed (explicit failure). Non-suspicious OAuth fallback unchanged. Added SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1-FIXUP-4.md manual testing doc. |
| 6.10 | 2026-01-20 | SHOPIFY-SCOPE-PARSE-ROBUSTNESS-1: Added CP-006 scenarios for legacy scope storage format compatibility. `parseShopifyScopesCsv()` now handles JSON arrays and whitespace-delimited strings from Prisma Json field. Prevents false "Missing permission: read_products/read_content" blocks when scopes are stored in legacy formats. Updated unit tests, SHOPIFY_SCOPES_MATRIX.md, and SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md with regression check steps. |
| 6.11 | 2026-01-20 | AUTOMATION-TRIGGER-TRUTHFULNESS-1: Added CP-012 scenarios for truthful automation triggers. Page load never triggers AI (DEO issues read-only), project-level setting gate `autoGenerateAnswerBlocksOnProductSync` (default OFF), DB-backed idempotency via AnswerBlockAutomationRun model, deterministic Sync CTA labels ("+ Generate Answer Blocks" only when setting ON + paid plan), worker run state tracking (QUEUED→RUNNING→terminal), diagnostic safety logs with suppressedReason. Added manual testing doc. |
| 6.12 | 2026-01-20 | AUTOMATION-TRIGGER-TRUTHFULNESS-1 REVIEW-1: Fixed Playbooks CTA labels ("Sync products" not "Sync to Shopify"), neutral toast message, race-safe idempotency (FAILED→QUEUED transition via conditional updateMany, concurrent trigger handling), web API typing for new setting. Rewrote manual test doc to match template structure. |
| 6.13 | 2026-01-20 | SHOPIFY-EMBEDDED-SHELL-1: Added CP-006 scenarios for Shopify embedded app launch. ShopifyEmbeddedShell wrapper with never-blank fallbacks, host/shop persistence to sessionStorage, URL auto-repair, frame-ancestors CSP headers, auth flow with next param preservation (login + 2FA). Added @shopify/app-bridge-react dep, NEXT_PUBLIC_SHOPIFY_API_KEY env var. Added SHOPIFY-EMBEDDED-SHELL-1.md manual testing doc. |
| 6.14 | 2026-01-21 | SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1: Added CP-006 scenarios for unconditional CSP header reliability. frame-ancestors CSP now applied to all app routes regardless of embedded query params (server has no sessionStorage). Ensures deep links and hard refreshes inside Shopify iframe never blank. Updated middleware.ts and manual testing doc. |
| 6.15 | 2026-01-21 | DARK-MODE-SYSTEM-1: Added CP-008 scenarios for global theme system. 3-mode theme selector (System/Light/Dark) with localStorage persistence, no-FOUC early theme init script, single-source-of-truth CSS design tokens with dark palette aligned to Coming Soon direction, centralized .dark utility remaps for broad coverage without mass file edits. Theme works in Shopify embedded iframe. Added DARK-MODE-SYSTEM-1.md manual testing doc. |
| 6.16 | 2026-01-21 | PRODUCTS-SHELL-REMOUNT-1: Added CP-003 scenarios for Products list remount onto canonical DataTable. DataTable extended with onRowClick/isRowExpanded/renderExpandedContent props. ProductTable refactored to use DataTable with expansion support for progressive disclosure. Token-based shell-safe styling (no min-h-screen, no bg-white). Command Palette "Go to Products" navigation command. Added PRODUCTS-SHELL-REMOUNT-1.md manual testing doc. |
| 6.17 | 2026-01-22 | NAV-HIERARCHY-POLISH-1: Added CP-020 scenarios for navigation tier visual hierarchy. Global Nav (strongest tier) with font-semibold active + primary color. Section Nav (demoted) with font-medium heading + neutral active state. Entity Tabs as view switchers (token-only border-primary). RCP as auxiliary non-navigational. Mobile drawer with token-only surfaces. Added NAV-HIERARCHY-POLISH-1.md manual testing doc. |
| 6.18 | 2026-01-22 | RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1: Added CP-020 scenarios for RCP content expansion. No in-body navigation links (header external-link only). Asset summary renders (Type/Status/Last synced/Last applied). Issues drilldown truthfulness + empty/loading states. Pillar-to-category mapping (Metadata/Content/Search Intent/Technical/Other). "Why this matters" uses server-provided fields. Action preview is read-only (no buttons/links). AI assist hints are collapsible and non-blocking. Shopify iframe safe (scroll contained). Added RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md manual testing doc. |
| 6.19 | 2026-01-22 | TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4: Added CP-020 scenarios for remaining DataTable migrations. 9 pages migrated: /admin/audit-log, /admin/governance-audit, /admin/projects, /admin/users/[id] Recent Runs, /projects/[id]/assets/pages, /projects/[id]/assets/collections, /projects/[id]/assets/blogs, /projects/[id]/settings/governance (3 tables), /projects/[id]/automation/playbooks per-product results. All use canonical DataTable or token-based styling. Empty states outside DataTable. Updated TABLES-&-LISTS-ALIGNMENT-1.md with HP-015 through HP-023 test scenarios. |
| 6.20 | 2026-01-22 | TABLES-&-LISTS-ALIGNMENT-1 FIXUP-5: Completed Playbooks per-item results DataTable migration. Per-product results now uses canonical DataTable (dense) instead of legacy `<table>` markup. Updated CP-020 FIXUP-4 playbooks line to not claim "token-based styling" as end state. Added FIXUP-5 checklist item. Updated TABLES-&-LISTS-ALIGNMENT-1.md HP-023 to require canonical DataTable usage. |
| 6.21 | 2026-01-22 | TABLES-&-LISTS-ALIGNMENT-1 FIXUP-6: DataTable column contract correctness. Playbooks per-product results DataTable used `render` instead of `cell` for column renderers, causing blank cells at runtime. Updated columns to use `cell` (correct DataTableColumn contract). Updated CP-020 checklist and TABLES-&-LISTS-ALIGNMENT-1.md HP-023. |
| 6.22 | 2026-01-22 | PANEL-DEEP-LINKS-1: Added CP-020 scenarios for shareable Right Context Panel state via URL deep-links. URL schema (panel, entityType, entityId, optional entityTitle). UI open writes URL params (replaceState semantics). Tab switch updates panel param. Close removes all panel params. Back/forward restores state. Invalid params fail safely (no crash, no auto-clean). Shopify embedded params preserved. Products list and Admin Users verified as integration proof points. Added PANEL-DEEP-LINKS-1.md manual testing doc. |
| 6.23 | 2026-01-22 | PANEL-DEEP-LINKS-1 FIXUP-1: Type safety + back/forward semantics + project-scope guard. (1) Fixed type mismatch: parseDeepLinkParams now uses structural type `ReadableSearchParams` compatible with Next.js useSearchParams(). (2) Updated HP-005 manual test to match replaceState semantics (back/forward applies across route navigations, not panel-only changes on same route). (3) Added project-scope guard: product/page/collection/blog/issue deep links on non-/projects/:id routes set scopeProjectId to sentinel `__outside_project__` to force "Unavailable in this project context." state. User entity type remains non-project-scoped. Added EC-007 edge case scenario. |
| 6.24 | 2026-01-22 | ISSUES-ENGINE-REMOUNT-1: Updated CP-009 with DataTable migration and RCP issue details integration. Issues list remounted to canonical DataTable with row click → RCP, eye icon → RCP, PANEL-DEEP-LINKS-1 issue deep-links. ContextPanelIssueDetails component renders pillar/severity/status/affected counts. Token-only styling (no bg-white/gray flashes in dark mode). Existing preview/draft/apply flow preserved via DataTable expansion rows. Added ISSUES-ENGINE-REMOUNT-1.md manual testing doc. |
| 6.25 | 2026-01-22 | ISSUES-ENGINE-REMOUNT-1 FIXUP-1: Token-only enforcement + removed invalid semantic Tailwind classes. Replaced remaining literal palette classes (bg-white, bg-gray-*, text-gray-*, border-red/yellow/amber/blue-*, text-red/yellow/amber/blue-*) with token-only arbitrary values (--danger-*, --warning-*, --info-*, --success-*). Removed invalid semantic classes (bg-destructive, bg-warning, bg-success, text-destructive, text-success, text-warning-foreground, hover:bg-accent) that are not configured in tailwind.config.ts. Updated page.tsx (loading, error banner, warning banner, header, triplet container, zero-actionable banner, severity cards, filter labels, filter buttons, DataTable severity badges, expanded preview panel, empty state). Updated ContextPanelIssueDetails.tsx (error state, getSeverityClass). Updated ISSUES-ENGINE-REMOUNT-1.md (doc paths, HP-003 API expectation). |
| 6.26 | 2026-01-22 | ISSUES-ENGINE-REMOUNT-1 FIXUP-2: TypeScript safety fix for Issues DataTable title click. Changed conditional render from `isClickableIssue ? (...)` to `fixHref && isClickableIssue ? (...)` so `fixHref` is narrowed to a non-null string before being passed to `handleIssueClick()`. No behavioral change - same actionable logic preserved. |
| 6.27 | 2026-01-22 | UI-POLISH-&-CLARITY-1: Visual polish pass for Design System v1.5 alignment. Updated DataTable/DataList density padding (py-2.5/py-3.5), header text color (text-foreground/80), hover states (surface-raised). Added ProjectSideNav active accent bar + increased inactive contrast. Added LayoutShell breadcrumbs. Increased RCP header/content padding. Increased ContextPanelContentRenderer section spacing. All styling token-only (no literal palette classes). Added manual testing doc. |
| 6.28 | 2026-01-22 | UI-POLISH-&-CLARITY-1 FIXUP-1: Token compliance corrections + removal of unintended new components. Updated common/RowStatusChip.tsx with token-only semantic colors (--success/warning/info/danger-background/foreground). Deleted unintended /components/ui/RowStatusChip.tsx and /components/panels/ProductIssuesPanel.tsx. Updated optimization/ProductIssuesPanel.tsx with token-only triplet container, text colors, pillar groups, severity colors, FixNextBadge, IssueRow hover, and neutral AI fixable badge. Updated ProductTable.tsx healthPillClasses fallback with token-only styling. Updated products/[productId]/page.tsx with token-only "Product not found" panel, back links, sticky header, status/DEO issues pills, draft state indicator, and action buttons. Updated playbooks/page.tsx "Playbook rules" block with token-only container, toggle switch, and inputs. Added FIXUP-1 checklist items to CP-020. |
| 6.29 | 2026-01-22 | UI-POLISH-&-CLARITY-1 FIXUP-2: Token-only completion for remaining high-signal surfaces. Updated issue-fix-anchors.ts getArrivalCalloutContent() containerClass outputs (coming_soon/external_fix/already_compliant/diagnostic/anchor_not_found/actionable→token-only) and HIGHLIGHT_CSS outline colors (rgb→hsl(var(--primary)/alpha)). Updated products/[productId]/page.tsx preview mode banner (purple→info), preview expired banner (amber→warning with token CTA), issue fix banner actions (indigo/blue→primary/border tokens), optimization banner (blue→info), success/error banners (green/red→success/danger), metadata draft banner (yellow/blue/green→warning/info/success), guidance callout (indigo→info). Updated playbooks/page.tsx previewValidityClass (amber/green→warning/success), loading/empty states (gray→surface-raised), preview sample section (gray→token surfaces, blue→primary link). Added FIXUP-2 checklist items to CP-020. |
| 6.30 | 2026-01-22 | UI-POLISH-&-CLARITY-1 FIXUP-3: Complete token-only cleanup for ALL remaining literal palette classes. Updated issue-fix-anchors.ts commented example block (rgb→hsl(var(--primary))). Updated products/[productId]/page.tsx tab headers (gray→text-foreground/muted-foreground), AI diagnostic toggle button (gray/blue→border-border/surface-card/ring-primary), SEO editor ring (blue→ring-primary ring-offset-background). Updated playbooks/page.tsx: COMPLETE token cleanup removing ALL literal palette classes - draft status badges (green/yellow→success/warning), eligibility badges (green→success/muted), saved preview callout (blue→info), continue blocked panel (amber→warning), draft blocker panels EXPIRED/FAILED/missing (amber/red/gray→warning/danger/neutral), regenerate buttons (amber→warning), retry button (red→danger), generate button (blue→primary), apply inline error banners (amber→warning), apply result summary (green→success), stopped safely/skipped banners (amber→warning), link in warning banner (amber-700/900→warning-foreground/foreground), status column badges (green/amber/red→success/warning/danger), approval status messages (green/amber-600→success/warning-foreground), checkbox (gray/blue→border/primary), apply button (blue→primary). ZERO remaining literal palette classes in playbooks/page.tsx. Added FIXUP-3 checklist items to CP-020. |
| 6.31 | 2026-01-22 | UI-POLISH-&-CLARITY-1 FIXUP-4: Tokenized remaining "AI usage this month" callout. Removed all purple-* literals (border-purple-100, bg-purple-50, text-purple-900, text-purple-700, text-purple-600) and replaced with token-only styling (border-border, bg-[hsl(var(--surface-raised))], text-foreground, text-muted-foreground). Preserved text-[hsl(var(--success-foreground))] for "AI runs avoided" line. Added FIXUP-4 checklist item to CP-020. |
| 6.32 | 2026-01-22 | ISSUES-ENGINE-REMOUNT-1 FIXUP-3: RCP Issue Details completeness + truthfulness. Added Issue Summary section (title + description), Why This Matters section with truthful fallback (prefers whyItMatters, fallback "Not available for this issue." without duplicating description), Actionability section replacing Status (informational/blocked/actionable labels with guidance text, no Fix/Apply wording), Affected Assets list (max 6 items + overflow). All content read-only with token-only styling, no in-body navigation links. Added FIXUP-3 checklist items to CP-009. |
| 6.33 | 2026-01-22 | ISSUES-ENGINE-REMOUNT-1 FIXUP-4: Actionability truthfulness correction. Updated blocked label from "Blocked — insufficient permissions" to "Blocked — not actionable in this context" (non-speculative, no claims about permissions/elevated access). Updated blocked guidance to be truthful and non-speculative. Changed isActionableNow logic: only treat as "Actionable now" when explicitly true (undefined now treated as blocked). Updated CP-009 checklist wording and HP-009 manual test expectations. |
| 6.34 | 2026-01-22 | PLAYBOOKS-SHELL-REMOUNT-1: Playbooks list remounted to canonical DataTable + RCP integration. (1) Added 'playbook' to ALLOWED_ENTITY_TYPES and PROJECT_SCOPED_ENTITY_TYPES for deep-link support; (2) Added PlaybookDetailsContent renderer (What it does, Applicable assets, Preconditions, Availability state, History stub); (3) Replaced card-based playbooks grid with DataTable (columns: Playbook, What It Fixes, Asset Type, Availability); (4) Selection is now in-page state (no navigation on row click); (5) Eye icon opens RCP with playbook details; (6) Deep-link compatibility: URL panel params sync selectedPlaybookId for highlight alignment. Preview → Estimate → Apply flow preserved. Token-only styling. Added PLAYBOOKS-SHELL-REMOUNT-1.md manual testing doc. Updated CP-012 with checklist items. |
| 6.35 | 2026-01-22 | PLAYBOOKS-SHELL-REMOUNT-1 FIXUP-2: Canonicalized playbook RCP header external-link to /playbooks/:playbookId route and removed unused navigateToPlaybookRunReplace import. Updated HP-004 with explicit external-link route expectation. Added CP-012 checklist item. |
| 6.36 | 2026-01-23 | ISSUE-TO-ACTION-GUIDANCE-1: Added deterministic issue→playbook guidance mapping. RCP Issue Details shows "Recommended action" section with playbook name/description/preconditions for actionable issues with mapping. Issues list shows subtle non-interactive indicator. "View playbook" CTA navigates to preview step WITHOUT auto-execution. Updated CP-009 and CP-012 with new manual testing doc and key scenarios. |
| 6.37 | 2026-01-23 | ISSUE-TO-ACTION-GUIDANCE-1 FIXUP-1: Trust language alignment + GuardedLink CTA. (1) Non-actionable states (blocked/informational) now use "Automation Guidance" section label instead of "Recommended Action" (no "Recommended" language when nothing to recommend); (2) "View playbook" CTA uses GuardedLink for unsaved-changes protection; (3) Mapping copy made non-overclaiming (uses "assets within playbook scope" instead of asserting specific asset types). Updated CP-009 checklist items and manual testing doc. |
| 6.38 | 2026-01-23 | ISSUE-TO-ACTION-GUIDANCE-1 FIXUP-2: Documentation-only coherence update aligning RCP "no in-body links" policy with ISSUE-TO-ACTION-GUIDANCE-1's single CTA exception; manual test doc corrections. Updated RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md (Overview + HP-009), RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md (HP-002), RIGHT_CONTEXT_PANEL_CONTRACT.md (Link Policy section), ISSUE-TO-ACTION-GUIDANCE-1.md (EC-001 + ERR-001). |
| 6.39 | 2026-01-23 | RIGHT-CONTEXT-PANEL-AUTONOMY-1: Autonomous context-driven panel behavior. (1) Removed shell-level Action/Details grouped control from LayoutShell; (2) Removed RCP pin toggle, width toggle, view tabs (Details/Recommendations/History/Help); (3) Removed Cmd/Ctrl+. shortcut; (4) Added autonomous open on entity detail routes (products, pages, collections, playbooks); (5) Added autonomous close on contextless routes; (6) Added dismissal model (user-driven close respected until context changes); (7) Auto-open writes URL params via replaceState; (8) Removed all in-body navigation CTAs including "View playbook" (guidance is informational only); (9) Header external-link is the only navigation affordance. Updated CP-009, CP-012, CP-020. Added RIGHT-CONTEXT-PANEL-AUTONOMY-1.md manual testing doc. |
| 6.40 | 2026-01-23 | RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-1: URL sync correctness fix. Removed incorrect `isApplyingUrlStateRef` re-entrancy guard wrappers from state→URL write paths (dismissed context cleanup, auto-open URL writes, contextless close). Re-entrancy guard now only protects URL→state application (deep-link path). Removed obsolete CP-020 checklist items (Details button click, pin toggle, width toggle, view tabs scenarios). |
| 6.41 | 2026-01-23 | RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-2: Deep-link panel param normalized to `details` under autonomy. Legacy `panel` values (recommendations, history, help) accepted for backward compatibility but coerced to `details` via replaceState. Updated PANEL-DEEP-LINKS-1.md: removed tab-switch scenario (HP-003 now tests normalization), marked Cmd/Ctrl+. scenario obsolete, updated URL schema to show `details` as canonical value. |
| 6.42 | 2026-01-23 | RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-3: Descriptor hydration for display titles. Panel header now shows entity display title (not raw entityId) after detail data loads. (1) `openPanel` supports in-place descriptor enrichment for same kind+id; (2) Added hydration effects to product, page, collection detail pages and playbooks page; (3) Title sync via `updateUrlParams({ entityTitle })`. Added CP-020 checklist item. Updated RIGHT-CONTEXT-PANEL-AUTONOMY-1.md (HP-001/HP-002 expected results, removed Known Issue). |
| 6.43 | 2026-01-23 | CENTER-PANE-NAV-REMODEL-1: Center header standardization + scoped nav demotion. (1) Added CenterPaneHeaderProvider for per-page shell header customization (breadcrumbs/title/description/actions/hideHeader); (2) Updated LayoutShell to render standardized header structure; (3) Issues page: migrated header to shell (title "Issues", description=project name, actions="Re-scan Issues" button), removed in-canvas header block; (4) Playbooks page: migrated header to shell, removed in-canvas breadcrumbs nav and header block; (5) Product detail: hideHeader=true to avoid duplicate headers, removed in-canvas breadcrumbs nav; (6) ProjectSideNav demoted to low-emphasis contextual index (lighter typography, tighter spacing, subtle active state with thin accent bar only); (7) layout.tsx removed max-width container wrappers. RCP remains autonomous (no new toggles/modes). Added CENTER-PANE-NAV-REMODEL-1.md manual testing doc. Updated CP-020 with checklist items. |
| 6.44 | 2026-01-23 | CENTER-PANE-NAV-REMODEL-1 FIXUP-1: Extended shell header integration to remaining surfaces. (1) Pillar pages (keywords, performance, media, competitors, local) now use shell header with breadcrumbs/title/description and no in-canvas breadcrumb nav or h1 header blocks; (2) Members settings page (settings/members) uses shell header; (3) New Playbook entry page (automation/playbooks/entry) uses shell header; (4) Content Workspace page (content/[pageId]) uses shell header; (5) ProjectSideNav insightsPillarRoutes now includes 'media' for correct active-state coverage. Updated CENTER-PANE-NAV-REMODEL-1.md with FIXUP-1 scenarios (HP-008 through HP-012). Updated CP-020 with FIXUP-1 checklist items. |
| 6.45 | 2026-01-23 | CENTER-PANE-NAV-REMODEL-1 FIXUP-2: Completed shell header integration for GEO Insights page. Removed in-canvas breadcrumbs nav and h1/action header block, moved "Export Report" action into shell header. Added HP-013 scenario to CENTER-PANE-NAV-REMODEL-1.md. Updated CP-020 with FIXUP-2 checklist item. |
| 6.46 | 2026-01-23 | CENTER-PANE-NAV-REMODEL-1 FIXUP-3: Removed GEO Insights breadcrumbs override so canonical shell breadcrumbs display correctly (real project name instead of placeholder). Updated HP-013 expected results, added CP-020 FIXUP-3 checklist item. |
| 6.47 | 2026-01-23 | WORK-CANVAS-ARCHITECTURE-LOCK-1: Structural contracts + minimal shell adjustments. (1) Created WORK_CANVAS_ARCHITECTURE.md: one-page architecture contract documenting Left Rail/Center Pane/RCP responsibilities, navigation rules, URL/state policy, action hierarchy, visual constraints; (2) Updated LayoutShell.tsx: added visual hierarchy comments, left rail icon-only annotations, center pane elevation comments, RCP divider annotations; (3) Updated ProjectSideNav.tsx: wrapped scoped nav in distinct container surface (border + surface-card bg), strengthened active-state (bg-primary/70 accent bar, font-semibold); (4) Updated RightContextPanel.tsx: added RCP contract lock comments (no navigation/mode controls, header external-link only navigation, content rhythm); (5) Updated RightContextPanelProvider.tsx: added autonomy boundaries documentation. Added 14 checklist items to CP-020 covering dividers, surfaces, navigation controls, title hierarchy, Shopify iframe sanity. Created WORK-CANVAS-ARCHITECTURE-LOCK-1.md manual testing checklist. |
| 6.48 | 2026-01-23 | WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1: Left rail made icon-only always (no expand/collapse toggle). (1) Removed NavState type, NAV_STATE_STORAGE_KEY, readNavState(), persistNavState(), toggleNav() from LayoutShell.tsx; (2) Removed collapsed state variable and all conditional rendering based on collapsed; (3) Removed "Navigation" heading and collapse/expand toggle button; (4) Removed ChevronLeftIcon (no longer needed); (5) Left rail now fixed at 72px width with no transition; (6) Added aria-label to each nav item for accessibility; (7) Updated WORK_CANVAS_ARCHITECTURE.md: "Icon-only always visible" (not "when collapsed"), fixed 72px width (no expanded state); (8) Updated WORK-CANVAS-ARCHITECTURE-LOCK-1.md: "Icon-Only Always" section with explicit "No collapse/expand toggle exists" check; (9) Updated LAYOUT-SHELL-IMPLEMENTATION-1.md: marked HP-002 collapse/expand scenario as OBSOLETE; (10) Updated CP-020: marked LAYOUT-SHELL-1 collapse/expand checklist items as OBSOLETE, updated WORK-CANVAS-ARCHITECTURE-LOCK-1 checklist item wording. |
| 6.49 | 2026-01-23 | WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-2: Documentation contract coherence. (1) Updated ENGINEERING_IMPLEMENTATION_CONTRACT.md: Left Navigation row changed to "Icon-only. No expand/collapse toggle", Command Palette changed from "Future (v1.6)" to "Core (v1.5)", panel state wording changed from "expanded/collapsed" to "open/closed", removed navState from Global State, marked "Command Palette reserved for v1.6" as implemented; (2) Updated IMPLEMENTATION_PLAN.md LAYOUT-SHELL-IMPLEMENTATION-1 section: scope bullet updated to "Left Rail (icon-only always; fixed ~72px; no expand/collapse toggle)", added historical note about FIXUP-1 removal; (3) Updated COMMAND-PALETTE-IMPLEMENTATION-1.md: replaced "Left Nav collapse/expand unaffected" regression check with "Left rail is icon-only always" sanity check. |
| 6.50 | 2026-01-23 | ICONS-LOCAL-LIBRARY-1: Local SVG icon system implementation. (1) Created curated 33-icon Material Symbols manifest with semantic keys (nav.*, utility.*, status.*, workflow.*, playbook.*); (2) Downloaded SVGs and built sprite.svg for CDN-free icon serving from `/icons/material-symbols/sprite.svg`; (3) Created Icon component with semantic key resolution, size variants (16/20/24), and accessibility support (aria-hidden for decorative, aria-label + role="img" for meaningful); (4) Migrated LayoutShell left rail nav icons from inline SVGs to Icon component; (5) Migrated search icon in command palette triggers; (6) Migrated RowStatusChip to show Icon + clean label (stripped emoji prefixes). Added docs/icons.md usage guide and docs/manual-testing/ICONS-LOCAL-LIBRARY-1.md QA checklist. Updated CP-020 with icon adoption checklist items. |
| 6.51 | 2026-01-23 | ICONS-LOCAL-LIBRARY-1 FIXUP-1: auto_fix_high viewBox-safe path correction. Fixed out-of-viewBox coordinate (L25 12 → L24 12) in auto_fix_high icon path data across download-material-symbols.mjs, auto_fix_high.svg, and sprite.svg. Updated dev-script header comment to accurately state it generates SVGs from embedded path data (not downloads from CDN). Added FIXUP-1 checklist item to CP-020 and verification note to ICONS-LOCAL-LIBRARY-1.md Icon Inventory. |
| 6.52 | 2026-01-24 | ISSUES-ENGINE-REMOUNT-1 FIXUP-5: Decision engine remount with three-section hierarchy and action semantics. (1) TripletDisplay: replaced text-gray-* with text-muted-foreground, reordered to "Actionable now" first, added emphasis='actionable' prop with bg-primary/10 highlight; (2) DataTable: added headerContrast='default'|'strong' prop for Issues-only strong header contrast; (3) Issues page: three-section rendering (Actionable now comfortable + Blocked dense collapsible + Informational dense collapsible), classification arrays with severity→impact→title sorting, removed Status column (section membership communicates status), Severity as dot+label (not pill), Issue column compact meta line (severity + fixability + impact), Actions column Blocked non-clickable pill, "Fix next" → "Fix now", mode toggle "Actionable now" / "All detected". Updated ISSUES-ENGINE-REMOUNT-1.md with HP-011 through HP-015 scenarios. Added 8 checklist items to CP-009. |
| 6.53 | 2026-01-24 | ISSUES-ENGINE-REMOUNT-1 FIXUP-6: Semantics and consistency corrections. (1) Fixed blocked chip logic: only render "Outside control" chip for actionability === 'informational' (blocked status is conveyed by section + Actions pill, no chip needed); (2) Added stable sorting tie-breaker: after title comparison, sort by id for deterministic ordering within each severity/impact group; (3) Normalized Action column labels to exactly "Fix now" / "Review" / "Blocked": "Review" for DIAGNOSTIC and "View affected" flows, "Fix now" for other actionable fix flows (ai/manual/sync), preserve original meaning in title attribute; (4) Fixed TripletDisplay emphasis: when emphasis='actionable', both count and label render as text-primary (not text-muted-foreground); (5) Updated ISSUES-ENGINE-REMOUNT-1.md HP-013 to match actual UI semantics (Fix now action, Review for View affected with title preservation). **No backend changes.** **Core files:** page.tsx, TripletDisplay.tsx. **Manual Testing:** ISSUES-ENGINE-REMOUNT-1.md (HP-013). |
| 6.54 | 2026-01-24 | ISSUES-ENGINE-REMOUNT-1 FIXUP-7: Trust copy tightening for Issues preview Apply CTA. Changed inline preview Apply button label from "Apply to Shopify" to "Apply saved draft to Shopify" for trust clarity (no behavior change; data-testid="issue-apply-to-shopify-button" preserved; disabled gating unchanged; loading label "Applying…" unchanged; title attribute already clarifies "Applies saved draft only. Does not use AI."). **Copy-only trust tightening. No Playwright test changes required** - tests use stable data-testid selector. **Core files:** issues/page.tsx. Added FIXUP-7 checklist item to CP-009. **Phase ISSUES-ENGINE-REMOUNT-1 now marked COMPLETE** (updated completion date to 2026-01-24, added History entry 7.49). |
| 6.55 | 2026-01-24 | ISSUES-ENGINE-REMOUNT-1 FIXUP-8: Doc/Playwright alignment + config fix. **PATCH A (Manual testing doc copy alignment):** Updated DRAFT-CLARITY-AND-ACTION-TRUST-1.md Scenario 7 to reflect new button labels (replaced "Fix next" with "Fix now" in 4 instances; replaced "Apply button" with "Apply saved draft to Shopify button" in 4 instances; Issues preview Apply button trust copy now aligned with UI from FIXUP-7). **PATCH B (Playwright selector hardening):** Replaced text-based selector `button:has-text("Fix next")` with stable data-testid selector `[data-testid="issue-fix-next-button"]` in 2 instances; updated 3 comment references from "Fix next" to "Fix now" for consistency; hardened tests against UI copy drift. **PATCH C (Config fix + regression verification):** Fixed playwright.config.ts testDir from './tests/e2e' to './tests' (corrected test discovery: 38 tests in ./tests vs 2 in ./tests/e2e); verified test execution: 14 tests discovered and ran; selector changes validated (no selector-related errors); tests blocked by missing API server (environmental; not code-related). **Core files:** draft-clarity-and-action-trust-1.spec.ts, DRAFT-CLARITY-AND-ACTION-TRUST-1.md, playwright.config.ts. Added FIXUP-8 checklist item to CP-009. Added History entry 7.50. **Phase ISSUES-ENGINE-REMOUNT-1 doc/test alignment complete.** |
| 6.56 | 2026-01-25 | ISSUE-FIX-ROUTE-INTEGRITY-1 FIXUP-2: Compliance + Test Hardening. **PATCH 2:** Added specific data-testid attributes (issue-fix-button, issue-view-affected-button) for deterministic selection; updated view-affected-routing-1.spec.ts to use new selectors. **PATCH 3:** Rewrote issue-fix-route-integrity-1.spec.ts to be data-testid-first with 6 deterministic tests (AI preview, direct fix, view affected, blocked chip, RCP behavior, external Open link); removed text-based selection and conditional "if exists" skips. **PATCH 4:** Added CP-009 scenarios for ISSUE-FIX-ROUTE-INTEGRITY-1 (8 checklist items); added ISSUE-FIX-ROUTE-INTEGRITY-1.md to Manual Testing Docs; added issue-fix-route-integrity-1.spec.ts to Automated Tests. **Core files:** page.tsx, issue-fix-route-integrity-1.spec.ts, view-affected-routing-1.spec.ts, CRITICAL_PATH_MAP.md, ISSUE-FIX-ROUTE-INTEGRITY-1.md. **Phase ISSUE-FIX-ROUTE-INTEGRITY-1 compliance complete.** |
| 6.57 | 2026-01-25 | ISSUE-FIX-ROUTE-INTEGRITY-1 FIXUP-3: Compliance + Backward Compatibility. **PATCH 1:** Moved issueActionDestinations.ts to allowed location (lib/issues/issueActionDestinations.ts); updated import in page.tsx; updated relative imports in destination map file. **PATCH 2:** Restored issue-card-cta backward compatibility by adding nested `<span data-testid="issue-card-cta">` inside issue-fix-next-button, issue-fix-button, and issue-view-affected-button (preserves new selectors while restoring legacy issue-fix-kind-clarity-1.spec.ts compatibility). **PATCH 3:** Made issue-fix-route-integrity-1.spec.ts truly deterministic: removed all test.skip() conditional skips; replaced text-based "Preview/Draft" assertions with `data-testid="issue-preview-draft-panel"` selector; all 6 tests now fail loudly if seed data doesn't provide required elements. **PATCH 4:** Added changelog entry 6.57. **Core files:** lib/issues/issueActionDestinations.ts (new path), page.tsx (import update + nested cta spans), issue-fix-route-integrity-1.spec.ts (deterministic rewrite). **Phase ISSUE-FIX-ROUTE-INTEGRITY-1 FIXUP-3 complete.** |
| 6.58 | 2026-01-25 | ISSUE-FIX-ROUTE-INTEGRITY-1 FIXUP-4: Test + Doc Integrity. **PATCH 1:** IFRI-005 strengthened to assert RCP open/close via `data-testid="right-context-panel"` (explicit UI assertion instead of URL heuristic); close via `right-context-panel-close` button; assert RCP count 0 after close and after action click. **PATCH 2:** Manual testing doc updated: HP-002 uses `issue-fix-button` as canonical selector, HP-003 uses `issue-view-affected-button` as canonical selector, HP-008 adds explicit `right-context-panel` selector and softens stopPropagation claim to "action clicks do not trigger row click". Nested `issue-card-cta` preserved for backward compatibility. **Core files:** issue-fix-route-integrity-1.spec.ts, ISSUE-FIX-ROUTE-INTEGRITY-1.md. **Phase ISSUE-FIX-ROUTE-INTEGRITY-1 FIXUP-4 complete.** |
| 6.59 | 2026-01-25 | ISSUE-FIX-KIND-CLARITY-1 FIXUP-3: Fix-Action Kind Clarity. **PATCH 1:** Created `lib/issues/issueFixActionKind.ts` with 4 canonical fix-action kinds (AI_PREVIEW_FIX, DIRECT_FIX, GUIDANCE_ONLY, BLOCKED); derives from existing destination map signals (no guesswork). **PATCH 2:** Updated Issues page CTA labels/icons/sublabels: "Review AI fix" (workflow.ai) for AI preview, "Fix in workspace" (nav.projects) for direct fix, "Review guidance" (playbook.content) for view affected. All data-testid selectors preserved. **PATCH 3:** Added dev-time trust guardrails (console warnings if AI label lacks "Review" or direct fix label contains "AI/Apply/Automation"). **PATCH 4:** Updated RCP Actionability section with fix-action kind sentence (read-only panel, no CTAs). **PATCH 5:** Updated ISSUE-FIX-KIND-CLARITY-1.md with FIXUP-3 scenarios (F3-001 through F3-005) and verification checklist. **PATCH 6:** Updated IMPLEMENTATION_PLAN.md with FIXUP-3 entry. **PATCH 7:** Aligned IFKC1-002 assertion to accept semantic labels ("Fix in workspace" or "Review AI fix"). **Core files:** issueFixActionKind.ts (new), page.tsx, ContextPanelIssueDetails.tsx, issue-fix-kind-clarity-1.spec.ts. **Phase ISSUE-FIX-KIND-CLARITY-1 FIXUP-3 complete.** |
| 6.60 | 2026-01-25 | DRAFT-LIFECYCLE-VISIBILITY-1: Draft Lifecycle State Visibility and Trust. **PATCH 1:** Created `lib/issues/draftLifecycleState.ts` with 4 canonical draft states (NO_DRAFT, GENERATED_UNSAVED, SAVED_NOT_APPLIED, APPLIED); derives from existing UI signals (preview/saved/applied); includes `getDraftLifecycleCopy()` for banner/indicator text and `checkSavedDraftInSessionStorage()` for persistence checks. **PATCH 2:** Added subtle draft state indicator to Issues table row Actions column (shows "(Draft not saved)" / "(Draft saved)" / "(Applied)" next to CTA when draft exists). **PATCH 3:** Inline preview action strip now uses state-driven gating: Apply button disabled until SAVED_NOT_APPLIED state; Applied confirmation shows non-interactive chip (not button); dev-time console warnings if Apply enabled in wrong state. **PATCH 4:** RCP Actionability section echoes draft lifecycle state when draft exists ("Draft: [state label]" line with tooltip explaining next action). **PATCH 5:** Created DRAFT-LIFECYCLE-VISIBILITY-1.md manual testing doc (6 scenarios covering all draft states, critical invariants, dev-time guardrails). **PATCH 6:** Dev-time regression guardrails (console warnings when Apply enabled but state ≠ SAVED_NOT_APPLIED, or Applied shown but appliedAt not set). **Core files:** draftLifecycleState.ts (new), page.tsx, ContextPanelIssueDetails.tsx, ContextPanelContentRenderer.tsx. **No backend changes. No AI execution changes.** Token-only styling. All existing data-testid selectors preserved. **Phase DRAFT-LIFECYCLE-VISIBILITY-1 complete.** |
