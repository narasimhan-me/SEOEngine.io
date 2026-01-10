# EngineO.ai – Manual Testing: Manual Testing Workflow & Template Integration

> This document validates the introduction of the canonical manual testing template and the v3.3 protocol updates for EngineO.ai AI collaboration.

---

## Overview

- **Purpose of the feature/patch:**
  - Introduce a canonical manual testing template (`docs/MANUAL_TESTING_TEMPLATE.md`) for all EngineO.ai features and patches.
  - Update the AI Collaboration Protocol to v3.3 with mandatory manual testing documentation requirements.
  - Update boot prompts in both `ENGINEO_AI_INSTRUCTIONS.md` and `SESSION_STARTER.md`.
  - Add a Manual Testing Documentation Workflow section to `docs/IMPLEMENTATION_PLAN.md`.

- **High-level user impact and what "success" looks like:**
  - Every future PATCH BATCH will require manual testing documentation as part of the deliverable.
  - Claude Implementer will consistently create/update manual testing docs under `docs/manual-testing/`.
  - GPT-5.1 Supervisor will include testing requirements in every PATCH BATCH.
  - The Implementation Plan will reference manual testing docs for each phase.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Manual Testing Documentation Workflow (new section)
  - Final summary section (updated with manual testing docs reference)

- **Related documentation:**
  - `docs/ENGINEO_AI_INSTRUCTIONS.md` (v3.3)
  - `docs/SESSION_STARTER.md` (v3.3)
  - `docs/MANUAL_TESTING_TEMPLATE.md` (new canonical template)

---

## Preconditions

- **Environment requirements:**
  - [x] Repository checked out with this patch applied
  - [x] Access to view/edit markdown files
  - [ ] Optional: Fresh AI session to test new boot prompts

- **Test accounts and sample data:**
  - N/A — This patch is documentation/process-only

- **Required user roles or subscriptions:**
  - N/A — No runtime behavior changes

---

## Test Scenarios (Happy Path)

### Scenario 1: Verify canonical template is present and matches expected structure

**ID:** HP-001

**Preconditions:**
- Patch has been applied to the repository

**Steps:**
1. Open `docs/MANUAL_TESTING_TEMPLATE.md`
2. Verify the file exists and is readable
3. Confirm the following sections are present:
   - Overview
   - Preconditions
   - Test Scenarios (Happy Path)
   - Edge Cases
   - Error Handling
   - Limits
   - Regression
   - Post-Conditions
   - Known Issues
   - Approval

**Expected Results:**
- **File:** File exists at `docs/MANUAL_TESTING_TEMPLATE.md`
- **Structure:** All 10 major sections are present with placeholder content and guidance text

---

### Scenario 2: Verify ENGINEO_AI_INSTRUCTIONS.md shows v3.3 with manual testing rules

**ID:** HP-002

**Preconditions:**
- Patch has been applied

**Steps:**
1. Open `docs/ENGINEO_AI_INSTRUCTIONS.md`
2. Check the title line for version number
3. Search for "Manual testing documentation rule (v3.3):" in section 2.2
4. Search for manual testing responsibilities in section 2.3
5. Search for "Manual Testing docs (v3.3)" subsection in section 5
6. Verify section 6 references v3.3 rules
7. Verify section 7.2 and 7.3 boot prompts are labeled v3.3
8. Verify section 8 versioning states v3.3

**Expected Results:**
- **Title:** Shows "v3.3"
- **Section 2.2:** Contains "Manual testing documentation rule (v3.3):" block
- **Section 2.3:** Lists manual testing doc creation as a responsibility
- **Section 5:** Has "Manual Testing docs (v3.3)" subsection
- **Section 6:** References v3.3 rules including manual testing workflow
- **Section 7.2:** Header says "v3.3", content includes "Documentation & Testing Rules (v3.3):"
- **Section 7.3:** Header says "v3.3", content includes "Implementation Plan & Manual Testing Rules (v3.3):"
- **Section 8:** States document is v3.3 and mentions manual testing template introduction

---

### Scenario 3: Verify SESSION_STARTER.md shows v3.3 boot prompts

**ID:** HP-003

**Preconditions:**
- Patch has been applied

**Steps:**
1. Open `docs/SESSION_STARTER.md`
2. Check title for version
3. Verify section headings show v3.3:
   - "1. UEP Boot Prompt — v3.3"
   - "2. GPT-5.1 Supervisor Boot Prompt — v3.3"
   - "3. Claude Implementer Boot Prompt — v3.3"
4. In Supervisor boot prompt, verify "Documentation & Testing Rules (v3.3):" is present
5. In Claude boot prompt, verify "Implementation Plan & Manual Testing Rules (v3.3):" is present

