# SEOEngine.io – Full Implementation Plan

This document provides a **step-by-step, execution-ready plan** for building the SEOEngine.io SaaS application using a monorepo (Next.js frontend + NestJS backend + Prisma + PostgreSQL + Shopify integration + AI metadata engine).

AI IDEs (Cursor, Claude Code, etc.) should follow these instructions **exactly as written**.  
Each phase should be implemented in sequence.  
Each step should produce diffs and await approval before applying.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend:** NestJS (Node + TypeScript)
- **Database:** PostgreSQL + Prisma (Neon in production)
- **Cache / Queue (later):** Redis
- **AI:** OpenAI / Gemini via REST API
- **E-commerce:** Shopify Admin API (REST or GraphQL), via a generic **Integration** model (Shopify first, others later)

---

# PHASE 0 — Monorepo Structure & Tooling

### 0.1. Create Monorepo Structure

Create the directory structure:

```txt
seoengine/
  apps/
    web/        # Next.js 14 app (frontend)
    api/        # NestJS backend API
  packages/
    shared/     # shared types and utility
  .gitignore
  package.json
  tsconfig.base.json
  README.md
```

**Requirements:**
- Use pnpm workspaces (preferred) or Yarn workspaces.
- Configure "apps/*" and "packages/*" as workspace folders.
- Create a root tsconfig: `tsconfig.base.json` with base compiler options.
- Ensure Node 20+ is assumed.

### 0.2. Initialize Frontend (Next.js 14 + TS + Tailwind)

Inside `apps/web`:

Create a new Next.js app configured with:
- App Router
- TypeScript
- TailwindCSS
- `/src` directory enabled

**Required directory structure:**

```txt
apps/web/src/
  app/
    (marketing)/
      page.tsx
    dashboard/
      page.tsx
    projects/
      page.tsx
    settings/
      page.tsx
    layout.tsx
  components/
  lib/
```

**Requirements:**
- TailwindCSS configured with JIT.
- Global layout with a simple navigation shell (top nav + optional sidebar).
- Home page text: `SEOEngine.io – SEO on Autopilot.`
- `/dashboard` renders "Dashboard placeholder".
- `/projects` renders "Projects placeholder".
- `/settings` renders "Settings placeholder".

### 0.3. Initialize Backend (NestJS)

Inside `apps/api`:

Create a NestJS project using the official CLI.

**Required structure:**

```txt
apps/api/src/
  app.module.ts
  main.ts
  health/
    health.module.ts
    health.controller.ts
  auth/
  users/
  projects/
```

**Add endpoint:**
- `GET /health` → `{ "status": "ok" }`

**Enable CORS** (temporary: allow all origins for development).  
**Add .env support** via `@nestjs/config`.

### 0.4. Shared Package

Inside `packages/shared`:

Create `src/index.ts` exporting shared types/interfaces, e.g.:

```typescript
export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}
```

Configure TS path alias: `@seoengine/shared` so both web and api can import these types.

### 0.5. Root Tooling

At repo root:

- Add **ESLint + Prettier** configs shared between apps.
- Add root scripts in `package.json`:

```json
{
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api start:dev",
    "dev": "concurrently \"pnpm dev:web\" \"pnpm dev:api\""
  }
}
```

- Install and configure `concurrently`.
- Ensure `.gitignore` includes standard Node/Next/Nest patterns:
  - `node_modules/`, `.next/`, `.turbo/`, `dist/`, `.env*`, etc.

---

# PHASE 1 — Auth, Users & Database

**Note:** Phase 1 starts with a simple Project model that will be evolved in Phase 2 to use a generic Integration model (this matches the current implementation, which uses Integration instead of connectedType).

### 1.1. Set Up Prisma + PostgreSQL

Inside `apps/api`:

1. Install Prisma and PostgreSQL client.
2. Add `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects  Project[]
}

model Project {
  id            String   @id @default(cuid())
  user          User     @relation(fields: [userId], references: [id])
  userId        String
  name          String
  domain        String?
  connectedType String   // 'website' | 'shopify' (will be replaced by Integration model in Phase 2)
  createdAt     DateTime @default(now())
}
```

