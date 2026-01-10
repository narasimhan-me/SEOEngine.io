# EngineO.ai Deployment Guide

This guide explains how to deploy EngineO.ai to production using the recommended cloud infrastructure stack.

---

## Overview

EngineO.ai is a monorepo containing:

- **apps/api** – NestJS backend with Prisma ORM (PostgreSQL)
- **apps/web** – Next.js 14 frontend (App Router)
- **packages/shared** – Shared TypeScript types and utilities

### Production Stack

| Component | Service | Purpose |
|-----------|---------|---------|
| Database | Neon | Managed PostgreSQL |
| API | Render | NestJS backend hosting |
| Web | Vercel | Next.js frontend hosting |
| Cache/Queues | Upstash Redis | BullMQ queues & caching |
| DNS/SSL | Cloudflare | Domain management and SSL |
| Backups | AWS S3 | Periodic database backups |
| E-commerce | Shopify | Partner app integration |

### Environments – Production vs Staging

EngineO.ai runs two primary environments backed by Git branches:

| Environment | Git branch | API URL (example) | Web URL (example) |
|------------|------------|-------------------|-------------------|
| Production | `main`     | `https://api.engineo.ai` | `https://app.engineo.ai` |
| Staging    | `develop`  | `https://staging-api.engineo.ai` | `https://staging.engineo.ai` |

- **Production instances**
  - Render API service: `engineo-api` (branch `main`, domain `api.engineo.ai`)
  - Render worker: `engineo-worker` (branch `main`)
  - Vercel web project: `engineo-web` (Production environment, domain `app.engineo.ai`)
  - Neon database/project: e.g., `engineo-prod`
  - Upstash Redis: e.g., database `engineo-redis-prod`, `REDIS_PREFIX=engineo`

- **Staging instances**
  - Render API service: `engineo-api-staging` (branch `develop`, domain `staging-api.engineo.ai`)
  - Render worker: `engineo-worker-staging` (branch `develop`)
  - Vercel web project: `engineo-web` (Preview/Staging environment, domain `staging.engineo.ai`)
  - Neon database/project or branch: e.g., `engineo-staging`
  - Upstash Redis: e.g., database `engineo-redis-staging`, `REDIS_PREFIX=engineo_staging`

- Production and staging each have their own Render services, Vercel environment, Neon database (or Neon branch), and Upstash Redis database/prefix.
- All deployment steps in this guide apply to both environments; use **main** for production and **develop** for staging, with separate URLs and credentials.

> **Note:** Stripe billing (Phase 10B) is optional and can be configured later. This guide focuses on core infrastructure.

---

## Prerequisites

### Required Accounts

