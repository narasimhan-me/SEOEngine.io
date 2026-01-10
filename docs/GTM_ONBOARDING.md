# Guided Onboarding & First DEO Win (GTM-ONBOARD-1)

> **Implementation Status:** SPEC ONLY — This document describes the planned feature design. The actual implementation (Prisma models, API endpoints, UI components) does not exist yet. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for current status.

This document describes the Guided Onboarding feature, which helps new users achieve their first DEO win within 5-10 minutes of connecting their Shopify store.

## Overview

The Guided Onboarding system provides a trust-safe, resumable, and derived-state-based onboarding experience that:
- Guides users through fixing their first DEO issue
- Never triggers AI work without explicit user consent
- Uses existing data to recommend the highest-impact fix
- Celebrates success when users complete their first APPLY action

## Philosophy

### Trust Guarantees

1. **No Silent AI**: The onboarding flow never triggers AI work automatically. All AI operations require an explicit user click on a "Preview" or similar action.

2. **Derived State**: Onboarding eligibility and recommendations are computed from existing data (issues, products, Shopify connection status) rather than requiring new data collection.

3. **Resumable**: Users can leave and return to the onboarding flow at any point. Progress is persisted per user+project.

4. **Non-Blocking**: Users can skip onboarding at any time and access all features normally.

5. **Canonical Completion**: Completion is determined by the existence of a successful APPLY run in AutomationPlaybookRun, making it objective and verifiable.

## Onboarding Steps

### Step 1: Connect Your Store
- **Requirement**: Shopify OAuth connection completed
- **UI**: Shopify connection widget or confirmation of existing connection
- **Auto-advance**: If already connected

### Step 2: See Your Opportunities
- **Requirement**: View the recommended issue/pillar
- **UI**: Deep-link to the relevant pillar section with focus on the specific issue
- **Selection Ladder**: Search & Intent > Media > Metadata (highest severity first)

### Step 3: Preview a Fix
- **Requirement**: User clicks "Preview Fix" button (explicit AI consent)
- **UI**: Preview panel shows AI-generated suggestions
- **Event**: `onboarding_first_preview` emitted

### Step 4: Apply Your First Fix
- **Requirement**: User clicks "Apply" to commit the fix
- **UI**: Success celebration with personalized copy
- **Event**: `onboarding_first_apply` + `onboarding_completed` emitted

## Issue Selection Ladder

The onboarding system recommends the most actionable issue using a priority ladder:

1. **Search & Intent Pillar** (highest priority)
   - If any actionable issue exists → select highest severity
   - Includes: missing intent coverage, weak query targeting

2. **Media Pillar** (second priority)
   - If any actionable issue exists → select highest severity
   - Includes: missing_image_alt_text, generic_image_alt_text

3. **Metadata Pillar** (fallback)
   - If any actionable issue exists → select highest severity
   - Includes: missing_seo_title, missing_seo_description

4. **No Issues** (edge case)
   - If all pillars are clean → show "You're in great shape" message
   - Link to DEO overview for exploration

### Severity Ordering
- critical > warning > info
- Tie-breaker: higher count, then stable deterministic sort by issue.id

## Eligibility Conditions

A user+project is eligible for onboarding if ALL of the following are true:
1. Shopify integration is connected (project has SHOPIFY integration)
2. No successful APPLY run exists for the project
3. Onboarding state is NOT `SKIPPED` or `COMPLETED`

## Recommendation Payload

When recommending an issue, the payload includes:

### Always Present
- `pillarId`: Pillar identifier (search_intent_fit, media_accessibility, metadata_snippet_quality)
- `issueId`: Unique issue identifier
- `issueType`: Issue type code (e.g., `missing_seo_title`)
- `severity`: critical | warning | info
- `title`: Human-readable issue title
- `description`: Issue description
- `primaryProductId`: First affected product ID

### Pillar-Specific
- **Search & Intent**: `intentType`, `query` (from exampleQueries[0])
- **Media**: `primaryProductId` only (UI selects image later)
- **Metadata**: `issueType` (missing_seo_title / missing_seo_description)

### Optional (when available)
- `whyItMatters`: Business impact explanation
- `recommendedFix` / `recommendedAction`: Fix guidance