**Expected Results:**
- **Title:** "Session Starter Pack (v3.3)"
- **Section headers:** All three boot prompts labeled v3.3
- **Supervisor prompt:** Contains manual testing requirement bullets
- **Claude prompt:** Contains manual testing doc creation requirement and summary requirements

---

### Scenario 4: Verify docs/IMPLEMENTATION_PLAN.md includes manual testing workflow section

**ID:** HP-004

**Preconditions:**
- Patch has been applied

**Steps:**
1. Open `docs/IMPLEMENTATION_PLAN.md`
2. Search for "## Manual Testing Documentation Workflow"
3. Verify it appears after "Test Track" section and before "Test Phase 0"
4. Confirm it references `docs/MANUAL_TESTING_TEMPLATE.md`
5. Search the final summary section for manual testing docs bullet
6. Verify it references `docs/manual-testing/` directory

**Expected Results:**
- **New section:** "Manual Testing Documentation Workflow" exists between Test Track and Test Phase 0
- **Content:** References canonical template path and `docs/manual-testing/` directory
- **Final summary:** Contains bullet about manual testing docs with correct paths

---

## Edge Cases

### EC-001: Patches touching multiple phases/features

**Description:** When a single patch affects multiple phases, determine if one or multiple manual testing docs should be created.

**Steps:**
1. Review guidance in `docs/MANUAL_TESTING_TEMPLATE.md` intro text
2. Consider patch scope and decide on doc naming

**Expected Behavior:**
- For tightly related changes: Single doc covering all affected areas
- For distinct features: Separate docs per feature, each named to match the phase

---

### EC-002: Docs-only changes vs code+docs changes

**Description:** Ensure manual testing is still required for documentation-only patches.

**Steps:**
1. Review this patch (which is docs-only)
2. Confirm manual testing doc was still required

**Expected Behavior:**
- Manual testing docs are required even for process/documentation changes
- Tests focus on verifying document structure and content rather than runtime behavior

---

## Error Handling

### ERR-001: Missing or incorrectly named manual testing doc

**Scenario:** Claude fails to create/update the manual testing doc after a PATCH BATCH

**Steps:**
1. Review Claude's completion summary
2. Check for manual testing doc path/filename mention
3. Verify file exists in `docs/manual-testing/`

**Expected Behavior:**
- Claude's summary MUST mention the manual testing doc path
- If missing, the PATCH BATCH is not considered complete
- Supervisor should flag incomplete patches in future sessions

---

### ERR-002: Canonical template inadvertently modified

**Scenario:** `docs/MANUAL_TESTING_TEMPLATE.md` is edited directly instead of cloned

**Steps:**
1. Check git diff for `docs/MANUAL_TESTING_TEMPLATE.md`
2. Verify only the original canonical content is present

**Expected Behavior:**
- Template should never be modified for specific patches
- All per-patch docs should be new files in `docs/manual-testing/`
- If template is modified, it should be reverted unless intentionally updating the standard

---

## Limits

### LIM-001: Process-only changes (no runtime limits)

**Scenario:** This patch does not change any runtime behavior, entitlements, or quotas.

**Steps:**
1. Confirm no code files were modified
2. Confirm only `.md` documentation files were changed/created

**Expected Behavior:**
- No runtime limit testing applicable
- Focus is on documentation structure and content accuracy

---

## Regression

### Areas potentially impacted:

- [ ] **Prior AI collaboration rules:** Implementation Plan ownership and PATCH BATCH workflow should still function correctly
- [ ] **Existing documentation:** Other docs should not be inadvertently modified
- [ ] **v3.2 compatibility:** Sessions using older prompts should not break (though they won't enforce manual testing)

### Quick sanity checks:

- [ ] `docs/ENGINEO_AI_INSTRUCTIONS.md` still contains all v3.2 rules in addition to v3.3 additions
- [ ] `docs/SESSION_STARTER.md` UEP prompt content unchanged (only version label updated)
- [ ] `docs/IMPLEMENTATION_PLAN.md` Test Track section unchanged except for new Manual Testing section insertion
- [ ] No other docs accidentally modified

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A — No test data created (documentation changes only)

### Follow-up verification:

- [ ] Confirm all files saved and committed
- [ ] Verify `docs/manual-testing/` directory exists

---

## Known Issues

- **Intentionally accepted issues:**
  - Older phases in docs/IMPLEMENTATION_PLAN.md do not yet have `Manual Testing:` bullets; these will be backfilled opportunistically as phases are revisited.

- **Out-of-scope items:**
  - Automated enforcement of manual testing doc creation (this is a process rule, not code enforcement)
  - Migration of any existing informal testing notes into the new format

- **TODOs:**
  - [ ] Consider adding CI check for manual testing doc presence (future enhancement)

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Created as part of v3.3 protocol update |
