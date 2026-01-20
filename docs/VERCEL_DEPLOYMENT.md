# Vercel Deployment Guide - Step by Step

This guide provides detailed step-by-step instructions for deploying the EngineO.ai Next.js frontend to Vercel.

---

## Environments – Web Instances

The frontend uses one Vercel project with separate environments:

| Environment | Branch    | Vercel environment | Domain (example)             |
| ----------- | --------- | ------------------ | ---------------------------- |
| Production  | `main`    | Production         | `https://app.engineo.ai`     |
| Staging     | `develop` | Preview/Staging    | `https://staging.engineo.ai` |

- Both environments use the same project name (for example, `engineo-web`).
- Environment variables differ per environment, especially URLs and CAPTCHA keys.

---

## Prerequisites

- [ ] GitHub repository is set up and pushed (repository: `narasimhan-me/EngineO.ai`)
- [ ] Vercel account created at [vercel.com](https://vercel.com)
- [ ] GitHub account connected to Vercel
- [ ] API backend is deployed (or you have the API URL ready)

---

## Step 1: Connect GitHub Account to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **Add New...** → **Project**
3. If prompted, click **Continue with GitHub** to connect your GitHub account
4. Authorize Vercel to access your repositories
5. Select your GitHub account/organization if prompted

---

## Step 2: Import Your Repository

1. In the **Import Git Repository** screen, search for `EngineO.ai` or `narasimhan-me/EngineO.ai`
2. Click **Import** next to your repository
3. You'll be taken to the project configuration screen

---

## Step 3: Configure Project Settings

### Basic Configuration

| Setting              | Value                                     | Notes                                            |
| -------------------- | ----------------------------------------- | ------------------------------------------------ |
| **Project Name**     | `engineo-web`                             | Or any name you prefer                           |
| **Framework Preset** | `Next.js`                                 | Should auto-detect                               |
| **Root Directory**   | `apps/web`                                | **Important:** Set this to the web app directory |
| **Build Command**    | `pnpm install && pnpm --filter web build` | Or use root-level build                          |
| **Output Directory** | `.next`                                   | Default for Next.js                              |
| **Install Command**  | `pnpm install`                            | Use pnpm for monorepo                            |

### Advanced Configuration (Optional)

Click **Show Advanced Options** to configure:

- **Node.js Version**: `20.x` (recommended)
- **Environment**: `Production` (for production deployments)

---

## Step 4: Configure Build Settings

Since this is a monorepo, you need to ensure Vercel can build from the correct directory:

### Option A: Root Directory Method (Recommended)

1. Set **Root Directory** to `apps/web`
2. Vercel will automatically:
   - Run `pnpm install` from the repo root
   - Run the build command from `apps/web`
   - Use the `.next` output directory

### Option B: Custom Build Command

If you need more control, use:

```bash
# Build Command
cd ../.. && pnpm install && pnpm --filter web build

# Output Directory
.next
```

### Verify Build Settings

Your configuration should look like:

```
Framework Preset: Next.js
Root Directory: apps/web
Build Command: (auto-detected or custom)
Output Directory: .next
Install Command: pnpm install
```

---

## Step 5: Add Environment Variables

Before deploying, add required environment variables:

1. In the project configuration screen, scroll to **Environment Variables**
2. Click **Add** for each variable below

### Required Variables

These variables are used in the web app code and must be set:

| Variable Name                  | Default (if not set)    | Description                          | Used In                                                                                                |
| ------------------------------ | ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`          | `http://localhost:3001` | Backend API URL                      | `src/lib/api.ts`, `src/app/projects/[id]/overview/page.tsx`, `src/app/projects/[id]/products/page.tsx` |
| `NEXT_PUBLIC_APP_URL`          | `http://localhost:3000` | Frontend app URL (used for metadata) | `src/app/(marketing)/layout.tsx`                                                                       |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | `''` (empty string)     | Cloudflare Turnstile site key        | `src/components/common/Captcha.tsx`                                                                    |

**Production Values:**

- `NEXT_PUBLIC_API_URL`: `https://api.engineo.ai` (or your production API URL)
- `NEXT_PUBLIC_APP_URL`: `https://app.engineo.ai` (or your Vercel deployment URL)
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY`: Your Cloudflare Turnstile site key from the dashboard

### Optional Variables

These variables are not currently used in the codebase but may be added in the future:

| Variable Name                        | Value          | Description                              |
| ------------------------------------ | -------------- | ---------------------------------------- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`      | `G-XXXXXXXXXX` | Google Analytics ID (if using)           |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...`  | Stripe publishable key (if using Stripe) |

### Environment-Specific Variables

You can set different values for different environments:

- **Production (main)**: Production URLs and keys (e.g., `https://api.engineo.ai`, `https://app.engineo.ai`)
- **Staging (develop)**: Staging URLs and keys (e.g., `https://staging-api.engineo.ai`, `https://staging.engineo.ai`)
- **Development**: Local development URLs

Click the environment dropdown next to each variable to set environment-specific values. On Vercel, map the `main` branch to Production and the `develop` branch to a staging/preview environment with its own domain.

### Reference: Environment Variables in Code

The environment variables and their defaults are defined in the following files:

- `apps/web/src/lib/api.ts` - `NEXT_PUBLIC_API_URL` (default: `http://localhost:3001`)
- `apps/web/src/app/(marketing)/layout.tsx` - `NEXT_PUBLIC_APP_URL` (default: `http://localhost:3000`)
- `apps/web/src/components/common/Captcha.tsx` - `NEXT_PUBLIC_CAPTCHA_SITE_KEY` (default: `''`)

To verify the current defaults or add new environment variables, check these files in the codebase.

---

## Step 6: Deploy

1. Review all settings
2. Click **Deploy** button
3. Vercel will:
   - Clone your repository
   - Install dependencies (`pnpm install`)
   - Build your Next.js app
   - Deploy to Vercel's CDN

### Monitor the Deployment

1. Watch the build logs in real-time
2. Check for any build errors
3. If successful, you'll see a **Success** message with a deployment URL

---

## Step 7: Verify Deployment

1. Click on the deployment URL (e.g., `engineo-web.vercel.app`)
2. Test the application:
   - Homepage loads correctly
   - Navigation works
   - API calls work (if backend is deployed)
   - No console errors

### Check Build Logs

If there are issues:

1. Go to **Deployments** tab
2. Click on the failed deployment
3. Review **Build Logs** for errors
4. Common issues:
   - Missing environment variables
   - Build command errors
   - TypeScript errors
   - Missing dependencies

---

## Step 8: Configure Custom Domain

### Add Domain in Vercel

1. Go to your project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain: `app.engineo.ai`
4. Click **Add**

### Configure DNS in Cloudflare

Vercel will show you the DNS records to add. Typically:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (`engineo.ai`)
3. Go to **DNS** → **Records**
4. Add a CNAME record:

| Type  | Name  | Target                 | Proxy Status           |
| ----- | ----- | ---------------------- | ---------------------- |
| CNAME | `app` | `cname.vercel-dns.com` | Proxied (orange cloud) |

5. Save the record

### Verify Domain

1. Wait a few minutes for DNS propagation
2. In Vercel, the domain status should change to **Valid Configuration**
3. SSL certificate will be automatically provisioned
4. Your site will be accessible at `https://app.engineo.ai`

---

## Step 9: Configure Automatic Deployments

Vercel automatically deploys on:

- **Push to `main` branch** → Production deployment (production domain)
- **Push to `develop` branch** → Staging deployment (staging domain / preview environment)
- **Pull requests / other branches** → Preview deployments

### Branch Protection (Optional)

1. Go to **Settings** → **Git**
2. Configure branch protection:
   - Require preview deployments for PRs
   - Auto-assign reviewers
   - Block production deployments without approval

---

## Step 10: Post-Deployment Checklist

- [ ] Homepage loads at custom domain
- [ ] All environment variables are set correctly
- [ ] API calls work (test login, signup, etc.)
- [ ] CAPTCHA works on contact/signup forms
- [ ] SSL certificate is active (HTTPS works)
- [ ] No console errors in browser
- [ ] Performance is acceptable (check Vercel Analytics)

---

## Troubleshooting

### Build Fails: "Cannot find module"

**Solution:** Ensure `Root Directory` is set to `apps/web` and build command includes monorepo context.

### Build Fails: TypeScript Errors

**Solution:**

1. Fix TypeScript errors locally first
2. Run `pnpm --filter web build` locally to verify
3. Ensure `tsconfig.json` is correct in `apps/web`

### Environment Variables Not Working

**Solution:**

1. Variables starting with `NEXT_PUBLIC_` are available in browser
2. Other variables are server-side only
3. Redeploy after adding/changing environment variables

### API Calls Failing

**Solution:**

1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check CORS settings on API backend
3. Verify API is deployed and accessible
4. Check browser console for CORS errors

### Domain Not Working

**Solution:**

1. Verify DNS records in Cloudflare
2. Wait for DNS propagation (can take up to 48 hours, usually < 1 hour)
3. Check domain status in Vercel dashboard
4. Ensure SSL certificate is provisioned

---

## Updating Deployment

### Automatic Updates

Vercel automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Vercel will detect the push and start a new deployment.

### Manual Redeploy

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on any deployment
3. Click **Redeploy**

### Rollback

1. Go to **Deployments** tab
2. Find a previous successful deployment
3. Click **⋯** → **Promote to Production**

---

## Monitoring & Analytics

### Vercel Analytics

1. Go to **Analytics** tab in your project
2. Enable **Web Analytics** (free tier available)
3. View:
   - Page views
   - Unique visitors
   - Performance metrics
   - Core Web Vitals

### Function Logs

1. Go to **Deployments** → Select deployment
2. Click **Functions** tab
3. View serverless function logs
4. Check for errors or performance issues

---

## Production Best Practices

1. **Environment Variables**: Never commit secrets. Use Vercel's environment variables.
2. **Build Optimization**: Enable Vercel's automatic optimizations
3. **Caching**: Configure caching headers for static assets
4. **Error Tracking**: Integrate error tracking (Sentry, etc.)
5. **Performance**: Monitor Core Web Vitals in Vercel Analytics
6. **Backups**: Keep regular backups of your database (Neon handles this)

---

## Quick Reference

### Vercel Dashboard URLs

- **Projects**: https://vercel.com/dashboard
- **Your Project**: https://vercel.com/[username]/engineo-web
- **Deployments**: https://vercel.com/[username]/engineo-web/deployments

### Common Commands

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy from local (optional)
vercel

# Link local project to Vercel
vercel link

# Pull environment variables
vercel env pull .env.local
```

---

## Next Steps

After successful deployment:

1. Configure API backend (Render) to accept requests from Vercel domain
2. Set up monitoring and error tracking
3. Configure CI/CD for automated testing
4. Set up staging environment
5. Configure production database (Neon)

---

**Author:** Narasimhan Mahendrakumar
