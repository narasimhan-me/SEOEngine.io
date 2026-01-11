# SHOPIFY-ASSET-SYNC-COVERAGE-1 — Manual Testing
> Clone of MANUAL_TESTING_TEMPLATE.md (structure preserved).

---

## Overview

- Purpose of the feature/patch:
  - Ensure Shopify Pages and Shopify Collections are ingested into EngineO.ai and visible in Assets lists/details.
- High-level user impact and what "success" looks like:
  - After sync, users can see Shopify "About/Contact" pages and Collections in EngineO.ai.
  - UI clearly distinguishes "never synced" vs "synced but empty" and shows last sync time.
- Related phases/sections in docs/IMPLEMENTATION_PLAN.md:
  - Phase SHOPIFY-ASSET-SYNC-COVERAGE-1
- Related documentation:
  - CRITICAL_PATH_MAP.md (CP-006 Shopify Sync)
  - shopify-integration.md
  - sync-status-and-progress-feedback.md

---

## Preconditions

- Environment requirements:
  - API + Web running
  - Shopify connected to the target project
  - Shopify scopes include read_content (Pages) and required read scopes for Collections
- Test accounts and sample data:
  - A project connected to a Shopify store that contains:
    - Pages: "About us", "Contact"
    - Collections: at least 1–2 collections
- Required user roles or subscriptions:
  - OWNER role (required to trigger sync)
  - VIEWER role (optional) to confirm read-only sync-status visibility

---

## Test Scenarios (Happy Path)

### Scenario 1: Pages sync imports Shopify Pages and shows last sync time

ID: HP-001

Steps:
1. Go to Assets → Pages for a Shopify-connected project.
2. If empty and never synced, confirm the page shows "Not yet synced…" guidance.
3. Click "Sync Pages".
4. Confirm Pages list contains "About us" and "Contact" (or store-equivalent pages).
5. Confirm a "Last synced: …" line is visible.
6. Open a Page detail row and confirm header shows handle + updated timestamp (metadata-only).

Expected Results:
- UI: Pages list and detail populate; last sync line updates after sync.
- API: Sync endpoint returns counts + completedAt; sync-status returns lastPagesSyncAt.

---

### Scenario 2: Collections sync imports Shopify Collections and shows last sync time

ID: HP-002

Steps:
1. Go to Assets → Collections.
2. Click "Sync Collections".
3. Confirm collections appear in the list.
4. Confirm a "Last synced: …" line is visible.
5. Open a Collection detail and confirm header shows handle + updated timestamp (metadata-only).

Expected Results:
- UI: Collections list and detail populate correctly; no Pages/Collections mixing.
- API: sync-status returns lastCollectionsSyncAt.

---

## Edge Cases

### EC-001: Never synced vs synced-but-empty messaging

Description: Ensure the empty state is not interpreted as a broken integration.

Steps:
1. Open Pages/Collections lists before ever syncing.
2. Confirm "Not yet synced…" messaging appears.
3. Trigger sync on a store with zero Pages or zero Collections.

Expected Behavior:
- Never synced: "Not yet synced. Click Sync…"
- Synced but empty: "No pages found…" / "No collections found…"

---

## Error Handling

### ERR-001: Missing Shopify scope for Pages

Scenario: Store token does not include read_content.

Steps:
1. Attempt "Sync Pages".

Expected Behavior:
- Clear error instructing user to reconnect Shopify to grant required permissions.
- No destructive deletes; existing data remains.

---

### ERR-003: Permission Failures

Scenario: Non-OWNER attempts to trigger sync.

Steps:
1. Log in as EDITOR/VIEWER.
2. Attempt sync.

Expected Behavior:
- API returns 403; UI remains stable and communicates lack of permission.

---

## Limits

### LIM-001: N/A

---

## Regression

### Areas potentially impacted:

- [ ] CP-006 Shopify Sync: existing product sync still works
- [ ] Assets Pages/Collections list routing and Drafts tab routing still correct
- [ ] No content-body surfaces introduced

### Quick sanity checks:

- [ ] Products list still loads
- [ ] Existing Pages/Collections Playbooks + Draft Review routes still work

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A (no manual cleanup required unless using test stores)

### Follow-up verification:

- [ ] Confirm no unexpected deletes occurred

---

## Known Issues

- Intentionally accepted issues:
  - Metadata-only ingestion; no content body.
- Out-of-scope items:
  - Any apply expansion for Pages/Collections beyond what already exists.
- TODOs:
  - N/A
