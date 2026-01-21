# EngineO.ai – Release Verification Gate (RVG)

> Defines the gating criteria that must be satisfied before any release or major merge.

---

## Purpose

This document establishes the verification requirements that must be met before:

- Deploying to production
- Merging major feature branches
- Publishing a new version

The RVG ensures all critical paths have been verified and documented.

---

## Pre-Release Checklist

### 1. Critical Path Verification

All critical paths in `docs/testing/CRITICAL_PATH_MAP.md` must be verified:

| Requirement                 | Description                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| **Manual Testing Complete** | All critical paths have "Last Verified (Manual)" dates within the release window |
| **Key Scenarios Checked**   | All checkbox items under each critical path are marked complete                  |
| **No Blocking Issues**      | No critical path has unresolved blockers                                         |

**Verification Command:**

```bash
# Review Critical Path Map for recent verification dates
cat docs/testing/CRITICAL_PATH_MAP.md | grep "Last Verified"
```

---

### 2. Manual Testing Documentation

All features in the release must have associated manual testing docs:

| Requirement                | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| **Per-Feature Docs Exist** | Each feature has a doc in `docs/manual-testing/`          |
| **System Docs Updated**    | Relevant system-level docs in `docs/testing/` are current |
| **Approval Status**        | Testing docs show "Passed" status in Approval section     |

**Verification Command:**

```bash
# List all manual testing docs
ls -la docs/manual-testing/
ls -la docs/testing/
```

---

### 3. Implementation Plan Alignment

The Implementation Plan must reflect the release state:

| Requirement                | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| **Phases Marked Complete** | All implemented phases show completion markers           |
| **Manual Testing Links**   | Each phase has `Manual Testing:` bullet pointing to docs |
| **No Orphan Features**     | All shipped features are documented in the plan          |

---

### 4. Documentation Consistency

All documentation must be consistent and current:

| Requirement              | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| **API Spec Current**     | `docs/API_SPEC.md` matches implemented endpoints       |
| **Architecture Current** | `docs/ARCHITECTURE.md` reflects current system design  |
| **Entitlements Current** | `docs/ENTITLEMENTS_MATRIX.md` matches code enforcement |

---

## Gate Criteria by Release Type

### Production Deploy

| Gate                         | Required | Notes                    |
| ---------------------------- | -------- | ------------------------ |
| All Critical Paths Verified  | ✅ Yes   | Within last 7 days       |
| Manual Testing Docs Complete | ✅ Yes   | All features covered     |
| Implementation Plan Updated  | ✅ Yes   | Phases marked complete   |
| No P0/P1 Bugs Open           | ✅ Yes   | Blocking issues resolved |
| Smoke Test Passed            | ✅ Yes   | Core flows functional    |

### Staging Deploy

| Gate                    | Required       | Notes                       |
| ----------------------- | -------------- | --------------------------- |
| Critical Paths Verified | 🟡 Recommended | At least touched paths      |
| Manual Testing Docs     | 🟡 Recommended | For new features            |
| Implementation Plan     | ✅ Yes         | Must reflect changes        |
| No P0 Bugs              | ✅ Yes         | P1 acceptable if documented |

### Feature Branch Merge

| Gate                       | Required | Notes                                |
| -------------------------- | -------- | ------------------------------------ |
| Feature Manual Testing Doc | ✅ Yes   | Must exist in `docs/manual-testing/` |
| Critical Path Map Updated  | ✅ Yes   | If touching critical path            |
| Implementation Plan Entry  | ✅ Yes   | Phase/feature documented             |

---

## Verification Process

### Step 1: Review Critical Path Map

1. Open `docs/testing/CRITICAL_PATH_MAP.md`
2. Check each critical path's "Last Verified" dates
3. Ensure all dates are within acceptable window (7 days for prod)
4. Verify all key scenarios are checked

### Step 2: Review Manual Testing Docs

1. List docs in `docs/manual-testing/` and `docs/testing/`
2. For each feature in release, confirm doc exists
3. Check Approval section shows "Passed" status
4. Review Known Issues for any blockers

### Step 3: Review Implementation Plan

1. Open `IMPLEMENTATION_PLAN.md`
2. Verify all shipped phases are marked complete
3. Confirm `Manual Testing:` bullets point to correct docs
4. Check final summary section is current

### Step 4: Run Smoke Test

Execute core user journeys:

- [ ] User can sign up / log in
- [ ] User can create a project (within limits)
- [ ] User can connect Shopify store
- [ ] User can trigger a crawl
- [ ] User can view DEO score
- [ ] User can optimize a product
- [ ] Billing page loads correctly

### Step 5: Sign-Off

| Field                | Value            |
| -------------------- | ---------------- |
| **Release Version**  | [vX.Y.Z]         |
| **Verifier Name**    | [Name]           |
| **Date**             | [YYYY-MM-DD]     |
| **All Gates Passed** | [ ] Yes / [ ] No |
| **Notes**            |                  |

---

## Exception Process

If a release must proceed without meeting all gates:

1. **Document the exception** in this file under "Exception Log"
2. **Identify the risk** and mitigation plan
3. **Get founder approval** before proceeding
4. **Create follow-up task** to address the gap post-release

### Exception Log

| Date | Release | Gate Skipped | Reason | Mitigation | Approved By |
| ---- | ------- | ------------ | ------ | ---------- | ----------- |
| —    | —       | —            | —      | —          | —           |

---

## Automated Checks (Future)

The following automated checks are planned for CI integration:

| Check                     | Status  | Description                            |
| ------------------------- | ------- | -------------------------------------- |
| Critical Path Dates       | Planned | Verify dates are recent                |
| Manual Test Doc Existence | Planned | Check docs exist for changed files     |
| Implementation Plan Links | Planned | Verify manual testing links are valid  |
| Approval Status Parser    | Planned | Extract and validate approval statuses |

---

## Document History

| Version | Date      | Changes                                    |
| ------- | --------- | ------------------------------------------ |
| 1.0     | [Initial] | Created as part of v3.4 verification layer |
