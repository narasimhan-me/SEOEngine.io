# ENTERPRISE-GEO-1: Enterprise Governance & Approvals

**Status:** Implemented
**Target:** Enterprise-ready governance controls for GEO reports and content modifications

---

## Overview

ENTERPRISE-GEO-1 adds enterprise-grade governance controls to the GEO (Generative Engine Optimization) feature set. These controls enable organizations to enforce approval workflows, passcode-protected sharing, audit logging, and content export restrictions.

---

## Core Features

### 1. Governance Policy (per-project)

Each project can define governance settings via `GovernancePolicy`:

| Field                     | Type    | Default          | Description                                                             |
| ------------------------- | ------- | ---------------- | ----------------------------------------------------------------------- |
| `requireApproval`         | boolean | false            | Require approval before applying GEO fixes or syncing Answer Blocks     |
| `restrictShareLinks`      | boolean | false            | Enforce audience restrictions on share links                            |
| `allowedExportAudience`   | enum    | ANYONE_WITH_LINK | Minimum audience for share links (ANYONE_WITH_LINK, PASSCODE, ORG_ONLY) |
| `shareLinkExpiryDays`     | number  | 14               | Default expiry for new share links                                      |
| `allowCompetitorMentions` | boolean | true             | Allow competitor mentions in exported reports                           |
| `allowPII`                | boolean | false            | **Always false** - PII export is never allowed                          |

### 2. Approval Workflow

When `requireApproval` is enabled:

- **GEO Fix Apply** (`applyGeoFix`) requires a valid approval
- **Answer Block Sync** (`syncAnswerBlocksToShopify`) requires a valid approval

Approval lifecycle:

1. Request approval via `POST /projects/:id/governance/approvals`
2. Approval is created with `status: PENDING`
3. Approver approves/rejects via `PATCH /projects/:id/governance/approvals/:approvalId`
4. When action is executed, approval is marked as `consumed: true`

### 3. Passcode-Protected Share Links

Share links can be protected with an 8-character alphanumeric passcode:

- **Format:** A-Z, 0-9 (uppercase only)
- **Generation:** Cryptographically random
- **Display:** Shown only once at creation
- **Storage:** bcrypt hash stored, only `last4` preserved for hints
- **Verification:** POST `/share/geo-report/:token/verify` with `{ passcode: "..." }`

### 4. Audit Events

All governance-related actions are logged to `GovernanceAuditEvent`:

| Event Type           | Description                         |
| -------------------- | ----------------------------------- |
| `POLICY_UPDATED`     | Governance policy was modified      |
| `APPROVAL_REQUESTED` | New approval request created        |
| `APPROVAL_APPROVED`  | Approval was granted                |
| `APPROVAL_REJECTED`  | Approval was denied                 |
| `SHARE_LINK_CREATED` | New share link generated            |
| `SHARE_LINK_REVOKED` | Share link manually revoked         |
| `APPLY_EXECUTED`     | GEO fix or sync action was executed |

### 5. Content Redaction

When `allowCompetitorMentions: false`:

- Export reports have competitor-related text patterns redacted
- Patterns like "competitor X", "vs. X", "compared to X" become "[REDACTED]"

---

## API Endpoints

### Governance Policy

```
GET    /projects/:id/governance/policy
PUT    /projects/:id/governance/policy
```

### Approvals

```
GET    /projects/:id/governance/approvals
POST   /projects/:id/governance/approvals
PATCH  /projects/:id/governance/approvals/:approvalId
```

### Audit Events

```
GET    /projects/:id/governance/audit
```

### Share Link (with passcode)

```
POST   /projects/:id/geo-reports/share-links
       Body: { audience: "PASSCODE" }
       Response: { shareLink: {...}, passcode: "ABCD1234" }

POST   /share/geo-report/:token/verify
       Body: { passcode: "ABCD1234" }
```

---

## Hard Contracts

### Mutation-Free Views

**Contract:** View/print operations are read-only.

- `GET /share/geo-report/:token` - No DB writes
- `POST /share/geo-report/:token/verify` - Only validates passcode, no writes
- Report assembly - Reads from existing insights, no mutations
- Printing - Pure client-side rendering

### PII Protection

**Contract:** PII export is never allowed.

- `allowPII` in GovernancePolicy is always `false`
- API rejects any attempt to set `allowPII: true`
- UI shows the toggle as disabled/locked
- No PII fields are included in any export format

### Passcode Security

- 8 characters, A-Z + 0-9 (uppercase)
- Plaintext shown exactly once at creation
- Only `passcodeLast4` stored for hint display
- Full passcode stored as bcrypt hash
- Audit logs record `passcodeLast4`, never full passcode

---

## Database Schema

```prisma
model GovernancePolicy {
  id                     String   @id @default(cuid())
  projectId              String   @unique
  project                Project  @relation(...)
  requireApproval        Boolean  @default(false)
  restrictShareLinks     Boolean  @default(false)
  allowedExportAudience  ShareLinkAudience @default(ANYONE_WITH_LINK)
  shareLinkExpiryDays    Int      @default(14)
  allowCompetitorMentions Boolean @default(true)
  allowPII               Boolean  @default(false)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}

model GovernanceApproval {
  id           String   @id @default(cuid())
  projectId    String
  project      Project  @relation(...)
  actionType   GovernanceActionType
  targetId     String?
  status       ApprovalStatus @default(PENDING)
  requestedBy  String
  approvedBy   String?
  rejectedBy   String?
  rejectionReason String?
  consumed     Boolean  @default(false)
  consumedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model GovernanceAuditEvent {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(...)
  eventType  GovernanceEventType
  actorId    String
  targetId   String?
  metadata   Json?
  createdAt  DateTime @default(now())
}

enum ShareLinkAudience {
  ANYONE_WITH_LINK
  PASSCODE
  ORG_ONLY
}

enum GovernanceActionType {
  GEO_FIX_APPLY
  ANSWER_BLOCK_SYNC
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

enum GovernanceEventType {
  POLICY_UPDATED
  APPROVAL_REQUESTED
  APPROVAL_APPROVED
  APPROVAL_REJECTED
  SHARE_LINK_CREATED
  SHARE_LINK_REVOKED
  APPLY_EXECUTED
}
```

---

## Test Coverage

### Backend Integration Tests

`apps/api/test/integration/enterprise-geo-1.test.ts`:

- Governance policy CRUD
- Approval workflow (request → approve → consume)
- Share link creation with passcode
- Passcode verification flow
- Expiry policy enforcement
- Audience restriction enforcement
- Audit event logging

### Playwright E2E Tests

`apps/web/tests/enterprise-geo-1.spec.ts`:

- Governance settings section visibility
- Approval toggle interaction
- Passcode-protected link flow (create → enter passcode → view)
- Wrong passcode error handling
- Share link expiry policy enforcement
- Restricted audience enforcement

---

## Related Documentation

- [GEO_INSIGHTS.md](./GEO_INSIGHTS.md) - GEO insights dashboard
- [GEO_EXPORT.md](./GEO_EXPORT.md) - GEO report export/sharing
- [GEO_FOUNDATION.md](./GEO_FOUNDATION.md) - GEO foundation and concepts
- [API_SPEC.md](../API_SPEC.md) - Full API specification
