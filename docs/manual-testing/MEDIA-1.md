# MEDIA-1: Media & Accessibility Pillar - Manual Testing

## Overview
Manual testing checklist for the Media & Accessibility pillar implementation (MEDIA-1).

## Prerequisites
- Project with Shopify integration connected
- Products synced from Shopify with images
- Access to DEO Overview, Issues page, and Product detail pages

---

## 1. DEO Overview - Media Pillar Card

### Test Steps
1. Navigate to DEO Overview page for a project
2. Locate the Media & Accessibility pillar card

### Expected Results
- [ ] Media card shows overall score (0-100)
- [ ] Status badge displays correctly:
  - Green "Strong" for scores ≥ 80
  - Yellow "Needs improvement" for scores 40-79
  - Red "Weak" for scores < 40
- [ ] Card shows total image count
- [ ] Card shows % images with good alt text
- [ ] Card shows count of images without alt / with generic alt
- [ ] "View issues" link works and navigates to Issues page filtered to media_accessibility

---

## 2. Media Workspace Page

### Test Steps
1. Navigate to `/projects/[id]/media`
2. Review the workspace layout

### Expected Results
- [ ] Breadcrumbs show: Projects / [Project Name] / Media & Accessibility
- [ ] Header displays pillar title and description
- [ ] Summary card shows:
  - Overall score and status
  - Total images count
  - % images with any alt text
  - % images with good alt text
  - Counts for missing and generic alt text
  - Media issues count
- [ ] Issues list displays MEDIA pillar issues only
- [ ] Products table shows products with alt text coverage percentage
- [ ] Products table includes status badge and link to product workspace

---

## 3. Product Workspace - Media Section

### Test Steps
1. Navigate to a product detail page
2. Scroll to or click "Media" section
3. Test deep link: `/projects/[id]/products/[productId]?focus=media`

### Expected Results
- [ ] Media section displays per-product stats:
  - Number of images
  - Counts per alt quality (good, generic, missing)
  - Alt text coverage percentage
  - Per-product status (Strong/Needs improvement/Weak)
- [ ] Images list shows:
  - Thumbnail
  - Current alt text
  - Quality label badge (Good/Generic/Missing)
  - Caption (if present)
- [ ] "Preview alt text (uses AI)" button appears for each image
- [ ] Deep link `?focus=media` scrolls to media section

---

## 4. Alt Text Preview Flow

### Test Steps
1. On product media section, click "Preview alt text" for an image
2. Observe the preview modal/drawer
3. Click same button again (test draft reuse)

### Expected Results
- [ ] First click generates new draft (shows "Generated with AI")
- [ ] Loading state displays during generation
- [ ] Preview shows proposed alt text
- [ ] Banner indicates: "This draft was generated with AI"
- [ ] Second click reuses existing draft
- [ ] Reused draft shows: "No AI used (reused draft)"
- [ ] `generatedWithAi: false` on reused response

---

## 5. Alt Text Apply Flow

### Test Steps
1. From preview modal, click "Apply alt text"
2. Verify the update

### Expected Results
- [ ] Apply action does NOT trigger any AI calls
- [ ] ProductImage alt text is updated in database
- [ ] UI refreshes to show new alt text
- [ ] Quality badge updates if alt text is now "good"
- [ ] Per-product stats update
- [ ] Issues count may decrease if this resolved an issue

---

## 6. Caption Preview/Apply Flow (Optional)

### Test Steps
1. If "Preview caption" button is available, click it
2. Preview and apply the caption

### Expected Results
- [ ] Caption draft is generated (uses AI)
- [ ] Preview shows proposed caption
- [ ] Apply updates ProductImage.caption
- [ ] No AI call during apply

---

## 7. Issues Engine Integration

### Test Steps
1. Navigate to Issues page: `/projects/[id]/issues`
2. Filter by pillar: `?pillar=media_accessibility`
3. Review MEDIA issues

### Expected Results
- [ ] MEDIA issues display with correct labels:
  - "Missing Image Alt Text"
  - "Generic Image Alt Text"
  - "Insufficient Image Coverage"
  - "Missing Media Context"
- [ ] Issues show `imageCountAffected` when present (e.g., "Affects 8 images")
- [ ] Issues show correct severity (critical/warning/info)
- [ ] "Review images" CTA deep-links to product workspace with `?focus=media`
- [ ] Issues include `whyItMatters` and `recommendedFix` fields

---

## 8. Shopify Sync Integration

### Test Steps
1. Trigger a Shopify product sync
2. Verify ProductImage records are created

### Expected Results
- [ ] ProductImage records created for each product image
- [ ] Alt text from Shopify is preserved
- [ ] Image position is preserved
- [ ] Existing ProductImage records are updated on re-sync
- [ ] Images no longer in Shopify are removed from ProductImage
- [ ] Product.imageUrls array remains populated for compatibility

---

## 9. Accessibility & Trust Checks

### Test Steps
1. Review generated alt text samples
2. Check for problematic content

### Expected Results
- [ ] Generated alt text does NOT hallucinate specific visual details
- [ ] Alt text uses neutral, descriptive language
- [ ] No keyword stuffing in generated content
- [ ] Alt text acknowledges uncertainty (e.g., "likely shows")
- [ ] No heavy CV/vision features involved

---

## 10. Edge Cases

### Test Steps
1. Test product with no images
2. Test product with all images having good alt text
3. Test product with all images missing alt text
4. Test very long alt text (> 125 chars)

### Expected Results
- [ ] Product with no images: shows 0 images, no media issues generated
- [ ] All good alt text: 100% score, "Strong" status
- [ ] All missing alt text: 0% score, "Weak" status
- [ ] Long alt text: truncated appropriately, still saved

---

## Sign-Off

| Tester | Date | Result | Notes |
|--------|------|--------|-------|
|        |      |        |       |

---

## Related Documentation

- [MEDIA_PILLAR.md](../MEDIA_PILLAR.md) - Pillar reference
- [DEO_PILLARS.md](../DEO_PILLARS.md) - All pillars overview
