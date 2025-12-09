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

| Phase | Scope |
|-------|-------|
| **AE 1.0** | Model + detection concepts + generation rules (this spec) |
| **AE 1.1** | Detection implementation + API endpoints |
| **AE 1.2** | Generation pipeline + UI integration |
| **AE 2.x** | Deep integration with DEO Score v2, Issue Engine, Automation Engine, and Shopify sync |

---

## 2. Answer Block Model

### Structure

The `AnswerBlock` interface represents a single structured answer:

```typescript
interface AnswerBlock {
  id: string;                    // Stable identifier
  projectId: string;             // Owning project
  productId?: string;            // Primary product (optional for page-level)
  questionId: AnswerBlockQuestionId;  // Question category
  question: string;              // Human-readable question
  answer: string;                // Factual answer (~80-120 words)
  confidence: number;            // 0-1 confidence score
  sourceType: AnswerBlockSourceType;  // generated | userEdited | legacy
  factsUsed: string[];           // Attribute keys used
  deoImpactEstimate?: {          // Optional DEO Score impact
    answerability?: number;
    entityStrength?: number;
    intentMatch?: number;
  };
  version: string;               // Engine version (e.g., 'ae_v1')
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### Canonical Phase 1 Question Set

| Question ID | Human-Readable Question | Purpose |
|-------------|-------------------------|---------|
| `what_is_it` | What is this? | Core product identification |
| `who_is_it_for` | Who is it for? | Target audience/use case |
| `why_choose_this` | Why choose this? | Value proposition |
| `key_features` | What are the key features? | Feature highlights |
| `how_is_it_used` | How is it used? | Usage instructions |
| `problems_it_solves` | What problems does it solve? | Pain points addressed |
| `what_makes_it_different` | What makes it different? | Differentiation |
| `whats_included` | What's included? | Contents/components |
| `materials_and_specs` | Materials / Specs | Technical details |
| `care_safety_instructions` | Care / safety / instructions | Maintenance/safety |

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

| Signal | Description | Weight |
|--------|-------------|--------|
| Answer Block presence | Does a high-confidence answer exist? | High |
| Description quality | Is the description detailed and specific? | Medium |
| Attribute coverage | Are key attributes populated? | Medium |
| Content consistency | Do descriptions and attributes align? | Low |

### Detection Output

The detection system outputs an `AnswerabilityStatus`:

```typescript
interface AnswerabilityStatus {
  status: 'answer_ready' | 'partially_answer_ready' | 'needs_answers';
  missingQuestions: AnswerBlockQuestionId[];  // No answer at all
  weakQuestions: AnswerBlockQuestionId[];     // Low-confidence answer
  answerabilityScore?: number;                // 0-100 normalized
}
```

### Status Definitions

| Status | Criteria |
|--------|----------|
| `answer_ready` | All 10 questions have high-confidence answers |
| `partially_answer_ready` | 5-9 questions answered, some missing/weak |
| `needs_answers` | Fewer than 5 questions answered |

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

| Component | How Answer Blocks Contribute |
|-----------|------------------------------|
| **Answerability** | Primary input; high answer coverage = higher score |
| **Intent Match** | Well-matched answers improve intent signals |
| **Entity Strength** | Clear entity definitions strengthen entity coverage |

For now, v2 uses Answerability-related signals; Answer Blocks provide richer data for future weighting refinements.

### Issue Engine Full

Missing/weak Answer Blocks surface as Answerability issues:

| Issue ID Pattern | Description | Severity |
|------------------|-------------|----------|
| `missing_answer_<questionId>` | No answer for this question | Warning |
| `weak_answer_<questionId>` | Low-confidence answer exists | Info |

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

| Version | Description |
|---------|-------------|
| `ae_v1` | Initial Phase 1 implementation |
| `ae_v1_1` | Minor refinements to detection/generation |
| `ae_v2` | Major update with new question categories or logic |

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

- [ ] `AnswerBlock` and `AnswerabilityStatus` types defined in shared package
- [ ] Canonical 10-question taxonomy documented
- [ ] No-hallucination rules clearly specified
- [ ] Lifecycle stages defined (detection, generation, review, sync)
- [ ] DEO Score v2 integration points documented
- [ ] Issue Engine integration points documented (reserved issue IDs)
- [ ] UI expectations documented (deferred implementation)
- [ ] Version scheme defined
- [ ] Security/safety requirements specified

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-08 | Initial Answer Engine specification (Phase AE 1.0) |
