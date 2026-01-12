-- SHOPIFY-ASSET-SYNC-COVERAGE-1: Add Shopify identity fields to CrawlResult
-- Enables Pages and Collections ingestion from Shopify

-- Add Shopify identity columns to CrawlResult
ALTER TABLE "CrawlResult" ADD COLUMN "shopifyResourceType" TEXT;
ALTER TABLE "CrawlResult" ADD COLUMN "shopifyResourceId" TEXT;
ALTER TABLE "CrawlResult" ADD COLUMN "shopifyHandle" TEXT;
ALTER TABLE "CrawlResult" ADD COLUMN "shopifyUpdatedAt" TIMESTAMP(3);
ALTER TABLE "CrawlResult" ADD COLUMN "shopifySyncedAt" TIMESTAMP(3);

-- Compound unique constraint for upsert identity (allows null combinations)
CREATE UNIQUE INDEX "CrawlResult_projectId_shopifyResourceType_shopifyResourceId_key"
ON "CrawlResult"("projectId", "shopifyResourceType", "shopifyResourceId");

-- Index for filtering by resource type
CREATE INDEX "CrawlResult_projectId_shopifyResourceType_idx"
ON "CrawlResult"("projectId", "shopifyResourceType");

-- Index for URL-based deduplication queries
CREATE INDEX "CrawlResult_projectId_url_idx"
ON "CrawlResult"("projectId", "url");