3. Create `.env` with `DATABASE_URL` for local Postgres.
4. Run: `npx prisma migrate dev --name init`.

### 1.2. Backend Auth Module

Inside `apps/api/src/auth`:

**Implement:**

**Endpoints:**
- `POST /auth/signup`
  - Body: `{ email, password, name? }`
  - Hash password using bcrypt.
  - Store user in DB.
- `POST /auth/login`
  - Body: `{ email, password }`
  - Validate credentials.
  - Return `{ accessToken, user }`.

**Supporting pieces:**
- `AuthModule`, `AuthService`, `AuthController`.
- `JwtModule` configured with secret and expiration.
- `LocalStrategy` + `JwtStrategy` (if using Nest Passport).
- `JwtAuthGuard` to protect routes.

**Create UsersModule with:**
- `GET /users/me` (JWT-protected) returning `UserDTO`.

### 1.3. Frontend Auth Pages

Inside `apps/web/src/app`:

**Create `/login/page.tsx`:**
- Email + password form.
- Calls `POST /auth/login`.
- On success:
  - Store JWT in localStorage as `seoengine_token`.
  - Redirect to `/dashboard`.

**Create `/signup/page.tsx`:**
- Email, password, name form.
- Calls `POST /auth/signup`.
- On success:
  - Optionally auto-login, then redirect to `/dashboard`.

**Add simple client-side auth hook in `src/lib/auth.ts`:**
- `getToken()`, `setToken()`, `isAuthenticated()`.

**Implement a basic "guard" layout for dashboard routes:**
- If not authenticated, redirect to `/login`.

### 1.4. Projects Module (Backend + Frontend)

**Backend (`apps/api/src/projects`):**

Create endpoints:

- `GET /projects`
  - Returns projects for authenticated user.
- `POST /projects`
  - Body: `{ name, domain, connectedType }`.
  - Creates new project linked to `userId`.
- `GET /projects/:id`
  - Returns project by ID (only if belongs to user).
- `DELETE /projects/:id`
  - Soft delete or hard delete, your choice (MVP: hard delete).

**Frontend:**

- `/projects/page.tsx`:
  - Fetches `GET /projects` with JWT.
  - Lists projects in a table or cards.
  - "New Project" button:
    - Opens a simple form/modal.
    - POSTs to `POST /projects`.
    - Refreshes list.
- `/dashboard/page.tsx`:
  - Fetches `GET /projects`.
  - Shows summary:
    - Number of projects.
    - Last created project.
    - Link to `/projects`.

---

# PHASE 2 — Shopify Integration (MVP) using Generic Integrations

In this phase, we evolve the schema from a Shopify-specific connectedType to a generic Integration model that supports Shopify now and other platforms later. This matches the current implementation (Integration + IntegrationType.SHOPIFY).

### 2.0. Shopify App Setup in Shopify

Before implementing any code in this phase, create and configure the actual Shopify app in the Shopify Partner dashboard so that OAuth and API calls from SEOEngine.io can succeed.

**2.0.1. Create Partner account and test store**

- Go to Shopify's Partner dashboard and sign up (or log in).
- Create at least one development store for testing the SEOEngine app.

**2.0.2. Create a public app**

- In the Partner dashboard, navigate to **Apps → Create app**.
- Choose **Public app** (later listable on the Shopify App Store) and name it something like `SEOEngine – AI SEO`.
- Set the app's **App URL / Primary URL** to your backend base URL (for local dev you can use a tunneling service like `ngrok` or `cloudflared`, e.g. `https://<random>.ngrok.io`).

**2.0.3. Configure redirect URLs**

- In app settings, add the allowed redirect URL that the NestJS backend will handle for OAuth:
  - `https://<backend-base-url>/shopify/callback`