## Onboarding State Model

```prisma
enum ProjectOnboardingStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

model ProjectOnboardingState {
  id              String                    @id @default(cuid())
  userId          String
  user            User                      @relation(fields: [userId], references: [id])
  projectId       String
  project         Project                   @relation(fields: [projectId], references: [id])
  status          ProjectOnboardingStatus   @default(NOT_STARTED)
  stepIndex       Int                       @default(0)
  selectedContext Json?                     // Locked issue recommendation
  startedAt       DateTime?
  skippedAt       DateTime?
  completedAt     DateTime?
  completedRunId  String?                   // Reference to first successful APPLY run
  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt

  @@unique([userId, projectId])
  @@index([projectId])
  @@index([userId])
  @@index([status])
}
```

## API Endpoints

All endpoints require JWT authentication and enforce project ownership.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/onboarding/projects/:projectId/status` | GET | Get eligibility, state, recommendation, completion |
| `/onboarding/projects/:projectId/start` | POST | Start onboarding (creates/updates state) |
| `/onboarding/projects/:projectId/advance` | POST | Advance to next step (body: `{ toStep: number }`) |
| `/onboarding/projects/:projectId/skip` | POST | Skip onboarding |

### GET /onboarding/projects/:projectId/status Response

```typescript
interface OnboardingStatusResponse {
  eligible: boolean;
  state: {
    status: ProjectOnboardingStatus;
    stepIndex: number;
    startedAt: string | null;
    skippedAt: string | null;
    completedAt: string | null;
  };
  recommendation: OnboardingRecommendation | null;
  completion: {
    hasSuccessfulApply: boolean;
    firstSuccessfulApplyRunId: string | null;
    firstSuccessfulApplyAt: string | null;
  };
}
```

## Analytics Events

All events are emitted from the web layer only (via existing GA pipeline):

| Event Name | When Emitted |
|------------|--------------|
| `onboarding_started` | User starts onboarding flow |
| `onboarding_step_completed` | User advances to next step |
| `onboarding_first_preview` | User clicks first preview action |
| `onboarding_first_apply` | User completes first APPLY action |
| `onboarding_completed` | Onboarding flow completed |
| `onboarding_skipped` | User skips onboarding |

## UI Components

### OnboardingBanner
- Visible under `/projects/[id]/*` routes only
- Shows progress: "Get your first DEO win (5–10 minutes)" + step X/4
- Dismiss hides for current session (sessionStorage)
- Reappears next session until completed or skipped

### OnboardingPanel
- 4-step guidance UI
- Step 2 CTA: "Preview fix (uses AI)" - deep-links, no auto-run
- Step 4: Celebration with dynamic copy
  - Guided fix: "You completed your first DEO win"
  - Other fix: "You fixed your first DEO issue"

## Canonical APPLY Recording

All pillar apply endpoints record a corresponding `AutomationPlaybookRun` row with:
- `runType`: 'APPLY'
- `status`: 'SUCCEEDED'
- `aiUsed`: false (critical invariant)
- `playbookId`: Pillar-specific stable ID
- `scopeId`: Target scope (product:<id> or project:<id>)
- `meta`: Contains pillar, target, and source information

### Playbook IDs by Pillar
- Search & Intent: `search_intent_fix`
- Media: `media_accessibility_fix`
- Competitors: `competitive_fix`
- Offsite Signals: `offsite_fix`
- Local Discovery: `local_fix`
- Shopify SEO Update: `shopify_product_seo_update`

## Trust Contract: No AI Side Effects

The `deo-issues.service.ts` `getIssuesForProject` method does NOT trigger any AI work. The previous fire-and-forget `triggerAnswerBlockAutomationsForIssues` side effect has been removed.

**Rationale**: "No silent AI; viewing issues must not enqueue or trigger AI work."

## Related Documents

- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-015: Guided Onboarding
- [GTM-ONBOARD-1.md](./manual-testing/GTM-ONBOARD-1.md) - Manual testing guide
- [ACTIVATION_METRICS.md](./ACTIVATION_METRICS.md) - Activation funnel metrics
- [DEO_PILLARS.md](./DEO_PILLARS.md) - Pillar definitions