- [ ] GitHub (or other Git provider)
- [ ] [Neon](https://neon.tech) – PostgreSQL hosting
- [ ] [Render](https://render.com) – API hosting
- [ ] [Vercel](https://vercel.com) – Frontend hosting
- [ ] [Cloudflare](https://cloudflare.com) – DNS and SSL
- [ ] [AWS](https://aws.amazon.com) – S3 for backups
- [ ] [Shopify Partner](https://partners.shopify.com) – App configuration

### Local Requirements

- Node.js 20+
- pnpm 8+
- Git

---

## 1. Database: Neon (Postgres)

### Create Neon Project (Production)

1. Log in to [Neon Console](https://console.neon.tech)
2. Click **New Project**
3. Choose a project name (e.g., `engineo-prod`)
4. Select a region close to your users (e.g., `us-east-1`)
5. Create the project

### Get Connection String

1. In the Neon dashboard, go to **Connection Details**
2. Copy the connection string (it includes `sslmode=require`)
3. The format is:
   ```
   postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
   ```

### Configure Environment (Production)

Add to your **production** API environment (Render dashboard, not committed to git):

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
```

### Run Migrations

From your local machine (one-time setup):

```bash
cd apps/api
npx prisma migrate deploy
```

> **Important:** Use `migrate deploy` for production. The `migrate dev` command is for local development only.

### Staging Database (develop)

For staging, either:

- Create a separate Neon project (e.g., `engineo-staging`) with its own connection string, **or**
- Use a Neon branch dedicated to staging.

Set a separate `DATABASE_URL` for your staging API service, for example:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/STAGING_DB?sslmode=require
```

Run `npx prisma migrate deploy` against the staging database as well (from the `apps/api` directory), typically after changes are merged into `develop`.

---

## 2. API Deployment: Render (NestJS)

### Create Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect to your GitHub repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| Name | `engineo-api` |
| Region | Same as Neon (e.g., `us-east-1`) |
| Branch | `main` (production) |
| Root Directory | _(leave blank – repo root)_ |
| Runtime | Node |

### Build & Start Commands

**Build Command:**
```bash
pnpm install && pnpm --filter api build
```

**Start Command:**
```bash
pnpm --filter api start:prod
```

### Environment Variables

In Render's **Environment** tab, add these variables:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | Neon connection string |
| `REDIS_URL` | Upstash Redis TLS URL (`UPSTASH_REDIS_URL`) |
| `REDIS_PREFIX` | Redis key prefix (e.g., `engineo`) |
| `JWT_SECRET` | Generate with `openssl rand -base64 32` |
| `SHOPIFY_API_KEY` | From Shopify Partner Dashboard |
| `SHOPIFY_API_SECRET` | From Shopify Partner Dashboard |
| `SHOPIFY_APP_URL` | `https://api.engineo.ai` |
| `SHOPIFY_SCOPES` | `read_products,write_products` |
| `AI_PROVIDER` | `gemini` or `openai` |
| `AI_API_KEY` | Your AI provider API key |
| `FRONTEND_URL` | `https://app.engineo.ai` |

**Optional (Phase 10B – Stripe):**

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

> **Security:** Never commit real secrets to version control. Use Render's environment variables dashboard.

For **staging** (`develop` branch), create a separate Render Web Service (for example, `engineo-api-staging`) with:

- `Branch`: `develop`
- Its own `DATABASE_URL` pointing to the staging Neon database
- Its own `REDIS_URL` (staging Upstash database or shared DB)
- A distinct `REDIS_PREFIX` (for example, `engineo_staging`)
- Optional: separate `JWT_SECRET`, `SHOPIFY_APP_URL`, and any other URLs (e.g., `https://staging-api.engineo.ai`, `https://staging.engineo.ai`)

### Custom Domain

1. In Render service settings, go to **Settings** → **Custom Domains**
2. Add `api.engineo.ai`
3. Render will provide a CNAME target (e.g., `engineo-api.onrender.com`)
4. Configure this in Cloudflare (see DNS section below)

### Health Check

Configure a health check endpoint:

- **Path:** `/` or `/health` (if implemented)
- **Method:** GET

---

## 3. Web Deployment: Vercel (Next.js)

### Import Project

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure the project:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |

### Build Settings

| Setting | Value |
|---------|-------|
| Build Command | `pnpm install && pnpm build` |
| Output Directory | `.next` |
| Install Command | `pnpm install` |

### Environment Variables

In Vercel's **Settings** → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.engineo.ai` (production) |
| `NEXT_PUBLIC_APP_URL` | `https://app.engineo.ai` (production) |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | `turnstile` |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | Cloudflare Turnstile site key |

**Optional:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Legacy Cloudflare Turnstile site key (still supported) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics ID |

> **Note:** You must redeploy after changing environment variables for changes to take effect.

For **staging** (branch `develop`), configure a separate Vercel environment:

- Map the `develop` branch to a preview/staging environment.
- Set environment variables such as:

  ```bash
  NEXT_PUBLIC_API_URL=https://staging-api.engineo.ai
  NEXT_PUBLIC_APP_URL=https://staging.engineo.ai
  NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
  NEXT_PUBLIC_CAPTCHA_SITE_KEY=<staging-site-key>
  ```

- Attach a staging domain in Vercel (e.g., `staging.engineo.ai`) and configure DNS in Cloudflare accordingly.

### Custom Domain

1. In Vercel project settings, go to **Domains**
2. Add `app.engineo.ai`
3. Vercel will provide DNS configuration instructions
4. Configure in Cloudflare (see DNS section below)

---

## 4. DNS & SSL: Cloudflare

### Add Domain to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Add a Site** and enter your domain (e.g., `engineo.ai`)
3. Follow the setup wizard to update your domain's nameservers

### Configure DNS Records

Add these DNS records for **production**:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `api` | `engineo-api.onrender.com` | Proxied (orange) |
| CNAME | `app` | `cname.vercel-dns.com` | Proxied (orange) |
| CNAME | `@` | Your marketing site | Proxied (orange) |

Add these DNS records for **staging**:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `staging-api` | `engineo-api-staging.onrender.com` | Proxied (orange) |
| CNAME | `staging` | `cname.vercel-dns.com` (staging project/alias) | Proxied (orange) |

> **Note:** Replace targets with the actual values from Render and Vercel for both production and staging services.

### SSL Configuration (Both Environments)

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS** in **SSL/TLS** → **Edge Certificates**

### Optional: WAF Rules (Primarily Production)

Consider adding basic protection for your API and web app.

#### 1. Rate Limiting on API Endpoints

Protect your API from abuse by limiting requests per IP:

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Click **Create rule**
3. Configure the rule:

| Setting | Value |
|---------|-------|
| Rule name | `API Rate Limit` |
| If incoming requests match... | `Hostname equals api.engineo.ai` |
| Rate | `100 requests per 1 minute` |
| Action | `Block` |
| Duration | `1 minute` |

4. For stricter auth endpoint protection, create another rule:

| Setting | Value |
|---------|-------|
| Rule name | `Auth Rate Limit` |
| Expression | `(http.host eq "api.engineo.ai" and http.request.uri.path contains "/auth")` |
| Rate | `10 requests per 1 minute` |
| Action | `Block` |
| Duration | `10 minutes` |

5. Click **Deploy**

#### 2. Country Blocking for Admin Routes (Production)

Restrict admin access to specific countries:

1. Go to **Security** → **WAF** → **Custom rules**
2. Click **Create rule**
3. Configure:

| Setting | Value |
|---------|-------|
| Rule name | `Block Admin from Outside US` |
| Expression | `(http.request.uri.path contains "/admin" and not ip.geoip.country in {"US" "CA"})` |
| Action | `Block` |

4. Adjust country codes as needed (US, CA, GB, AU, etc.)
5. Click **Deploy**

#### 3. Bot Protection

Enable Cloudflare's bot management:

1. Go to **Security** → **Bots**
2. Enable **Bot Fight Mode** (free tier) or configure **Super Bot Fight Mode** (Pro+):
   - **Definitely automated**: Block
   - **Likely automated**: Managed Challenge
   - **Verified bots**: Allow (for search engines like Google, Bing)

3. For API protection (Pro+ plans only), go to **Security** → **WAF** → **Custom rules**:

| Setting | Value |
|---------|-------|
| Rule name | `Block Bad Bots on API` |
| Expression | `(http.host eq "api.engineo.ai" and cf.client.bot)` |
| Action | `Managed Challenge` |

> **Note:** The `cf.bot_management.verified_bot` field requires a paid Bot Management add-on. On free/Pro plans, use `cf.client.bot` with "Managed Challenge" action to avoid blocking legitimate services. For free tier, rely on Bot Fight Mode instead of custom rules.

#### 4. Additional Security Headers

Add security headers via Response Header Transform Rules:

1. Go to **Rules** → click **Create rule** button
2. Select **Response Header Transform Rules** from the dropdown
3. Configure:

| Setting | Value |
|---------|-------|
| Rule name | `Security Headers` |
| Expression | `(http.host eq "app.engineo.ai" or http.host eq "api.engineo.ai")` |

4. Under **Then... Modify response header**, click **+ Set new header** and add each header:

   **First header:**
   - Select item: `Set static`
   - Header name: `X-Content-Type-Options`
   - Value: `nosniff`

   **Second header:** (click **+ Set new header** again)
   - Select item: `Set static`
   - Header name: `X-Frame-Options`
   - Value: `DENY`

   **Third header:** (click **+ Set new header** again)
   - Select item: `Set static`
   - Header name: `Referrer-Policy`
   - Value: `strict-origin-when-cross-origin`

5. Click **Deploy**

> **Note:** Response Header Transform Rules are available on all Cloudflare plans including the free tier.

#### 5. DDoS Protection

Cloudflare provides automatic DDoS protection on all plans (including free). The security level is fully automated and set to "always protected" by default - no configuration required.

Optional settings in **Security** → **Settings**:

- **I'm under attack mode**: Enable this only during an active DDoS attack. It adds an interstitial challenge page for all visitors.
- **SSL/TLS DDoS attack protection**: Automatic mitigation for SSL-based attacks (enabled by default).

> **Note:** Monitor **Security** → **Analytics** to review blocked requests and traffic patterns.

---

### Staging Access Control – One-Time Password

To restrict staging (`staging.engineo.ai`, `staging-api.engineo.ai`) behind a one-time password challenge, use **Cloudflare Access**:

1. Go to **Zero Trust** (or **Access**) in the Cloudflare dashboard.
2. Navigate to **Access** → **Applications** → **Add an application** → **Self-hosted**.
3. Configure the application:
   - **Application name**: `engineo-staging`
   - **Session duration**: e.g., `8 hours`
   - **Application domain**:  
     - `staging.engineo.ai` (web app)  
     - Optionally add `staging-api.engineo.ai` if you want to protect the API UI access as well.
4. Click **Next** to define **Policies**:
   - Create a policy like:
     - **Policy name**: `staging-otp-access`
     - **Action**: `Allow`
     - **Include**: emails, emails ending in your domain, or Access groups (e.g., founders/team emails).
5. Under **Authentication methods** for this application, enable **One-time PIN**:
   - This forces users to enter a one-time code sent to their email before accessing staging.
   - You can also enable additional methods (e.g., SSO) if desired, but One-time PIN ensures OTP-style access.
6. Save and deploy the application.

After configuration:
- Any visit to `https://staging.engineo.ai` (and optionally `https://staging-api.engineo.ai`) will prompt for the Cloudflare Access one-time PIN before allowing access.

---

## 5. Backups: AWS S3 + Cron Job (TODO)

Even though Neon provides managed backups, we maintain independent backups to S3.

### Create S3 Bucket

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Go to **S3** → **Create bucket**
3. Name: `engineo-db-backups-prod`
4. Region: Same as your infrastructure (e.g., `us-east-1`)
5. Enable **Server-side encryption** (SSE-S3)
6. Block all public access (default)

### Create IAM User

1. Go to **IAM** → **Users** → **Add users**
2. Name: `engineo-backup-bot`
3. Select **Access key - Programmatic access**
4. Attach a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::engineo-db-backups-prod/*"
    }
  ]
}
```

5. Save the **Access Key ID** and **Secret Access Key**

### Configure Render Environment

Add these variables to your Render API service (or a dedicated cron job):

| Variable | Value |
|----------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret key |
| `AWS_REGION` | `us-east-1` |
| `S3_BACKUP_BUCKET` | `engineo-db-backups-prod` |

### Backup Script

The backup script is located at `apps/api/src/scripts/backup-db.ts` (Phase 11.5).

It performs:
1. Runs `pg_dump` against the production database
2. Compresses the output with gzip
3. Uploads to S3 with timestamp naming: `db-backup-YYYY-MM-DDTHH-mm-ss.sql.gz`

### Render Cron Job

1. In Render, create a new **Cron Job**
2. Connect to the same repository
3. Configure:

| Setting | Value |
|---------|-------|
| Name | `engineo-db-backup` |
| Schedule | `0 2 * * *` (daily at 2 AM UTC) |
| Build Command | `pnpm install && pnpm --filter api build` |
| Command | `node apps/api/dist/scripts/backup-db.js` |

4. Add the same environment variables as the API service

> **Note:** Ensure `pg_dump` is available in the Render environment. Most Node images include PostgreSQL CLI tools.

---

## 6. Shopify App Production Configuration

### Partner Dashboard Setup

1. Log in to [Shopify Partners](https://partners.shopify.com)
2. Go to **Apps** → Select your app
3. Configure **App setup**:

| Setting | Value |
|---------|-------|
| App URL | `https://app.engineo.ai` |
| Allowed redirection URL(s) | `https://api.engineo.ai/shopify/callback` |

4. Under **API access**, confirm scopes match your environment:
   - `read_products`
   - `write_products`
   - (Add others as needed)

### Environment Variables

Ensure these are set in Render:

| Variable | Source |
|----------|--------|
| `SHOPIFY_API_KEY` | Partners Dashboard → API credentials |
| `SHOPIFY_API_SECRET` | Partners Dashboard → API credentials |
| `SHOPIFY_APP_URL` | `https://api.engineo.ai` |
| `SHOPIFY_SCOPES` | `read_products,write_products` |

### Testing

After deployment, test the OAuth flow:

1. Create a development store in Shopify Partners
2. Install the app from your app listing
3. Verify:
   - OAuth redirect works
   - Access token is stored
   - Product sync functions correctly
   - SEO updates apply to products

---

## 7. Monitoring & Go-Live

### Uptime Monitoring

Set up monitoring with [UptimeRobot](https://uptimerobot.com), [Better Stack](https://betterstack.com), or similar:

| Endpoint | Check |
|----------|-------|
| `https://api.engineo.ai/health` | API health |
| `https://app.engineo.ai` | Web app availability |

### Logging

- **Render:** View logs in service dashboard → **Logs**
- **Vercel:** View logs in project dashboard → **Deployments** → select deployment → **Functions**

Check logs regularly during initial launch for errors.

### Go-Live Checklist

Before announcing your launch:

- [ ] **Database:** Neon project created and `DATABASE_URL` configured
- [ ] **Migrations:** `npx prisma migrate deploy` completed successfully
- [ ] **API:** Render service deployed and responding at `https://api.engineo.ai`
- [ ] **Web:** Vercel deployment live at `https://app.engineo.ai`
- [ ] **DNS:** Cloudflare records configured for `api` and `app` subdomains
- [ ] **SSL:** Full (strict) mode enabled in Cloudflare
- [ ] **Shopify:** App URLs updated in Partner Dashboard
- [ ] **OAuth:** Tested app install/uninstall flow with a test store
- [ ] **Smoke Test:** Complete user journey works:
  - Sign up / Log in
  - Create a project
  - Connect Shopify store
  - Sync products
  - Run SEO scan
  - Apply SEO suggestions
- [ ] **Monitoring:** Uptime checks configured and alerting

### Stripe (Phase 10B)

Stripe billing can be added later:

1. Create products and prices in Stripe Dashboard
2. Add environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - Price IDs for each plan
3. Configure webhook endpoint in Stripe Dashboard
4. Redeploy API service

---

## Troubleshooting

### Common Issues

**API not responding:**
- Check Render logs for startup errors
- Verify `DATABASE_URL` is correct
- Ensure migrations have been run

**OAuth callback fails:**
- Verify `SHOPIFY_APP_URL` matches your Render custom domain
- Check redirect URL in Shopify Partner Dashboard
- Inspect browser network tab for error details

**Database connection errors:**
- Confirm Neon project is active
- Check connection string includes `?sslmode=require`
- Verify IP allowlist in Neon (if configured)

**Build failures:**
- Ensure `pnpm-lock.yaml` is committed
- Check Node.js version matches local development
- Review build logs for missing dependencies

### AI Suggestions / Gemini Issues

If AI-powered suggestions are not working:

- **Check environment variables (Render API):**
  - `AI_PROVIDER` must be set (e.g., `gemini` or `openai`).
  - `AI_API_KEY` must be set with a valid key for the selected provider (no quotes or extra spaces).
- **Confirm a fresh deploy:**
  - After changing AI env vars, trigger a manual redeploy of the API service so the new values are picked up.
- **Inspect Render logs:**
  - In the API service logs, search for lines containing `Gemini` / `OpenAI` / `AI`.
  - Look for upstream error messages (invalid API key, quota exceeded, network errors).
- **Verify frontend points to the correct API:**
  - In Vercel, ensure `NEXT_PUBLIC_API_URL` is `https://api.engineo.ai` (or your staging API URL).
  - Redeploy the frontend after changing environment variables.

---

## Related Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) – Full project roadmap
- [Architecture](../ARCHITECTURE.md) – System design
- [API Specification](../API_SPEC.md) – API endpoints
- [Shopify Integration](../SHOPIFY_INTEGRATION.md) – Shopify OAuth details