- Make sure **App URL** and **Allowed redirection URL(s)** in Shopify match the backend config:
  - `SHOPIFY_APP_URL` → backend base URL (e.g. `https://<random>.ngrok.io`)
  - OAuth callback path → `/shopify/callback`

**2.0.4. Get API credentials and scopes**

- In the app's credentials section, obtain:
  - Client ID / API key
  - Client secret
- Decide initial scopes (minimum for MVP product SEO):
  - `read_products`
  - `write_products`
- Add these to the backend environment:
  - `SHOPIFY_API_KEY=<your-api-key>`
  - `SHOPIFY_API_SECRET=<your-api-secret>`
  - `SHOPIFY_SCOPES=read_products,write_products`
  - `SHOPIFY_APP_URL=https://<backend-base-url>`

**2.0.5. Enable app for your development store**

- From the app detail page in the Partner dashboard, click **Test your app** and install it on your development store (once the backend is ready).
- During development you will:
  - Start the NestJS API server.
  - Expose it via tunnel (if running locally).
  - Trigger OAuth from SEOEngine (`/shopify/install`) to install/authorize the app on the test store.

Once steps 2.0.1–2.0.5 are complete, proceed with schema + integration steps.

### 2.1. DB Evolution: Generic Integration Model

We migrate away from connectedType on Project and move to a generic Integration model that can represent Shopify and other platforms.

Update `schema.prisma`:

```prisma
enum IntegrationType {
  SHOPIFY
  // Future: WOOCOMMERCE, BIGCOMMERCE, CUSTOM_WEBSITE, etc.
}

model Integration {
  id           String          @id @default(cuid())
  project      Project         @relation(fields: [projectId], references: [id])
  projectId    String
  type         IntegrationType
  externalId   String?         // e.g. shop domain, store ID
  accessToken  String?         // Admin API token for that store
  config       Json?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}

model Project {
  id        String        @id @default(cuid())
  user      User          @relation(fields: [userId], references: [id])
  userId    String
  name      String
  domain    String?
  // connectedType removed in favor of integrations
  createdAt DateTime      @default(now())

  integrations Integration[]
}
```

**Migration notes:**
- If connectedType still exists in the DB, remove it during migration.
- Run:
  ```
  npx prisma migrate dev --name add_integration_model
  ```

### 2.2. Shopify OAuth Flow (Backend, using Integration)

Create `apps/api/src/shopify`:
- `shopify.module.ts`
- `shopify.service.ts`
- `shopify.controller.ts`
- Optional: `dto/`, `guards/`, `interfaces/`

**Config:**
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL` (your backend public URL)
- `SHOPIFY_SCOPES` (e.g. `read_products,write_products`)

**2.2.1. Service responsibilities**

`ShopifyService` should:
- Build Shopify install URL:
  - `https://{shop}/admin/oauth/authorize`
  - Params: `client_id`, `scope`, `redirect_uri`, `state`
- Validate HMAC from Shopify on callback using the app's secret.
- Validate state to map back to a `projectId` and protect against CSRF.
- Exchange code for an Admin API access token:
  - `POST https://{shop}/admin/oauth/access_token`
- Upsert an `Integration` row:
  - `type = SHOPIFY`
  - `projectId = ...`
  - `externalId = shopDomain`
  - `accessToken = token`
  - `config = JSON` with scope, etc.

Optionally, use an auxiliary table or cache for state:

```prisma
model ShopifyInstallState {
  id        String   @id @default(cuid())
  projectId String
  state     String   @unique
  createdAt DateTime @default(now())
}
```

**2.2.2. Endpoint: GET /shopify/install?projectId=...&shop=...**

- **Auth:** JWT-protected.
- **Input (query):**
  - `projectId`
  - `shop` (e.g. `mystore.myshopify.com`)
- **Steps:**
  1. Verify authenticated user owns `projectId`.
  2. Create and persist a random state.
  3. Build the Shopify OAuth URL:
     ```
     https://{shop}/admin/oauth/authorize?
       client_id=SHOPIFY_API_KEY&
       scope=SHOPIFY_SCOPES&
       redirect_uri={SHOPIFY_APP_URL}/shopify/callback&
       state={state}
     ```
  4. Respond with a 302 redirect to that URL.

