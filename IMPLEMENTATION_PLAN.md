# SEOEngine.io – Full Implementation Plan

This document provides a **step-by-step, execution-ready plan** for building the SEOEngine.io SaaS application using a monorepo (Next.js frontend + NestJS backend + Prisma + PostgreSQL + Shopify integration + AI metadata engine).

AI IDEs (Cursor, Antigravity, etc.) should follow these instructions **exactly as written**.  
Each phase should be implemented in sequence.  
Each step should produce diffs and await approval before applying.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend:** NestJS (Node + TypeScript)
- **Database:** PostgreSQL + Prisma
- **Cache / Queue (later):** Redis
- **AI:** OpenAI / Gemini via REST API
- **E-commerce:** Shopify Admin API (REST or GraphQL)

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
  connectedType String   // 'website' | 'shopify'
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

# PHASE 2 — Shopify Integration (MVP Skeleton)

### 2.0. Shopify App Setup in Shopify

Before implementing any code in this phase, create and configure the actual Shopify app in the Shopify Partner dashboard so that OAuth and API calls from SEOEngine.io can succeed.

**2.0.1. Create Partner account and test store**
- Go to `https://partners.shopify.com` and sign up (or log in) as a Shopify Partner.
- In the Partner dashboard, create at least one **development store** that you will use for testing the SEOEngine app.

**2.0.2. Create a public app**
- In the Partner dashboard, navigate to **Apps → Create app**.
- Choose **Public app** (listed on the Shopify App Store in the future) and give it a name such as `SEOEngine – AI SEO`.
- Set the app’s **App URL / Primary URL** temporarily to your backend base URL (for local dev you can use a tunneling service like `ngrok` or `cloudflared`, e.g. `https://<random>.ngrok.io`).

**2.0.3. Configure redirect URLs**
- In the app settings, add the allowed redirect URL that the NestJS backend will handle for OAuth:
  - `https://<backend-base-url>/shopify/callback`
- Make sure **App URL** and **Allowed redirection URL(s)** in Shopify always match the values used in the backend config:
  - `SHOPIFY_APP_URL` → backend base URL (e.g. `https://<random>.ngrok.io`)
  - OAuth callback path → `/shopify/callback`

**2.0.4. Get API credentials and scopes**
- In the app’s **Configuration / API credentials** section, obtain:
  - `API key` (client ID)
  - `API secret key`
- Decide initial scopes based on this plan (minimum for MVP product SEO):
  - `read_products`
  - `write_products`
  - Optionally: `read_themes`, `write_themes` if you later manipulate theme SEO or templates.
- Add these to the backend environment:
  - `SHOPIFY_API_KEY=<your-api-key>`
  - `SHOPIFY_API_SECRET=<your-api-secret>`
  - `SHOPIFY_SCOPES=read_products,write_products,read_themes,write_themes` (as needed)
  - `SHOPIFY_APP_URL=https://<backend-base-url>`

**2.0.5. Enable app for your development store**
- From the app detail page in the Partner dashboard, click **Test your app** and install it on your development store.
- During development you will primarily:
  - Start the NestJS API server.
  - Expose it via tunnel (if running locally).
  - Trigger OAuth from SEOEngine (`/shopify/install`) to install/authorize the app on the test store.

Once steps 2.0.1–2.0.5 are complete, proceed with the backend and frontend integration steps below.

### 2.1. Integration DB Model (Shopify + others)

Add to `apps/api/prisma/schema.prisma`:

```prisma
// Supported ecommerce platform integration types
enum IntegrationType {
  SHOPIFY
  WOOCOMMERCE
  BIGCOMMERCE
  MAGENTO
  CUSTOM_WEBSITE
}

model Integration {
  id          String          @id @default(cuid())
  project     Project         @relation(fields: [projectId], references: [id])
  projectId   String
  type        IntegrationType
  externalId  String?         // shop domain, store ID, account slug, etc.
  accessToken String?         // Shopify token, Woo API key, etc.
  config      Json?           // platform-specific configuration
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([projectId, type]) // One integration per type per project
}
```

Run `npx prisma migrate dev --name add_integration_model`.

### 2.2. Shopify OAuth Flow (Backend)

Create `shopify` module:

