-- BLOGS-ASSET-SYNC-COVERAGE-1: Add Shopify Article publishedAt and blogHandle support
-- Enables Published/Draft status display for Blog Posts (Articles)
-- blogHandle stores the parent blog's handle for display (e.g., "news/welcome-to-our-blog")

ALTER TABLE "CrawlResult" ADD COLUMN "shopifyPublishedAt" TIMESTAMP(3);
ALTER TABLE "CrawlResult" ADD COLUMN "shopifyBlogHandle" TEXT;
