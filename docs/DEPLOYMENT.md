# SEOEngine.io Deployment Guide

This guide explains how to deploy SEOEngine.io to production using the recommended cloud infrastructure stack.

---

## Overview

SEOEngine.io is a monorepo containing:

- **apps/api** – NestJS backend with Prisma ORM (PostgreSQL)
- **apps/web** – Next.js 14 frontend (App Router)
- **packages/shared** – Shared TypeScript types and utilities

### Production Stack

| Component | Service | Purpose |
|-----------|---------|---------|
| Database | Neon | Managed PostgreSQL |
| API | Render | NestJS backend hosting |
| Web | Vercel | Next.js frontend hosting |
| DNS/SSL | Cloudflare | Domain management and SSL |
| Backups | AWS S3 | Periodic database backups |
| E-commerce | Shopify | Partner app integration |

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

## 1. Database: Neon (Production Postgres)

### Create Neon Project

1. Log in to [Neon Console](https://console.neon.tech)
2. Click **New Project**
3. Choose a project name (e.g., `seoengine-prod`)
4. Select a region close to your users (e.g., `us-east-1`)
5. Create the project

### Get Connection String

1. In the Neon dashboard, go to **Connection Details**
2. Copy the connection string (it includes `sslmode=require`)
3. The format is:
   ```
   postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
   ```

### Configure Environment

Add to your API environment (Render dashboard, not committed to git):

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

---

## 2. API Deployment: Render (NestJS)

### Create Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect to your GitHub repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| Name | `seoengine-api` |
| Region | Same as Neon (e.g., `us-east-1`) |
| Branch | `main` |
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
| `JWT_SECRET` | Generate with `openssl rand -base64 32` |
| `SHOPIFY_API_KEY` | From Shopify Partner Dashboard |
| `SHOPIFY_API_SECRET` | From Shopify Partner Dashboard |
| `SHOPIFY_APP_URL` | `https://api.seoengine.io` |
| `SHOPIFY_SCOPES` | `read_products,write_products` |
| `AI_PROVIDER` | `gemini` or `openai` |
| `AI_API_KEY` | Your AI provider API key |
| `FRONTEND_URL` | `https://app.seoengine.io` |

**Optional (Phase 10B – Stripe):**

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

> **Security:** Never commit real secrets to version control. Use Render's environment variables dashboard.

### Custom Domain

1. In Render service settings, go to **Settings** → **Custom Domains**
2. Add `api.seoengine.io`
3. Render will provide a CNAME target (e.g., `seoengine-api.onrender.com`)
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
| `NEXT_PUBLIC_API_URL` | `https://api.seoengine.io` |
| `NEXT_PUBLIC_APP_URL` | `https://app.seoengine.io` |

**Optional:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics ID |

> **Note:** You must redeploy after changing environment variables for changes to take effect.

### Custom Domain

1. In Vercel project settings, go to **Domains**
2. Add `app.seoengine.io`
3. Vercel will provide DNS configuration instructions
4. Configure in Cloudflare (see DNS section below)

---

## 4. DNS & SSL: Cloudflare

### Add Domain to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Add a Site** and enter your domain (e.g., `seoengine.io`)
3. Follow the setup wizard to update your domain's nameservers

### Configure DNS Records

Add these DNS records:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `api` | `seoengine-api.onrender.com` | Proxied (orange) |
| CNAME | `app` | `cname.vercel-dns.com` | Proxied (orange) |
| CNAME | `@` | Your marketing site | Proxied (orange) |

> **Note:** Replace targets with the actual values from Render and Vercel.

### SSL Configuration

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS** in **SSL/TLS** → **Edge Certificates**

### Optional: WAF Rules

Consider adding basic protection:

- Rate limiting on API endpoints
- Country blocking for `/admin` routes (if needed)
- Bot protection

---

## 5. Backups: AWS S3 + Cron Job

Even though Neon provides managed backups, we maintain independent backups to S3.

### Create S3 Bucket

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Go to **S3** → **Create bucket**
3. Name: `seoengine-db-backups-prod`
4. Region: Same as your infrastructure (e.g., `us-east-1`)
5. Enable **Server-side encryption** (SSE-S3)
6. Block all public access (default)

### Create IAM User

1. Go to **IAM** → **Users** → **Add users**
2. Name: `seoengine-backup-bot`
3. Select **Access key - Programmatic access**
4. Attach a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::seoengine-db-backups-prod/*"
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
| `S3_BACKUP_BUCKET` | `seoengine-db-backups-prod` |

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
| Name | `seoengine-db-backup` |
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
| App URL | `https://app.seoengine.io` |
| Allowed redirection URL(s) | `https://api.seoengine.io/shopify/callback` |

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
| `SHOPIFY_APP_URL` | `https://api.seoengine.io` |
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
| `https://api.seoengine.io/health` | API health |
| `https://app.seoengine.io` | Web app availability |

### Logging

- **Render:** View logs in service dashboard → **Logs**
- **Vercel:** View logs in project dashboard → **Deployments** → select deployment → **Functions**

Check logs regularly during initial launch for errors.

### Go-Live Checklist

Before announcing your launch:

- [ ] **Database:** Neon project created and `DATABASE_URL` configured
- [ ] **Migrations:** `npx prisma migrate deploy` completed successfully
- [ ] **API:** Render service deployed and responding at `https://api.seoengine.io`
- [ ] **Web:** Vercel deployment live at `https://app.seoengine.io`
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

---

## Related Documentation

- [Implementation Plan](../IMPLEMENTATION_PLAN.md) – Full project roadmap
- [Architecture](../ARCHITECTURE.md) – System design
- [API Specification](../API_SPEC.md) – API endpoints
- [Shopify Integration](../SHOPIFY_INTEGRATION.md) – Shopify OAuth details
