# Answer Engine Specification (Phase AE 1.x)

> Canonical technical and product specification for the Answer Engine subsystem.

---

## 1. Purpose

### Primary Goals

The Answer Engine is designed to:

1. **Detect missing/weak answers** — Identify which key buyer/AI questions a product cannot yet answer well
2. **Generate Answer Blocks** — Create structured, factual answers from existing product and page data
3. **Improve Answerability** — Feed high-quality answer signals into DEO Score v2
4. **Be AI-preferable** — Produce content that AI assistants prefer to cite and surface

### Design Principles

Answer Blocks must be:

- **AI-readable** — Clear, structured format that AI systems can parse
- **AI-confident** — Based only on verified facts, never fabricated
- **AI-preferable** — Optimized for citation and extraction by search and AI engines

### Scope

| Phase      | Scope                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- |
| **AE 1.0** | Model + detection concepts + generation rules (this spec)                             |
| **AE 1.1** | Detection implementation + API endpoints                                              |
| **AE 1.2** | Generation pipeline + UI integration                                                  |
| **AE 2.x** | Deep integration with DEO Score v2, Issue Engine, Automation Engine, and Shopify sync |

---

## 2. Answer Block Model

### Structure

The `AnswerBlock` interface represents a single structured answer:

```typescript
interface AnswerBlock {
  id: string; // Stable identifier
  projectId: string; // Owning project
  productId?: string; // Primary product (optional for page-level)
  questionId: AnswerBlockQuestionId; // Question category
  question: string; // Human-readable question
  answer: string; // Factual answer (~80-120 words)
  confidence: number; // 0-1 confidence score
  sourceType: AnswerBlockSourceType; // generated | userEdited | legacy
  factsUsed: string[]; // Attribute keys used
  deoImpactEstimate?: {
    // Optional DEO Score impact
    answerability?: number;
    entityStrength?: number;
    intentMatch?: number;
  };
  version: string; // Engine version (e.g., 'ae_v1')
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

### Canonical Phase 1 Question Set

| Question ID                | Human-Readable Question      | Purpose                     |
| -------------------------- | ---------------------------- | --------------------------- |
| `what_is_it`               | What is this?                | Core product identification |
| `who_is_it_for`            | Who is it for?               | Target audience/use case    |
| `why_choose_this`          | Why choose this?             | Value proposition           |
| `key_features`             | What are the key features?   | Feature highlights          |
| `how_is_it_used`           | How is it used?              | Usage instructions          |
| `problems_it_solves`       | What problems does it solve? | Pain points addressed       |
| `what_makes_it_different`  | What makes it different?     | Differentiation             |
| `whats_included`           | What's included?             | Contents/components         |
| `materials_and_specs`      | Materials / Specs            | Technical details           |
| `care_safety_instructions` | Care / safety / instructions | Maintenance/safety          |

### Behavioral Requirements

#### No Hallucinations

**Critical:** Answers must strictly derive from existing data.

- Only use facts present in product/page data and known attributes
- Never infer, assume, or fabricate content
- When facts are insufficient, emit a "cannot answer" response instead

#### Answer Quality

- **Length:** 80-120 words maximum
- **Tone:** Factual, non-promotional, objective
- **Structure:** Clear, scannable, AI-friendly
- **Accuracy:** Must be verifiable from source data

#### "Cannot Answer" Behavior

When the Answer Engine cannot confidently answer a question:

1. Do not generate a low-quality or speculative answer
2. Mark the question as "missing" in AnswerabilityStatus
3. Surface this as an issue in the Issue Engine
4. Allow users to manually provide the answer

### Persistence Options

Answer Blocks can be persisted via:

1. **Dedicated DB model** — `AnswerBlock` table referencing `Project` and `Product`
2. **Embedded metadata** — Stored as JSON on products/pages

This spec defines the model; actual storage implementation is deferred to a follow-up phase to avoid premature schema changes.

---

## 3. Answerability Detection (Conceptual v1)

### Detection Inputs

The detection system analyzes:

1. **Existing Answer Blocks** — Presence/absence per question category
2. **Product Descriptions** — Quality and specificity of description content
3. **Product Attributes** — Presence of key attributes (materials, usage, audience)
4. **Crawl Data** — Structured data and content extracted from pages

### Detection Signals

| Signal                | Description                               | Weight |
| --------------------- | ----------------------------------------- | ------ |
| Answer Block presence | Does a high-confidence answer exist?      | High   |
| Description quality   | Is the description detailed and specific? | Medium |
| Attribute coverage    | Are key attributes populated?             | Medium |
| Content consistency   | Do descriptions and attributes align?     | Low    |

### Detection Output

The detection system outputs an `AnswerabilityStatus`:

```typescript
interface AnswerabilityStatus {
  status: 'answer_ready' | 'partially_answer_ready' | 'needs_answers';
  missingQuestions: AnswerBlockQuestionId[]; // No answer at all
  weakQuestions: AnswerBlockQuestionId[]; // Low-confidence answer
  answerabilityScore?: number; // 0-100 normalized
}
```

### Status Definitions

| Status                   | Criteria                                      |
| ------------------------ | --------------------------------------------- |
| `answer_ready`           | All 10 questions have high-confidence answers |
| `partially_answer_ready` | 5-9 questions answered, some missing/weak     |
| `needs_answers`          | Fewer than 5 questions answered               |

### Integration with DEO Score v2

Answerability signals map into DEO Score v2's Answerability component:

- `answerabilityScore` provides a 0-100 input signal
- Missing/weak questions reduce the component score
- High answer coverage increases the component score

**Note:** Detection heuristics will be implemented in a later backend patch; this spec defines the conceptual model only.

---

## 4. Lifecycle

### Answer Block Lifecycle Stages

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Detection  │ --> │ Generation  │ --> │   Review    │ --> │    Sync     │
│             │     │             │     │  / Editing  │     │ (Future)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

#### 1. Detection

- Triggered after sync, crawl, or Optimize action
- Identifies missing/weak answers per question category
- Updates AnswerabilityStatus for the product/page

#### 2. Generation

- AI creates new Answer Blocks when safe (sufficient data)
- Uses product attributes, descriptions, and crawl data
- Assigns confidence scores based on data quality
- Respects no-hallucination rules

#### 3. Review / Editing

- Users can review generated answers
- Users can edit or replace answers (sourceType: 'userEdited')
- Users can manually add answers for questions AI couldn't answer

#### 4. Sync (Future)

- Write Answer Blocks to Shopify metafields
- Generate schema.org JSON-LD for structured data
- Support for other platforms (WordPress, etc.)

### Non-Goals for Phase AE 1.0

- No automatic sync to Shopify metafields
- No batch operations or Automation Engine triggers
- No UI implementation (deferred to UX/AE phase)
- No Prisma schema changes

---

## 5. Integration Points

### DEO Score v2

Answer Blocks feed into multiple DEO Score v2 components:

| Component           | How Answer Blocks Contribute                        |
| ------------------- | --------------------------------------------------- |
| **Answerability**   | Primary input; high answer coverage = higher score  |
| **Intent Match**    | Well-matched answers improve intent signals         |
| **Entity Strength** | Clear entity definitions strengthen entity coverage |

For now, v2 uses Answerability-related signals; Answer Blocks provide richer data for future weighting refinements.

### Issue Engine Full

Missing/weak Answer Blocks surface as Answerability issues:

| Issue ID Pattern              | Description                  | Severity |
| ----------------------------- | ---------------------------- | -------- |
| `missing_answer_<questionId>` | No answer for this question  | Warning  |
| `weak_answer_<questionId>`    | Low-confidence answer exists | Info     |

**Note:** These issue IDs are reserved for a later Issue Engine patch.

### UI Integration (Future)

Planned UI components:

1. **Answers Tab** — Product workspace tab: Overview | Issues | Answers | History
2. **Answer Readiness Badge** — Visual indicator near DEO Score
3. **Answer Editor** — Inline editing for Answer Blocks
4. **Generation Controls** — Trigger AI answer generation

This spec defines UX expectations; actual UI implementation is deferred.

---

## 6. Versioning

### Version Scheme

Answer Engine versions follow the pattern: `ae_v{major}` or `ae_v{major}_{minor}`

| Version   | Description                                        |
| --------- | -------------------------------------------------- |
| `ae_v1`   | Initial Phase 1 implementation                     |
| `ae_v1_1` | Minor refinements to detection/generation          |
| `ae_v2`   | Major update with new question categories or logic |

### Versioning Rules

1. **Answer Blocks must store their version** — The `version` field is required
2. **Detection logic should be versioned** — Significant changes increment version
3. **Backward compatibility** — New versions should not invalidate old answers
4. **Version tracking** — Analytics should track answers by version

---

## 7. Security & Safety

### Non-Hallucination Enforcement

- All generated content must trace back to source data
- Confidence scores must reflect actual data support
- Low-confidence answers must be flagged, not presented as facts

### Data Provenance

- `factsUsed` field must accurately list source attributes
- Answer origin (generated vs. user-edited) must be tracked
- Audit trail for answer changes (future enhancement)

### Privacy & Security

- Answers must never expose internal logs or system data
- Non-public data sources must not be referenced in answers
- User-edited content should be sanitized for XSS/injection

---

## 8. Acceptance Criteria (Phase AE 1.0 Spec)

- [x] `AnswerBlock` and `AnswerabilityStatus` types defined in shared package
- [x] Canonical 10-question taxonomy documented
- [x] No-hallucination rules clearly specified
- [x] Lifecycle stages defined (detection, generation, review, sync)
- [x] DEO Score v2 integration points documented
- [x] Issue Engine integration points documented (reserved issue IDs)
- [x] UI expectations documented (deferred implementation)
- [x] Version scheme defined
- [x] Security/safety requirements specified

---

## 9. Phase AE-1.1 – Answerability Detection & API

### Scope

Phase AE-1.1 implements heuristic answerability detection for products based on:

- **Product title and descriptions** (`title`, `description`, `seoTitle`, `seoDescription`)
- **Presence and richness of content** relevant to each of the 10 canonical questions

This phase **excludes**:

- Answer Block persistence (deferred to AE-1.2+)
- AI generation (deferred to AE-1.2+)
- UI changes (deferred to UX/AE phases)

### Detection Heuristics

The `AnswerEngineService` classifies each of the 10 canonical questions as `missing`, `weak`, or `strong` based on heuristics over product text:

| Question                   | Detection Approach                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `what_is_it`               | Requires non-empty title and description with concrete nouns; short/generic content is weak |
| `who_is_it_for`            | Looks for audience indicators ("for runners", "for kids", "designed for")                   |
| `key_features`             | Looks for feature keywords ("features", "built with", "equipped with") and bullet patterns  |
| `how_is_it_used`           | Looks for usage verbs ("use it to", "simply plug", "wear this")                             |
| `problems_it_solves`       | Looks for problem/solution language ("helps reduce", "prevents", "solves")                  |
| `what_makes_it_different`  | Looks for differentiation indicators ("unlike other", "unique because", "patented")         |
| `whats_included`           | Looks for inclusion phrases ("includes", "comes with", "set of")                            |
| `materials_and_specs`      | Looks for material keywords (cotton, steel, etc.) and dimension patterns                    |
| `care_safety_instructions` | Looks for care/safety phrases ("machine wash", "warning", "non-toxic")                      |
| `why_choose_this`          | Looks for value proposition language and overall content quality                            |

**Answerability Score Computation:**

- Base score from fraction of non-missing questions (coverage)
- Quality bonus for strong vs weak classifications
- Final score: `(coverage * 40) + (quality * 60)`, clamped to [0, 100]

**Non-Hallucination Rule:**

When source data is insufficient for a question, the system marks it as `missing` and **never fabricates an answer**. Conflicting or low-quality data results in `weak` classification, not `strong`.

### API Endpoint

```
GET /projects/:projectId/answerability
```

**Authentication:** Required (JWT Bearer token)

**Authorization:** Only the project owner can access this endpoint

**Response Shape:**

```typescript
interface ProjectAnswerabilityResponse {
  projectId: string;
  generatedAt: string; // ISO timestamp
  overallStatus: {
    status: 'answer_ready' | 'partially_answer_ready' | 'needs_answers';
    missingQuestions: AnswerBlockQuestionId[];
    weakQuestions: AnswerBlockQuestionId[];
    answerabilityScore: number; // 0-100
  };
  products: Array<{
    productId: string;
    productTitle: string;
    status: AnswerabilityStatus;
  }>;
}
```

**Error Responses:**

- `401 Unauthorized` – Missing or invalid token
- `403 Forbidden` – User does not own the project
- `404 Not Found` – Project does not exist

### Integration & Non-Goals

**AE-1.1 does NOT:**

- Persist Answer Blocks to the database
- Modify DEO Score v2 computation (detection output is separate from scoring)
- Surface UI changes (Answers tab is AE-1.2+)
- Generate AI-written answers

**AE-1.1 detection output is designed to:**

- Feed into future DEO Score v2 Answerability component refinements
- Feed into Issue Engine as future `missing_answer_*` / `weak_answer_*` issues
- Provide actionable data for the Product Workspace Answers tab (AE-1.2+)

### Versioning

AE-1.1 remains under the `ae_v1` family for detection. Detection version is implicit in the service implementation; Answer Block versioning (for persistence) is not yet active.

---

## 10. Acceptance Criteria (Phase AE-1.1)

- [x] `ProductAnswerabilitySummary` and `ProjectAnswerabilityResponse` types defined in shared package
- [x] `AnswerEngineService` implemented with heuristic detection for all 10 questions
- [x] `GET /projects/:id/answerability` endpoint returns stable `ProjectAnswerabilityResponse`
- [x] Endpoint enforces project ownership (403 for non-owners, 404 for missing projects)
- [x] Detection respects non-hallucination rule (missing data → questions marked missing)
- [x] E2E tests cover happy path, authorization, and edge cases
- [x] DEO Score v1/v2 APIs continue unchanged

---

## 11. Phase AE-1.2 – Answer Generation & UI Integration

### Scope

Phase AE-1.2 implements AI-based Answer Block generation and UI integration:

- **AnswerGenerationService** generates factual Answer Blocks using configured AI provider
- **POST /ai/product-answers** endpoint returns `ProductAnswersResponse` with ephemeral answers
- **ProductAnswersPanel** UI component displays answers in Product Optimization workspace
- Answers are **ephemeral** (not persisted to database in AE-1.2)

### API Endpoint

```
POST /ai/product-answers
```

**Request Body:**

```json
{
  "productId": "string"
}
```

**Response Shape (ProductAnswersResponse):**

```typescript
interface ProductAnswersResponse {
  projectId: string;
  productId: string;
  generatedAt: string; // ISO timestamp
  answerabilityStatus: AnswerabilityStatus;
  answers: AnswerBlock[]; // Ephemeral, not persisted
}
```

**Error Responses:**

- `400 Bad Request` – Product not found or access denied
- `401 Unauthorized` – Missing or invalid token
- `429 Too Many Requests` – Daily AI limit reached

### Non-Hallucination Enforcement

The AI prompt instructs the provider to:

1. Only use facts explicitly present in product data
2. Return `cannotAnswer: true` when data is insufficient
3. Never infer, assume, or fabricate information
4. Assign appropriate confidence scores (0.7+ required for answer inclusion)

### UI Integration

The `ProductAnswersPanel` component is integrated into the Product Optimization workspace center column, displaying:

- Answerability status badge
- Answerability score (0-100)
- Warning for missing questions
- Expandable list of generated answers with confidence badges
- Generate/Regenerate button

### Entitlements

Answer generation shares the daily AI limit with other AI features (`automationSuggestionsPerDay`). The `product_answers` feature type is recorded in `AiUsageEvent`.

---

## 12. Acceptance Criteria (Phase AE-1.2)

- [x] `ProductAnswersResponse` type defined in shared package
- [x] `AnswerGenerationService` implemented with AI provider integration
- [x] `POST /ai/product-answers` endpoint returns `ProductAnswersResponse`
- [x] Endpoint enforces product ownership (400 for non-owners, 400 for missing products)
- [x] Generation respects non-hallucination rule (AI returns `cannotAnswer: true` when appropriate)
- [x] Daily AI limit enforcement via `EntitlementsService`
- [x] E2E tests cover happy path, authorization, and edge cases
- [x] `ProductAnswersPanel` component displays answers in Product Optimization workspace
- [x] Web API client updated with `generateProductAnswers` method
- [x] DEO Score v1/v2 and detection APIs continue unchanged

---

## 13. Phase AE-1.3 – Answer Block Persistence

Phase AE-1.3 introduces persistent Answer Blocks for products and is required for the EngineO.ai v1 Shopify-only launch:

### Scope

- **Store the 10 canonical Answer Blocks per product** in a durable backing store (Prisma model or equivalent), keyed by at least `projectId`, `productId`, `questionId`, and a version or timestamp field (`version`, `createdAt`/`updatedAt`).
- **Allow merchants to edit existing Answer Blocks** and save changes, preserving provenance via `sourceType` and versioning or `updatedAt` semantics.
- **Allow merchants (and future automations) to regenerate Answer Blocks** via the existing AE-1.2 generation pipeline while preserving non-hallucination guarantees from this spec.

### Persisted Answer Blocks as Canonical Source

Make persisted Answer Blocks the canonical source for:

- **Answerability signals and answerabilityScore** used by DEO Score v2 explainability (see `docs/deo-score-spec.md`).
- **Answerability and answer-related issues** in the Issues Engine (see `docs/deo-issues-spec.md`).
- **Answer Block automations** in the Automation Engine (see `docs/AUTOMATION_ENGINE_SPEC.md`).

### Scope Limitations

- Initial implementation scoped to **Shopify products for v1**; other integrations remain future work.

### Manual Testing & Verification

- Manual testing for AE-1.3 must be documented in `docs/manual-testing/phase-ae-1.3-answer-block-persistence.md` (clone of `docs/MANUAL_TESTING_TEMPLATE.md`), covering:
  - Creation, editing, and regeneration flows for Answer Blocks.
  - Non-hallucination behavior when data is insufficient.
  - Interactions with DEO Score, Issues Engine, and Automation Engine where applicable.
- The Implementation Plan entry for AE-1.3 and the v1 Shopify-only launch scope section must include a `Manual Testing:` bullet pointing to this document.
- When AE-1.3 is implemented, any critical path entries related to Answer Engine / Product Optimize in `docs/testing/CRITICAL_PATH_MAP.md` must be updated to reflect the new persistence behavior and its verification status.

---

## 14. Acceptance Criteria (Phase AE-1.3)

- [ ] Prisma model for `AnswerBlock` created with fields: `id`, `projectId`, `productId`, `questionId`, `question`, `answer`, `confidence`, `sourceType`, `factsUsed`, `version`, `createdAt`, `updatedAt`
- [ ] API endpoints for CRUD operations on Answer Blocks
- [ ] Persisted Answer Blocks feed into Answerability detection
- [ ] Users can edit and save Answer Blocks (sourceType: 'userEdited')
- [ ] Users can regenerate Answer Blocks via AE-1.2 pipeline
- [ ] Non-hallucination rules enforced during regeneration
- [ ] DEO Score v2 Answerability component reads from persisted Answer Blocks
- [ ] Issues Engine can surface missing/weak Answer Block issues
- [ ] Manual testing doc created: `docs/manual-testing/phase-ae-1.3-answer-block-persistence.md`
- [ ] Critical path map updated when implementation complete

---

## Document History

| Version | Date       | Changes                                                                                       |
| ------- | ---------- | --------------------------------------------------------------------------------------------- |
| 1.0     | 2025-12-08 | Initial Answer Engine specification (Phase AE 1.0)                                            |
| 1.1     | 2025-12-09 | Added Phase AE-1.1 Answerability detection implementation and /projects/:id/answerability API |
| 1.2     | 2025-12-09 | Added Phase AE-1.2 Answer Generation & UI Integration with POST /ai/product-answers endpoint  |
| 1.3     | 2025-12-10 | Added Phase AE-1.3 Answer Block Persistence specification for v1 launch                       |
