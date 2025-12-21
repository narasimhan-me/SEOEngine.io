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
| **Manual Testing Doc(s)** | `docs/testing/user-profile-and-account-settings.md`, `docs/manual-testing/SELF-SERVICE-1.md`, `docs/manual-testing/SECURITY-LOGIN-QUERY-PARAMS.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md` |
| **Automated Tests** | `apps/api/test/integration/self-service-1.test.ts`, `apps/web/tests/auth-security.spec.ts` |
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
| **Manual Testing Doc(s)** | `docs/testing/ai-systems.md`, `docs/testing/token-usage-tracking.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/PRODUCTS-LIST-2.0.md` |
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
- [ ] DEO-UX-REFRESH-1: AI CTA labeling "(uses AI)" on AI-triggering buttons only
- [ ] DEO-UX-REFRESH-1: "Apply to Shopify" / "Apply Fix" never labeled with "(uses AI)"
- [ ] PRODUCTS-LIST-2.0: Health pill per row (3 states: Healthy, Needs Attention, Critical - no numbers)
- [ ] PRODUCTS-LIST-2.0: Recommended action per row (single, deterministic based on severity + pillar priority)
- [ ] PRODUCTS-LIST-2.0: Progressive disclosure (details only on expand, no inline breakdowns by default)
- [ ] PRODUCTS-LIST-2.0: No always-visible "Scan SEO"; "Rescan" only when data is stale
- [ ] PRODUCTS-LIST-2.0: Command Bar with attention count and "Fix in bulk" CTA

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
| **Manual Testing Doc(s)** | `docs/testing/shopify-integration.md`, `docs/testing/product-sync.md`, `docs/testing/metadata-sync-seo-fields.md`, `docs/testing/sync-status-and-progress-feedback.md`, `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`, `docs/manual-testing/phase-shop-api-1-graphql-migration.md`, `docs/manual-testing/phase-shop-ux-cta-1-connect-shopify.md`, `docs/manual-testing/phase-shop-ux-cta-1-1-dedup-connect-shopify.md`, `docs/manual-testing/MEDIA-1.md` |
| **Automated Tests** | `packages/shared/src/media-accessibility-types.test.ts` (MEDIA-1) |
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

**Description:** Product-focused DEO issues with actionable fix buttons (AI fix, manual fix, sync fix) and severity filtering. Includes MEDIA pillar issues.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/testing/issue-engine-lite.md`, `docs/manual-testing/MEDIA-1.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md` |
| **Automated Tests** | `packages/shared/src/media-accessibility-types.test.ts` (MEDIA-1) |
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
- [ ] AUTO-PB-1.3 (Planned): Preview Persistence & Cross-Surface Drafts – persistent AI drafts survive navigation, reused across Playbooks and Product detail surfaces

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

**Description:** Read-only derived insights dashboard showing DEO progress, AI efficiency metrics, issue resolution, opportunity signals, and GEO insights. Never triggers AI or mutations.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/INSIGHTS-1.md`, `docs/manual-testing/GEO-INSIGHTS-2.md`, `docs/IMPLEMENTATION_PLAN.md` |
| **Automated Tests** | `apps/api/test/integration/geo-insights-2.test.ts` |
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

---

### CP-017: GEO Answer Readiness & Citation Confidence

**Description:** GEO (Generative Engine Optimization) foundation layer providing explainable answer readiness signals (Clarity, Specificity, Structure, Context, Accessibility) and derived Citation Confidence (Low/Medium/High). Includes Preview/Apply flow for answer improvements.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/manual-testing/GEO-FOUNDATION-1.md`, `docs/GEO_FOUNDATION.md`, `docs/GEO_INSIGHTS.md`, `docs/manual-testing/DEO-UX-REFRESH-1.md`, `docs/manual-testing/GEO-EXPORT-1.md` |
| **Automated Tests** | `packages/shared/src/geo-types.test.ts`, `apps/api/test/integration/geo-insights-2.test.ts` |
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

---

### CP-018: Enterprise Governance & Approvals

**Description:** Enterprise-grade governance controls for GEO reports and content modifications. Includes per-project governance policies, approval workflows, passcode-protected share links, immutable audit logging, and content redaction.

| Field | Value |
|-------|-------|
| **Manual Testing Doc(s)** | `docs/ENTERPRISE_GEO_GOVERNANCE.md`, `docs/manual-testing/ENTERPRISE-GEO-1.md`, `docs/IMPLEMENTATION_PLAN.md` |
| **Automated Tests** | `apps/api/test/integration/enterprise-geo-1.test.ts`, `apps/web/tests/enterprise-geo-1.spec.ts` |
| **Last Verified (Manual)** | [YYYY-MM-DD] |
| **Last Verified (Automated)** | N/A |
| **Owner** | Core Team |

**Key Scenarios:**
- [ ] Governance policy CRUD (GET/PUT /projects/:id/governance/policy)
- [ ] Approval workflow: request → approve/reject → consume
- [ ] Approval required check gates GEO fix apply and Answer Block sync
- [ ] Share link creation with passcode (8-char A-Z 0-9)
- [ ] Passcode shown only once at creation
- [ ] Passcode verification via POST /share/geo-report/:token/verify
- [ ] Wrong passcode returns error message
- [ ] Share link expiry respects governance policy
- [ ] Audience restriction enforcement (ANYONE_WITH_LINK vs PASSCODE)
- [ ] Content redaction when allowCompetitorMentions is false
- [ ] PII toggle always false (API rejects true, UI shows locked)
- [ ] Audit events logged for all governance actions
- [ ] Public share view is mutation-free (no DB writes)
- [ ] Report assembly is read-only
- [ ] Print/PDF rendering has no side effects

**Hard Contracts:**
- [ ] View/print is mutation-free: No DB writes during public share view GET/POST, report assembly, or printing
- [ ] PII never allowed: API enforces allowPII=false, UI displays toggle as locked
- [ ] Passcode shown once: Plaintext only at creation, audit stores only last4

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
| CP-008: Frontend Global UX Feedback | ✅ | Planned | 🟡 Manual Only |
| CP-009: Issue Engine Lite | ✅ | Planned | 🟡 Manual Only |
| CP-010: Issue Engine Full | ✅ | Planned | 🟡 Manual Only |
| CP-011: Answer Engine | ✅ | Planned | 🟡 Manual Only |
| CP-012: Automation Engine | ✅ | Planned | 🟡 Manual Only |
| CP-013: Admin Operations | ✅ | ✅ | 🟢 Full Coverage |
| CP-014: Self-Service Control Plane | ✅ | ✅ | 🟢 Full Coverage |
| CP-015: Guided Onboarding | ✅ | Planned | 🟡 Manual Only (Impl Pending) |
| CP-016: Project Insights | ✅ | ✅ | 🟢 Full Coverage |
| CP-017: GEO Answer Readiness | ✅ | ✅ | 🟢 Full Coverage |
| CP-018: Enterprise Governance | ✅ | ✅ | 🟢 Full Coverage |

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
| 3.5 | 2025-12-21 | Added CP-018: Enterprise Governance & Approvals (ENTERPRISE-GEO-1) with governance policies, approval workflows, passcode-protected share links, audit logging, and content redaction. Added integration and E2E tests. |
| 3.6 | 2025-12-21 | PRODUCTS-LIST-2.0: Updated CP-003 with decision-first Products list scenarios (Health pill, recommended action, progressive disclosure, Rescan gating, Command Bar). Replaced DEO-UX-REFRESH-1 product-list bullets. Added manual testing doc. |
