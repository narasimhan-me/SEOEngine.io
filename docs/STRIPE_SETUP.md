# Stripe Setup & Integration Guide

**Version:** 1.0 — December 2025
**Phase:** BILLING-1

---

## Table of Contents

1. [Quick Start Checklist](#quick-start-checklist)
2. [Create Stripe Account](#1-create-stripe-account)
3. [Get API Keys](#2-get-api-keys)
4. [Create Products & Prices](#3-create-products--prices)
5. [Set Up Webhook Endpoint](#4-set-up-webhook-endpoint)
6. [Configure Environment Variables](#5-configure-environment-variables)
7. [Install Stripe CLI](#6-install-stripe-cli-local-development)
8. [Forward Webhooks Locally](#7-forward-webhooks-locally)
9. [Database Schema](#8-database-schema)
10. [Start the Application](#9-start-the-application)
11. [Test the Integration](#10-test-the-integration)
12. [Configure Customer Portal](#11-configure-customer-portal)
13. [Production Deployment](#12-production-deployment)
14. [Test Cards Reference](#13-test-cards-reference)
15. [Troubleshooting](#14-troubleshooting)

---

## Quick Start Checklist

Follow these steps in order to get Stripe working in your local environment:

- [ ] **Step 1:** Create Stripe account and get API keys
- [ ] **Step 2:** Create Pro and Business products with monthly prices ($29 and $99)
- [ ] **Step 3:** Copy Price IDs from Stripe Dashboard
- [ ] **Step 4:** Add environment variables to `apps/api/.env`:
  - [ ] `STRIPE_SECRET_KEY` (from API Keys page)
  - [ ] `STRIPE_PRICE_PRO` (from Pro product)
  - [ ] `STRIPE_PRICE_BUSINESS` (from Business product)
  - [ ] `FRONTEND_URL=http://localhost:3000`
- [ ] **Step 5:** Install Stripe CLI (`brew install stripe/stripe-cli/stripe`)
- [ ] **Step 6:** Run `stripe listen --forward-to localhost:3001/billing/webhook`
- [ ] **Step 7:** Copy webhook secret from CLI output to `STRIPE_WEBHOOK_SECRET` in `.env`
- [ ] **Step 8:** Restart API server
- [ ] **Step 9:** Start frontend and test checkout flow

**Estimated time:** 15-20 minutes

---

## 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and click **Start now**
2. Enter your email and create a password
3. Complete account verification (can skip for test mode)
4. You'll land on the Dashboard in **Test Mode**

> **Note:** The toggle for Test/Live mode is in the top-right corner of the dashboard. Always use Test Mode during development.

---

## 2. Get API Keys

1. Navigate to **Developers → API Keys**
   Direct link: [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)

2. You'll see two keys:

| Key Type | Format | Usage |
|----------|--------|-------|
| Publishable key | `pk_test_...` | Frontend (not needed for BILLING-1) |
| Secret key | `sk_test_...` | Backend API calls |

3. Click **Reveal test key** next to the Secret key and copy it

> **Security:** Never commit your secret key to version control. Always use environment variables.

---

## 3. Create Products & Prices

### 3.1 Navigate to Products

Go to **Products** in the left sidebar, or visit [dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)

### 3.2 Create Pro Plan

1. Click **+ Add product**
2. Fill in the details:
   - **Name:** `Pro`
   - **Description:** `5 projects, 500 crawled pages, 25 automation suggestions per day`
3. Under **Price information:**
   - **Pricing model:** Standard pricing
   - **Price:** `$29.00` (enter as `29.00`)
   - **Currency:** `USD`
   - **Billing period:** `Monthly` (recurring)
4. Click **Save product**
5. After saving, you'll see the product page. In the **Pricing** section, you'll see the price you just created
6. Click on the price to view details, or look for the **Price ID** in the format `price_1ABC123...`
7. **Copy the Price ID** - you'll need this for `STRIPE_PRICE_PRO`

> **Tip:** The Price ID is different from the Product ID. Make sure you copy the **Price ID** which starts with `price_`.

### 3.3 Create Business Plan

1. Click **+ Add product** again (or go back to Products page)
2. Fill in the details:
   - **Name:** `Business`
   - **Description:** `Unlimited projects, unlimited crawled pages, unlimited automation suggestions`
3. Under **Price information:**
   - **Pricing model:** Standard pricing
   - **Price:** `$99.00` (enter as `99.00`)
   - **Currency:** `USD`
   - **Billing period:** `Monthly` (recurring)
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_`) - you'll need this for `STRIPE_PRICE_BUSINESS`

### 3.4 Verify Your Price IDs

You should now have two Price IDs. They will look like:
- Pro: `price_1ABC123def456...` (starts with `price_`)
- Business: `price_1DEF789ghi012...` (starts with `price_`)

> **Important:** 
> - Price IDs are different from Product IDs
> - Price IDs start with `price_`
> - Product IDs start with `prod_`
> - You need the **Price ID** for environment variables

---

## 4. Set Up Webhook Endpoint

Webhooks allow Stripe to notify your application when events occur (e.g., successful payments, subscription changes).

### 4.1 For Local Development

Skip the dashboard webhook setup — we'll use Stripe CLI instead (see [Section 6](#6-install-stripe-cli-local-development)).

### 4.2 For Production

1. Go to **Developers → Webhooks**
   Direct link: [dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)

2. Click **+ Add endpoint**

3. Configure the endpoint:
   - **Endpoint URL:** `https://your-api-domain.com/billing/webhook`
   - **Description:** `EngineO.ai Billing Webhooks`

4. Under **Select events to listen to**, click **+ Select events** and choose:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Click **Add endpoint**

6. On the endpoint page, click **Reveal** under Signing secret and copy the value (e.g., `whsec_...`)

---

## 5. Configure Environment Variables

Add the following to `apps/api/.env`:

```bash
# ===========================================
# STRIPE CONFIGURATION
# ===========================================

# Your Stripe Secret Key (starts with sk_test_ for test mode)
# Get this from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_51ABC123...

# Webhook Signing Secret (starts with whsec_)
# For local dev: get from `stripe listen` command output (see Section 7)
# For production: get from Stripe Dashboard webhook endpoint (see Section 4.2)
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs for your subscription plans
# Get these from Stripe Dashboard → Products → [Product] → Pricing section
STRIPE_PRICE_PRO=price_1ABC123...
STRIPE_PRICE_BUSINESS=price_1DEF789...

# Frontend URL (used for Stripe redirect URLs after checkout)
# For local development:
FRONTEND_URL=http://localhost:3000
# For production, use your actual domain:
# FRONTEND_URL=https://app.engineo.ai
```

### Step-by-Step Environment Setup

1. **Open your `.env` file:**
   ```bash
   cd apps/api
   # Edit .env file (create it if it doesn't exist)
   ```

2. **Add Stripe Secret Key:**
   - Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/test/apikeys)
   - Click **Reveal test key** next to the Secret key
   - Copy the key (starts with `sk_test_`)
   - Add to `.env`: `STRIPE_SECRET_KEY=sk_test_...`

3. **Add Price IDs:**
   - Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
   - Click on your **Pro** product
   - Find the Price ID in the Pricing section (starts with `price_`)
   - Copy and add: `STRIPE_PRICE_PRO=price_...`
   - Repeat for **Business** product: `STRIPE_PRICE_BUSINESS=price_...`

4. **Add Frontend URL:**
   - For local: `FRONTEND_URL=http://localhost:3000`
   - For production: `FRONTEND_URL=https://your-domain.com`

5. **Webhook Secret (for local):**
   - Skip this for now - you'll get it when running `stripe listen` (see Section 7)
   - For production, add it after setting up the webhook endpoint (see Section 4.2)

### Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | API authentication | `sk_test_51ABC...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | `whsec_abc123...` |
| `STRIPE_PRICE_PRO` | Pro plan price ID | `price_1ABC...` |
| `STRIPE_PRICE_BUSINESS` | Business plan price ID | `price_1DEF...` |
| `FRONTEND_URL` | Redirect URL after checkout | `http://localhost:3000` |

---

## 6. Install Stripe CLI (Local Development)

The Stripe CLI allows you to forward webhook events to your local server.

### macOS (Homebrew)

```bash
brew install stripe/stripe-cli/stripe
```

### Windows (Scoop)

```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

### Windows (Chocolatey)

```bash
choco install stripe-cli
```

### Linux (Debian/Ubuntu)

```bash
# Add Stripe's GPG key
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list

# Update and install
sudo apt update
sudo apt install stripe
```

### Docker

```bash
docker run --rm -it stripe/stripe-cli:latest
```

### Verify Installation

```bash
stripe --version
# Output: stripe version x.x.x
```

---

## 7. Forward Webhooks Locally

### 7.1 Login to Stripe CLI

```bash
stripe login
```

This opens your browser to authorize the CLI. Click **Allow access**.

### 7.2 Start Webhook Forwarding

1. **Open a new terminal window** (keep your API server running in another terminal)

2. **Start the Stripe webhook listener:**
   ```bash
   stripe listen --forward-to localhost:3001/billing/webhook
   ```

3. **You'll see output like:**
   ```
   > Ready! You are using Stripe API Version [2023-10-16]. Your webhook signing secret is whsec_abc123def456... (^C to quit)
   ```

4. **Copy the webhook signing secret** from the output (starts with `whsec_`)

### 7.3 Update Environment Variable

1. **Open your `.env` file:**
   ```bash
   cd apps/api
   # Edit .env file
   ```

2. **Add or update the webhook secret:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_abc123def456...
   ```
   (Replace with the actual secret from step 7.2)

3. **Restart your API server** for the changes to take effect:
   ```bash
   # Stop the server (Ctrl+C) and restart
   pnpm start:dev
   ```

> **Important:** 
> - The signing secret changes each time you run `stripe listen`
> - If you restart `stripe listen`, you must update `STRIPE_WEBHOOK_SECRET` and restart your API server
> - Keep the `stripe listen` terminal running while developing
> - For production, use a persistent webhook endpoint (see Section 4.2)

### 7.4 Keep Terminal Running

Leave this terminal running while developing. Webhook events will be logged here.

---

## 8. Database Schema

Ensure your Prisma schema includes Stripe fields. Check `apps/api/prisma/schema.prisma`:

```prisma
model Subscription {
  id                   String    @id @default(cuid())
  userId               String    @unique
  user                 User      @relation(fields: [userId], references: [id])
  plan                 String    @default("free")
  status               String    @default("active")
  stripeCustomerId     String?
  stripeSubscriptionId String?
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
}
```

### Apply Schema Changes (if needed)

```bash
cd apps/api
npx prisma migrate dev --name add_stripe_fields
```

---

## 9. Start the Application

You'll need **three terminal windows** running simultaneously:

### Terminal 1: API Server

```bash
# Navigate to API directory
cd apps/api

# Start the development server
pnpm start:dev
```

**Expected output:**
```
🚀 SEOEngine API is running on: http://localhost:3001
```

**Wait for:** The server to fully start (you'll see the "running on" message)

### Terminal 2: Web Frontend

```bash
# Navigate to web directory
cd apps/web

# Start the Next.js development server
pnpm dev
```

**Expected output:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
```

**Wait for:** The server to compile and show "Ready"

### Terminal 3: Stripe Webhook Forwarding

```bash
# Make sure you're logged in (see Section 7.1)
stripe listen --forward-to localhost:3001/billing/webhook
```

**Expected output:**
```
> Ready! You are using Stripe API Version [2023-10-16].
> Your webhook signing secret is whsec_...
```

**Important:** 
- Keep all three terminals running
- If you see webhook errors, check that Terminal 1 (API) is running
- Copy the webhook secret to your `.env` file (see Section 7.3)

---

## 10. Test the Integration

### 10.1 Open the Application

Navigate to [http://localhost:3000](http://localhost:3000)

### 10.2 Login or Register

Create a test account or login with existing credentials.

### 10.3 Navigate to Billing

Go to **Settings → Billing** or directly to [http://localhost:3000/settings/billing](http://localhost:3000/settings/billing)

### 10.4 Initiate Upgrade

1. You should see three plans: **Free**, **Pro**, and **Business**
2. Click the **Upgrade** or **Get Started** button on either Pro or Business plan
3. You'll be redirected to Stripe Checkout

### 10.5 Complete Stripe Checkout

On the Stripe Checkout page:

1. **Enter test card details:**
   | Field | Value |
   |-------|-------|
   | Card number | `4242 4242 4242 4242` |
   | Expiry | Any future date (e.g., `12/34` or `12/25`) |
   | CVC | Any 3 digits (e.g., `123`) |
   | ZIP | Any 5 digits (e.g., `12345`) |

2. **Fill in email** (use a test email, e.g., `test@example.com`)

3. **Click "Subscribe"** or "Pay" button

### 10.6 Verify Success

After completing checkout, verify the following:

1. **Redirect:** You should be redirected to `/settings/billing?success=true`

2. **Success Message:** A success message should appear on the billing page

3. **Plan Update:** 
   - Refresh the billing page
   - Your plan should now show as **Pro** or **Business** (not Free)
   - Check the plan limits and features

4. **Webhook Events:** 
   - Check Terminal 3 (Stripe CLI) - you should see webhook events logged:
     ```
     checkout.session.completed [200]
     customer.subscription.created [200]
     ```

5. **Database Check (optional):**
   - Check your database `Subscription` table
   - Verify `stripeCustomerId` and `stripeSubscriptionId` are populated
   - Verify `plan` is set to `pro` or `business`
   - Verify `status` is `active`

### 10.7 Test Billing Portal

1. On the billing page, click **Manage Billing** or **Manage Subscription**
2. You should be redirected to Stripe Customer Portal
3. You can view invoices, update payment methods, or cancel subscription
4. After canceling, you'll be redirected back to your billing page

---

## 11. Configure Customer Portal

The Stripe Customer Portal allows users to manage their subscriptions, update payment methods, and view invoices.

### 11.1 Access Portal Settings

Go to **Settings → Billing → Customer portal**
Direct link: [dashboard.stripe.com/test/settings/billing/portal](https://dashboard.stripe.com/test/settings/billing/portal)

### 11.2 Configure Features

Enable the following:

**Payment methods:**
- ✅ Allow customers to update payment methods

**Invoices:**
- ✅ Show invoice history

**Subscriptions:**
- ✅ Allow customers to cancel subscriptions
- ✅ Allow customers to switch plans (optional)

**Branding:**
- Add your logo and colors (optional)

### 11.3 Save Configuration

Click **Save** at the bottom of the page.

---

## 12. Production Deployment

### 12.1 Switch to Live Mode

1. Toggle from **Test** to **Live** mode in the Stripe Dashboard
2. Complete any required account verification

### 12.2 Create Live Products

1. **Switch to Live mode** in Stripe Dashboard (toggle in top-right)

2. **Repeat [Section 3](#3-create-products--prices) in Live mode:**
   - Create **Pro** product with $29/month recurring price
   - Create **Business** product with $99/month recurring price
   - Copy the new **Price IDs** (they will be different from test mode)

3. **Important:** Live mode Price IDs are different from test mode Price IDs
   - Test mode: `price_1ABC...` (test)
   - Live mode: `price_1XYZ...` (live)
   - Make sure you use the **live** Price IDs in production

### 12.3 Create Live Webhook Endpoint

Repeat [Section 4.2](#42-for-production) with your production URL.

### 12.4 Update Production Environment Variables

**In your production environment** (e.g., Render, Vercel, or your hosting platform):

```bash
# Production Stripe Configuration
# Get from: https://dashboard.stripe.com/apikeys (Live mode)
STRIPE_SECRET_KEY=sk_live_...

# Get from webhook endpoint (see Section 12.3)
STRIPE_WEBHOOK_SECRET=whsec_...

# Get from Products page in Live mode (see Section 12.2)
STRIPE_PRICE_PRO=price_...       # Live Pro price ID
STRIPE_PRICE_BUSINESS=price_...  # Live Business price ID

# Your production frontend URL
FRONTEND_URL=https://app.engineo.ai
```

**Where to set these:**
- **Render:** Dashboard → Your API Service → Environment → Add Environment Variable
- **Vercel:** Project Settings → Environment Variables
- **Other platforms:** Check your platform's documentation for environment variable configuration

**Important:**
- Never commit production keys to version control
- Use your platform's secure environment variable storage
- Test with a small transaction first before going fully live

### 12.5 Deploy and Test

1. Deploy your application
2. Test with a real card (you can immediately refund)
3. Verify webhook events are received
4. Check subscription is created in database

---

## 13. Test Cards Reference

Use these card numbers in Test mode:

### Successful Payments

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Visa - Always succeeds |
| `5555 5555 5555 4444` | Mastercard - Always succeeds |
| `3782 822463 10005` | American Express - Always succeeds |

### Authentication Required

| Card Number | Description |
|-------------|-------------|
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0027 6000 3184` | Requires authentication on all transactions |

### Declined Payments

| Card Number | Description |
|-------------|-------------|
| `4000 0000 0000 0002` | Generic decline |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 9987` | Lost card |
| `4000 0000 0000 9979` | Stolen card |
| `4100 0000 0000 0019` | Fraudulent card |

### Special Cases

| Card Number | Description |
|-------------|-------------|
| `4000 0000 0000 0341` | Attaching card to customer fails |
| `4000 0000 0000 3220` | 3D Secure 2 - always authenticated |

> **Note:** Use any future expiry date, any 3-digit CVC, and any 5-digit ZIP code.

---

## 14. Troubleshooting

### "Stripe is not configured" Error

**Cause:** `STRIPE_SECRET_KEY` is not set or invalid.

**Solution:**
1. Verify the key in your `.env` file
2. Restart the API server after changing `.env`
3. Check for typos or extra whitespace

### Webhook Events Not Received

**Cause:** Stripe CLI not running or wrong endpoint.

**Solution:**
```bash
# Verify Stripe CLI is running
stripe listen --forward-to localhost:3001/billing/webhook

# Test the endpoint manually
curl -X POST http://localhost:3001/billing/webhook -d "{}" -H "Content-Type: application/json"
```

### "Webhook signature verification failed" Error

**Cause:** Mismatched webhook signing secret.

**Solution:**
1. Copy the secret from `stripe listen` output
2. Update `STRIPE_WEBHOOK_SECRET` in `.env`
3. Restart the API server

### Checkout Redirects to Wrong URL

**Cause:** `FRONTEND_URL` is incorrect.

**Solution:**
1. Verify `FRONTEND_URL` in `.env`
2. For local: `http://localhost:3000`
3. For production: Your actual domain with `https://`

### Subscription Not Updated After Checkout

**Cause:** Webhook not processed successfully.

**Solution:**
1. Check Stripe CLI terminal for errors
2. Verify `checkout.session.completed` event is received
3. Check API logs for errors in webhook handler
4. Ensure `stripeCustomerId` is being saved

### "No Stripe customer found" for Billing Portal

**Cause:** User never created a Stripe customer.

**Solution:**
- User must complete at least one checkout to create a Stripe customer
- The customer is automatically created during checkout
- If testing, complete a test checkout first, then try the portal

### Price ID Not Found Error

**Cause:** `STRIPE_PRICE_PRO` or `STRIPE_PRICE_BUSINESS` is not set or incorrect.

**Solution:**
1. Verify the environment variable is set in `apps/api/.env`
2. Check that you copied the **Price ID** (starts with `price_`), not the Product ID
3. Ensure there are no extra spaces or quotes around the value
4. Restart the API server after updating `.env`

### Checkout Session Creation Fails

**Cause:** Missing or invalid Stripe configuration.

**Solution:**
1. Verify `STRIPE_SECRET_KEY` is set and valid
2. Check that `STRIPE_PRICE_PRO` or `STRIPE_PRICE_BUSINESS` matches the plan you're trying to upgrade to
3. Ensure `FRONTEND_URL` is set correctly
4. Check API server logs for detailed error messages
5. Verify you're using test mode keys with test mode prices

### Webhook Handler Returns 400

**Cause:** Webhook signature verification failed.

**Solution:**
1. Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from `stripe listen` output
2. If you restarted `stripe listen`, update the secret in `.env` and restart API server
3. For production, verify the webhook secret matches the one from Stripe Dashboard
4. Check that the webhook endpoint URL is correct

---

## Quick Reference

### Local Development URLs

| Service | URL |
|---------|-----|
| Web Frontend | http://localhost:3000 |
| API Backend | http://localhost:3001 |
| Billing Page | http://localhost:3000/settings/billing |
| Stripe Dashboard | https://dashboard.stripe.com/test |

### API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/billing/plans` | No | List all available plans |
| GET | `/billing/subscription` | Yes | Get current user's subscription |
| GET | `/billing/entitlements` | Yes | Get user's plan limits and current usage |
| POST | `/billing/create-checkout-session` | Yes | Create Stripe Checkout session (body: `{ planId: "pro" \| "business" }`) |
| POST | `/billing/create-portal-session` | Yes | Create Stripe Customer Portal session |
| POST | `/billing/webhook` | No* | Stripe webhook receiver (uses signature verification) |
| POST | `/billing/subscribe` | Yes | Legacy: Update subscription directly (admin/testing) |
| POST | `/billing/cancel` | Yes | Legacy: Cancel subscription (use portal instead) |

\* Webhook endpoint uses Stripe signature verification instead of JWT auth

### Plan IDs

| Plan | ID | Price |
|------|-------|-------|
| Free | `free` | $0/month |
| Pro | `pro` | $29/month |
| Business | `business` | $99/month |

---

## 15. Verification Checklist

Use this checklist to verify your Stripe integration is working correctly:

### Environment Variables ✅

- [ ] `STRIPE_SECRET_KEY` is set and starts with `sk_test_` (test mode)
- [ ] `STRIPE_WEBHOOK_SECRET` is set and starts with `whsec_`
- [ ] `STRIPE_PRICE_PRO` is set and starts with `price_`
- [ ] `STRIPE_PRICE_BUSINESS` is set and starts with `price_`
- [ ] `FRONTEND_URL` is set to `http://localhost:3000` (local) or your production URL

### Stripe Dashboard ✅

- [ ] Created Pro product with $29/month recurring price
- [ ] Created Business product with $99/month recurring price
- [ ] Copied correct Price IDs (not Product IDs)
- [ ] Test mode is enabled (toggle in top-right of dashboard)

### Local Setup ✅

- [ ] Stripe CLI is installed (`stripe --version` works)
- [ ] Logged into Stripe CLI (`stripe login` completed)
- [ ] Webhook forwarding is running (`stripe listen --forward-to localhost:3001/billing/webhook`)
- [ ] API server is running on port 3001
- [ ] Frontend is running on port 3000

### Testing ✅

- [ ] Can access `/settings/billing` page
- [ ] Can see all three plans (Free, Pro, Business)
- [ ] Clicking "Upgrade" redirects to Stripe Checkout
- [ ] Can complete checkout with test card `4242 4242 4242 4242`
- [ ] Redirected back to billing page with success message
- [ ] Plan is updated in database
- [ ] Webhook events appear in Stripe CLI terminal
- [ ] Billing Portal link works and shows subscription

### Webhook Events ✅

When testing checkout, you should see these events in Stripe CLI:

```
checkout.session.completed [200]
customer.subscription.created [200]
```

If you cancel a subscription via the portal, you should see:

```
customer.subscription.updated [200]
customer.subscription.deleted [200]
```

### Database Verification ✅

After a successful checkout, verify in your database:

```sql
SELECT * FROM "Subscription" WHERE "userId" = 'your-user-id';
```

Should show:
- `plan` = `'pro'` or `'business'`
- `status` = `'active'`
- `stripeCustomerId` is populated (starts with `cus_`)
- `stripeSubscriptionId` is populated (starts with `sub_`)
- `currentPeriodStart` and `currentPeriodEnd` are set

---

## Support

- **Stripe Documentation:** [stripe.com/docs](https://stripe.com/docs)
- **Stripe CLI Reference:** [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
- **Webhook Events:** [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)
- **Test Cards:** [stripe.com/docs/testing](https://stripe.com/docs/testing)
- **Stripe Dashboard:** [dashboard.stripe.com/test](https://dashboard.stripe.com/test)
