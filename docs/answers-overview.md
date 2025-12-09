# Answer-Ready Content – Overview

Answer-ready content is content that can be safely and confidently surfaced by search engines and AI assistants as a direct answer.

In EngineO.ai, answer-ready content is implemented via the **Answer Engine** and **Answer Blocks**. This document is the high-level concept layer for those systems.

Answer-ready content in EngineO.ai is:

- Mapped to entities and intents
- Structured for snippet and answer box extraction
- Enriched with AI-friendly metadata
- Measured as a key input into your DEO Score (via the Answerability component)

---

## Answer Blocks (Concept)

**Answer Blocks** are structured, fact-oriented units designed for AI assistants. Each Answer Block provides a concise, factual answer to a specific buyer or AI question about a product or page.

### Core Phase 1 Question Categories

The Answer Engine defines 10 canonical questions that products should be able to answer:

| ID | Question |
|----|----------|
| `what_is_it` | What is this? |
| `who_is_it_for` | Who is it for? |
| `why_choose_this` | Why choose this? |
| `key_features` | What are the key features? |
| `how_is_it_used` | How is it used? |
| `problems_it_solves` | What problems does it solve? |
| `what_makes_it_different` | What makes it different? |
| `whats_included` | What's included? |
| `materials_and_specs` | Materials / Specs |
| `care_safety_instructions` | Care / safety / instructions |

### Answer Block Properties

Each Answer Block includes:

- **Question ID** — Stable identifier for the question category
- **Question Text** — Human-readable question
- **Answer** — Factual, AI-ready answer (~80-120 words)
- **Confidence** — Score indicating answer quality (0-1)
- **Source Type** — How the answer was created (generated, user-edited, legacy)
- **Facts Used** — Which product attributes were used to generate the answer

### No Hallucination Rule

**Critical Requirement:** Answers may only use product/page data and known attributes.

- Answers must be derived strictly from existing, verified data
- When data is insufficient, the system must emit a "cannot answer" outcome
- The Answer Engine must never fabricate or infer content that isn't supported by facts

---

## Relationship to DEO Score v2 and Issue Engine

### DEO Score v2 Integration

Answer-ready content feeds directly into the **Answerability** component of DEO Score v2:

- Products with complete, high-confidence Answer Blocks score higher on Answerability
- Answer Blocks also contribute indirectly to Intent Match and Entity Strength components
- The Answer Engine provides richer signal data for more accurate DEO scoring

### Issue Engine Integration

Missing or weak answers surface as **Answerability issues** in the Issues Engine:

- **Missing Answer Block** — A key question has no answer at all
- **Weak Answer Block** — An answer exists but has low confidence or is incomplete

These issues help merchants prioritize content improvements for maximum DEO impact.

---

## Related Documentation

- **Technical Specification:** `docs/ANSWER_ENGINE_SPEC.md`
- **Shared Types:** `packages/shared/src/answer-engine.ts`
- **Manual Testing:** `docs/testing/answer-engine.md`

---

_Author: Narasimhan Mahendrakumar_
