# EngineO.ai – Database Schema (Prisma)

This document defines the Prisma schema for EngineO.ai.

---

## 1. Datasource & Generator

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

## 2. Enums

### 2.1 IntegrationType

Supported ecommerce platform integration types:

```prisma
enum IntegrationType {
  SHOPIFY
  WOOCOMMERCE
  BIGCOMMERCE
  MAGENTO
  CUSTOM_WEBSITE
}
```

---

## 3. Models

### 3.1 User

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects  Project[]
}
```

---

### 3.2 Project

```prisma
model Project {
  id           String        @id @default(cuid())
  user         User          @relation(fields: [userId], references: [id])
  userId       String
  name         String
  domain       String?
  createdAt    DateTime      @default(now())

  integrations Integration[]
  crawlResults CrawlResult[]
  products     Product[]
}
```

---

### 3.3 Integration

Generic model for all ecommerce platform integrations (Shopify, WooCommerce, BigCommerce, Magento, custom websites).

```prisma
model Integration {
  id          String          @id @default(cuid())
  project     Project         @relation(fields: [projectId], references: [id])
  projectId   String
  type        IntegrationType
  externalId  String?         // shop domain, store ID, account slug, etc.
  accessToken String?         // shopify token, woo API key, etc.
  config      Json?           // platform-specific configuration
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([projectId, type]) // One integration per type per project
}
```

**Field descriptions:**

| Field         | Description                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `externalId`  | Platform-specific identifier (Shopify: shop domain, WooCommerce: store URL, BigCommerce: store hash) |
| `accessToken` | OAuth token or API key for the platform                                                              |
| `config`      | JSON object for platform-specific settings (scopes, webhooks, etc.)                                  |

**Example config by platform:**

- **Shopify:** `{ "scope": "read_products,write_products", "installedAt": "2025-01-01T00:00:00Z" }`
- **WooCommerce:** `{ "consumerKey": "ck_xxx", "consumerSecret": "cs_xxx", "version": "wc/v3" }`
- **BigCommerce:** `{ "clientId": "xxx", "storeHash": "xxx" }`

---

### 3.4 Product

```prisma
model Product {
  id             String   @id @default(cuid())
  project        Project  @relation(fields: [projectId], references: [id])
  projectId      String
  externalId     String   // platform-agnostic product ID
  title          String
  description    String?
  seoTitle       String?
  seoDescription String?
  imageUrls      Json?
  lastSyncedAt   DateTime @default(now())
}
```

---

### 3.5 CrawlResult

```prisma
model CrawlResult {
  id              String   @id @default(cuid())
  project         Project  @relation(fields: [projectId], references: [id])
  projectId       String
  url             String
  statusCode      Int
  title           String?
  metaDescription String?
  h1              String?
  wordCount       Int?
  loadTimeMs      Int?
  issues          Json
  scannedAt       DateTime @default(now())
}
```

---

### 3.6 (Optional) MetadataSuggestion

You may add this model later if you want to persist AI suggestions:

```prisma
model MetadataSuggestion {
  id              String       @id @default(cuid())
  project         Project      @relation(fields: [projectId], references: [id])
  projectId       String
  crawlResult     CrawlResult? @relation(fields: [crawlResultId], references: [id])
  crawlResultId   String?
  product         Product?     @relation(fields: [productId], references: [id])
  productId       String?
  suggestedTitle  String
  suggestedDesc   String
  createdAt       DateTime     @default(now())
}
```

---

### 3.7 ProductImage (MEDIA-1)

Per-product image records storing URL, alt text, and optional caption for each product image. Sourced from Shopify sync and MEDIA fix flows.

```prisma
model ProductImage {
  id         String   @id @default(cuid())
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId  String
  externalId String   // Shopify image ID (numeric or GID string)
  src        String   // Image URL
  altText    String?  // Current alt text
  position   Int?     // Display order
  caption    String?  // Optional caption
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([productId, externalId])
  @@index([productId])
}
```

**Notes:**

- `ProductImage` is the canonical source for per-image alt text and captions.
- `Product.imageUrls` remains as a convenience array of URLs for existing UI compatibility.
- Images are synced from Shopify during product sync, preserving the Shopify image ID as `externalId`.

---

### 3.8 MediaFixDraftType Enum (MEDIA-1)

```prisma
enum MediaFixDraftType {
  IMAGE_ALT_TEXT
  IMAGE_CAPTION
}
```

---

### 3.9 MediaFixApplyTarget Enum (MEDIA-1)

```prisma
enum MediaFixApplyTarget {
  IMAGE_ALT
  CAPTION_FIELD
}
```

---

### 3.10 ProductMediaFixDraft (MEDIA-1)

Draft fixes for media accessibility issues (preview-first pattern).

```prisma
model ProductMediaFixDraft {
  id                String            @id @default(cuid())
  product           Product           @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId         String
  imageId           String            // Image external ID or internal key
  draftType         MediaFixDraftType
  draftPayload      Json              // { altText?: string, caption?: string }
  aiWorkKey         String            // Deterministic key for CACHE/REUSE v2
  reusedFromWorkKey String?           // If reused, the original work key
  generatedWithAi   Boolean           @default(true)
  expiresAt         DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  applications      ProductMediaFixApplication[]

  @@index([productId, imageId, draftType])
  @@index([aiWorkKey])
  @@index([productId, expiresAt])
}
```

**Notes:**

- Follows the same draft-first pattern as `ProductIntentFixDraft` and `ProductCompetitiveFixDraft`.
- `aiWorkKey` enables CACHE/REUSE v2 for deduplicating AI work.
- Drafts expire after a configurable TTL (default 7 days).

---

### 3.11 ProductMediaFixApplication (MEDIA-1)

Audit log for applied media fixes (alt text and caption updates).

```prisma
model ProductMediaFixApplication {
  id              String                @id @default(cuid())
  product         Product               @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId       String
  draft           ProductMediaFixDraft  @relation(fields: [draftId], references: [id], onDelete: Cascade)
  draftId         String
  appliedBy       User                  @relation(fields: [appliedByUserId], references: [id], onDelete: Cascade)
  appliedByUserId String
  imageId         String                // Image external ID (as stored in draft)
  draftType       MediaFixDraftType
  applyTarget     MediaFixApplyTarget
  notes           String?
  appliedAt       DateTime              @default(now())

  @@index([productId, appliedAt(sort: Desc)])
  @@index([appliedByUserId, appliedAt(sort: Desc)])
}
```

---

## 4. Migrations

Migration sequence:

1. `init` – User + Project + ShopifyStore + Product + CrawlResult
2. `add_integration_model` – Migrate from ShopifyStore to generic Integration model
3. `add_media_accessibility` – ProductImage + MediaFixDraftType + MediaFixApplyTarget + ProductMediaFixDraft + ProductMediaFixApplication (MEDIA-1)

---

END OF DATABASE SCHEMA
