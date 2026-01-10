# Render Deployment Guide - Step by Step

This guide provides detailed step-by-step instructions for deploying the EngineO.ai NestJS API backend to Render.

---

## Environments – API Instances

Render hosts separate instances for production and staging:

| Environment | Service name           | Branch   | Base URL (example)              |
|------------|------------------------|---------|---------------------------------|
| Production | `engineo-api`          | `main`  | `https://api.engineo.ai`        |
| Staging    | `engineo-api-staging`  | `develop` | `https://staging-api.engineo.ai` |

Background workers follow the same pattern:

- Production worker: `engineo-worker` (branch `main`)
- Staging worker: `engineo-worker-staging` (branch `develop`)

The rest of this guide walks through configuring these services.

---

## Prerequisites

- [ ] GitHub repository is set up and pushed (repository: `narasimhan-me/EngineO.ai`)
- [ ] Render account created at [render.com](https://render.com)
- [ ] GitHub account connected to Render
- [ ] Neon PostgreSQL database created (see [DEPLOYMENT.md](./DEPLOYMENT.md) for Neon setup)
- [ ] Upstash Redis database created (optional, but required for background job queues)

---

## Step 1: Connect GitHub Account to Render

1. Go to [render.com](https://render.com) and sign in (or create an account)
2. Click **New +** → **Web Service**
3. If prompted, click **Connect GitHub** to connect your GitHub account
4. Authorize Render to access your repositories
5. Select your GitHub account/organization if prompted

---

## Step 2: Import Your Repository

1. In the **Connect a repository** screen, search for `EngineO.ai` or `narasimhan-me/EngineO.ai`
2. Click **Connect** next to your repository
3. You'll be taken to the service configuration screen

---

## Step 3: Configure Web Service Settings

### Basic Configuration (Production)

| Setting | Value | Notes |
|---------|-------|-------|
| **Name** | `engineo-api` | Or any name you prefer |
| **Region** | Same as Neon database (e.g., `Oregon (US West)`) | Reduces latency |
| **Branch** | `main` | Production branch |
| **Root Directory** | _(leave blank)_ | Uses repo root |
| **Runtime** | `Node` | Should auto-detect |
| **Node Version** | `20` | Required: Node.js 20+ |

### Build & Start Commands

**Build Command:**
```bash
pnpm install && pnpm --filter api build
```

**Start Command:**
```bash
pnpm --filter api start:prod
```

### Verify Build Settings

Your production configuration should look like:

```
Name: engineo-api
Region: Oregon (US West) (or your preferred region)
Branch: main
Root Directory: (blank)
Runtime: Node
Node Version: 20
Build Command: pnpm install && pnpm --filter api build
Start Command: pnpm --filter api start:prod
```

### Staging Web Service (develop)

To add a dedicated staging API:

1. Create a second Web Service (e.g., `engineo-api-staging`)
2. Use the same build and start commands
3. Set **Branch** to `develop`
4. Point `DATABASE_URL`, `REDIS_URL`, and URLs (`SHOPIFY_APP_URL`, `FRONTEND_URL`) to your staging resources (for example, `https://staging-api.engineo.ai`, `https://staging.engineo.ai`)

---

## Step 4: Add Environment Variables

Before deploying, add required environment variables in Render's **Environment** tab:

### Required Variables

These variables are used in the API code and must be set:

| Variable Name | Default (if not set) | Description | Used In |
|---------------|---------------------|-------------|---------|
| `NODE_ENV` | - | Set to `production` | General app configuration |
| `PORT` | `3001` | Port the API listens on | `src/main.ts` |
| `DATABASE_URL` | - | Neon PostgreSQL connection string | `src/prisma.service.ts`, Prisma migrations |
| `JWT_SECRET` | `default-secret-change-in-production` | Secret for JWT token signing | `src/auth/jwt.strategy.ts` |

**Production Values:**
- `NODE_ENV`: `production`
- `PORT`: `3001` (or let Render auto-assign)
- `DATABASE_URL`: Your Neon connection string (format: `postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require`)
- `JWT_SECRET`: Generate with `openssl rand -base64 32` (keep this secret!)

### Shopify Integration Variables

Required if using Shopify integration:

| Variable Name | Description | Used In |
|---------------|-------------|---------|
| `SHOPIFY_API_KEY` | Shopify Partner API key | `src/shopify/shopify.service.ts` |
| `SHOPIFY_API_SECRET` | Shopify Partner API secret | `src/shopify/shopify.service.ts` |
| `SHOPIFY_APP_URL` | Your API URL (e.g., `https://api.engineo.ai`) | `src/shopify/shopify.service.ts` |
| `SHOPIFY_SCOPES` | Comma-separated scopes (default: `read_products,write_products,read_themes`) | `src/shopify/shopify.service.ts` |

### Frontend URL

| Variable Name | Default | Description | Used In |
|---------------|---------|-------------|---------|
| `FRONTEND_URL` | `http://localhost:3000` | Frontend app URL for redirects | `src/shopify/shopify.controller.ts` |

**Production Value:**
- `FRONTEND_URL`: `https://app.engineo.ai` (or your Vercel deployment URL)

### AI Service Variables

Required if using AI features (metadata generation):

| Variable Name | Default | Description | Used In |
|---------------|---------|-------------|---------|
| `AI_PROVIDER` | `openai` | AI provider: `openai`, `anthropic`, or `gemini` | `src/ai/ai.service.ts` |
| `AI_API_KEY` | - | API key for your chosen AI provider | `src/ai/ai.service.ts` |

### CAPTCHA Variables

Required if using CAPTCHA verification:

| Variable Name | Default | Description | Used In |
|---------------|---------|-------------|---------|
| `CAPTCHA_PROVIDER` | `turnstile` | CAPTCHA provider (currently only `turnstile` supported) | `src/captcha/captcha.service.ts` |
| `CAPTCHA_SECRET_KEY` | - | Cloudflare Turnstile secret key | `src/captcha/captcha.service.ts` |

**Note:** The API uses Cloudflare Turnstile. Get your secret key from the [Cloudflare Dashboard](https://dash.cloudflare.com).

### Redis Variables (Optional but Recommended)

Required for background job queues (DEO score computation) using **external Upstash Redis**:

| Variable Name | Default | Description | Used In |
|---------------|---------|-------------|---------|
| `REDIS_URL` | - | Upstash Redis TLS connection URL (`UPSTASH_REDIS_URL`) | `src/config/redis.config.ts`, `src/queues/queues.ts`, `src/projects/deo-score.processor.ts` |
| `REDIS_PREFIX` | `engineo` | Prefix for Redis keys | `src/config/redis.config.ts` |

**Note:** If `REDIS_URL` is not set, background job queues will not work. Render does **not** host Redis directly; EngineO.ai uses an external Upstash Redis database.

### Stripe Variables (Optional - Phase 10B)

Required if using Stripe billing:

| Variable Name | Description |
|---------------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### AWS Backup Variables (Optional)

Required for database backups (if using backup script):

| Variable Name | Description | Used In |
|---------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | `src/scripts/backup-db.ts` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | `src/scripts/backup-db.ts` |
| `AWS_REGION` | AWS region (e.g., `us-east-1`) | `src/scripts/backup-db.ts` |
| `S3_BACKUP_BUCKET` | S3 bucket name for backups | `src/scripts/backup-db.ts` |

### Environment Variable Summary

**Minimum Required:**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://...
JWT_SECRET=your-generated-secret
```

**Recommended (for full functionality):**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://...
JWT_SECRET=your-generated-secret
FRONTEND_URL=https://app.engineo.ai
SHOPIFY_API_KEY=your-shopify-key
SHOPIFY_API_SECRET=your-shopify-secret
SHOPIFY_APP_URL=https://api.engineo.ai
SHOPIFY_SCOPES=read_products,write_products,read_themes
AI_PROVIDER=gemini
AI_API_KEY=your-ai-api-key
CAPTCHA_PROVIDER=turnstile
CAPTCHA_SECRET_KEY=your-turnstile-secret
REDIS_URL=<UPSTASH_TLS_URL>
REDIS_PREFIX=engineo
```

#### Staging-Specific Values (engineo-api-staging)

For the staging API service (`engineo-api-staging`, branch `develop`):

- `DATABASE_URL`: staging Neon database URL (separate from production)
- `SHOPIFY_APP_URL`: `https://staging-api.engineo.ai`
- `FRONTEND_URL`: `https://staging.engineo.ai`
- `REDIS_URL`: staging Upstash Redis URL (or same DB with a different prefix)
- `REDIS_PREFIX`: `engineo_staging`

All other variables (e.g., `NODE_ENV`, `AI_PROVIDER`, `CAPTCHA_PROVIDER`) normally mirror production but can be customized if needed.

### Environment-Specific Variables

You can set different values for different environments in Render:

- **Production**: Production URLs and keys
- **Preview**: Preview/staging URLs
- **Development**: Local development URLs

Click the environment dropdown next to each variable to set environment-specific values.

---

## Step 5: Configure Health Check

Render needs a health check endpoint to monitor your service:

1. Go to **Settings** → **Health Check Path**
2. Set the path to: `/health`
3. The health check endpoint is already implemented at `src/health/health.controller.ts` and returns `{ status: 'ok' }`

**Health Check Configuration:**
- **Path:** `/health`
- **Method:** GET
- **Expected Response:** `{ "status": "ok" }`

---

## Step 6: Deploy

1. Review all settings
2. Click **Create Web Service**
3. Render will:
   - Clone your repository
   - Install dependencies (`pnpm install`)
   - Build your NestJS app (`pnpm --filter api build`)
   - Start the service (`pnpm --filter api start:prod`)

### Monitor the Deployment

1. Watch the build logs in real-time
2. Check for any build errors
3. If successful, you'll see a **Live** status with a deployment URL

### Common Build Issues

**Issue: "Cannot find module '@engineo/shared'"**
- **Solution:** Ensure you're using the monorepo build command: `pnpm install && pnpm --filter api build`

**Issue: "Prisma Client not generated"**
- **Solution:** The `postinstall` script should generate Prisma Client. Ensure `DATABASE_URL` is set before build.

**Issue: "TypeScript compilation errors"**
- **Solution:** Fix TypeScript errors locally first, then push to GitHub

---

## Step 7: Run Database Migrations

Before the API can work, you need to run Prisma migrations:

### Option A: Run Migrations Locally (Recommended)

From your local machine:

```bash
cd apps/api
npx prisma migrate deploy
```

This will apply all pending migrations to your production database.

### Option B: Run Migrations via Render Shell

1. In Render dashboard, go to your service
2. Click **Shell** tab
3. Run:
   ```bash
   cd apps/api
   npx prisma migrate deploy
   ```

> **Important:** Use `migrate deploy` for production. The `migrate dev` command is for local development only.

---

## Step 8: Verify Deployment

1. Check the deployment URL (e.g., `engineo-api.onrender.com`)
2. Test the health endpoint:
   ```bash
   curl https://engineo-api.onrender.com/health
   ```
   Should return: `{"status":"ok"}`

3. Check Render logs for any errors:
   - Go to **Logs** tab
   - Look for startup messages: `🚀 SEOEngine API is running on: http://0.0.0.0:3001`

### Test API Endpoints

Test a few endpoints to ensure everything works:

```bash
# Health check
curl https://engineo-api.onrender.com/health

# Signup (if implemented)
curl -X POST https://engineo-api.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","captchaToken":"test"}'
```

---

## Step 9: Configure Custom Domain

### Add Domain in Render

1. Go to your service → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Enter your domain: `api.engineo.ai`
4. Click **Add**

### Configure DNS in Cloudflare

Render will show you the DNS records to add. Typically:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (`engineo.ai`)
3. Go to **DNS** → **Records**
4. Add a CNAME record:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | `api` | `engineo-api.onrender.com` | Proxied (orange cloud) |

5. Save the record

### Verify Domain

1. Wait a few minutes for DNS propagation
2. In Render, the domain status should change to **Valid Configuration**
3. SSL certificate will be automatically provisioned
4. Your API will be accessible at `https://api.engineo.ai`

---

## Step 10: Configure Automatic Deployments

Render automatically deploys on:

- **Push to `main` branch** → Production deployment
- **Pull requests** → Preview deployments (if enabled)
- **Other branches** → Preview deployments (if enabled)

### Branch Protection (Optional)

1. Go to **Settings** → **Build & Deploy**
2. Configure:
   - **Auto-Deploy**: Enable for `main` branch
   - **Pull Request Previews**: Enable if desired
   - **Branch**: Set to `main` for production

---

## Step 11: Set Up Redis via Upstash (Optional but Recommended)

If you're using background job queues (DEO score computation), you need an external Redis provider. EngineO.ai uses **Upstash Redis**:

1. In the [Upstash Dashboard](https://console.upstash.com), create a Redis database (or reuse an existing one).
2. Copy the `UPSTASH_REDIS_URL` value (TLS Redis URL, e.g. `rediss://default:<password>@<host>.upstash.io:6379`).
3. In your Render API service environment variables, add:
   - `REDIS_URL`: `UPSTASH_REDIS_URL` value
   - `REDIS_PREFIX`: `engineo` (optional)
4. In your Render worker environment variables (if using a background worker), add the same:
   - `REDIS_URL`: `UPSTASH_REDIS_URL` value
   - `REDIS_PREFIX`: `engineo` (optional)

**Note:** Without Redis, background job queues will not work, but the API will still function for other features. Render no longer manages Redis directly; all Redis traffic goes to Upstash.

---

## Step 12: Post-Deployment Checklist

- [ ] API health endpoint responds at custom domain
- [ ] All environment variables are set correctly
- [ ] Database migrations have been run
- [ ] Database connection works (check logs)
- [ ] Authentication endpoints work (test signup/login)
- [ ] Shopify OAuth works (if configured)
- [ ] AI endpoints work (if configured)
- [ ] CAPTCHA verification works (if configured)
- [ ] Redis queues work (if configured)
- [ ] SSL certificate is active (HTTPS works)
- [ ] No errors in Render logs

---

## Troubleshooting

### Build Fails: "Cannot find module"

**Solution:** 
1. Ensure build command is: `pnpm install && pnpm --filter api build`
2. Check that `pnpm-lock.yaml` is committed to the repository
3. Verify monorepo structure is correct

### Build Fails: "Prisma Client not generated"

**Solution:**
1. Ensure `DATABASE_URL` is set before build
2. The `postinstall` script should generate Prisma Client automatically
3. Check build logs for Prisma generation messages

### Build Fails: TypeScript Errors

**Solution:**
1. Fix TypeScript errors locally first
2. Run `pnpm --filter api build` locally to verify
3. Ensure `tsconfig.json` is correct in `apps/api`

### Service Won't Start: "Port already in use"

**Solution:**
1. Render automatically assigns a port via `PORT` environment variable
2. Don't hardcode the port in code
3. The code already uses `process.env.PORT || 3001` which is correct

### Database Connection Errors

**Solution:**
1. Verify `DATABASE_URL` is correct and includes `?sslmode=require`
2. Check Neon project is active
3. Verify IP allowlist in Neon (if configured)
4. Check database migrations have been run

### Environment Variables Not Working

**Solution:**
1. Variables must be set in Render's **Environment** tab
2. Redeploy after adding/changing environment variables
3. Check variable names match exactly (case-sensitive)
4. Verify no extra spaces in variable values

### API Calls Failing: CORS Errors

**Solution:**
1. The API has CORS enabled for all origins (`origin: '*'`)
2. For production, consider restricting CORS to your frontend domain
3. Update `src/main.ts` to restrict origins if needed

### Redis Connection Errors

**Solution:**
1. Verify `REDIS_URL` is set correctly (should match your `UPSTASH_REDIS_URL` value)
2. Check the Upstash Redis database status in the Upstash dashboard
3. Verify network connectivity between Render and Upstash
4. Check application logs for Redis connection errors

### Health Check Failing

**Solution:**
1. Verify health check path is set to `/health`
2. Check that `src/health/health.controller.ts` is properly registered
3. Review service logs for startup errors

---

## Updating Deployment

### Automatic Updates

Render automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update API"
git push origin main
```

Render will detect the push and start a new deployment.

### Manual Redeploy

1. Go to **Manual Deploy** tab
2. Click **Deploy latest commit**
3. Or click **Deploy specific commit** to deploy a previous version

### Rollback

1. Go to **Events** tab
2. Find a previous successful deployment
3. Click **Deploy this version**

---

## Monitoring & Logs

### View Logs

1. Go to **Logs** tab in your service
2. View real-time logs
3. Filter by log level or search for specific terms

### Metrics

Render provides basic metrics:
- **CPU Usage**
- **Memory Usage**
- **Request Count**
- **Response Time**

View metrics in the **Metrics** tab.

### Alerts

Set up alerts for:
- Service downtime
- High error rates
- Resource usage thresholds

Go to **Settings** → **Alerts** to configure.

---

## Production Best Practices

1. **Environment Variables**: Never commit secrets. Use Render's environment variables.
2. **Database Migrations**: Always run migrations before deploying code that requires schema changes.
3. **Health Checks**: Keep health check endpoint simple and fast.
4. **Error Tracking**: Consider integrating error tracking (Sentry, etc.)
5. **Logging**: Use structured logging for better debugging.
6. **Backups**: Set up regular database backups (see [DEPLOYMENT.md](./DEPLOYMENT.md) for backup setup).
7. **Monitoring**: Set up uptime monitoring and alerts.
8. **Security**: 
   - Use strong `JWT_SECRET`
   - Enable HTTPS only
   - Restrict CORS in production
   - Use environment-specific variables

---

## Quick Reference

### Render Dashboard URLs

- **Dashboard**: https://dashboard.render.com
- **Your Service**: https://dashboard.render.com/web/[service-name]
- **Logs**: https://dashboard.render.com/web/[service-name]/logs

### Common Commands

```bash
# Install Render CLI (optional)
npm i -g render-cli

# Deploy from local (optional)
render deploy

# View logs
render logs [service-name]

# List services
render services list
```

### Service URLs

- **API Health**: `https://api.engineo.ai/health`
- **API Base**: `https://api.engineo.ai`

---

## Next Steps

After successful deployment:

1. Configure frontend (Vercel) to point to your API URL
2. Set up monitoring and error tracking
3. Configure CI/CD for automated testing
4. Set up staging environment
5. Configure production database backups
6. Set up Redis for background jobs (if needed)

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) – Full deployment guide including Neon, Vercel, and Cloudflare
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) – Frontend deployment guide
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) – Full project roadmap
- [API Specification](../API_SPEC.md) – API endpoints documentation

---

**Author:** Narasimhan Mahendrakumar
