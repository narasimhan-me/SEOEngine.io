# Phase UX-2 – Product Workspace AEO + Automation UI (v1)

> Manual testing guide for Product Workspace AEO / Answers tab and per-product Automation History panel wired to AE-1.3 Answer Block persistence and AUE-2 Shopify Answer Block automations.

---

## Overview

This manual testing document covers the first version of the Product Workspace AEO + Automation UI:

1. **Answer Blocks (AEO) panel**
   - Reads persisted Answer Blocks per product via AE-1.3 endpoints.
   - Allows merchants to edit and save Answer Blocks.
   - Triggers Answer Block automations for Pro/Business plans.
   - Enforces Free-plan gating for automation triggers.

2. **Automation History (Answer Blocks) panel**
   - Surfaces AnswerBlockAutomationLog entries per product.
   - Shows trigger type, action, status, and basic error details.

**Related phases/sections:**

- IMPLEMENTATION_PLAN.md
  - Phase AE-1.3 – Answer Block Persistence (Shopify v1)
  - Phase AUE-2 – Shopify Answer Block Automations (Automation Engine v1)
  - Phase UX-2 – Product Workspace (per-product optimization workspace)

- Specs:
  - `docs/ANSWER_ENGINE_SPEC.md`
  - `docs/AUTOMATION_ENGINE_SPEC.md` (Section 8.7 – Shopify Answer Block Automations)
  - `docs/manual-testing/phase-ae-1.3-answer-block-persistence.md`
  - `docs/manual-testing/automation-engine-v1-shopify-answer-block-automations.md`

For structure and expectations, see `docs/MANUAL_TESTING_TEMPLATE.md`.

---

## Preconditions

