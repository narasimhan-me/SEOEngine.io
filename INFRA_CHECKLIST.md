# INFRASTRUCTURE CHECKLIST — EngineO.ai (Option A Architecture)

This checklist provides a step-by-step guide to set up the full infrastructure for EngineO.ai using:

- **Vercel** (Next.js frontend)
- **Render** (NestJS API + workers)
- **Upstash Redis** (queues + caching)
- **Neon Postgres** (primary database)
- **Cloudflare** (DNS + security)

---

## ✅ 1. Cloudflare Setup (DNS & security)

### 1.1 Add domain to Cloudflare

- Add `seoengine.io` to Cloudflare
- Update nameservers at your registrar

### 1.2 Create DNS records

- `A / CNAME` for:
  - `seoengine.io` → Vercel
  - `www.seoengine.io` → Vercel
  - `api.seoengine.io` → Render public URL

### 1.3 Enable essential security settings

- SSL: Full (strict)
- Turn on DDoS protection
- (Optional) Rate limiting rules
- (Optional) Bot protection

---

## ✅ 2. Vercel Setup (Frontend – Next.js 14)

### 2.1 Connect GitHub repository

- Import repo into Vercel
- Select `apps/web` as root

### 2.2 Configure build settings

- Build Command: `pnpm install && pnpm build`
- Output Directory: `.next`

### 2.3 Add environment variables

- `NEXT_PUBLIC_API_URL=https://api.seoengine.io`

### 2.4 Configure domains

- Production: `seoengine.io`
- Preview: `staging.seoengine.io` (optional)

---

## ✅ 3. Neon Setup (Serverless Postgres)

### 3.1 Create Neon project

- Project: `seoengine-dev`
- Database: `neondb`

### 3.2 Configure branches

- `main` → production
- `develop` → staging
- other feature branches → development / preview

### 3.3 Copy connection strings

Use Neon UI → **Connection Details**.

### 3.4 Set environment variables on Render

```
DATABASE_URL="postgres://<user>:<password>@<host>/<dbname>?sslmode=require"
```

### 3.5 Push Prisma schema

```
cd apps/api
pnpm prisma migrate deploy
```

---

## ✅ 4. Upstash Redis Setup (Queues & Caching)

### 4.1 Create a Redis database

- Project: `seoengine-redis`
- Region: closest to Render region (e.g., `us-east-1`)

### 4.2 Copy Redis URL

Example:

```
rediss://default:<password>@<host>:6379
```

### 4.3 Add env vars to Render (API + worker)

```
REDIS_URL=<your-upstash-url>
```

---

## ✅ 5. Render Setup (Backend API)

### 5.1 Create a Render Web Service

- Name: `seoengine-api`
- Root directory: `apps/api`
- Environment: Node
- Build Command: `pnpm install && pnpm build`
- Start Command: `node dist/apps/api/main.js`

### 5.2 Add environment variables

```
DATABASE_URL=<neon-url>
REDIS_URL=<upstash-url>
NODE_ENV=production
JWT_SECRET=<random-secret>

SHOPIFY_API_KEY=<key>
SHOPIFY_API_SECRET=<secret>
SHOPIFY_APP_URL=https://api.seoengine.io
FRONTEND_URL=https://seoengine.io

OPENAI_API_KEY=<optional>
GEMINI_API_KEY=<optional>
```

### 5.3 Configure auto-deploy

- Production API: trigger on push to `main`
- Staging API: separate service triggering on push to `develop`

---

## ✅ 6. Render Setup (Background Worker)

### 6.1 Create a Background Worker

- Name: `seoengine-worker`
- Same repo
- Root: `apps/api`
- Build Command: `pnpm install && pnpm build`
- Start Command: `node dist/apps/api/worker-main.js`

### 6.2 Copy same environment variables as API

Workers need:

- Redis
- Neon
- Shopify keys
- AI keys

### 6.3 Optional scaling

- 1 instance to start
- Increase to 2–3 when queues grow

---

## ✅ 7. Cron Jobs (Render)

### 7.1 Create scheduled jobs

Examples:

- Weekly SEO report enqueuer
- Store sync job
- Automation rule job

### 7.2 Cron job format

Set Cron Job → `curl -X POST https://api.seoengine.io/internal/cron/*`

---

## ✅ 8. Shopify App Setup

### 8.1 Create Shopify Partner App

- Public app
- Allowed redirect URL:

```
https://api.seoengine.io/shopify/callback
```

### 8.2 Add credentials to Render

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`

### 8.3 Test OAuth flow

- Visit `https://seoengine.io/projects/<id>`
- Click Connect Shopify Store
- Complete OAuth → verify DB writes in Neon

---

## ✅ 9. Logging, Monitoring, Alerts

### 9.1 Enable Render logs

- For API
- For workers

### 9.2 Add Sentry (optional)

- Frontend error tracking
- Backend API tracking
- Worker tracking

---

## ✅ 10. Backups & DR

### 10.1 Neon PITR

- Enable Point-in-Time Recovery
- Set retention window (7–30 days)

### 10.2 Nightly logical backup (optional)

```
pg_dump $DATABASE_URL > backup-$(date +%F).sql
```

---

## 🎉 INFRA COMPLETE

This checklist allows you to completely stand up the **Option A Architecture** for SEOEngine.io as a solo founder with minimal DevOps overhead.