**2.2.3. Endpoint: GET /shopify/callback**

- **Query params:** `shop`, `code`, `state`, `hmac`, `timestamp`, etc.
- **Steps:**
  1. Validate HMAC using all query params except `hmac` and the app's secret.
  2. Validate state:
     - Look up `ShopifyInstallState` by `state`.
     - Retrieve associated `projectId`.
  3. Exchange code for access token:
     ```
     POST https://{shop}/admin/oauth/access_token
     Content-Type: application/json

     {
       "client_id": SHOPIFY_API_KEY,
       "client_secret": SHOPIFY_API_SECRET,
       "code": code
     }
     ```
  4. From response, get:
     - `access_token`
     - `scope`
  5. Upsert `Integration` row:
     ```typescript
     await prisma.integration.upsert({
       where: {
         // one integration per project+type
         projectId_type: {
           projectId,
           type: IntegrationType.SHOPIFY
         }
       },
       update: {
         externalId: shop,
         accessToken,
         config: { scope },
       },
       create: {
         projectId,
         type: IntegrationType.SHOPIFY,
         externalId: shop,
         accessToken,
         config: { scope },
       },
     });
     ```
  6. Redirect to the frontend:
     ```
     https://app.seoengine.io/shopify/success?projectId=...&shop=...
     ```

### 2.3. Integration Status Endpoint

Create an endpoint like:

**GET /projects/:id/integration-status**

**Returns:**

```json
{
  "project": { ... },
  "shopify": {
    "connected": true | false,
    "shopDomain": "mystore.myshopify.com" | null
  }
}
```

**Implementation:**
- Query `Integration` where `projectId = :id` and `type = SHOPIFY`.
- If found, return `connected: true` and `shopDomain` from `externalId`.
- Else, `connected: false`.

### 2.4. Shopify Connect Button (Frontend)

On `/projects/[id]/page.tsx`:

- Fetch `GET /projects/:id/integration-status`.
- If not connected:
  - Show button "Connect Shopify Store".
  - On click:
    - Ask for shop domain (or let the merchant enter `mystore.myshopify.com`).
    - Call `GET /shopify/install?projectId=...&shop=....`
    - Follow redirect to Shopify.
- If connected:
  - Show `shopDomain` and a "Connected" badge.
  - Provide link to `/products` tab (Phase 5).

### 2.5. Local Development vs Production

- For local dev, use a tunnel (`ngrok`, `cloudflared`) to expose the NestJS API over HTTPS.
- Set `SHOPIFY_APP_URL` and redirect URL in the Dev Dashboard to the tunnel URL (e.g. `https://<random>.ngrok.io`).
- Ensure redirect URLs stay consistent between Shopify config and backend env.

---

# PHASE 3 — Basic SEO Scanner

### 3.1. CrawlResult Schema

Add to `schema.prisma`:

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

Run migration.

### 3.2. SEO Scan Service (Backend)

Create `seo-scan` module:

**Endpoint:** `POST /seo-scan/start`

- **Body:** `{ projectId }`.
- Validates that the project belongs to the authenticated user.
- Fetches project domain.
- For MVP, scan only `/` (root page), plus any minimal extra paths if desired.

**Steps:**
1. Build URL (`https://{domain}/`).
2. Fetch the page (e.g. using `node-fetch` or `axios`).
3. Measure response time (ms).
4. Parse HTML (using `cheerio` or similar).
5. Extract:
   - `<title>`
   - `<meta name="description">`
   - first `<h1>`
   - basic word count (e.g. text length / 5)
6. Build issues array of strings:
   - `"MISSING_TITLE"`
   - `"MISSING_META_DESCRIPTION"`
   - `"MISSING_H1"`
   - `"THIN_CONTENT"`
7. Create `CrawlResult` row.

