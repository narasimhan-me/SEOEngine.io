import { describe, expect, it } from 'vitest';
import {
  classifyAltText,
  getMediaAccessibilityStatusFromScore,
  computeMediaScoreFromStats,
  computeMediaFixWorkKey,
  ProductMediaStats,
} from './media-accessibility';

describe('Media Accessibility Types', () => {
  describe('classifyAltText', () => {
    it("returns 'missing' for empty/whitespace/null alt text", () => {
      expect(classifyAltText(null, 'Product Title')).toBe('missing');
      expect(classifyAltText(undefined, 'Product Title')).toBe('missing');
      expect(classifyAltText('', 'Product Title')).toBe('missing');
      expect(classifyAltText('   ', 'Product Title')).toBe('missing');
      expect(classifyAltText('\t\n', 'Product Title')).toBe('missing');
    });

    it("returns 'generic' for generic alt text patterns", () => {
      expect(classifyAltText('product image', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('Product Image', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('image', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('Image', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('photo', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('Photo', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('picture', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('placeholder', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('img', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('pic', 'Cool Widget')).toBe('generic');
    });

    it("returns 'generic' when alt text exactly equals product title", () => {
      expect(classifyAltText('Cool Widget', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('cool widget', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('COOL WIDGET', 'Cool Widget')).toBe('generic');
    });

    it("returns 'generic' for title + generic suffix patterns", () => {
      expect(classifyAltText('Cool Widget image', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('Cool Widget photo', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('image of Cool Widget', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('photo of Cool Widget', 'Cool Widget')).toBe('generic');
    });

    it("returns 'generic' for very short alt text (< 5 chars)", () => {
      expect(classifyAltText('test', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('a', 'Cool Widget')).toBe('generic');
      expect(classifyAltText('xyz', 'Cool Widget')).toBe('generic');
    });

    it("returns 'good' for descriptive alt text", () => {
      expect(
        classifyAltText(
          'Red leather wallet with brass zipper and card slots',
          'Premium Wallet'
        )
      ).toBe('good');

      expect(
        classifyAltText(
          'Stainless steel watch with black dial showing side view',
          'Classic Watch'
        )
      ).toBe('good');

      expect(
        classifyAltText(
          'Woman wearing blue sundress in outdoor garden setting',
          'Summer Dress'
        )
      ).toBe('good');

      expect(
        classifyAltText(
          'Front view of ergonomic office chair with mesh back',
          'Ergonomic Chair'
        )
      ).toBe('good');
    });

    it("returns 'good' for descriptive alt text even with product name included", () => {
      expect(
        classifyAltText(
          'Cool Widget displayed on wooden desk with accessories',
          'Cool Widget'
        )
      ).toBe('good');
    });
  });

  describe('getMediaAccessibilityStatusFromScore', () => {
    it("returns 'Weak' for scores < 40", () => {
      expect(getMediaAccessibilityStatusFromScore(0)).toBe('Weak');
      expect(getMediaAccessibilityStatusFromScore(10)).toBe('Weak');
      expect(getMediaAccessibilityStatusFromScore(39)).toBe('Weak');
    });

    it("returns 'Needs improvement' for scores 40-79", () => {
      expect(getMediaAccessibilityStatusFromScore(40)).toBe('Needs improvement');
      expect(getMediaAccessibilityStatusFromScore(50)).toBe('Needs improvement');
      expect(getMediaAccessibilityStatusFromScore(79)).toBe('Needs improvement');
    });

    it("returns 'Strong' for scores >= 80", () => {
      expect(getMediaAccessibilityStatusFromScore(80)).toBe('Strong');
      expect(getMediaAccessibilityStatusFromScore(90)).toBe('Strong');
      expect(getMediaAccessibilityStatusFromScore(100)).toBe('Strong');
    });

    it('handles boundary values correctly', () => {
      expect(getMediaAccessibilityStatusFromScore(39.9)).toBe('Weak');
      expect(getMediaAccessibilityStatusFromScore(40)).toBe('Needs improvement');
      expect(getMediaAccessibilityStatusFromScore(79.9)).toBe('Needs improvement');
      expect(getMediaAccessibilityStatusFromScore(80)).toBe('Strong');
    });
  });

  describe('computeMediaScoreFromStats', () => {
    const projectId = 'test-project';

    it('returns 0 score for empty stats', () => {
      const scorecard = computeMediaScoreFromStats(projectId, []);
      expect(scorecard.overallScore).toBe(0);
      expect(scorecard.totalImages).toBe(0);
      expect(scorecard.status).toBe('Weak');
    });

    it('returns 100 score when all images have good alt text', () => {
      const stats: ProductMediaStats[] = [
        {
          productId: 'p1',
          totalImages: 3,
          imagesWithAnyAlt: 3,
          imagesWithGoodAlt: 3,
          imagesWithGenericAlt: 0,
          imagesWithoutAlt: 0,
          imagesWithCaptions: 0,
          altTextCoveragePercent: 100,
          goodAltTextCoveragePercent: 100,
          hasContextualMedia: true,
        },
      ];
      const scorecard = computeMediaScoreFromStats(projectId, stats);
      expect(scorecard.overallScore).toBe(100);
      expect(scorecard.status).toBe('Strong');
    });

    it('returns 40 score when all images have generic alt text', () => {
      const stats: ProductMediaStats[] = [
        {
          productId: 'p1',
          totalImages: 5,
          imagesWithAnyAlt: 5,
          imagesWithGoodAlt: 0,
          imagesWithGenericAlt: 5,
          imagesWithoutAlt: 0,
          imagesWithCaptions: 0,
          altTextCoveragePercent: 100,
          goodAltTextCoveragePercent: 0,
          hasContextualMedia: false,
        },
      ];
      const scorecard = computeMediaScoreFromStats(projectId, stats);
      // 5 generic * 0.4 credit = 2, 2/5 = 0.4 = 40%
      expect(scorecard.overallScore).toBe(40);
      expect(scorecard.status).toBe('Needs improvement');
    });

    it('returns 0 score when all images are missing alt text', () => {
      const stats: ProductMediaStats[] = [
        {
          productId: 'p1',
          totalImages: 4,
          imagesWithAnyAlt: 0,
          imagesWithGoodAlt: 0,
          imagesWithGenericAlt: 0,
          imagesWithoutAlt: 4,
          imagesWithCaptions: 0,
          altTextCoveragePercent: 0,
          goodAltTextCoveragePercent: 0,
          hasContextualMedia: false,
        },
      ];
      const scorecard = computeMediaScoreFromStats(projectId, stats);
      expect(scorecard.overallScore).toBe(0);
      expect(scorecard.status).toBe('Weak');
    });

    it('calculates mixed scores correctly with weighted credits', () => {
      const stats: ProductMediaStats[] = [
        {
          productId: 'p1',
          totalImages: 10,
          imagesWithAnyAlt: 7,
          imagesWithGoodAlt: 5,
          imagesWithGenericAlt: 2,
          imagesWithoutAlt: 3,
          imagesWithCaptions: 1,
          altTextCoveragePercent: 70,
          goodAltTextCoveragePercent: 50,
          hasContextualMedia: true,
        },
      ];
      const scorecard = computeMediaScoreFromStats(projectId, stats);
      // Good: 5 * 1.0 = 5, Generic: 2 * 0.4 = 0.8, Missing: 3 * 0 = 0
      // Total credit: 5.8, Total images: 10
      // Score: 5.8/10 = 0.58 = 58%
      expect(scorecard.overallScore).toBe(58);
      expect(scorecard.status).toBe('Needs improvement');
      expect(scorecard.productsWithMissingAlt).toBe(1);
      expect(scorecard.productsWithGenericAlt).toBe(1);
    });

    it('aggregates stats across multiple products', () => {
      const stats: ProductMediaStats[] = [
        {
          productId: 'p1',
          totalImages: 5,
          imagesWithAnyAlt: 5,
          imagesWithGoodAlt: 5,
          imagesWithGenericAlt: 0,
          imagesWithoutAlt: 0,
          imagesWithCaptions: 0,
          altTextCoveragePercent: 100,
          goodAltTextCoveragePercent: 100,
          hasContextualMedia: true,
        },
        {
          productId: 'p2',
          totalImages: 5,
          imagesWithAnyAlt: 0,
          imagesWithGoodAlt: 0,
          imagesWithGenericAlt: 0,
          imagesWithoutAlt: 5,
          imagesWithCaptions: 0,
          altTextCoveragePercent: 0,
          goodAltTextCoveragePercent: 0,
          hasContextualMedia: false,
        },
      ];
      const scorecard = computeMediaScoreFromStats(projectId, stats);
      // p1: 5 good, p2: 5 missing
      // Total credit: 5, Total images: 10
      // Score: 5/10 = 50%
      expect(scorecard.overallScore).toBe(50);
      expect(scorecard.totalImages).toBe(10);
      expect(scorecard.imagesWithGoodAlt).toBe(5);
      expect(scorecard.imagesWithoutAlt).toBe(5);
      expect(scorecard.productsWithMissingAlt).toBe(1);
    });
  });

  describe('computeMediaFixWorkKey', () => {
    it('generates deterministic keys with same inputs', () => {
      const key1 = computeMediaFixWorkKey('proj1', 'prod1', 'img1', 'image_alt_text');
      const key2 = computeMediaFixWorkKey('proj1', 'prod1', 'img1', 'image_alt_text');
      expect(key1).toBe(key2);
    });

    it('generates different keys for different projectId', () => {
      const key1 = computeMediaFixWorkKey('proj1', 'prod1', 'img1', 'image_alt_text');
      const key2 = computeMediaFixWorkKey('proj2', 'prod1', 'img1', 'image_alt_text');
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different productId', () => {
      const key1 = computeMediaFixWorkKey('proj1', 'prod1', 'img1', 'image_alt_text');
      const key2 = computeMediaFixWorkKey('proj1', 'prod2', 'img1', 'image_alt_text');
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different imageKey', () => {
      const key1 = computeMediaFixWorkKey('proj1', 'prod1', 'img1', 'image_alt_text');
      const key2 = computeMediaFixWorkKey('proj1', 'prod1', 'img2', 'image_alt_text');
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different draftType', () => {
      const key1 = computeMediaFixWorkKey('proj1', 'prod1', 'img1', 'image_alt_text');
      const key2 = computeMediaFixWorkKey('proj1', 'prod1', 'img1', 'image_caption');
      expect(key1).not.toBe(key2);
    });

    it('embeds all components in the key', () => {
      const key = computeMediaFixWorkKey('proj1', 'prod1', 'img1', 'image_alt_text');
      expect(key).toContain('proj1');
      expect(key).toContain('prod1');
      expect(key).toContain('img1');
      expect(key).toContain('image_alt_text');
    });
  });
});
