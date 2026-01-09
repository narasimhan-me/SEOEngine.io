-- [LIST-SEARCH-FILTER-1] Add nullable handle column to Product table
-- Shopify handle for URL-based search and filtering

ALTER TABLE "Product" ADD COLUMN "handle" TEXT;