**Endpoint:** `GET /seo-scan/results?projectId=...`
- Returns list of `CrawlResult` for that project ordered by `scannedAt DESC`.

### 3.3. SEO Scan UI

On `/projects/[id]/page.tsx`:

- Add "Run SEO Scan" button.
- Calls `POST /seo-scan/start`.
- After success, refresh results list.
- Below, show table:
  - | URL | Status | Title | Issues | Score | Scanned |

Compute SEO Score per page (match current code):
```typescript
const score = Math.max(0, 100 - issues.length * 10);
```

Optionally show an average project score.

---

# PHASE 4 — AI Metadata Suggestions

### 4.1. AI Integration (OpenAI or Gemini)

**Backend `ai` module:**
- Load API key(s) from `.env`.
- Implement:

```typescript
async function generateMetadata(input: {
  url: string;
  currentTitle?: string;
  currentDescription?: string;
  pageTextSnippet?: string;
  targetKeywords?: string[];
}): Promise<{
  title: string;
  description: string;
  extra?: any; // richer response allowed
}> {
  // Call AI provider with a prompt like:
  // "You are an SEO assistant. Generate an SEO-friendly title (<= 65 chars) and meta description (<= 155 chars) for the following page..."
}
```

Implementation can return a richer JSON payload as long as at minimum it includes a title and description.

### 4.2. Metadata Suggestion Endpoint

**POST /ai/metadata**

**Body:**

```json
{
  "crawlResultId": "string",
  "targetKeywords": ["optional", "keywords"]
}
```

**Steps:**
1. Load `CrawlResult` by ID and project.
2. Compose a text snippet from page info (title, H1, meta description, etc.).
3. Call `generateMetadata`.
4. Return:

```json
{
  "current": {
    "title": "current title or null",
    "description": "current meta description or null"
  },
  "suggested": {
    "title": "SEO-optimized title",
    "description": "SEO-optimized meta description"
  },
  "raw": { ... } // optional extra data from AI
}
```

### 4.3. UI for Metadata Suggestions

In the SEO scan table:

- Add column "Actions" with button "Suggest Metadata".
- On click:
  - Call `POST /ai/metadata`.
  - Show modal with:
    - Current title + description.
    - Suggested title + description.
    - Buttons: "Copy title", "Copy description", "Copy both" (MVP can just be one "Copy to clipboard" button).

No CMS updates yet (that comes with Shopify product SEO).

---

# PHASE 5 — Shopify Product SEO (Read + AI)

This phase uses the generic Integration model with `IntegrationType.SHOPIFY`. Products are tied to projects and optionally to a specific integration via `integrationId`. The current implementation uses `externalId` instead of a Shopify-only ID field.

### 5.1. Product Schema

Update Prisma:

```prisma
model Product {
  id             String        @id @default(cuid())
  project        Project       @relation(fields: [projectId], references: [id])
  projectId      String

  integration    Integration?  @relation(fields: [integrationId], references: [id])
  integrationId  String?

  externalId     String        // Product ID from Shopify or other platforms
  source         IntegrationType

  title          String
  description    String?
  seoTitle       String?
  seoDescription String?
  imageUrls      Json?
  lastSyncedAt   DateTime      @default(now())
}
```

Run migration, making sure to match the current code's schema (this plan is aligned with the existing use of `externalId` and `source`).

### 5.2. Shopify Product Sync (Backend)

**Endpoint:** `POST /shopify/sync-products?projectId=...`

**Steps:**

1. Validate user and project.
2. Find `Integration` for the project where `type = SHOPIFY`.
3. Use the stored `accessToken` and `externalId` (shop domain) to call the Shopify Admin API (REST or GraphQL) to fetch the first N products (e.g. 50).
4. For each product:
   - Extract:
     - Shopify product ID (as `externalId`)
     - `title`
     - `body_html` or `description`
     - existing `seoTitle` / `seoDescription` fields, if available
     - image URLs
   - Upsert into `Product` table using a unique constraint on `(projectId, externalId, source)`.

### 5.3. Product List UI

