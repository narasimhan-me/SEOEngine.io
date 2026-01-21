# Media & Accessibility Pillar Reference

## Overview

The **Media & Accessibility** pillar measures how well your product images and visual content support discovery by search engines, AI assistants, and users with accessibility needs.

Key focus areas:

- **Image Alt Text Coverage**: Percentage of images with descriptive alt text
- **Alt Text Quality**: Classification as missing, generic, or good
- **Image Presence**: Products with sufficient image coverage
- **Contextual Media**: Images with captions and contextual descriptions

## Why Media Matters for DEO

### Accessibility as a Discovery Signal

- Screen readers use alt text to describe images to visually impaired users
- AI assistants rely on alt text to understand and describe visual content
- Missing or generic alt text creates invisible content for large user segments

### Image Search & AI Discovery

- Proper alt text improves image search rankings
- AI systems use alt text to match products with visual queries
- Descriptive alt text helps AI recommend products contextually

### Trust & Conversion

- Products with multiple quality images convert better
- Contextual images (lifestyle, in-use) build buyer confidence
- Missing images signal incomplete or untrustworthy listings

## Media Signal Types

### 1. Image Coverage

- Products should have multiple images (different angles, details, lifestyle)
- Single-image products have reduced visual appeal and trust

### 2. Alt Text Coverage

- **Missing**: No alt text or whitespace only — invisible to screen readers
- **Generic**: "Product image", "photo", or just the product title — provides no useful context
- **Good**: Descriptive text reflecting what's visible — helps accessibility and search

### 3. Contextual Media Usage

- Captions explaining image context
- Alt text describing visible details, not just product name
- Lifestyle and usage images with descriptions

### 4. Accessibility Readiness

- All images accessible to screen readers
- No hallucinated content in alt text
- Clear, neutral language without keyword stuffing

## Alt-Text Best Practices

### DO:

- Describe what is actually visible in the image
- Keep alt text concise (under 125 characters recommended)
- Include relevant details: color, material, angle, context
- Use neutral, factual language
- One unique alt text per image

### DON'T:

- Use generic phrases like "product image" or "photo"
- Just repeat the product title without adding context
- Keyword stuff or use promotional language
- Claim features not visible in the image
- Leave alt text empty or whitespace-only

### Examples

**Bad**: "Product image"
**Bad**: "Blue Widget"
**Good**: "Blue ceramic coffee mug with speckled glaze shown from front"

**Bad**: "photo"
**Bad**: "Widget Photo"
**Good**: "Stainless steel watch with black leather strap on wooden display stand"

## Media Score Model

The Media Score (0-100) uses a weighted coverage model:

| Alt Text Quality | Credit Weight |
| ---------------- | ------------- |
| Good             | 100%          |
| Generic          | 40%           |
| Missing          | 0%            |

**Formula**: `Score = (Good × 1.0 + Generic × 0.4 + Missing × 0.0) / Total Images × 100`

### Status Thresholds

| Score | Status            |
| ----- | ----------------- |
| ≥ 80  | Strong            |
| 40-79 | Needs improvement |
| < 40  | Weak              |

### Key Principle

Missing alt text is penalized more severely than generic alt text because:

- Missing alt text is completely invisible to accessibility tools
- Generic alt text at least acknowledges an image exists
- The incentive is to add any alt text first, then improve quality

## Issue Types

### missing_image_alt_text (Critical/Warning)

Images without any alt text. High severity for significant ratios.

- **pillarId**: media_accessibility
- **aiFixable**: true
- **fixCost**: one_click

### generic_image_alt_text (Warning)

Images with generic alt text ("product image", product title only).

- **pillarId**: media_accessibility
- **aiFixable**: true
- **fixCost**: one_click

### insufficient_image_coverage (Warning)

Products with only 0-1 images.

- **pillarId**: media_accessibility
- **aiFixable**: false
- **fixCost**: manual

### missing_media_context (Info)

Products with images but no captions or contextual alt text.

- **pillarId**: media_accessibility
- **aiFixable**: false (for v1)
- **fixCost**: manual

## Fix Flows

### Draft-First Pattern (CACHE/REUSE v2)

1. **Preview (uses AI)**: Generate alt text or caption draft
   - Computes deterministic `aiWorkKey`
   - Checks for existing unexpired draft
   - If found, returns reused draft (no AI call)
   - Otherwise, generates new draft and persists

2. **Apply (no AI)**: Persist draft to ProductImage
   - Updates ProductImage.altText or caption
   - Optionally writes back to Shopify (best-effort)
   - Never calls AI during apply

### AI Generation Principles

- Uses only product metadata (title, description, position)
- No heavy CV/vision pipeline
- Does NOT hallucinate visual content
- Generated alt text describes likely visible content based on metadata

## Related Documentation

- [DEO Pillars](./DEO_PILLARS.md) - All DEO pillars overview
- [DEO Information Architecture](./DEO_INFORMATION_ARCHITECTURE.md) - System architecture
- [MEDIA-1 Manual Testing](./manual-testing/MEDIA-1.md) - Test scenarios