- **Backend:**
  - NestJS API running locally (e.g., http://localhost:3001) with:
    - AE-1.3 Answer Block persistence migrations applied.
    - AUE-2 Shopify Answer Block automations (queue + worker) configured.
    - Redis available and answer_block_automation_queue worker enabled.

- **Frontend:**
  - Next.js app running (e.g., http://localhost:3000).
  - Product Workspace page accessible at:
    - `/projects/:projectId/products/:productId`

- **Data & accounts:**
  - Test Shopify store connected to a project.
  - At least one product with rich metadata.
  - At least one product with minimal metadata.
  - Test users on Free, Pro, and Business plans.

- **Authentication:**
  - Logged in as each test user (Free / Pro / Business) for plan-aware scenarios.

---

## Test Scenarios

### UX2-AEO-HP-001: View persisted Answer Blocks (Pro/Business)

**Goal:** Verify that the Answer Blocks panel reads and displays persisted Answer Blocks for a product.

**Steps:**
1. Log in as a Pro or Business user.
2. Navigate to Projects → select a Shopify-connected project → Products.
3. Click on a product known to have persisted Answer Blocks (via AE-1.3 flows or seeded data).
4. In the Product Optimization workspace, scroll to the Answer Blocks (AEO) panel.

**Expected Results:**
- The panel shows a header "Answer Blocks (AEO)" with a plan badge (Pro or Business).
- A list of Answer Blocks is rendered, one card per question:
  - Question label uses the canonical 10-question taxonomy where applicable.
  - Each card shows:
    - Question label and question ID.
    - Source indicator ("AI-generated" or "Edited by you").
    - Confidence badge (High/Medium/Low) based on confidenceScore.
    - Last updated timestamp derived from updatedAt.
  - The textarea for each answer is populated with answerText.

---

### UX2-AEO-HP-002: Edit and save Answer Blocks (Pro/Business)

**Goal:** Confirm user edits to Answer Blocks are persisted and survive reload.

**Steps:**
1. With UX2-AEO-HP-001 preconditions satisfied, choose a product with existing Answer Blocks.
2. In the Answer Blocks panel, update the answerText for 1–2 questions (e.g., clarify wording).
3. Click **Save Answer Blocks**.
4. Observe any toasts or inline messages.
5. Reload the page (browser reload) or navigate away and back to the same product workspace.

**Expected Results:**
- **Save action:**
  - Save button becomes disabled/spinner while saving.
  - Success toast appears (e.g., "Answer Blocks saved successfully.").
  - Unsaved changes indicator clears after success.
- **After reload:**
  - Edited answers remain exactly as saved.
  - Confidence badges and question labels remain present.
  - Source metadata for edited answers reflects userEdited (where exposed).
- No new AI generation is triggered automatically on reload for edited questions.

---

### UX2-AEO-HP-003: Trigger Answer Block automation (Pro/Business)

**Goal:** Verify that the Answer Blocks panel can trigger Answer Block automation and that updated answers appear after automation runs.

**Steps:**
1. Log in as a Pro or Business user.
2. Choose a product with:
   - Either no Answer Blocks, or
   - Existing Answer Blocks with at least one weak (low-confidence) answer.
3. Navigate to Product Workspace → Answer Blocks (AEO) panel.
4. Click **Run Answer Block automation**.
5. Wait for the worker to process the job (monitor logs if needed).
6. Click **Refresh** in both:
   - Answer Blocks panel.
   - Automation History (Answer Blocks) panel.

**Expected Results:**
- **Answer Blocks panel:**
  - Shows a success toast indicating automation was triggered.
  - After refresh:
    - Previously missing questions now have answers, or
    - Weak answers have been replaced with stronger AI-generated answers.
- **Automation History panel:**
  - A new log row appears for this product with:
    - triggerType: 'issue_detected' (or configured trigger).
    - action: 'generate_missing' (no prior blocks) or action: 'regenerate_weak'.
    - status: 'succeeded'.
    - planId matching the user's plan (pro/business).
  - No error message is present for successful runs.

---

### UX2-AEO-LIM-001: Free plan gating for Answer Block automations

**Goal:** Ensure Free plan users can view/edit Answer Blocks but cannot trigger Answer Block automations, and see clear upgrade messaging.

**Steps:**
1. Log in as a Free plan user.
2. Navigate to a project and product that has persisted Answer Blocks.
3. Scroll to the Answer Blocks (AEO) panel.
4. Inspect available controls and messaging.
5. Attempt to click **Run Answer Block automation** (if enabled) or observe disabled state.

**Expected Results:**
- **Answer Blocks panel:**
  - Plan badge shows "Free plan".
  - Existing Answer Blocks render and remain editable with **Save Answer Blocks**.
  - Automation-related controls (Generate/Run automation) are disabled or non-interactive.
  - A clear message explains that Answer Block automations are gated on Pro/Business plans and links to the billing/upgrade page.
- **Automation History panel:**
  - Either:
    - Shows skip_plan_free entries (if backend logs Free-plan attempts), or
    - Remains empty with explanatory text.
  - No successful Answer Block automation runs appear for Free-plan-only scenarios.

---

### UX2-AUTO-HP-004: Automation History panel – success, skip, and error entries

**Goal:** Validate that the Automation History panel surfaces the main Answer Block automation outcomes.

**Steps:**
1. Trigger at least one successful Answer Block automation (Pro/Business).
2. Trigger a scenario that leads to a skip, such as:
   - Running automation when all Answer Blocks are already strong.
   - Running automation when Answer Block generation yields no answers.
3. Simulate a failure (in a controlled environment), e.g., by:
   - Temporarily breaking AI provider configuration, or
   - Forcing an exception inside the worker in a test environment.
4. Refresh the Automation History panel after each scenario.

**Expected Results:**
- **Success case:**
  - Entry with status: 'succeeded', appropriate action, and no error text.
- **Skip cases:**
  - Entries with status: 'skipped' and actions such as:
    - skip_plan_free
    - skip_no_action
    - skip_no_generated_answers
  - No error text for expected skips.
- **Error case:**
  - Entry with status: 'failed' and action: 'error'.
  - Error icon and truncated error message visible in the Automation History panel.

---

### UX2-AUTO-HP-005: Automation History panel – collapsed-by-default behavior

**Goal:** Verify that the Automation History panel displays a summary card for the latest run by default and allows expansion to view full history.

**Steps:**
1. Log in as a Pro or Business user.
2. Navigate to a product that has multiple automation log entries (at least 3–5).
3. Observe the Automation History (Answer Blocks) panel on initial load.
4. Click the "View full history (X)" link.
5. Observe the expanded list of all automation logs.
6. Click the "Hide full history" link.

**Expected Results:**
- **On initial load (collapsed state):**
  - A summary card with a slate-50 background is displayed.
  - The card shows "Last automation" label with the most recent log's:
    - Status badge (Succeeded/Failed/Skipped).
    - Timestamp (formatted date/time).
    - Action label (e.g., "Generated Answer Blocks", "Skipped (no action needed)").
    - Trigger type and Plan ID.
  - A blue "View full history (X)" link is visible below the summary.
  - The full list of logs is NOT visible.
- **After clicking "View full history":**
  - The link text changes to "Hide full history".
  - The full list of automation logs appears below the summary card.
  - Logs are sorted by date (newest first).
  - Each log entry displays: timestamp, action label, trigger, plan, status badge, and error message (if applicable).
- **After clicking "Hide full history":**
  - The expanded list collapses and is no longer visible.
  - The link text returns to "View full history (X)".
  - Only the summary card remains visible.

---

### UX2-AUTO-HP-006: Automation History panel – long history lists remain collapsed

**Goal:** Ensure that products with many skip entries (e.g., daily skip_no_action logs) do not clutter the UI on initial load.

**Steps:**
1. Create or use a product with 10+ automation log entries, mostly skipped actions.
2. Navigate to the Product Workspace for that product.
3. Observe the Automation History panel.
4. Verify the entry count in the "View full history (X)" link.
5. Expand and confirm all entries are present.

**Expected Results:**
- **On initial load:**
  - Only the latest log summary card is shown.
  - The "View full history (X)" link displays the correct count (e.g., "View full history (12)").
  - The panel does not show 10+ individual log rows cluttering the UI.
- **After expansion:**
  - All log entries are visible and scrollable.
  - Performance remains acceptable (no lag or jank).

---

### UX2-LAYOUT-HP-007: Metadata-first layout and section ordering

**Goal:** Confirm that the Product Workspace presents metadata as the first optimization surface, followed by Answers and Automations, and that the layout feels visually segmented.

**Steps:**
1. Log in as a Pro or Business user.
2. Navigate to Projects → select a Shopify-connected project → Products → choose a product.
3. Observe the main (center) column of the Product Optimization workspace.
4. Verify the order of sections from top to bottom.
5. Scroll through the page and note the separation between each section.

**Expected Results:**
- The Metadata section (AI suggestions + SEO editor) appears first.
- The Answers section (ProductAnswersPanel + Answer Blocks panel) appears directly below Metadata.
- The Automations section (collapsed-by-default Automation History panel) appears below Answers.
- Visual spacing (margins, card padding) clearly separates each section without excessive vertical whitespace.

---

### UX2-DEO-HP-008: Collapsible DEO / SEO Insights panel

**Goal:** Verify that the DEO / SEO Insights panel on the right is collapsed by default and can be expanded to reveal full issue details.

**Steps:**
1. With a product selected that has at least one DEO issue, open the Product Optimization workspace.
2. Locate the DEO / SEO Insights panel in the right-hand column.
3. Observe the default, collapsed state.
4. Click "Expand issues & recommendations".
5. Scroll within the Product Workspace, then click "Collapse issues & recommendations".

**Expected Results:**
- **Collapsed state:**
  - Panel shows a summary card titled "DEO Score & Issues".
  - Summary includes content depth (e.g., "0 words — Very short") and metadata completeness summaries (SEO Title/Description Present/Missing).
  - Full Content Depth, Metadata Completeness, Thin Content warning, DEO Issues list, and Coming Soon blocks are hidden.
- **Expanded state:**
  - Full detail view is visible, matching the previous DEO / SEO Insights content (Content Depth, Metadata Completeness, Thin Content warning, Overall Status, DEO Issues list, Coming Soon).
  - "Collapse issues & recommendations" control hides the detailed content and returns to the summary-only view.
- Layout and typography remain consistent with other cards in the workspace.

---

### UX2-HEADER-HP-009: Sticky workspace header and "Jump to" anchors

**Goal:** Ensure the sticky workspace header and Jump to bar behave correctly and improve navigation across sections.

**Steps:**
1. Open the Product Optimization workspace for a product with some metadata, Answer Blocks, automation history, and DEO issues.
2. Scroll down the page so metadata, answers, and automations sections move out of the initial viewport.
3. Observe the top of the viewport while scrolling.
4. Use each Jump to link (Metadata, Answers, Automations, Issues) in turn.
5. Use the Apply to Shopify button in the sticky header after editing metadata.

**Expected Results:**
- **Sticky header:**
  - Remains visible at the top of the page while scrolling.
  - Shows Back to Products link, product name, optimization status pill, and an Apply to Shopify button wired to the same behavior as the metadata editor's Apply action.
- **Jump to bar:**
  - Stays directly beneath the sticky header while scrolling.
  - Clicking Metadata scrolls smoothly to the metadata section (AI suggestions + SEO editor).
  - Clicking Answers scrolls smoothly to the Answers section (ephemeral answers + Answer Blocks).
  - Clicking Automations scrolls smoothly to the Automation History panel.
  - Clicking Issues scrolls smoothly to the DEO / SEO Insights panel in the right-hand column.
- After applying metadata from the sticky header, success toast and confirmation behavior remain consistent with existing Apply to Shopify flows (no double-apply or regression).

---

## Regression & Integration Checks

- Confirm existing AE-1.2 ProductAnswersPanel behaviors are unchanged:
  - Ephemeral AI answer generation still works and respects AI limits.
  - Product Optimization workspace loads without type or runtime errors.
- Verify backend endpoints:
  - `GET /products/:id/answer-blocks`
  - `POST /products/:id/answer-blocks`
  - `POST /products/:id/answer-blocks/automation-run`
  - `GET /products/:id/automation-logs`
  - All enforce ownership and behave as described above.

---

## Documentation & Critical Paths

- **Critical paths impacted:**
  - **CP-011: Answer Engine (Answer Blocks & Answerability)** – Product Workspace AEO tab now reads and edits persisted Answer Blocks.
  - **CP-012: Automation Engine (Framework & Rules)** – Product-level Answer Block automation history now visible to merchants.

- **Ensure:**
  - `docs/testing/CRITICAL_PATH_MAP.md` entries for CP-011 and CP-012 reference this document for UI verification.
  - `IMPLEMENTATION_PLAN.md` v1 Shopify launch section lists this manual testing doc under Manual Testing.
