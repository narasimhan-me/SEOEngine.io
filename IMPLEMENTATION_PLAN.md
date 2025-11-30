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

```
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
- Configure "apps/" and "packages/" as workspace folders.
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

```
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

```
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

# # PHASE 0.5 — Public Marketing Website (Landing, Features, Pricing, Signup Funnel)

*(Insert this between Phase 0 and Phase 1)*

This phase creates the public-facing marketing website that visitors see before logging in. It is separate from the authenticated app UI.

### 0.5.1. Goals

- Provide a professional SaaS landing experience
- Explain SEOEngine.io offering clearly
- Show pricing
- Drive signups
- SEO-optimized & fast
- Prepare for scaling into a full marketing site

### 0.5.2. Marketing Routes & Layout

Create a separate marketing route group:

```
apps/web/src/app/(marketing)/
```

Inside it, create:

- `layout.tsx` — marketing-only layout
  - Top navigation (lighter than app UI)
  - Footer
  - No sidebar
  - No authenticated UI elements
- `page.tsx` — Home / Landing Page
- `pricing/page.tsx`
- `features/page.tsx`
- `contact/page.tsx`

**Marketing Navbar:**

- **Left:**
  - Logo
  - Links: Features, Pricing
- **Right:**
  - Login
  - Button: Sign Up Free

**Marketing Footer:**

- Product links
- Docs
- Support
- Terms
- Privacy

### 0.5.3. Required Pages

**Home / Landing Page (`/`)**

**Sections:**

- Hero (headline + subheadline + primary CTA)
- Product value propositions
- Screenshots
- Shopify integration highlights
- Feature summary
- Testimonials (placeholder)
- Footer CTA

**Initial copy (placeholders permitted):**

- Hero text: "SEOEngine.io — AI-Powered SEO for eCommerce & SaaS."
- Primary CTA: "Start Free"

**Features Page (`/features`)**

Breakdown of feature categories:

- AI SEO Automation
- Content Intelligence
- Shopify SEO Optimization
- Performance Monitoring
- Competitor Insights
- Backlinks & Local SEO
- Automations

Each section should include:

- A short description
- Placeholder icons

**Pricing Page (`/pricing`)**

- Starter, Pro, Agency plans (match backend plan definitions)
- Feature comparison table
- Monthly & annual toggle
- CTA: "Sign Up Free"

**Contact Page (`/contact`)**

- Contact form UI
- Support email section

### 0.5.4. UX Requirements

- Mobile-responsive
- Fast-loading (optimized images)
- Clean, SaaS-standard spacing & typography
- SEO-optimized:
  - Title tags
  - Meta descriptions
  - OpenGraph image
  - Schema markup (basic)

### 0.5.5. Frontend Implementation Details

**Directory Structure:**

```
apps/web/src/app/(marketing)/
  layout.tsx
  page.tsx              // home
  features/page.tsx
  pricing/page.tsx
  contact/page.tsx
```

**Shared Components:**

Create reusable:

- `components/marketing/Navbar.tsx`
- `components/marketing/Footer.tsx`
- `components/marketing/Hero.tsx`
- Placeholder components for other sections

### 0.5.6. Authentication Boundary

**Marketing pages:**

- Must not require authentication
- Must not show TopNav used inside the app
- Use the marketing layout exclusively

**Authenticated pages:**

- Use the app layout (Phase 9)
- Logged-in users bypass landing page automatically if visiting `/`
- Redirect logic will be implemented in 0.5.11

### 0.5.7. Backend Requirements

No backend changes required for this phase besides ensuring:

- `/auth/login` and `/auth/signup` still work
- CORS & environment variables for production are configured

### 0.5.8. Deliverables for This Phase

- Marketing layout
- Landing page
- Features page
- Pricing page
- Contact page
- Navbar + Footer
- SEO meta setup
- Public signup funnel connected to `/signup`

### 0.5.9. Marketing Content (Copy, Features, Pricing, Contact)

**Goal:** Replace placeholder text with real, conversion-focused marketing content for all public pages.

#### 0.5.9.1. Messaging Foundations

- Define 1–2 primary personas (e.g. "Shopify store owner", "SEO agency lead").
- Write:
  - One-sentence product positioning
  - 3–5 key value props
  - 3 major pains SEOEngine.io solves
- Store this in a simple markdown file:
  - `apps/web/src/marketing/messaging.md` (for future reuse in product, docs, ads).

#### 0.5.9.2. Home / Landing Page Content

Update `(marketing)/page.tsx` to use finalized copy:

- **Hero:**
  - Headline (benefit-driven, ≤ 12 words)
  - Subheadline
  - Primary CTA text ("Start free") + secondary CTA ("Book a demo" or "Learn how it works")
- **Sections:**
  - "Who it's for" (2–3 audience types)
  - 3–4 feature blocks with short descriptions
  - Shopify focus section (how it helps stores)
  - Social proof placeholders (logos/testimonials)
  - Final "Ready to get started?" CTA tied to `/signup`

#### 0.5.9.3. Features Page Content

Update `(marketing)/features/page.tsx`:

- Group features under the same buckets as the product roadmap:
  - AI SEO Automation
  - Content Intelligence
  - Shopify SEO
  - Monitoring & Reporting
  - Competitive & Backlink Intelligence
  - Local SEO & Automations
- For each bucket add:
  - Title
  - 2–3 bullet points
  - Short "Why it matters" paragraph.

#### 0.5.9.4. Pricing Page Content

Update `(marketing)/pricing/page.tsx`:

- Align plans with backend PLANS config (Starter, Pro, Agency).
- For each plan:
  - 1-line summary ("For solo stores getting started", etc.)
  - Price placeholder (can be "TBD" until Stripe live).
  - 5–7 bullets (limits, AI usage, priority features).
- Add FAQ section (4–6 common questions):
  - "Can I cancel anytime?"
  - "Do you work with agencies?"
  - "Do you support multiple stores?"
  - "What is an AI token?"
  - "Do I need a developer?"

#### 0.5.9.5. Contact Page Content

Update `(marketing)/contact/page.tsx`:

- Short intro ("Need help, or want a demo?").
- Form labels: Name, Work email, Website/Store URL, Message.
- Add static info:
  - Support email (e.g. support@seoengine.io)
  - Expected response time (e.g. "within 1 business day").
#### 0.5.9.6. SEO Meta & OG Content

For all marketing routes (`/`, `/features`, `/pricing`, `/contact`):

- Set metadata in the page files:
  - `title`
  - `description`
  - `openGraph` image (use your logo/hero image).
- Make sure copy is keyword-aware:
  - e.g. "AI SEO for Shopify", "eCommerce SEO automation", etc.

### 0.5.10. Contact Form Backend Wiring

Connect the `/contact` page form to a real backend endpoint so submissions don't just disappear.

**Backend (NestJS – `apps/api`):**

**Create Contact module:**

- **Folder:** `apps/api/src/contact`
- **Files:**
  - `contact.module.ts`
  - `contact.service.ts`
  - `contact.controller.ts`
  - `dto/create-contact.dto.ts`

**DTO & validation:**

In `create-contact.dto.ts`:

- **Fields:**
  - `name: string`
  - `email: string`
  - `company?: string`
  - `message: string`
  - (Later, add `captchaToken: string` – see 0.5.12)
- Add class-validator decorators:
  - `@IsEmail()` for email
  - `@IsString() + @IsNotEmpty()` where appropriate

**Endpoint:**

In `contact.controller.ts`:

- `POST /contact`
- Public endpoint (no auth required).
- Body: `CreateContactDto`
- Calls `ContactService.create(...)`.

**Service behavior:**

In `contact.service.ts`:

For now, implement a simple "delivery" mechanism with clear TODOs:

- Log to console in development.
- Optionally send an email via an external provider (when configured):
  ```typescript
  // Pseudocode
  await this.mailer.send({
    to: process.env.SUPPORT_EMAIL_TO,
    subject: "[SEOEngine.io] New contact form submission",
    text: `Name: ...\nEmail: ...\nCompany: ...\nMessage: ...`,
  });
  ```
- Read target email from env: `SUPPORT_EMAIL_TO=support@seoengine.io`.
- Do not fail the request if email sending fails — log and return a generic success with a TODO.

**Wire module:**

- Import `ContactModule` into `AppModule`.

**Frontend (Next.js – `apps/web`):**

**Connect the form:**

On `apps/web/src/app/(marketing)/contact/page.tsx`:

- Make the form a client component and handle `onSubmit`.
- Call `POST ${NEXT_PUBLIC_API_URL}/contact` with JSON body:
  ```json
  { "name", "email", "company", "message" }
  ```

**Show:**

- **Success state:** "Thanks, we've received your message."
- **Error state:** friendly, on-brand error message:
  - e.g., "Our SEO robot tripped over a cable. Please try again in a few seconds."

**Validation UX:**

- Basic required-field checks on the client.
- Disabled state + loading indicator on the submit button while sending.

### 0.5.11. Auth-Aware Landing Redirect (`/` → `/projects` when logged in)

Ensure logged-in users skip the marketing landing and go straight into the app.

**Frontend (Next.js – `apps/web`):**

**Auth helper (if not already present):**

In `apps/web/src/lib/auth.ts` (or reuse existing):

- `getToken()` reads `seoengine_token` from localStorage (browser only).
- `isAuthenticated()` returns `true` if token exists.

**Create a small wrapper component:**

**File:** `apps/web/src/components/marketing/RedirectIfAuthenticated.tsx`

**Client component:**

On mount:

- Check localStorage for `seoengine_token`.
- If present, `router.replace("/projects")`.
- If not, render children.

**Pseudocode:**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/projects");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null; // or a tiny spinner
  return <>{children}</>;
}
```

