# GEO Export – Report Assembly & Share Links

> Export and share GEO readiness reports with stakeholders.
>
> **Mental Model**: Reports are read-only snapshots of internal readiness signals. They never trigger AI operations or database mutations.

---

## Decision Locks (v1 + ENTERPRISE-GEO-1)

The following decisions are locked and must not be changed without explicit approval:

### Share Link Model
| Decision | Detail |
|----------|--------|
| **Access Model** | Default: "Anyone with the link". When governance policy requires: passcode-protected (ENTERPRISE-GEO-1) |
| **Time-bound** | Default 14-day expiry; customizable via governance policy `shareLinkExpiryDays` |
| **Revocable** | Links can be revoked by the owner at any time |
| **Non-discoverable** | URLs use random tokens, not indexed/crawlable |
| **Read-only** | Shared reports are view-only snapshots |
| **Mutation-free** | Public view, assembly, and print perform NO database writes (ENTERPRISE-GEO-1 hard contract) |

### Passcode Protection (ENTERPRISE-GEO-1)
| Decision | Detail |
|----------|--------|
| **Format** | 8 characters, uppercase A-Z + 0-9 |
| **Shown Once** | Plaintext passcode displayed only at creation in a modal with acknowledgement |
| **Storage** | bcrypt hash stored; only `last4` preserved for hints |
| **Verification** | POST `/share/geo-report/:token/verify` with `{ passcode: "..." }` |
| **Audit** | Creation logs `passcodeLast4`, never full passcode |

### Export-Safe Data
| Requirement | Detail |
|-------------|--------|
| **No Internal IDs** | Reports exclude product IDs, answer block IDs, issue IDs |
| **No Internal Links** | Reports exclude hrefs pointing to app routes |
| **No Raw Issue Dumps** | Reports show human-readable labels, not raw issue types |
| **Attribution Readiness** | Use "Attribution readiness" instead of "citation confidence" |
| **Answer Engines** | Use "answer engines" generically, not vendor names (ChatGPT, Perplexity) |

### Required Elements
| Element | Purpose |
|---------|---------|
| **Read-only Badge** | Indicates snapshot nature |
| **Expiry Date** | Shows when share link expires |
| **Generated Date** | Shows when report was generated |
| **Disclaimer** | "These metrics reflect internal content readiness signals. Actual citations by AI systems depend on many factors outside your control." |

### Error States
| State | Display |
|-------|---------|
| **expired** | "Link Expired" – prompt to request new link |
| **revoked** | "Access Revoked" – explain link was revoked by owner |
| **not_found** | "Report Not Found" – generic not-found state |

---

## API Endpoints

### Authenticated Endpoints

**All require JWT authentication and project ownership.**

#### GET /projects/:projectId/geo-reports/assemble

Assembles export-safe GEO report data.

**Response:**
```json
{
  "projectId": "...",
  "projectName": "My Project",
  "generatedAt": "2025-12-20T...",
  "overview": {
    "productsAnswerReadyPercent": 75,
    "productsAnswerReadyCount": 15,
    "productsTotal": 20,
    "answersTotal": 45,
    "reuseRatePercent": 35,
    "confidenceDistribution": { "high": 10, "medium": 5, "low": 5 }
  },
  "coverage": {
    "byIntent": [
      { "intentType": "transactional", "label": "Transactional", "productsCovered": 18, "productsTotal": 20, "coveragePercent": 90 }
    ],
    "gaps": ["trust_validation"],
    "summary": "Coverage shows whether..."
  },
  "trustSignals": {
    "topBlockers": [
      { "label": "Missing Clarity", "affectedProducts": 5 }
    ],
    "avgTimeToImproveHours": 24,
    "summary": "Trust signals summarize..."
  },
  "opportunities": [
    { "title": "Improve coverage", "why": "...", "estimatedImpact": "high", "category": "coverage" }
  ],
  "disclaimer": "These metrics reflect internal content readiness signals..."
}
```

#### POST /projects/:projectId/geo-reports/share-links

Creates a new shareable link.

**Request:**
```json
{ "title": "Q4 Report" }
```

**Response:**
```json
{
  "id": "...",
  "shareToken": "abc123xyz",
  "shareUrl": "https://app.engineo.ai/share/geo-report/abc123xyz",
  "title": "Q4 Report",
  "expiresAt": "2025-01-03T...",
  "createdAt": "2025-12-20T...",
  "status": "ACTIVE"
}
```

#### GET /projects/:projectId/geo-reports/share-links

Lists all share links for a project.

#### DELETE /projects/:projectId/geo-reports/share-links/:linkId

Revokes a share link. Returns `{ "success": true }`.

### Public Endpoint

**No authentication required.**

#### GET /public/geo-reports/:shareToken

Returns the shared report or an error status.

**Response (valid):**
```json
{
  "status": "valid",
  "report": { ... },
  "expiresAt": "2025-01-03T...",
  "generatedAt": "2025-12-20T..."
}
```

**Response (expired/revoked/not_found):**
```json
{
  "status": "expired" | "revoked" | "not_found"
}
```

---

## Database Schema

### GeoReportShareLink Model

```prisma
enum GeoReportShareLinkStatus {
  ACTIVE
  EXPIRED
  REVOKED
}

model GeoReportShareLink {
  id              String                   @id @default(cuid())
  project         Project                  @relation(...)
  projectId       String
  shareToken      String                   @unique @default(cuid())
  title           String?
  createdAt       DateTime                 @default(now())
  expiresAt       DateTime
  status          GeoReportShareLinkStatus @default(ACTIVE)
  revokedAt       DateTime?
  generatedAt     DateTime                 @default(now())
  createdByUserId String
}
```

---

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/projects/:id/insights/geo-insights` | GEO Insights page (with Export Report CTA) |
| `/projects/:id/insights/geo-insights/export` | Export/print view with share link management |
| `/share/geo-report/:token` | Public share view (no auth) |

---

## Trust Contracts

1. **Read-only**: Export and share operations never trigger AI or mutations
2. **Mutation-free Views**: Public share view, report assembly, and printing perform NO database writes (ENTERPRISE-GEO-1 hard contract)
3. **Time-bound**: Share links expire (default 14 days, customizable via governance policy)
4. **Revocable**: Owners can revoke links at any time
5. **Export-safe**: No internal IDs, hrefs, or raw issue dumps in exports
6. **Hedged Language**: All copy uses "may," "can help," "supports" – never guarantees
7. **PII Never Allowed**: PII export is always disabled; API rejects attempts to enable (ENTERPRISE-GEO-1)
8. **Passcode Shown Once**: Plaintext passcode returned only at creation, never stored or recoverable

---

## Testing

### Integration Tests

`apps/api/test/integration/geo-export-1.test.ts`:
- Assemble endpoint returns export-safe data
- Share link CRUD operations
- Public share view status handling (valid/expired/revoked/not_found)

### Playwright Tests

`apps/web/tests/geo-export-1.spec.ts`:
- Export button appears on GEO Insights page
- Export page loads with report data
- Share link creation and revocation
- Public share view displays read-only badge and disclaimer

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-20 | Initial GEO Export documentation (GEO-EXPORT-1) |
| 1.1 | 2025-12-21 | ENTERPRISE-GEO-1: Added passcode protection, mutation-free hard contract, governance policy integration |
