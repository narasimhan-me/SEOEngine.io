-- Add project-level flag for Answer Engine → Shopify metafield sync (Phase AEO-2).
ALTER TABLE "Project"
ADD COLUMN "aeoSyncToShopifyMetafields" BOOLEAN NOT NULL DEFAULT FALSE;