**Wrap the landing page:**

In `apps/web/src/app/(marketing)/page.tsx`:

Wrap the exported page content:

```typescript
import { RedirectIfAuthenticated } from "@/components/marketing/RedirectIfAuthenticated";

export default function MarketingHomePage() {
  return (
    <RedirectIfAuthenticated>
      {/* existing landing content */}
    </RedirectIfAuthenticated>
  );
}
```

**Keep other marketing routes public:**

- `/features`, `/pricing`, `/contact` should not redirect automatically.
- Only the root landing page (`/`) uses `RedirectIfAuthenticated` to send logged-in users to `/projects`.
### 0.5.12. Contact Form CAPTCHA (Anti-Bot Protection)

Add CAPTCHA to the contact form to reduce spam and automated junk submissions.

**Choice:** Use a modern, privacy-friendly CAPTCHA such as Cloudflare Turnstile or hCaptcha (Google reCAPTCHA v3 is also possible if preferred).

#### 0.5.12.1. Environment & Config

Add env vars for your chosen provider, e.g. (Turnstile example):

```
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
CAPTCHA_PROVIDER=turnstile
```

**Backend (`apps/api`):**

Create a small config service or constants file, e.g. `apps/api/src/config/captcha.config.ts`, exporting:

- `captchaProvider`
- `siteKey`
- `secretKey`

**Frontend (`apps/web`):**

Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (or equivalent) for loading the widget on the client.

#### 0.5.12.2. Frontend Integration (Contact Form)

Update `apps/web/src/app/(marketing)/contact/page.tsx`:

- Make it a client component if not already.
- Add a CAPTCHA widget just above the submit button.
- For Turnstile, use their official React snippet or a small wrapper.
- On successful CAPTCHA completion, store the token in component state.
- On submit:
  - Include `captchaToken` in the request body:
    ```json
    {
      "name": "...",
      "email": "...",
      "company": "...",
      "message": "...",
      "captchaToken": "token-from-widget"
    }
    ```

**UX details:**

- Disable submit button while verifying/sending.
- If CAPTCHA fails (token missing/expired), show a friendly error:
  - "Please verify you're not a robot and try again."

#### 0.5.12.3. Backend Verification (NestJS)

**Update CreateContactDto:**

- Add `captchaToken: string` with validation:
  - `@IsString()`
  - `@IsNotEmpty()`

**In ContactService (or a separate CaptchaService):**

Implement `verifyCaptcha(token: string, remoteIp?: string)`:

