# Cloudflare Turnstile Setup Guide

This guide provides step-by-step instructions for setting up Cloudflare Turnstile CAPTCHA for EngineO.ai to protect contact forms, signup, and login flows from abuse.

---

## What is Cloudflare Turnstile?

Cloudflare Turnstile is a privacy-friendly CAPTCHA alternative that:

- Protects forms from bots and spam
- Works invisibly for most users (no puzzles to solve)
- Is free to use
- Respects user privacy
- Provides better UX than traditional CAPTCHAs

---

## Prerequisites

- [ ] Cloudflare account (free tier works)
- [ ] Access to Cloudflare Dashboard
- [ ] Domain name (optional, but recommended for production)

---

## Step 1: Create a Cloudflare Account

1. Go to [cloudflare.com](https://www.cloudflare.com)
2. Click **Sign Up** (or **Log In** if you already have an account)
3. Complete the signup process
4. Verify your email address

> **Note:** You don't need to add your domain to Cloudflare to use Turnstile. Turnstile works independently.

---

## Step 2: Access Turnstile Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. In the left sidebar, scroll down and click **Turnstile**
3. You'll see the Turnstile management page

---

## Step 3: Create a Site

1. Click **Add Site** button
2. Fill in the form:

| Field           | Value                   | Notes                                           |
| --------------- | ----------------------- | ----------------------------------------------- |
| **Site Name**   | `EngineO.ai Production` | Descriptive name for your reference             |
| **Domain**      | `app.engineo.ai`        | Your production domain (or `localhost` for dev) |
| **Widget Mode** | `Managed`               | Recommended for most use cases                  |

### Widget Mode Options

- **Managed** (Recommended): Cloudflare automatically chooses the best challenge type
- **Non-Interactive**: Always invisible, no user interaction
- **Invisible**: Completely invisible, runs in background
- **Interactive**: Always shows a challenge (like traditional CAPTCHA)

3. Click **Create**

---

## Step 4: Get Your Keys

After creating a site, you'll see two keys:

### Site Key (Public Key)

- **Format**: Starts with `0x` followed by alphanumeric characters
- **Example**: `0x4AAAAAAABkMYinukVXMcR5`
- **Usage**: Used in frontend (Next.js app)
- **Security**: Safe to expose publicly (it's meant to be in client-side code)

### Secret Key (Private Key)

- **Format**: Starts with `0x` followed by longer alphanumeric string
- **Example**: `0x4AAAAAAABkMYinukVXMcR5abcdefghijklmnopqrstuvwxyz123456`
- **Usage**: Used in backend (NestJS API)
- **Security**: **NEVER expose this publicly** - keep it secret!

---

## Step 5: Configure Frontend (Next.js)

### Add Environment Variable

1. Open `apps/web/.env.local` (create if it doesn't exist)
2. Add the Site Key:

```bash
NEXT_PUBLIC_CAPTCHA_SITE_KEY=0x4AAAAAAABkMYinukVXMcR5
NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
```

3. Save the file

### For Production (Vercel)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - **Name**: `NEXT_PUBLIC_CAPTCHA_SITE_KEY`
   - **Value**: Your Turnstile Site Key
   - **Environment**: Production, Preview, Development (select all)
4. Add:
   - **Name**: `NEXT_PUBLIC_CAPTCHA_PROVIDER`
   - **Value**: `turnstile`
   - **Environment**: Production, Preview, Development (select all)
5. Click **Save**

### Verify Frontend Integration

The frontend is already set up to use Turnstile. The `Captcha` component in `apps/web/src/components/common/Captcha.tsx` will automatically use your site key.

**Test it:**

1. Start your Next.js dev server: `pnpm --filter web dev`
2. Navigate to `/contact` page
3. You should see the Turnstile widget
4. Complete the challenge and verify it works

---

## Step 6: Configure Backend (NestJS API)

### Add Environment Variables

1. Open `apps/api/.env` (or `.env.production` for production)
2. Add the Secret Key:

```bash
CAPTCHA_SECRET_KEY=0x4AAAAAAABkMYinukVXMcR5abcdefghijklmnopqrstuvwxyz123456
CAPTCHA_PROVIDER=turnstile
```

3. Save the file

### For Production (Render)

1. Go to your Render dashboard
2. Select your API service
3. Go to **Environment** tab
4. Add environment variables:

| Variable             | Value                     |
| -------------------- | ------------------------- |
| `CAPTCHA_SECRET_KEY` | Your Turnstile Secret Key |
| `CAPTCHA_PROVIDER`   | `turnstile`               |

5. Click **Save Changes**
6. **Important**: Restart your service for changes to take effect

### Verify Backend Integration

The backend is already set up. The `CaptchaService` in `apps/api/src/captcha/captcha.service.ts` will automatically verify tokens using your secret key.

**Test it:**

1. Submit a form with a valid CAPTCHA token
2. Check API logs to ensure verification succeeds
3. Try submitting without a token - should fail with error

---

## Step 7: Test Keys (Development)

Cloudflare provides test keys for development that always pass/fail:

### Always Passes (Development)

**Site Key:**

```
1x00000000000000000000AA
```

**Secret Key:**

```
1x0000000000000000000000000000000AA
```

### Always Fails (Testing Error Handling)

**Site Key:**

```
2x00000000000000000000AB
```

**Secret Key:**

```
2x0000000000000000000000000000000AB
```

### Using Test Keys

For local development, you can use test keys in your `.env.local`:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_CAPTCHA_SITE_KEY=1x00000000000000000000AA

# Backend (.env)
CAPTCHA_SECRET_KEY=1x0000000000000000000000000000000AA
```

> **Note:** The code already includes fallback to test keys if environment variables are not set, but it's better to explicitly set them.

---

## Step 8: Configure Multiple Domains (Optional)

If you have multiple environments (dev, staging, production), you can:

### Option A: One Site for All Domains

1. In Turnstile dashboard, edit your site
2. Add multiple domains:
   - `localhost` (for local dev)
   - `app.engineo.ai` (production)
   - `staging.engineo.ai` (staging)
3. Use the same keys for all environments

### Option B: Separate Sites per Environment

1. Create separate Turnstile sites:
   - `EngineO.ai - Development`
   - `EngineO.ai - Staging`
   - `EngineO.ai - Production`
2. Use different keys for each environment
3. Set environment-specific variables in Vercel/Render

---

## Step 9: Verify Integration

### Test Contact Form

1. Navigate to `/contact` page
2. Fill out the form
3. Complete the Turnstile challenge
4. Submit the form
5. Verify:
   - Form submits successfully
   - No errors in browser console
   - Backend receives and verifies the token

### Test Signup Form

1. Navigate to `/signup` page
2. Fill out the signup form
3. Complete the Turnstile challenge
4. Submit the form
5. Verify user is created successfully

### Test Login (After Failed Attempts)

1. Navigate to `/login` page
2. Enter incorrect credentials **twice**
3. On the third attempt, verify:
   - Turnstile widget appears
   - Form cannot be submitted without completing CAPTCHA
4. Complete CAPTCHA and submit
5. Verify login works or shows appropriate error

---

## Step 10: Monitor Usage

### View Analytics

1. Go to Cloudflare Dashboard → **Turnstile**
2. Click on your site
3. View analytics:
   - Total challenges
   - Success rate
   - Bot detection rate
   - Geographic distribution

### Check Logs

Monitor your backend logs for:

- CAPTCHA verification failures
- Error patterns
- Unusual activity

---

## Troubleshooting

### Widget Not Appearing

**Symptoms:** Turnstile widget doesn't show on the page

**Solutions:**

1. Check `NEXT_PUBLIC_CAPTCHA_SITE_KEY` is set correctly
2. Verify the site key is valid in Cloudflare dashboard
3. Check browser console for errors
4. Ensure domain matches the one configured in Turnstile
5. Verify the `@marsidev/react-turnstile` package is installed

### Verification Always Fails

**Symptoms:** Forms always fail CAPTCHA verification

**Solutions:**

1. Check `CAPTCHA_SECRET_KEY` is set correctly in backend
2. Verify secret key matches the site key in Cloudflare
3. Check backend logs for Turnstile API errors
4. Ensure domain matches between frontend and Turnstile config
5. Verify network connectivity to `challenges.cloudflare.com`

### "Invalid site key" Error

**Symptoms:** Error message about invalid site key

**Solutions:**

1. Verify site key is copied correctly (no extra spaces)
2. Check domain matches in Turnstile dashboard
3. Ensure you're using the correct key (site key for frontend, secret key for backend)
4. For localhost, make sure `localhost` is added to allowed domains in Turnstile

### Widget Shows "Unable to verify" Error

**Symptoms:** Widget displays error message

**Solutions:**

1. Check internet connectivity
2. Verify Cloudflare services are operational
3. Check if domain is blocked or restricted
4. Try clearing browser cache
5. Check browser console for specific error messages

### Test Keys Not Working

**Symptoms:** Test keys don't work in development

**Solutions:**

1. Verify you're using the correct test keys:
   - Site: `1x00000000000000000000AA`
   - Secret: `1x0000000000000000000000000000000AA`
2. Ensure environment variables are loaded (restart dev server)
3. Check that test keys aren't being overridden by production keys

---

## Security Best Practices

### 1. Never Commit Secrets

- ✅ Add `.env` files to `.gitignore`
- ✅ Use `.env.example` with placeholder values
- ✅ Store secrets in environment variables (Vercel, Render)
- ❌ Never commit `.env` files with real keys

### 2. Use Different Keys per Environment

- Development: Use test keys
- Staging: Use separate Turnstile site
- Production: Use production Turnstile site

### 3. Rotate Keys Periodically

- Review Turnstile usage monthly
- Rotate keys if suspicious activity detected
- Update keys in all environments when rotating

### 4. Monitor Usage

- Set up alerts for unusual verification failure rates
- Monitor Turnstile analytics dashboard
- Review backend logs regularly

### 5. Domain Validation

- Only allow verified domains in Turnstile configuration
- Don't use wildcard domains unless necessary
- Remove unused domains from configuration

---

## Environment Variables Summary

### Frontend (Next.js / Vercel)

```bash
NEXT_PUBLIC_CAPTCHA_SITE_KEY=0x4AAAAAAABkMYinukVXMcR5
NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
```

### Backend (NestJS / Render)

```bash
CAPTCHA_SECRET_KEY=0x4AAAAAAABkMYinukVXMcR5abcdefghijklmnopqrstuvwxyz123456
CAPTCHA_PROVIDER=turnstile
```

### Development (Local)

```bash
# Frontend
NEXT_PUBLIC_CAPTCHA_SITE_KEY=1x00000000000000000000AA

# Backend
CAPTCHA_SECRET_KEY=1x0000000000000000000000000000000AA
```

---

## Quick Reference

### Turnstile Dashboard

- **URL**: https://dash.cloudflare.com → Turnstile
- **Documentation**: https://developers.cloudflare.com/turnstile/

### Test Keys

- **Always Passes**: Site `1x00000000000000000000AA`, Secret `1x0000000000000000000000000000000AA`
- **Always Fails**: Site `2x00000000000000000000AB`, Secret `2x0000000000000000000000000000000AB`

### Verification Endpoint

- **URL**: `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- **Method**: POST
- **Content-Type**: `application/x-www-form-urlencoded`

### React Component

- **Package**: `@marsidev/react-turnstile`
- **Component**: `<Turnstile />`
- **Location**: `apps/web/src/components/common/Captcha.tsx`

---

## Next Steps

After setting up Turnstile:

1. ✅ Test all forms (contact, signup, login)
2. ✅ Monitor Turnstile analytics
3. ✅ Set up error alerts
4. ✅ Document keys in secure password manager
5. ✅ Update team on CAPTCHA configuration

---

**Author:** Narasimhan Mahendrakumar