**Route:** `/projects/[id]/products/page.tsx`

**Show:**
- "Sync Products" button → calls sync endpoint.
- Table columns:
  - Product title
  - External ID (Shopify ID)
  - SEO title (if any)
  - SEO description (if any)
  - Last synced
  - Actions (Scan SEO, Suggest SEO, Apply to Shopify in Phase 6)

**Backend endpoints to support this:**
- `GET /projects/:projectId/products`
  - Returns list of products for that project.

### 5.4. Product Metadata AI Suggestions

**Backend:**

**POST /ai/product-metadata**

**Body:**

```json
{
  "productId": "string",
  "targetKeywords": ["optional"]
}
```

- Load `Product` by ID.
- Use AI to generate suggested SEO title and description based on:
  - `title`
  - `description`
  - optional `targetKeywords`.
- Return a response similar to page metadata:

```json
{
  "current": {
    "title": "current SEO title or product title",
    "description": "current SEO description or product description"
  },
  "suggested": {
    "title": "AI SEO title",
    "description": "AI SEO description"
  },
  "raw": { ... }
}
```

**Frontend:**

- In product table row, add "Suggest SEO" button.
- Modal shows:
  - Current vs suggested SEO metadata.
  - "Apply to Shopify" (Phase 6) and/or "Copy" actions.

---

# PHASE 6 — Push AI SEO Updates to Shopify

### 6.1. Shopify Update Endpoint

**Backend:**

**POST /shopify/update-product-seo**

**Body:**

```json
{
  "productId": "string",
  "seoTitle": "string",
  "seoDescription": "string"
}
```

**Steps:**
1. Validate user + project ownership.
2. Load `Product` by ID and its associated `Integration` (type `SHOPIFY`).
3. Call Shopify Admin API to update product SEO fields:
   - This can be done via:
     - Product update endpoint (if store theme uses these fields), or
     - Metafields (recommended for flexibility).
4. On success, update `Product` row in DB with new `seoTitle` and `seoDescription`.

### 6.2. Frontend Apply Buttons

In the product SEO suggestion modal:

- Add "Apply to Shopify" button.
- On click:
  - Call `/shopify/update-product-seo`.
  - Show success or error toast.
  - Update the product row with new SEO title/description.

---

# PHASE 7 — Dashboard & Reports

### 7.1. Project Overview API

**Backend:**

**GET /projects/:id/overview**

**Returns:**

```json
{
  "crawlCount": number,
  "issueCount": number,
  "avgSeoScore": number,
  "productCount": number,
  "productsWithAppliedSeo": number
}
```

Stats are computed from `CrawlResult` and `Product` tables.
- `crawlCount` → number of `CrawlResult` rows for the project.
- `issueCount` → total number of issues across all `CrawlResults`.
- `avgSeoScore` → average of per-page scores computed with Formula from Phase 3.
- `productCount` → number of `Product` rows for the project.
- `productsWithAppliedSeo` → count of products where `seoTitle` or `seoDescription` is set.

### 7.2. Dashboard UI

**`/dashboard/page.tsx`**
- Fetch all projects for the user.
- For each project, fetch overview.
- Show cards/rows:
  - Project name
  - Avg SEO score
  - Crawl count
  - Product count
  - "View project" button

**`/projects/[id]/page.tsx`**
- Show project-level cards:
  - SEO score
  - Last scan date
  - Number of issues
  - Products synced
- Buttons:
  - "Run SEO Scan"
  - "View Products"

(Reuse existing components from previous phases where possible.)

---

# PHASE 8 — Two-Factor Authentication (2FA)

### 8.1. Overview

**Goal:** Add optional Two-Factor Authentication (2FA) for users using TOTP (e.g. Google Authenticator, 1Password, Authy).

**Key points:**

- 2FA is optional but recommended.
- If a user has 2FA enabled, login becomes a two-step flow:
  1. Verify email/password.
  2. Verify 6-digit TOTP code.