- For Turnstile, POST to:
  - `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- Include:
  - `secret`: from env
  - `response`: captchaToken
  - Optionally `remoteip`: from request if you want
- If verification fails or returns low/invalid score:
  - Throw a `BadRequestException("CAPTCHA verification failed")`.

**In `contact.controller.ts`:**

- Extract IP if you want (e.g. `req.ip`) and pass to verifier.
- Only proceed to email/logging logic if CAPTCHA is valid.

#### 0.5.12.4. Security & Rate-Limit TODOs

Add TODO comments for future hardening:

- **Rate limiting:**
  - Add NestJS guard or middleware to limit `/contact` posts per IP.
- **Logging / alerting:**
  - Log repeated failed CAPTCHA attempts.
- **Abuse monitoring:**
  - Consider blocking IPs with excessive failed attempts.
 
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
  "avgSeoScore": number | null,
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

**Note:** When implementing features, assume you are a renowned SEO, eCommerce, and AI product owner with deep expertise in these domains.

---

# PHASE 9 — UX & Navigation Redesign + Error Handling

✅ **COMPLETED** - Phase 9 implementation finished. Navigation structure, error boundaries, and friendly error handling are in place.

**Goal:** Redesign the app UX so it can scale to all planned features, and implement friendly, consistent error handling.

### 9.1. New Global & Project Layouts

**Frontend (`apps/web`)**

**Top-level App Layout**

`src/app/layout.tsx` should:
- Render a top navigation bar for logged-in users.
- Wrap all authenticated routes with a consistent shell.
- For marketing routes (e.g. `(marketing)`), use a lighter layout without side nav.

**Top Nav (Global)**

Create `components/layout/TopNav.tsx`:

- **Left:**
  - Logo + text "SEOEngine.io" → links to `/projects`.
  - Project switcher (dropdown with:
    - Current project name
    - Search projects (calls `GET /projects`)
    - "Create new project"
  )
- **Right:**
  - Help / Docs link.
  - Admin link (if `user.role === 'ADMIN'`) → `/admin`.
  - User avatar menu:
    - Profile
    - Billing & Subscription
    - Sign out

After login, redirect to `/projects` (project list) instead of `/dashboard`.

**Project Workspace & Side Nav**

Add a layout: `src/app/projects/[id]/layout.tsx`:
- Uses the TopNav from above.
- Adds a left side nav with project-level sections:
  - Overview → `/projects/[id]/overview`
  - Issues & Fixes → `/projects/[id]/issues`
  - Products → `/projects/[id]/products`
  - Content → `/projects/[id]/content`
  - Performance → `/projects/[id]/performance`
  - Keywords → `/projects/[id]/keywords`
  - Competitors → `/projects/[id]/competitors`
  - Backlinks → `/projects/[id]/backlinks`
  - Automation → `/projects/[id]/automation`
  - Local SEO → `/projects/[id]/local`
  - Settings → `/projects/[id]/settings`

Existing functionality should be mapped to:
- Current project detail view → `/projects/[id]/overview`
- Existing SEO scan UI → integrated into Overview + Issues.
- Products page → `/projects/[id]/products`.

**Placeholder Routes for Future Features**

Create minimal placeholder pages (with simple text + description) for:
- `/projects/[id]/issues`
- `/projects/[id]/content`
- `/projects/[id]/performance`
- `/projects/[id]/keywords`
- `/projects/[id]/competitors`
- `/projects/[id]/backlinks`
- `/projects/[id]/automation`
- `/projects/[id]/local`

Each page should explain what will go there later (helps keep UX consistent while features are WIP).

### 9.2. Friendly Error Handling

**Frontend:**

**Global Error Boundary / Error UI**

- Implement `error.tsx` files in key routes (app root and project layouts).
- Create a reusable component like `components/ui/FriendlyError.tsx` that:
  - Shows a human + playful message like:
    - "Oops, our SEO robot tripped over a cable. Please try again in a few seconds."
  - Includes:
    - "Retry" button (retries the last action when possible).
    - Optional "Go back" and "Go to Dashboard" buttons.

**API Error Handling in Hooks**

- Consolidate fetch logic into a small client utility (`lib/api.ts`).
- For errors (4xx/5xx), show:
  - Toast message with friendly text.
  - Use standard phrasing across the app.

**Backend:**

**NestJS Global Exception Filter**

- Implement a global filter (e.g. `AllExceptionsFilter`) that:
  - Logs internal errors with stack traces (for you).
  - Returns structured JSON to the client:
    ```json
    {
      "error": "Internal server error",
      "code": "INTERNAL_ERROR",
      "requestId": "..."
    }
    ```
  - DO NOT leak sensitive info in production.

**Validation Errors**

- Use NestJS `ValidationPipe` with DTOs and send clean messages.

---

# PHASE 10 — Admin Console, Billing & Subscription Management

**Current status:** Implemented as an **internal billing system** with a `Subscription` model and admin console. Stripe integration (real checkout sessions, customer portal, and webhook‑driven subscription updates) is planned as a follow‑up enhancement (Phase 10B) and is currently stubbed with TODOs in the billing service.

**Goal:** Add SaaS admin capabilities and subscription management, with Stripe integration planned for a later sub‑phase.

### 10.1. User Roles

**Prisma:**

```prisma
enum UserRole {
  USER
  ADMIN
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      UserRole @default(USER)
  // ... existing fields
  projects  Project[]
}
```

- Migrate: `npx prisma migrate dev --name add_user_role`.
- Update JWT payload to include role.
- Implement an `AdminGuard` in NestJS that enforces `role === ADMIN` on `/admin/*` routes.

### 10.2. Subscriptions & Plans (Internal Billing + Stripe Later)

**Prisma:**

```prisma
model Subscription {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id])
  stripeCustomerId     String?
  stripeSubscriptionId String?
  plan                 String
  status               String   // "active", "trialing", "canceled", etc.
  currentPeriodEnd     DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

Add subscription relation to User if desired.

**Backend (current implementation):**

- Implement internal subscription management:
  - `Subscription` rows created/updated directly by the API (no external payment processing yet).
  - Endpoints:
    - `GET /billing/plans` → returns available plans from in‑code config.
    - `GET /billing/subscription` (or equivalent) → returns the current user’s subscription or a default “free” state.
    - `POST /billing/subscribe` → switches the user to a new plan (DB only, no Stripe charge).
    - `POST /billing/cancel` → marks the subscription as canceled.
    - `POST /billing/webhook` → currently a stub that logs incoming events and includes TODOs for future Stripe integration.

**Plan Configuration (code, not DB at first):**

`apps/api/src/billing/plans.ts`:

```typescript
export const PLANS = {
  starter: {
    name: 'Starter',
    maxProjects: 3,
    maxProducts: 500,
    aiTokensPerMonth: 200_000,
    features: {
      shopify: true,
      advancedAutomation: false,
      competitiveIntelligence: false,
    },
  },
  pro: { ... },
  agency: { ... },
};
```

---

# PHASE 10B — Production-Ready Stripe Subscription Billing

**Status:** Not started (Stripe stubs exist in code with TODOs).

**Goal:** Convert the internal subscription system implemented in Phase 10A into a real SaaS billing system using Stripe Billing.

This includes:

- Checkout sessions
- Customer portal
- Webhook-driven subscription syncing
- Stripe customer creation
- Plan management
- Frontend billing UI
- Production-ready env variables & deployment

This phase is required before go-live and marketing launch.

### 10B.1. Stripe Setup (Backend + Environment)

**Install Stripe SDK:**

```bash
pnpm add stripe
```

**Add Render (API) environment variables:**

```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_AGENCY=price_xxx

STRIPE_SUCCESS_URL=https://app.seoengine.io/settings/billing/success
STRIPE_CANCEL_URL=https://app.seoengine.io/settings/billing/cancel
```

Create products & recurring prices in Stripe Dashboard and copy price IDs above.

### 10B.2. Extend Prisma Subscription Model

Ensure the model includes Stripe fields:

```prisma
model Subscription {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id])
  stripeCustomerId     String?
  stripeSubscriptionId String?
  plan                 String
  status               String
  currentPeriodEnd     DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

**Run migration:**

```bash
npx prisma migrate dev --name stripe_subscription_fields
```

### 10B.3. API: Create Checkout Session

**POST /billing/create-checkout-session**

**Body:**

```json
{
  "plan": "starter" | "pro" | "agency"
}
```

**Flow:**

1. Authenticate user
2. Find or create Stripe customer (save to DB)
3. Load price ID from env
4. Create Stripe Checkout Session:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer,
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: STRIPE_SUCCESS_URL,
  cancel_url: STRIPE_CANCEL_URL
});
```

5. Return `session.url`

### 10B.4. API: Customer Billing Portal

**GET /billing/portal**

Creates a Stripe portal session:

```typescript
stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: "https://app.seoengine.io/settings/billing"
});
```

Return portal URL.

### 10B.5. Stripe Webhook Handler

**POST /billing/webhook**

Must use raw body parsing and verify signature:

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  STRIPE_WEBHOOK_SECRET
);
```

**Handle events:**

**Event Types to Support:**

| Event | Behavior |
|-------|----------|
| `customer.subscription.created` | Create/update Subscription row |
| `customer.subscription.updated` | Update plan, status, period end |
| `customer.subscription.deleted` | Mark subscription as canceled |
| `invoice.paid` | Mark status as active |
| `invoice.payment_failed` | Mark status as past_due |

The webhook becomes the source of truth for subscription state.

### 10B.6. Frontend Billing Page Enhancements

**Location:** `apps/web/src/app/settings/billing/page.tsx`

**Add:**

**Buttons:**

- Upgrade Plan → calls `/billing/create-checkout-session`
- Manage Billing → calls `/billing/portal`

**Display:**

- Current plan
- Subscription status
- Next billing date
- Past due / canceled banners

### 10B.7. Stripe Customer Creation Logic

Inside `BillingService`:

```typescript
if (!subscription.stripeCustomerId) {
  const customer = await stripe.customers.create({
    email: user.email
  });
  save stripeCustomerId;
}
```

Prevents duplicates.

### 10B.8. Map Price IDs → Internal Plan Names

**Utility:**

```typescript
function mapPriceToPlan(priceId: string): "starter" | "pro" | "agency" {
  if (priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === env.STRIPE_PRICE_AGENCY) return "agency";
  throw new Error("Unknown price ID");
}
```

Used inside webhook handlers.

### 10B.9. Plan Enforcement Skeleton (Optional Now)

Add TODOs in:

- Project creation
- SEO scans
- Product sync limits
- AI usage

**Example:**

```typescript
// TODO: enforce plan limits
if (projectCount >= planConfig.maxProjects) {
  throw new ForbiddenException("Limit reached — upgrade your plan.");
}
```

### 10B.10. Testing Checklist (Stripe Test Mode)

**Test Scenarios:**

- Create user → upgrade to Starter
- Complete checkout using Stripe test cards
- Check webhook:
  - Subscription row created
  - Status active
- Cancel from Stripe Dashboard → webhook updates DB
- Upgrade/downgrade via Stripe Customer Portal
- Billing page updates in real time

### 10B.11. Live Mode Preparation

- Switch Stripe keys from test → live
- Add a live webhook endpoint in Stripe Dashboard
- Redeploy API to Render with live env vars
- Test live card payments with a $1 temporary plan
- Verify webhook events in production

### 10B.12. Deliverables

- Fully functional Stripe billing system
- Production-grade webhook processor
- Billing page integrated with real subscription state
- Proper environment configuration for Render & Vercel
- Full test-mode and live-mode validation
- Plan enforcement TODO hooks in place

---

# PHASE 10C — Add Free Tier + Plan Limits & Enforcement

**Goal:** Introduce a Free Tier that drives growth while protecting the platform from abuse. Includes new plan definitions, resource limits, backend enforcement logic, and upgrade UX.

### 10C.1. New Pricing Tier: FREE

**FREE ($0/mo)**

For early-stage stores evaluating SEOEngine.io.

**Included:**
- 1 project
- 10 synced products
- 50k AI tokens per month
- Basic homepage SEO audit only
- Up to 3 AI metadata generations per month
- Manual product sync (no background sync)

**Not included:**
- No automation features
- No product SEO auto-apply
- No AI blog generation
- No Shopify collection SEO
- No schema generator
- No social media posting
- No competitor insights
- No keyword tracking
- No scheduled jobs
- No backups
- Community support only

**Purpose:** Allow merchants to experience initial value and strongly push them toward the Starter plan.

### 10C.2. Updated Full Tier Structure

- **FREE** — $0
  - Limits focused on evaluation.
- **Starter** — $19
  - For small shops needing basic automation.
- **Pro** — $59
  - Most popular plan. Unlocks automation, schema, blog generation, competitor tools.
- **Agency** — $199
  - Unlimited usage with strong caps on AI to prevent abuse.

### 10C.3. Updated PLANS Configuration

Modify `apps/api/src/billing/plans.ts` to:

```typescript
export const PLANS = {
  free: {
    name: "Free",
    maxProjects: 1,
    maxProducts: 10,
    aiTokens: 50_000,
    aiMetadataGenerations: 3,
    features: {
      shopify: true,
      automation: false,
      aiContent: false,
      schema: false,
      social: false,
      competitor: false,
      keywordTracking: false,
      performance: "basic",
    },
  },

  starter: {
    name: "Starter",
    maxProjects: 3,
    maxProducts: 500,
    aiTokens: 200_000,
    aiMetadataGenerations: 50,
    features: {
      shopify: true,
      automation: true,
      aiContent: "limited",
      schema: "basic",
      social: false,
      competitor: false,
      keywordTracking: "basic",
      performance: "standard",
    },
  },

  pro: {
    name: "Pro",
    maxProjects: 10,
    maxProducts: 5000,
    aiTokens: 2_000_000,
    aiMetadataGenerations: 300,
    features: {
      shopify: true,
      automation: true,
      aiContent: "full",
      schema: "full",
      social: "basic",
      competitor: "full",
      keywordTracking: "full",
      performance: "advanced",
    },
  },

  agency: {
    name: "Agency",
    maxProjects: Infinity,
    maxProducts: Infinity,
    aiTokens: 10_000_000,
    aiMetadataGenerations: Infinity,
    features: {
      shopify: true,
      automation: true,
      aiContent: "full",
      schema: "full",
      social: "full",
      competitor: "full",
      keywordTracking: "full",
      performance: "advanced",
    },
  },
};
```

### 10C.4. Backend Plan Enforcement

Add middleware/guard: `PlanLimitGuard`

**Location:** `apps/api/src/billing/plan-limit.guard.ts`

**Functions to enforce limits:**

**1. Project Creation Limit**

Block new project creation:

```typescript
if (userProjectCount >= plan.maxProjects) {
  throw new ForbiddenException("Upgrade required");
}
```

**2. Product Sync Limit**

During product sync:

```typescript
if (existingProducts + incomingProducts > plan.maxProducts) {
  throw new ForbiddenException("Upgrade to sync more products");
}
```

**3. AI Token Usage**

Wrap AI calls:

```typescript
if (currentUsage.tokens + estimatedTokens > plan.aiTokens) {
  throw new ForbiddenException("You've used all monthly AI credits. Upgrade to continue.");
}
```

**4. AI Metadata Generation Count**

```typescript
if (metadataCount >= plan.aiMetadataGenerations) {
  throw new ForbiddenException("Upgrade to generate more metadata");
}
```

**5. Feature-based Access Control**

Before executing any feature-specific endpoints:

```typescript
if (!plan.features.aiContent) throw new ForbiddenException("Upgrade required");
if (plan.features.social !== "full") ...
```

### 10C.5. Monthly Usage Reset Cron Job

Add a cron job (Render Cron or worker):

- Resets monthly token usage
- Resets metadata generation counts
- Sends summary email

### 10C.6. Frontend Enforcement & Upsell UX

**Unified "Upgrade Required" Modal**

Create component: `apps/web/src/components/billing/UpgradeModal.tsx`

**Trigger it when:**
- User exceeds product sync limits
- User hits AI token cap
- User clicks a locked feature
- User tries to access forbidden pages

**Modal Text Example:**
> You've reached your plan's limit.  
> Upgrade to Starter to unlock more AI SEO features, product sync, and automation.

**Add "locked" UI states:**

For Free plan:
- Show greyed-out buttons
- Show tooltips: "Upgrade to unlock this feature"
- For menu items, show 🔒 icon

### 10C.7. Subscription Enforcement Middleware (Frontend)

In `apps/web/src/lib/subscription.ts`:

**Logic:**
- Fetch subscription on login
- Cache in global state
- On page render, check allowed features
- If locked → show upsell modal instead of the page

**Also add:**
- Auto redirect to `/billing` if subscription expired
- Yellow banner if user is near limits
- Red banner when out of credits

### 10C.8. Shopify Store Change Monitoring

Free Tier can monitor but cannot auto-apply.

**Rules:**

If the store adds new products:
- **Free tier:** notify + prompt upgrade
- **Starter & above:**
  - Summarize changes
  - Queue actions:
    - AI product metadata generation
    - Blog/social posting
    - Schema updates

Processing pipeline uses queues added later in Phase 17.

### 10C.9. Implementation Order

Follow this sequence:

1. Update PLANS config
2. Implement Prisma migration for usage tracking:
   - `MonthlyUsage` table
   - `MetadataGenerationLog`
3. Add backend guards
4. Add frontend upgrade modal
5. Add limit banners
6. Add locked feature UI
7. Add free plan copy to marketing pages
8. Test all limits
9. Test all upgrade flows
10. Launch free tier
11. Add metrics tracking (Mixpanel or PostHog)

### 10C.10. Acceptance Criteria

- Free users can sign up and use basic SEO audit
- Free users cannot abuse AI
- Free users cannot sync full product catalogs
- Users see clear upgrade prompts
- Backend prevents all misuse
- Billing pages reflect free tier properly
- Usage resets monthly
- All plan limits enforced cleanly

### 10C.11. Future Enhancements

- Free → Starter upgrade emails
- In-app "usage meter"
- Plan recommendation engine
- Shopify App Store automated upgrade pop-ups
---

### 10.3. Admin APIs

- `GET /admin/overview` → overall metrics.
- `GET /admin/users` → list users.
- `GET /admin/projects` → list projects.
- `GET /admin/subscriptions` → list subscriptions.

Protected with admin guard.

### 10.4. Admin UI

**Routes:**

- `/admin/layout.tsx` with its own side nav:
  - Overview → `/admin/overview`
  - Users → `/admin/users`
  - Projects → `/admin/projects`
  - Subscriptions → `/admin/subscriptions`
  - Usage (placeholder)
  - System Health (placeholder)

**Screens:**

- Overview: simple metrics cards.
- Users: table listing user info, link to their projects.
- Projects: table listing projects & owner.
- Subscriptions: table listing plan, status, next billing date.

**User (non-admin) Billing UI:**

- `/settings/billing` or `/billing`:
  - Show current plan, status, next billing date.
  - Button to "Manage subscription" (opens Stripe portal).

---

# PHASE 11 — Cloud Infrastructure & Production Deployment (Render + Vercel + Neon + Cloudflare + S3)

**Goal:** Deploy SEOEngine.io as a production-grade SaaS using:
- Neon for Postgres
- Render for the NestJS API
- Vercel for the Next.js frontend
- Cloudflare for DNS/SSL
- AWS S3 for DB backups
- Shopify app configured with production URLs

### 11.1. Neon (Production DB)

- Create a Neon project for production.
- Create a prod database and choose region near your main users (e.g. `us-east-1`).
- Get the `DATABASE_URL` connection string.
- In your local repo, create `.env.production` for API with:
  ```
  DATABASE_URL=postgres://...
  ```
- Run migrations against Neon from your local machine (once):
  ```
  cd apps/api
  npx prisma migrate deploy
  ```

### 11.2. Render – Backend (NestJS API)

**Create a new Render Web Service:**

- Connect to your GitHub repo.
- Root: repo root.
- Build command:
  ```
  pnpm install
  pnpm --filter api build
  ```
- Start command:
  ```
  pnpm --filter api start:prod
  ```

**Environment Variables in Render:**

```
NODE_ENV=production
DATABASE_URL=<Neon prod URL>
JWT_SECRET=...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_SCOPES=read_products,write_products
SHOPIFY_APP_URL=https://api.seoengine.io (once you set custom domain)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
OPENAI_API_KEY / GEMINI_API_KEY etc.
Any other secrets.
```

**Custom Domain:**

- In Render, add a custom domain: `api.seoengine.io`.
- Render will give you a CNAME to point to from Cloudflare.

### 11.3. Vercel – Frontend (Next.js 14)

**Create a new Vercel project:**

- Connect to the same GitHub repo.
- Set project root to `apps/web` or keep root and set the correct build command.

**Build & Output:**

- Build command:
  ```
  pnpm install
  pnpm --filter web build
  ```
- Output: `.next`

**Environment Variables:**

```
NEXT_PUBLIC_API_URL=https://api.seoengine.io
Public keys if needed (e.g., public Stripe key).
```

**Domain:**

- Map `app.seoengine.io` → this Vercel project.

### 11.4. Cloudflare – DNS & SSL

- Point your domain's nameservers to Cloudflare.
- In Cloudflare DNS:
  - CNAME `app` → Vercel provided domain.
  - CNAME `api` → Render provided domain (for `api.seoengine.io`).
  - A or CNAME for `seoengine.io` → your marketing site (could also be Vercel).
- SSL:
  - Use "Full (strict)" mode for HTTPS.
  - Add basic WAF rules:
    - Rate limit obvious abusive patterns.
    - Optionally protect `/admin` routes by country/IP for extra security.

### 11.5. AWS S3 – Periodic DB Backups

Even though Neon manages backups, we'll also create our own periodic logical dumps to S3.

- Create an AWS S3 bucket, e.g. `seoengine-db-backups-prod`.
- Create an AWS IAM user with:
  - Programmatic access.
  - Permissions to `s3:PutObject` on that bucket.
- Store credentials as env vars in Render (for a separate Cron Job or Worker):
  ```
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_REGION
  S3_BACKUP_BUCKET=seoengine-db-backups-prod
  ```
- Create a small backup script in `apps/api/scripts/backup-db.ts` that:
  - Runs `pg_dump` against `DATABASE_URL`.
  - Streams the result to S3 (gzip).
  - File naming: `db-backup-YYYY-MM-DDTHH-mm-ss.sql.gz`.
- Create a Render Cron Job or Background Worker:
  - Schedule: once per day or every 6–12 hours.
  - Command:
    ```
    pnpm install
    pnpm --filter api exec ts-node src/scripts/backup-db.ts
    ```
  - Ensure `pg_dump` is available (Render has Postgres CLI in most images; if not, include a container).

### 11.6. Shopify App (Production)

**In Shopify Partner Dashboard:**

- Set App URL → `https://api.seoengine.io/shopify/app-home` (or wherever you land merchants).
- Redirect URI → `https://api.seoengine.io/shopify/callback`.
- Ensure scopes match your backend config.
- Use production API key/secret in Render env vars.

**Test:**

- Install the app into a production dev store.
- Run through:
  - OAuth flow.
  - Product sync.
  - SEO updates.

### 11.7. Monitoring & Go-Live

- Add uptime monitoring (e.g. UptimeRobot) for:
  - `https://app.seoengine.io`
  - `https://api.seoengine.io/health`
- Enable basic logging & alerts (Render + Vercel dashboards).
- Soft launch with test users.
- Once stable, launch publicly:
  - Marketing site updated.
  - Shopify App listing updated.

✅ **COMPLETED** - Phase 11 implementation finished. Production deployment infrastructure, documentation, and backup script skeleton are in place.

---

# PHASE 12 — Advanced AI SEO Automation (Feature Set A)

(This is the same concept I outlined earlier as "Advanced SEO Automation Engine", now explicitly tied to your A list.)

**Goal:** Implement:
- Auto-fix technical SEO issues
- Auto-optimize metadata at scale
- Bulk image alt text & compression
- Internal linking suggestions
- Schema markup engine
- 1-click redirect manager

(I'll keep this abbreviated since you already saw the earlier breakdown; you can paste the previous detailed Phase 9 Automation plan here and label it Phase 12.)

**Key components (high level):**

- `UrlIssue` & `RedirectRule` models
- Enhanced crawler to detect:
  - Missing alt tags
  - Broken links
  - Missing schema
- AI endpoints for:
  - Generating alt text
  - Generating schema JSON-LD
  - Internal link suggestions
- UI:
  - Issues tab with filters and "Apply fix" actions
  - Redirect manager UI

---

# PHASE 13 — Content Intelligence & AI Generation (Feature Set B)

As described earlier:

- **Models:** `Keyword`, `ContentAsset`, `BrandSettings`
- **AI:**
  - Keyword clustering
  - Blog/landing/product content generators
  - Content scoring endpoint
- **UI:** "Content" & "Keywords" tabs with:
  - Keyword lists
  - Content editor with AI suggestions

---

# PHASE 14 — SEO Performance Monitoring (Feature Set D)

- **Models:** `PageMetric`, `KeywordRank`
- **Integrations:**
  - Google Search Console
  - Analytics (GA4)
- **UI:** "Performance" tab with charts and trend lines.

---

# PHASE 15 — Competitive Intelligence & Backlink Tools (Feature Sets E & F)

- **Models:** `Competitor`, `Backlink`
- **AI:**
  - Gap analysis report
  - Outreach email generator
- **UI:**
  - "Competitors" & "Backlinks" tabs.

---

# PHASE 16 — Local SEO Features (Feature Set G)

- **Models:** `Location`
- **AI:**
  - Local keyword suggestions
  - Local landing page templates
- **UI:**
  - "Local" tab with locations and local content ideas.

---

# PHASE 17 — Automation, Workflow & Social Media Integration (Feature Set H + Social)

**Goal:** Add scheduling, reporting, tasks, chatbot, and social media auto-posting (Facebook, Instagram, LinkedIn).

### 17.1. Automation & Tasks

**Models (as previously proposed):**

```prisma
model AutomationRule {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  name        String
  type        String   // "scheduled_scan", "weekly_report", "auto_apply_seo", "social_post"
  config      Json
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Task {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  title       String
  description String?
  status      String   // "open", "in_progress", "done"
  assignedTo  String?
  dueDate     DateTime?
  createdAt   DateTime @default(now())
}
```

**Backend:**

- Scheduler (cron/worker) that runs:
  - Regular SEO scans.
  - Weekly summary emails.
  - Auto-apply low-risk metadata fixes.

### 17.2. Social Media Integrations

**Models:**

```prisma
enum SocialProvider {
  FACEBOOK
  INSTAGRAM
  LINKEDIN
}

model SocialAccount {
  id           String         @id @default(cuid())
  project      Project        @relation(fields: [projectId], references: [id])
  projectId    String
  provider     SocialProvider
  accessToken  String
  refreshToken String?
  accountId    String?        // page or profile ID
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}
```

**Backend Integration:**

- OAuth flows for:
  - LinkedIn (Share on company page).
  - Facebook + Instagram via Meta Graph API (pages & Instagram Business accounts).
- Auto-posting use case (from your bullets):
  - When a new product is launched/imported from Shopify (Phase 5 sync), or when product SEO is updated:
    - Create a "post candidate" record (e.g., in `ContentAsset` with type `social_post`).
    - If an `AutomationRule` is set for social posting:
      - AI generates a short caption & optional hashtags.
      - Backend publishes to:
        - Facebook Page (product promo post).
        - Instagram (image + caption).
        - Optionally LinkedIn.
  - Provide controls:
    - "Auto-post immediately" vs "Review before posting".
- Endpoints:
  - `POST /social/connect/:provider` → initiates OAuth.
  - `POST /social/disconnect/:provider`.
  - `POST /social/test-post` (for debugging).
  - `POST /automation/social-product-post` (internal usage by automation jobs).

**Frontend:**

- In project Settings → new tab "Social & Sharing":
  - Connect/disconnect buttons for LinkedIn, Facebook, Instagram.
  - Show which accounts are linked.
- In Automation tab:
  - Rule builder: "When new product synced → Generate + publish social post to Facebook & Instagram."
- In Products list:
  - Optional "Post to social" button per product (manual trigger).

### 17.3. AI SEO Assistant Chatbot

- **Backend endpoint:** `POST /ai/assistant`:
  - Input: `projectId`, `message`.
  - Uses project data (issues, products, metrics) to answer.
- **Frontend:**
  - Chat UI in the project Overview or "Assistant" panel.
  - Focus on answering "what should I do next?" and "summarize my SEO health this week".

### 17.4. Automated Reporting

- Weekly email report per project:
  - Summary of:
    - SEO score changes
    - Issues resolved / new issues
    - Top pages/products changes
    - Social posts published (if enabled)
  - Configured via `AutomationRule`.

---

# PHASE 18 — Account Security Enhancements

**Goal:** Add password resets, backup codes, and user profile management.

### 18.1. Password Reset (Forgot Password Flow)

#### 18.1.1. Backend (NestJS API)

Add new module: `password-reset`

**Routes:**

**POST /auth/password/forgot**

- **Input:** `{ email }`
- **Behavior:**
  - Generate secure reset token (random UUID).
  - Store hashed token in DB with expiration (e.g., expires in 60 min).
  - Email user a reset link: `https://app.seoengine.io/reset-password?token=<token>`
  - Return: `{ success: true }`

**POST /auth/password/reset**

- **Input:** `{ token, newPassword }`
- **Steps:**
  - Validate token + expiration.
  - Update password (bcrypt hash).
  - Invalidate token.
  - Return: `{ success: true }`

**DB Changes (Prisma):**

Add table:

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

#### 18.1.2. Frontend (Next.js)

**Routes:**
- `/forgot-password`
- `/reset-password?token=...`

**UI:**
- Step 1: enter email
- Step 2: enter new password

**Security:**
- Success messages should be generic (do not reveal whether email exists)
- Token stored only in URL; never saved in localStorage

### 18.2. Backup Codes (architecture now, UI later)

#### 18.2.1. Backend

Add to User model:

```prisma
backupCodes Json? // array of hashed codes
```

When enabling 2FA:
- Generate 10 one-time 8-digit codes.
- Hash and store them in DB.
- Display plaintext once to the user.

Add endpoint:
- `POST /auth/2fa/consume-backup-code`

#### 18.2.2. Frontend

Add section in `/settings/security`:
- "Download backup codes"
- "Regenerate backup codes"

### 18.3. User Profile Management

#### 18.3.1. Backend

Add endpoint:
- `PATCH /users/me`

**Updatable fields:**
- `name`
- `email` (future)
- `company`
- `avatar` (future)

#### 18.3.2. Frontend

**Page:** `/settings/profile`

**Form fields:**
- Name
- Company
- (Email is read-only unless verification added later)

---

# PHASE 19 — Subscription Management + Hard Enforcement

**Goal:** Allow users to manage subscriptions and enforce plan limits strictly.

### 19.1. Allow Users to Manage Subscription

#### 19.1.1. Add /billing page

**Shows:**
- Current plan
- Usage meters (products synced, AI tokens, projects)
- Renewal date
- "Upgrade plan"
- "Cancel subscription"
- If using Stripe: "Manage in Stripe Portal"

**Backend:**
- Add `GET /billing/usage`
- Add `GET /billing/limits` (returns plan limits)
- Add Stripe portal endpoint (Phase 10B)

### 19.2. Enforcement Middleware (Backend)

Create middleware `SubscriptionLimitGuard`:

**Runs on protected API routes such as:**
- `/shopify/sync-products`
- `/ai/*`
- `/projects`
- `/products`
- `/automation/*`

**Checks:**
- User subscription plan
- Usage stats
- Remaining quota

**If exceeded:**

Return structured error:

```json
{
  "error": "LIMIT_EXCEEDED",
  "limit": "PRODUCT_LIMIT",
  "message": "You've reached your product sync limit for your plan.",
  "upgradeUrl": "/pricing"
}
```

---

# PHASE 20 — Store Monitoring & Automated Actions

**Goal:** Implement an event-driven Shopify monitoring engine. This is one of your strongest differentiators.

### 20.1. Detecting Store Changes

**Two approaches:**

**A) Shopify Webhooks (recommended)**

Register webhooks:
- `products/create`
- `products/update`
- `collections/create`
- `blogs/create`
- `articles/create`
- `orders/create` (optional for promotions)
- `price_rules/create` (for promotions)

**Webhook endpoint:**
- `POST /shopify/webhooks/:topic`

**B) Periodic Polling (fallback)**

Every 15–60 mins:
- Compare hash of product list, blog list, price rules
- Detect changes

### 20.2. Queue Detected Events

Create new table:

```prisma
model StoreEvent {
  id          String   @id @default(cuid())
  projectId   String
  type        String   // PRODUCT_CREATED, BLOG_CREATED, PROMO_CREATED, etc.
  payload     Json     // raw Shopify data
  processed   Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

### 20.3. Automated Action Engine

For each new event:

**(A) New Product Created**

Queue tasks:
- AI-generate:
  - product SEO title
  - product SEO description
  - alt text for images
- Push updates back to Shopify
- Post to all connected social accounts:
  - Instagram
  - Facebook
  - LinkedIn

**(B) New Blog Post Created**

- Summarize blog post
- Generate social post caption
- Auto-publish to social accounts

**(C) New Promotion / Sale Rule**

- Generate promo announcement post
- Push to connected networks

#### 20.3.1. Task Scheduler

Create:

```prisma
model AutomationTask {
  id        String   @id @default(cuid())
  projectId String
  type      String    // AUTO_PRODUCT_SEO, AUTO_SOCIAL_POST
  payload   Json
  status    String @default("pending")
  createdAt DateTime @default(now())
  runAt     DateTime @default(now())
}
```

**Worker cron:**
- Runs every minute
- Processes pending tasks
- Handles retries & exponential backoff

---

# PHASE 21 — Blog Auto-Scheduling System

**Goal:** Automate blog post generation and publishing on a schedule.

### 21.1. User UI for Auto Blog Posting

**Page:** `/projects/[id]/automation/blog-scheduler`

**Fields:**
- List of topic ideas
- **Frequency:**
  - Daily
  - Weekly
  - Biweekly
  - Monthly
- **Post destination:**
  - Shopify blog
  - External CMS (future)

### 21.2. Backend Scheduler

**New table:**

```prisma
model BlogSchedule {
  id          String   @id @default(cuid())
  projectId   String
  topics      Json     // array of strings
  frequency   String // DAILY/WEEKLY/MONTHLY
  nextRun     DateTime
  createdAt   DateTime @default(now())
}
```

**Cron job:**
- Runs every hour
- If `nextRun <= now`:
  - Pick next topic
  - Generate blog using AI
  - Publish to Shopify
  - Generate social media caption
  - Auto-post to socials
  - Update `nextRun` to next interval

---


# 
# PHASE 22 — Advanced Pricing Tiers & Monetization for High-Cost AI Features

**Goal:** Introduce advanced pricing tiers and add-ons for compute-heavy, high-value capabilities (Phases 23–30) so you can monetize them properly and protect AI/infra costs.

This phase does **not** change core product behavior yet — it defines the pricing architecture, data model, and enforcement hooks that later phases (23–30) will plug into.

### 22.1. Scope of “Advanced Features”

Advanced features that should **not** be bundled into base Pro/Agency plans by default:

- Phase 23 — AI Competitor Intelligence Dashboard
- Phase 24 — AI SEO Opportunity Engine (if added)
- Phase 25 — Technical SEO Theme Audit
- Phase 26 — CRO AI Engine & UX Suggestions
- Phase 27 — A/B Testing & Experimentation
- Phase 28 — Review Mining & VoC Insights
- Phase 29 — Marketplace SEO (Amazon/Etsy/etc.)
- Phase 30 — AI Video & Social Content Studio

These will be gated behind **add-ons** layered on top of base plans (Free/Starter/Pro/Agency).

### 22.2. Pricing Model Overview

Base subscription tiers from Phase 10C remain:

- **Free** — Evaluation tier
- **Starter** — Small shops
- **Pro** — Growing brands
- **Agency** — High-volume stores / agencies

On top of these, introduce the following **add-on products**:

1. **Enterprise Suite Add-On** (for Phases 23–28)
   - Includes:
     - Competitor dashboard
     - AI opportunity engine
     - Theme technical audits
     - CRO recommendations
     - A/B testing
     - Review mining
   - Price range (for Stripe configuration; actual prices set in dashboard):
     - +$99–$149/mo on top of Pro
     - +$149–$199/mo on top of Agency

2. **Marketplace SEO Add-On**
   - Includes:
     - Amazon/Etsy integration
     - Listing sync
     - AI listing optimization
     - Marketplace SEO scoring
   - Pricing:
     - $29–$49/mo per marketplace (e.g. Amazon, Etsy)
     - Bundle option: $79–$99/mo for “All marketplaces”

3. **AI Video & Social Studio Add-On**
   - Includes:
     - AI short-form video templates
     - Auto-caption + hashtags
     - Auto-posting scheduler to social networks
   - Pricing:
     - $29/mo starter usage
     - $49–$59/mo heavier usage (higher AI token pool and posting limits)

4. **Competitor & CRO Bundle Add-On**
   - For users who want competitor tools & CRO, but not marketplaces or video.
   - Includes:
     - Competitor dashboard
     - Keyword overlap & gaps
     - CRO suggestions
     - A/B testing
   - Pricing:
     - $49–$79/mo, only available on top of Pro/Agency

5. **AI Usage Add-Ons (Optional, later)**
   - Buy more AI usage without upgrading plan:
     - +500k tokens → $10
     - +2M tokens → $29
   - Buy more product sync capacity:
     - +1,000 products → $9
     - +5,000 products → $29

(Exact price points will be finalized directly in Stripe Dashboard; the code only needs to map price IDs to internal add-on types.)

### 22.3. Data Model Extensions (Prisma)

Extend billing schema to support add-ons independent of base subscription.

**Step 1 — Add enum:**

```prisma
enum AddonType {
  ENTERPRISE_SUITE
  MARKETPLACE_SEO
  AI_VIDEO_STUDIO
  COMPETITOR_CRO
  EXTRA_AI_TOKENS
  EXTRA_PRODUCTS
}
```

**Step 2 — Add SubscriptionAddon model:**

```prisma
model SubscriptionAddon {
  id             String      @id @default(cuid())
  user           User        @relation(fields: [userId], references: [id])
  userId         String
  type           AddonType
  stripePriceId  String?     // price that created this addon
  status         String      // "active", "canceled", "past_due"
  quantity       Int         @default(1) // for usage-based addons like EXTRA_AI_TOKENS
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

**Step 3 — Migration**

- Update `schema.prisma` as above.
- Run:
  ```bash
  npx prisma migrate dev --name add_subscription_addons
  ```

### 22.4. Backend Plan & Add-On Configuration

Extend `apps/api/src/billing/plans.ts`:

1. Keep `PLANS` as defined in Phase 10C (including Free).
2. Introduce a new `ADDONS` config object:

```typescript
export const ADDONS = {
  enterpriseSuite: {
    type: "ENTERPRISE_SUITE" as const,
    name: "Enterprise Suite",
    description: "Competitors, CRO, A/B tests, review mining, and advanced insights.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_ENTERPRISE_SUITE",
    // Soft limits for advanced features (can be tuned later)
    limits: {
      competitorDomains: 10,
      abTestsPerMonth: 20,
      themeAuditsPerMonth: 4,
      reviewMiningRunsPerMonth: 20,
    },
  },
  marketplaceSeo: {
    type: "MARKETPLACE_SEO" as const,
    name: "Marketplace SEO",
    description: "AI SEO for Amazon, Etsy, and other marketplaces.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_MARKETPLACE_SEO",
    // Per-marketplace limits applied elsewhere
  },
  aiVideoStudio: {
    type: "AI_VIDEO_STUDIO" as const,
    name: "AI Video & Social Studio",
    description: "AI-generated product videos and social posts.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_AI_VIDEO_STUDIO",
    limits: {
      videosPerMonth: 50,
      socialPostsPerMonth: 200,
    },
  },
  competitorCro: {
    type: "COMPETITOR_CRO" as const,
    name: "Competitor & CRO Bundle",
    description: "Competitor intel, CRO suggestions, and experiments.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_COMPETITOR_CRO",
  },
  extraAiTokens: {
    type: "EXTRA_AI_TOKENS" as const,
    name: "Extra AI Tokens",
    description: "Additional AI credits on top of your plan.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_EXTRA_AI_TOKENS",
  },
  extraProducts: {
    type: "EXTRA_PRODUCTS" as const,
    name: "Extra Product Capacity",
    description: "Sync more products without changing your base plan.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_EXTRA_PRODUCTS",
  },
} as const;
```

3. Expose helper functions:
   - `getPlanForUser(userId)`
   - `getActiveAddonsForUser(userId)`
   - `hasAddon(userId, AddonType.ENTERPRISE_SUITE)`

### 22.5. Stripe Integration for Add-Ons

Extend Phase 10B’s Stripe Billing implementation:

1. **Environment Variables:**

Add to Render/Vercel:

- `STRIPE_PRICE_ADDON_ENTERPRISE_SUITE`
- `STRIPE_PRICE_ADDON_MARKETPLACE_SEO`
- `STRIPE_PRICE_ADDON_AI_VIDEO_STUDIO`
- `STRIPE_PRICE_ADDON_COMPETITOR_CRO`
- `STRIPE_PRICE_ADDON_EXTRA_AI_TOKENS`
- `STRIPE_PRICE_ADDON_EXTRA_PRODUCTS`

2. **Create Checkout Sessions for Add-Ons**

Add endpoint:

- `POST /billing/addons/create-checkout-session`

Body:

```json
{
  "addonType": "ENTERPRISE_SUITE" | "MARKETPLACE_SEO" | "AI_VIDEO_STUDIO" | "COMPETITOR_CRO" | "EXTRA_AI_TOKENS" | "EXTRA_PRODUCTS",
  "quantity": 1
}
```

Behavior:

- Auth user
- Find Stripe customer (create if missing)
- Resolve price ID from `ADDONS[addonKey].stripePriceEnvKey`
- Create Checkout Session in subscription mode (or usage mode for usage add-ons)
- Return `session.url`

3. **Update Webhook Handler**

- When receiving `customer.subscription.updated` or `invoice.payment_succeeded` for add-on price IDs:
  - Map `price.id` to `AddonType`
  - Upsert `SubscriptionAddon` row for that user
  - Update status to `active`
- When receiving `customer.subscription.deleted` or `invoice.payment_failed`:
  - Mark `SubscriptionAddon.status` as `canceled` or `past_due`

### 22.6. Feature Gating Using Add-Ons

Reuse and extend the limit/enforcement logic from Phase 10C & 19.

**Backend helpers:**

Create `BillingAccessService`:

- `canUseFeature(userId, featureKey: string): boolean`
- `assertFeatureAccess(userId, featureKey: string): void` (throws if not allowed)

Map feature keys to required add-on:

- `"competitor.dashboard"` → requires `ENTERPRISE_SUITE` or `COMPETITOR_CRO`
- `"opportunity.engine"` → requires `ENTERPRISE_SUITE`
- `"theme.audit"` → requires `ENTERPRISE_SUITE`
- `"cro.suggestions"` → requires `ENTERPRISE_SUITE` or `COMPETITOR_CRO`
- `"abtesting"` → requires `ENTERPRISE_SUITE` or `COMPETITOR_CRO`
- `"review.mining"` → requires `ENTERPRISE_SUITE`
- `"marketplace.amazon"` / `"marketplace.etsy"` → requires `MARKETPLACE_SEO`
- `"ai.video.studio"` → requires `AI_VIDEO_STUDIO`

Then, in each advanced feature controller (Phases 23–30), call:

```typescript
this.billingAccess.assertFeatureAccess(userId, "competitor.dashboard");
```

Return structured error if lacking:

```json
{
  "error": "ADDON_REQUIRED",
  "addonType": "ENTERPRISE_SUITE",
  "message": "This feature is part of the Enterprise Suite add-on. Upgrade your plan to continue."
}
```

### 22.7. Frontend: Pricing Page & Upsell UX

**Pricing Page (`/pricing`):**

- Under main plans, add a section: **“Advanced Add-Ons”**
  - Cards for:
    - Enterprise Suite
    - Marketplace SEO
    - AI Video Studio
    - Competitor & CRO
  - Each card:
    - Short description
    - “Requires Pro or Agency” label (where applicable)
    - “Talk to sales” or “Add to plan” CTA

**Billing Settings Page (`/settings/billing`):**

- Show:
  - Base plan
  - Current add-ons with status
  - Buttons:
    - “Add Enterprise Suite”
    - “Add Marketplace SEO”
    - “Add AI Video Studio”
- Clicking opens flow:
  - Calls `/billing/addons/create-checkout-session`
  - Redirects to Stripe Checkout

**Feature-Level Upsell Modals:**

- When user on Pro/Agency clicks locked content (e.g. Competitors tab without add-on):
  - Show modal:
    - Explains feature
    - Shows price (from config)
    - Button → “Unlock with Enterprise Suite”
    - On click → start add-on checkout session

### 22.8. Analytics & Safeguards

- Track in-product events (later, with PostHog/Mixpanel):
  - Add-on viewed
  - Add-on checkout started
  - Add-on purchased
- Add basic guardrails:
  - Don’t show add-on upsell to Free users until they upgrade to Starter/Pro
  - For Free users, first upsell path:
    - Free → Starter/Pro
    - Then → add-on

### 22.9. Implementation Order

1. Update Prisma schema: `AddonType` + `SubscriptionAddon`.
2. Implement `ADDONS` config and helper functions.
3. Extend Stripe config and webhook handling for add-ons.
4. Implement `/billing/addons/create-checkout-session`.
5. Add `BillingAccessService` and feature gating helper.
6. Wire gating into advanced feature endpoints (as they are built in Phases 23–30).
7. Update `/pricing` and `/settings/billing` UI for add-on visibility and purchase.
8. Implement upsell modals on locked advanced features.
9. Smoke-test add-on purchase + access end-to-end in Stripe test mode.

### 22.10. Acceptance Criteria

- Users can view and understand advanced add-ons from the pricing page.
- Pro/Agency users can purchase add-ons through Stripe.
- Add-ons are reflected correctly in the database (`SubscriptionAddon` rows).
- Advanced features are **blocked** without the correct add-on and **unlocked** once purchased.
- Errors when lacking access are friendly and lead users to an upsell path.
- System is designed to prevent AI/compute abuse by requiring paid add-ons for heavy features.

---

# PHASE 23 — AI Competitor Intelligence Dashboard

**Goal:** Turn competitive research into a first-class, data-backed feature that shows merchants where they can win: which competitors to watch, which keywords they’re losing, and which pages to build next.

This phase deepens and extends the earlier competitive intelligence models from Phase 15.

### 23.1. Data Model Extensions (Prisma)

Build on the existing `Competitor` model introduced in Phase 15.

Update `schema.prisma` (if not already present or to extend):

```prisma
model Competitor {
  id          String                 @id @default(cuid())
  project     Project                @relation(fields: [projectId], references: [id])
  projectId   String
  domain      String
  label       String?
  createdAt   DateTime               @default(now())
  updatedAt   DateTime               @updatedAt

  snapshots   CompetitorSnapshot[]
}

model CompetitorSnapshot {
  id            String      @id @default(cuid())
  competitor    Competitor  @relation(fields: [competitorId], references: [id])
  competitorId  String
  takenAt       DateTime    @default(now())
  estTraffic    Int?
  estRevenue    Float?
  topKeywords   Json?       // aggregated keyword stats
  topPages      Json?       // URLs + metrics
}
```

Run migration:

```bash
npx prisma migrate dev --name competitor_intel_models
```

### 23.2. Competitor Discovery & Input

**Backend:**

- Endpoint: `POST /projects/:id/competitors`
  - Body: `{ domain: string, label?: string }`
  - Validates ownership.
- Endpoint: `GET /projects/:id/competitors`
  - Returns list of competitors for the project.

Optionally:
- Endpoint: `POST /projects/:id/competitors/discover`
  - Uses AI + search to suggest 3–5 competitors based on:
    - project domain
    - existing keywords (if available)
    - Shopify category

### 23.3. Competitor Snapshot Service

Create module: `apps/api/src/competitor-intel`:

- `competitor-intel.module.ts`
- `competitor-intel.service.ts`
- `competitor-intel.controller.ts`

**Service responsibilities:**

- Given a competitor domain:
  - Query external SEO APIs (or internal crawler when added later) for:
    - Estimated organic traffic
    - Top keywords (+ positions, volume)
    - Top ranking pages (URL, title, est traffic)
  - Use AI to:
    - cluster keywords by theme
    - guess revenue segments (low confidence but directional)
  - Save a `CompetitorSnapshot` record.

**Endpoints:**

- `POST /competitors/:id/snapshot`
  - Triggers a snapshot for a single competitor.
- `POST /projects/:id/competitors/snapshot-all`
  - Triggers snapshots for all competitors for that project (queued job in future).

### 23.4. AI Competitor Report Generation

Add an AI endpoint:

- `POST /ai/competitor-report`

**Body:**

```json
{
  "projectId": "string"
}
```

**Steps:**

1. Load project competitors + latest snapshots.
2. Load project’s own SEO metrics from:
   - Crawl results
   - Product SEO data
3. Ask AI to generate:
   - “Where you’re behind”
   - “Quick wins”
   - “Long-term content strategy”
   - “Product / category gaps to fill”

Return:

```json
{
  "summary": "High-level findings",
  "opportunities": [
    {
      "title": "Own 'eco-friendly yoga mats'",
      "impact": "high",
      "difficulty": "medium",
      "recommendations": ["Create a category page...", "Publish 2 blogs on..."]
    }
  ],
  "recommendedContentIdeas": [...],
  "recommendedProductIdeas": [...]
}
```

### 23.5. Competitors UI (`/projects/[id]/competitors`)

Enhance the existing Competitors tab:

- Table of competitors:
  - Domain
  - Label
  - Last snapshot
  - Est. traffic
  - Est. visibility vs your site
- Snapshot detail view:
  - List of top competitor keywords vs your ranking (if known)
  - Top pages with quick "View in SERP" link
- “AI Competitor Report” button:
  - Calls `/ai/competitor-report`
  - Shows an insight panel with:
    - Key findings
    - Recommended actions
    - Links to:
      - Create new content assets (Phase 13)
      - Create tasks/automations (Phase 17)


---

# PHASE 24 — AI SEO Opportunity Engine

**Goal:** Build an “AI growth brain” that surfaces the highest-impact actions for each project and turns your existing data into a prioritized to-do list.

### 24.1. SEO Opportunity Model

Add to `schema.prisma`:

```prisma
model SeoOpportunity {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  type        String   // "content", "product_seo", "technical", "internal_linking", etc.
  title       String
  description String
  priority    String   // "low", "medium", "high", "urgent"
  impactScore Int      // 1–100, estimated impact
  effortScore Int      // 1–100, estimated effort
  source      String?  // e.g., "competitor_intel", "crawl", "ai_insight"
  status      String   @default("open") // "open", "in_progress", "done", "dismissed"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Run migration:

```bash
npx prisma migrate dev --name seo_opportunity_model
```

### 24.2. Opportunity Generation Engine

Backend module: `apps/api/src/seo-opportunities`

Sources of signals:

- Crawl results (Phase 3)
- AI metadata suggestions (Phase 4)
- Products & their SEO status (Phase 5–6)
- Competitor intel (Phase 23)
- Performance metrics (Phase 14, in future)

**Service:**

- `SeoOpportunitiesService.generateForProject(projectId: string)`:
  - Fetches relevant data.
  - Calls an AI model with:
    - issues
    - competitor gaps
    - rankings
    - product catalog shape
  - AI returns a prioritized list of opportunities.
  - Upserts records in `SeoOpportunity` table.

**Endpoint:**

- `POST /projects/:id/seo-opportunities/generate`
  - Auth: JWT + ownership
  - Triggers generation and returns latest list.

- `GET /projects/:id/seo-opportunities`
  - Query parameters: `status`, `type`, `sort=impactScore` etc.

- `PATCH /seo-opportunities/:id`
  - Update status (`done`, `dismissed`, etc.)

### 24.3. UI — “Opportunities” Panel

Integrate into:

- Project Overview page
- Issues tab or new “Opportunities” sub-tab

Features:

- List of opportunities with:
  - Type badge (Content / Product SEO / Technical / etc.)
  - Impact vs Effort (displayed as a 2D indicator or text like “High impact · Low effort”)
- Filters:
  - By type
  - By priority
  - By status
- Actions:
  - “Mark as done”
  - “Create Task” (Phase 17 Task model)
  - “Auto-fix” (where possible, e.g., metadata)

Use this as the “home feed” of what to do next.

---

# PHASE 25 — AI Technical SEO Template Optimizer

**Goal:** Move beyond diagnostics and give merchants AI-assisted recommendations for theme-level fixes to performance and technical SEO issues.

> **Important:** For MVP, do NOT directly modify theme code automatically. Instead, generate actionable diffs/instructions developers can apply manually or via a safe review step.

### 25.1. Technical Theme Scan

Create a module: `apps/api/src/theme-audit`

**Inputs:**

- Storefront URLs (home, popular collections, product pages)
- Shopify theme metadata (via Shopify API if available)

**Service tasks:**

- Fetch page HTML + performance timings (LCP, TTFB approximations).
- Detect:
  - render-blocking scripts
  - heavy JavaScript bundles
  - unused CSS patterns
  - unoptimized images
  - missing preload/preconnect hints

Store summary into a new model:

```prisma
model ThemeAudit {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  themeName   String?
  shopDomain  String?
  findings    Json     // structured list of issues
  createdAt   DateTime @default(now())
}
```

### 25.2. AI Theme Optimization Suggestions

AI endpoint:

- `POST /ai/theme-optimizer`

**Body:**

```json
{
  "projectId": "string",
  "themeAuditId": "string"
}
```

**Steps:**

1. Load `ThemeAudit` findings.
2. Ask AI to generate:
   - Summary of main technical bottlenecks
   - Recommended Liquid/JS/CSS changes (at a snippet level)
   - Priority ordering

Return:

```json
{
  "summary": "...",
  "recommendations": [
    {
      "title": "Defer non-critical JS",
      "description": "...",
      "codeExamples": [
        {
          "before": "<script src=\"/app.js\"></script>",
          "after": "<script src=\"/app.js\" defer></script>"
        }
      ],
      "impact": "high"
    }
  ]
}
```

### 25.3. UI — Technical SEO Panel

Add a new section under:
- `/projects/[id]/issues` or `/projects/[id]/performance`

Features:

- Run Theme Audit button.
- List of technical issues grouped by type.
- For each item:
  - AI-generated explanation in plain English.
  - Code suggestion snippet.
  - “Copy code” button.

Future:
- Approve-and-apply flow that integrates with Shopify theme API and a safe staging workflow.

---

# PHASE 26 — AI Conversion Rate Optimization (CRO) Engine

**Goal:** Use AI to analyze product and landing pages for conversion potential, not just SEO, and propose concrete improvements.

### 26.1. CRO Analysis Endpoint

Backend module: `apps/api/src/cro`

**Endpoint:** `POST /cro/analyze-page`

**Body:**

```json
{
  "projectId": "string",
  "url": "https://...",
  "type": "product" | "collection" | "landing"
}
```

**Steps:**

1. Fetch page HTML and basic metrics.
2. Extract:
   - Headlines
   - Product info (price, variants, reviews)
   - CTAs
   - Trust elements
3. Send to AI:

Prompt includes best practices for CRO in eCommerce.

**Response:**

```json
{
  "summary": "Overall CRO assessment",
  "score": 0-100,
  "issues": [
    {
      "type": "cta_visibility",
      "severity": "high",
      "description": "Primary CTA is below the fold...",
      "suggestedChange": "Move 'Add to Cart' above the fold..."
    }
  ],
  "copySuggestions": {
    "headline": "New headline suggestion",
    "subheadline": "New subheadline",
    "bulletPoints": [...]
  },
  "layoutSuggestions": [...]
}
```

### 26.2. Product CRO Review UI

On `/projects/[id]/products`:

- Add “CRO Review” action for each product.
- Modal shows:
  - CRO score
  - Top 3 improvements
  - Suggested hero copy
  - Suggested benefit bullets
- Allow user to:
  - Copy suggestions
  - Create a Task (Phase 17) from any issue.

---

# PHASE 27 — A/B Testing Framework (UX + AI Variant Generator)

**Goal:** Let merchants test AI-suggested variants of titles, descriptions, and hero sections, while keeping technical implementation lightweight.

### 27.1. Data Model

Add:

```prisma
model AbTest {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  targetType  String   // "product_page", "landing_page"
  targetId    String   // externalId or URL
  name        String
  status      String   @default("draft") // "draft", "running", "completed"
  variantA    Json     // baseline content
  variantB    Json     // AI-generated content
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

(Tracking conversions may integrate with GA4 or Shopify analytics later.)

### 27.2. Variant Generation

AI endpoint:

- `POST /ai/abtest/generate-variant`

**Body:**

```json
{
  "projectId": "string",
  "targetType": "product_page",
  "targetId": "product-id-or-url"
}
```

**Steps:**

1. Fetch existing title, hero, copy.
2. Ask AI for:
   - Variant B (alternate headline, bullets, description) optimized for conversions.

### 27.3. UI for A/B Experiments

In product detail or content pages:

- Button: “Create A/B Test”
- Workflow:
  1. Show baseline content (Variant A).
  2. Generate Variant B via AI.
  3. Allow merchant to edit Variant B.
  4. Show instructions on how to manually implement variants in Shopify (MVP).
  5. Save test as `draft` with both variants stored.

Later phases can integrate automatically with storefront rendering and analytics.

---

# PHASE 28 — AI Review Mining & SEO Enrichment

**Goal:** Turn reviews into SEO and conversion assets.

### 28.1. Data Model (Optional Cache)

```prisma
model ProductReviewSummary {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  productId   String
  source      String   // "shopify", "judge.me", etc.
  summary     String
  pros        Json     // list of pros
  cons        Json     // list of cons
  themes      Json     // grouped insights
  keywords    Json     // SEO-relevant terms
  createdAt   DateTime @default(now())
}
```

### 28.2. Review Ingestion

- Integrate with Shopify product reviews API or third-party review app APIs where possible (Judge.me, Loox – future).
- Fetch latest N reviews per product.
- Store a raw snapshot or feed them directly into AI.

### 28.3. AI Review Mining Endpoint

`POST /ai/reviews/summarize-product`

**Body:**

```json
{
  "projectId": "string",
  "productId": "string"
}
```

**Response:**

```json
{
  "summary": "What customers love and hate",
  "pros": ["Comfortable", "Durable"],
  "cons": ["Runs small"],
  "seoKeywords": ["sustainable yoga mat", "non-slip", "eco-friendly"],
  "copySuggestions": {
    "description": "AI-suggested description using real language from reviews",
    "headline": "Loved for its grip and eco-friendly materials"
  }
}
```

### 28.4. UI Integration

On `/projects/[id]/products`:

- Add “Review Insights” action.
- Show:
  - Summary
  - Pros/cons
  - SEO keyword suggestions
  - Button “Apply to Description” (Phase 6 integration to push to Shopify).

---

# PHASE 29 — Multi-Marketplace SEO (Amazon, Etsy, Later Walmart)

**Goal:** Help merchants optimize product SEO across Shopify and major marketplaces from one place.

### 29.1. Integration Model Extensions

Extend `IntegrationType` enum:

```prisma
enum IntegrationType {
  SHOPIFY
  AMAZON
  ETSY
  // future: WALMART, EBAY, etc.
}
```

Use the existing `Integration` model:

- For Amazon:
  - `externalId` → Amazon Seller ID or store ID
  - `config` → auth tokens, marketplace region
- For Etsy:
  - `externalId` → Shop ID

Run migration:

```bash
npx prisma migrate dev --name add_marketplace_integration_types
```

### 29.2. Marketplace Connection Flows

Backend modules (future):

- `amazon-integration`
- `etsy-integration`

Each should support:

- OAuth / API credential storage
- Basic account info fetch
- Listing retrieval

### 29.3. Cross-Channel Product Mapping

Reuse `Product` model:

- `source` field (IntegrationType) differentiates Shopify vs Amazon vs Etsy.

Add helper:

- Endpoint: `GET /projects/:id/products/marketplaces`
  - Returns list of products with mapping:
    - Shopify product
    - Amazon listing (if any)
    - Etsy listing (if any)

### 29.4. Marketplace SEO Suggestions (MVP)

AI endpoints:

- `POST /ai/marketplace/amazon-metadata`
- `POST /ai/marketplace/etsy-metadata`

**Inputs:**
- product data (title, description, specs)
- marketplace-specific rules (character limits, bullet style)

**Outputs:**
- Amazon:
  - optimized title
  - 5 bullets
  - backend keywords
- Etsy:
  - title
  - tags
  - description

UI:

- New tab on product detail: “Marketplace SEO”
- Future: push changes via marketplace APIs.

---

# PHASE 30 — AI Video & Social Content Engine

**Goal:** Deepen social + content automation with short-form video scripts, captions, and campaign bundles, building on Phase 17’s social integrations.

### 30.1. Data Model: SocialContentAsset

```prisma
model SocialContentAsset {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  type        String   // "instagram_post", "tiktok_script", "reel", "youtube_description"
  source      String   // "product_launch", "blog_post", "promo", "manual"
  payload     Json     // structured fields (caption, script, hashtags, etc.)
  status      String   @default("draft") // "draft", "scheduled", "published"
  scheduledAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 30.2. AI Social & Video Script Generator

Endpoint:

- `POST /ai/social/generate`

**Body:**

```json
{
  "projectId": "string",
  "contextType": "product" | "blog" | "promo",
  "contextId": "string",
  "channels": ["instagram", "tiktok", "facebook", "linkedin"]
}
```

**Response:**

```json
{
  "assets": [
    {
      "type": "tiktok_script",
      "script": "Hook, problem, solution, CTA...",
      "durationSec": 30,
      "cta": "Shop now at..."
    },
    {
      "type": "instagram_post",
      "caption": "...",
      "hashtags": ["#shopify", "#ecofriendly"],
      "cta": "Link in bio."
    }
  ]
}
```

Save as `SocialContentAsset` records.

### 30.3. Scheduling & Publishing (Build on Phase 17)

- Reuse `AutomationRule` and task workers.
- Allow user to:
  - Manually schedule posts.
  - Use rules like:
    - “When new product added → generate social bundle and suggest schedule.”
- For each connected social account (Phase 17):
  - Provide UI:
    - “Publish now”
    - “Schedule”
    - “Edit before posting”

### 30.4. UI: Social Content Studio

New route:

- `/projects/[id]/social`

Features:

- Calendar view of scheduled posts.
- List of drafted AI-generated posts.
- Filters by channel.
- Editor:
  - Allow user to tweak captions/scripts.
  - Show tokens used vs plan limits (Phases 10C & 22).

---

These Phases 23–30 extend your IMPLEMENTATION_PLAN.md and keep your roadmap cohesive:

- Phases 12–17: Core feature sets (automation, content, performance, competitors, local, social).
- Phases 18–22: Security, subscription management, monitoring, fairness & limits.
- Phases 23–30: **Differentiation layer** — deep competitor intel, opportunity engine, CRO, technical AI support, marketplaces, and advanced social/video content.