**Config:**
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL` (your backend public URL)
- `SHOPIFY_SCOPES` (e.g. `read_products,write_products,read_themes` etc.)

**Implement:**

- `GET /shopify/install?projectId=...`
  - Validates that the authenticated user owns the `projectId`.
  - Generates Shopify OAuth URL with:
    - `client_id`
    - `scopes`
    - `redirect_uri` → `/shopify/callback`
    - `state` (random, store it mapped to `projectId`)
  - Redirects to Shopify.

- `GET /shopify/callback`
  - Validates HMAC from query.
  - Validates `state` (maps back to `projectId`).
  - Exchanges code for access token using Shopify OAuth endpoint.
  - Persists an `Integration` row with:
    - `type = SHOPIFY`
    - `externalId = shopDomain` (e.g. `mystore.myshopify.com`)
    - `accessToken`
    - `config.scope`
    - `config.installedAt`

### 2.3. Shopify Connect Button (Frontend)

On `/projects/[id]/page.tsx`:

- Fetch project details and `ShopifyStore` status from a backend endpoint, e.g. `GET /projects/:id/integration-status`.
- If no `ShopifyStore`:
  - Show button "Connect Shopify Store".
  - On click:
    - Call `GET /shopify/install?projectId=...`.
    - Follow redirect to Shopify.
- If connected:
  - Show `shopDomain` and "Connected" badge.

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
- Body: `{ projectId }`.
- Validates that the project belongs to the authenticated user.
- Fetches project domain.
- For MVP, scan only: `/`

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
  - | URL | Status | Title | Issues | Scanned |
- Compute SEO Score per page:
  ```typescript
  const score = Math.max(0, 100 - issues.length * 5);
  ```
- Optionally show an average project score.

---

# PHASE 4 — AI Metadata Suggestions

### 4.1. AI Integration (OpenAI or Gemini)

**Backend `ai` module:**
- Load API key from `.env`.
- Implement:

```typescript
async function generateMetadata(input: {
  url: string;
  currentTitle?: string;
  currentDescription?: string;
  pageTextSnippet?: string;
  targetKeywords?: string[];
}): Promise<{ title: string; description: string }> {
  // Call AI provider with a prompt like:
  // "You are an SEO assistant. Generate an SEO-friendly title (<= 65 chars) and meta description (<= 155 chars) for the following page..."
}
```

Keep prompts deterministic and short.

### 4.2. Metadata Suggestion Endpoint

`POST /ai/metadata`

**Body:**

```json
{
  "crawlResultId": "string",
  "targetKeywords": ["optional", "keywords"]
}
```

**Steps:**
1. Load `CrawlResult` by ID and project.
2. Compose a text snippet from page info (title, H1, etc.).
3. Call `generateMetadata`.
4. Return:

```json
{
  "suggestedTitle": "string",
  "suggestedDescription": "string"
}
```

You may also create a table `MetadataSuggestion` to persist suggestions, but MVP can keep it ephemeral.

### 4.3. UI for Metadata Suggestions

In the SEO scan table:

- Add column "Actions" with button "Suggest Metadata".
- On click:
  - Call `POST /ai/metadata`.
  - Show modal with:
    - Current title + description.
    - Suggested title + description.
    - Buttons: "Copy to clipboard" (MVP) and "Close".

No application back to CMS yet (that will be done for Shopify in later phases).

---

# PHASE 5 — Shopify Product SEO (Read + AI)

### 5.1. Product Schema

Add to Prisma:

```prisma
model Product {
  id             String   @id @default(cuid())
  project        Project  @relation(fields: [projectId], references: [id])
  projectId      String
  externalId     String   // platform-agnostic ID (Shopify product ID, etc.)
  title          String
  description    String?
  seoTitle       String?
  seoDescription String?
  imageUrls      Json?
  lastSyncedAt   DateTime @default(now())
}
```

Run migration.

### 5.2. Shopify Product Sync (Backend)

**Endpoint:** `POST /shopify/sync-products?projectId=...`

**Steps:**

1. Validate user and project.
2. Find the project's Shopify integration (`Integration` where `type = SHOPIFY`).
3. Call Shopify Admin API (REST or GraphQL) to fetch first N products (e.g. 50).
4. For each product:
   - Extract:
     - `id`, `title`, `body_html` / `description`, SEO title/description (if present), image URLs.
   - Upsert into `Product` table using `externalId` (for Shopify this is the product ID).

### 5.3. Product List UI

**Route:** `/projects/[id]/products/page.tsx`

- "Sync Products" button → calls sync endpoint.
- Table columns:
  - Product title
  - Shopify ID
  - SEO title (if any)
  - SEO description (if any)
  - Last synced

### 5.4. Product Metadata AI Suggestions

**Backend:**

`POST /ai/product-metadata`

**Body:**

```json
{
  "productId": "string",
  "targetKeywords": ["optional"]
}
```

- Load `Product` by ID.
- Use AI to generate suggested SEO title and description based on product title, description, and optional keywords.
- Return suggestions.

**Frontend:**

- In product table row, add "Suggest SEO" button.
- Modal shows suggestions similar to crawl metadata modal.

---

# PHASE 6 — Push AI SEO Updates to Shopify

✅ **COMPLETED** - Phase 6 implementation finished. All endpoints and frontend features are in place.

### 6.1. Shopify Update Endpoint

**Backend:**

`POST /shopify/update-product-seo`

**Body:**

```json
{
  "productId": "string",
  "seoTitle": "string",
  "seoDescription": "string"
}
```

**Steps:**
1. Validate user + project.
2. Load `Product` and the project's Shopify integration (`Integration` where `type = SHOPIFY`).
3. Call Shopify Admin API to update product SEO fields (title tag, meta description, or metafields, depending on chosen implementation).
4. On success, update `Product` row in DB with new `seoTitle` and `seoDescription`.

### 6.2. Frontend Apply Buttons

In the product SEO suggestion modal:

- Add "Apply to Shopify" button.
- On click:
  - Calls `/shopify/update-product-seo`.
  - Shows success or error toast.
  - Updates the table row with new SEO title/description.

---

# PHASE 7 — Dashboard & Reports

### 7.1. Project Overview API

**Backend:**

`GET /projects/:id/overview`

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