- Backend: NestJS (auth + 2FA module).
- Frontend: Next.js (settings screen + 2FA login step).
- DB: extend User model to store TOTP secret and flag.

### 8.2. Database Schema Changes (Prisma)

Update the User model in `apps/api/prisma/schema.prisma`:

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  password          String
  name              String?
  twoFactorEnabled  Boolean  @default(false)
  twoFactorSecret   String?  // Base32-encoded TOTP secret
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  projects          Project[]
}
```

**Then:**
1. Create a new migration, e.g.:
   ```
   npx prisma migrate dev --name add_two_factor_auth
   ```
2. Regenerate Prisma client.

### 8.3. Backend — 2FA Module (NestJS)

Create a new module in `apps/api/src/two-factor-auth`:
- `two-factor-auth.module.ts`
- `two-factor-auth.service.ts`
- `two-factor-auth.controller.ts`

**Use libraries (or equivalents):**
- `speakeasy` for TOTP generation/verification.
- `qrcode` for QR code PNG/base64.

#### 8.3.1. Service responsibilities

In `TwoFactorAuthService`:
- Generate a TOTP secret for a user.
- Build otpauth URL:
  ```
  otpauth://totp/SEOEngine.io:{email}?secret={secret}&issuer=SEOEngine.io
  ```
- Generate a QR code as a base64 PNG string.
- Verify a submitted TOTP code.
- Enable/disable 2FA on the user.

#### 8.3.2. Endpoints

All endpoints below (except the 2FA verify during login) require the user to be authenticated (JWT).

**(A) POST /2fa/setup-init**

**Purpose:** Begin 2FA setup (not enabled yet).

**Input:** none (uses current authenticated user).

**Steps:**
1. Generate TOTP secret (if user doesn't already have one).
2. Save `twoFactorSecret` in DB (but keep `twoFactorEnabled = false`).
3. Generate otpauth URL.
4. Generate QR code (base64 PNG).

**Response:**

```json
{
  "otpauthUrl": "otpauth://totp/SEOEngine.io:user@example.com?secret=ABC123&issuer=SEOEngine.io",
  "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```

**(B) POST /2fa/enable**

**Purpose:** Confirm 2FA setup by verifying one TOTP code.

**Body:**

```json
{
  "code": "123456"
}
```

**Steps:**
1. Load user, read `twoFactorSecret`.
2. Verify TOTP with `speakeasy.totp.verify(...)`.
3. If valid:
   - Set `twoFactorEnabled = true`.
4. If invalid: return 400 with error.

**Response (on success):**

```json
{
  "success": true
}
```

**(C) POST /2fa/disable**

**Purpose:** Disable 2FA (user must be authenticated).

**Optional body:** `{ "code": "123456" }` for extra safety (optional).

**Steps:**
1. Verify user identity (and optionally TOTP).
2. Set `twoFactorEnabled = false`.
3. Optionally clear `twoFactorSecret`.

**Response:**

```json
{
  "success": true
}
```

### 8.4. Backend — Update Auth Flow (NestJS)

#### 8.4.1. Login endpoint behaviour change

In `AuthController` / `AuthService` for `POST /auth/login`:

**Current behavior (MVP):**
- Validate email/password → return JWT.

**New behavior with 2FA:**
1. Validate email/password.
2. If `twoFactorEnabled === false`:
   - Return JWT as before:
     ```json
     {
       "accessToken": "jwt...",
       "user": { ... }
     }
     ```
3. If `twoFactorEnabled === true`:
   - DO NOT return the final JWT yet.
   - Instead return a temporary token and a flag:
     ```json
     {
       "requires2FA": true,
       "tempToken": "some-signed-token-or-jwt-for-2fa-step",
       "user": { "id": "...", "email": "..." }
     }
     ```

The `tempToken` should:
- Be short-lived.
- Only allow access to the 2FA verification endpoint.

#### 8.4.2. New endpoint: POST /auth/2fa/verify

**Body:**

```json
{
  "tempToken": "string",
  "code": "123456"
}
```

**Steps:**
1. Verify `tempToken`.
2. Load user and `twoFactorSecret`.
3. Verify TOTP code with `speakeasy`.
4. If valid: return final JWT (normal `accessToken`) and user:
   ```json
   {
     "accessToken": "final-jwt-token",
     "user": { "id": "...", "email": "..." }
   }
   ```

### 8.5. Frontend — Settings UI for 2FA (Next.js)

Create a Security / Account Settings page, e.g.:
`apps/web/src/app/settings/security/page.tsx`

#### 8.5.1. Security page features

**Show:**
- Whether 2FA is currently enabled/disabled (from `/users/me`).

**If disabled:**
- Button: "Enable 2FA"
  - Calls `POST /2fa/setup-init`.
  - Shows the QR code image (`qrCodeDataUrl`).
  - Prompts user to:
    1. Scan QR code with authenticator app.
    2. Enter 6-digit code.
  - Submits code to `POST /2fa/enable`.

**If enabled:**
- Show "2FA is enabled".
- Button: "Disable 2FA" → `POST /2fa/disable` (optionally with code confirmation).

### 8.6. Frontend — Updated Login Flow

Assuming the login UI is in:
`apps/web/src/app/login/page.tsx`

#### 8.6.1. Step 1 — Email + Password

On submit call `POST /auth/login`.

**Behaviors:**
- If response has `accessToken`:
  - Normal login (store JWT, redirect to `/dashboard`).
- If response has `requires2FA: true` and `tempToken`:
  - DO NOT store `accessToken` yet.
  - Store `tempToken` in memory (state) or temporary storage.
  - Navigate to `/2fa` page for the user to enter code.

#### 8.6.2. Step 2 — 2FA Page

Create a new page:
`apps/web/src/app/2fa/page.tsx`

**Features:**

- Simple form:
  - Input: 6-digit TOTP code.
  - Hidden or internal: `tempToken` from previous step.
- On submit:
  - Call `POST /auth/2fa/verify` with `{ tempToken, code }`.
  - If successful:
    - Receive final `accessToken`.
    - Store token (e.g. localStorage, or cookie if you later upgrade).
    - Redirect to `/dashboard`.
  - If failure:
    - Show error message (e.g., "Invalid or expired code").

### 8.7. Security & UX Considerations

- Use short expiry for `tempToken` (e.g. 5–10 minutes).
- Consider rate limiting login + 2FA endpoints.
- Make error messages generic:
  - Instead of "Wrong code", consider "Invalid credentials or code" to avoid leaking info.
- Consider backup codes as a future enhancement phase.

### 8.8. Testing Checklist

**Backend**
- [ ] Migration applies successfully.
- [ ] TOTP secret generation works and is stored.
- [ ] `/2fa/setup-init` returns valid otpauth URL and QR code.
- [ ] `/2fa/enable`:
  - [ ] Accepts valid code.
  - [ ] Rejects invalid code.
- [ ] `/2fa/disable` changes flags correctly.
- [ ] `/auth/login`:
  - [ ] Normal login when 2FA disabled.
  - [ ] `requires2FA: true` and `tempToken` when enabled.
- [ ] `/auth/2fa/verify`:
  - [ ] Rejects invalid or expired `tempToken`.
  - [ ] Rejects invalid TOTP code.
  - [ ] Returns final JWT when valid.

**Frontend**
- [ ] User can enable 2FA from settings page.
- [ ] QR displays correctly and can be scanned by Google Authenticator.
- [ ] After enabling, login requires 2FA.
- [ ] Incorrect 2FA code shows an error.
- [ ] Correct code logs user in and redirects.

---

# EXECUTION NOTES FOR AI IDE

- Implement one phase at a time.
- Before coding each phase:
  - Generate a step-by-step sub-plan.
- After coding each phase:
  - Show Git diffs for human review.
- Do not change tech stack or structure without explicit instruction.
- Ask for clarification if a requirement is ambiguous.
- Prefer small, incremental commits per feature.

---

END OF IMPLEMENTATION PLAN
