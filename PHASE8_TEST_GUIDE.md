# Phase 8 (2FA) Sanity Test Guide

## Pre-Test Checklist

### ✅ Migration Status
- [x] Migration `add_two_factor_auth` exists and is applied
- [x] Database schema includes `twoFactorEnabled` and `twoFactorSecret` fields

### 🔒 Security Hygiene Check

**Before testing, verify these in `apps/api/.env`:**

1. **JWT_SECRET** - Must be strong (at least 32 random characters)
   ```bash
   # Generate a strong secret:
   openssl rand -base64 32
   ```
   - ❌ **DO NOT USE:** `default-secret-change-in-production`
   - ✅ **USE:** A long, random string (32+ characters)

2. **API Keys** - Rotate before pushing to public repos:
   - `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`
   - `AI_API_KEY` (OpenAI/Gemini)
   - `STRIPE_SECRET_KEY` (if configured)
   - Any other sensitive credentials

3. **Database URL** - Ensure production DB URL is not in `.env` if committing

**Action Items:**
- [ ] Verify `JWT_SECRET` is set and strong (not default)
- [ ] Rotate any real API keys if this repo will be public
- [ ] Ensure `.env` is in `.gitignore` (verify it's not committed)

---

## End-to-End Test Procedure

### Step 1: Restart API Server

```bash
# Stop the current API server (if running)
# Then restart:
cd apps/api
pnpm start:dev
# Or if using root:
pnpm --filter api start:dev
```

### Step 2: Enable 2FA via Settings

1. **Login** to the app normally (without 2FA)
2. Navigate to **Settings → Security** (`/settings/security`)
3. Click **"Enable 2FA"** button
4. **Verify:**
   - QR code is displayed
   - `otpauth://` URL is shown (can be copied manually)
5. **Scan QR code** with authenticator app:
   - Google Authenticator
   - 1Password
   - Authy
   - Microsoft Authenticator
6. **Enter 6-digit code** from your authenticator app
7. Click **"Enable 2FA"**
8. **Verify:**
   - Success message appears
   - Status shows "2FA is enabled"
   - "Disable 2FA" button is visible

### Step 3: Test Two-Step Login Flow

1. **Logout** from the app
2. **Login** with email/password
3. **Verify:**
   - ❌ You do NOT receive `accessToken` immediately
   - ✅ You receive response with:
     ```json
     {
       "requires2FA": true,
       "tempToken": "...",
       "user": { "id": "...", "email": "..." }
     }
     ```
   - ✅ You are redirected to `/2fa` page
4. **Enter 6-digit code** from your authenticator app
5. **Click "Verify"**
6. **Verify:**
   - ✅ You receive final `accessToken`
   - ✅ You are redirected to `/dashboard`
   - ✅ You can access protected routes

### Step 4: Test Invalid Code Handling

1. **Logout** and login again
2. On `/2fa` page, enter an **invalid code** (e.g., `000000`)
3. **Verify:**
   - ❌ Error message appears: "Invalid or expired code"
   - ✅ You can try again (not locked out)
   - ✅ Temp token is still valid (can retry)

### Step 5: Test Disabling 2FA

1. Navigate to **Settings → Security** (`/settings/security`)
2. Click **"Disable 2FA"** button
3. **Verify:**
   - ✅ Success message appears
   - ✅ Status shows "2FA is disabled"
   - ✅ "Enable 2FA" button is visible again
4. **Logout** and **login** again
5. **Verify:**
   - ✅ Normal login flow (no 2FA step)
   - ✅ You receive `accessToken` immediately

### Step 6: Test Temp Token Expiry

1. **Enable 2FA** again (if disabled)
2. **Login** and get temp token
3. **Wait 10+ minutes** (temp token expires)
4. **Try to verify** with a valid code
5. **Verify:**
   - ❌ Error: "Invalid or expired verification token"
   - ✅ Must login again to get new temp token

---

## API Endpoint Tests

### Test 1: POST /2fa/setup-init

```bash
# Get JWT token first (normal login)
TOKEN="your-jwt-token"

curl -X POST http://localhost:3001/2fa/setup-init \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "otpauthUrl": "otpauth://totp/EngineO.ai:user@example.com?secret=...&issuer=EngineO.ai",
  "qrCodeDataUrl": "data:image/png;base64,..."
}
```

### Test 2: POST /2fa/enable

```bash
# Use code from authenticator app
curl -X POST http://localhost:3001/2fa/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

**Expected Response:**
```json
{
  "success": true
}
```

### Test 3: POST /auth/login (with 2FA enabled)

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

**Expected Response:**
```json
{
  "requires2FA": true,
  "tempToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "user@example.com"
  }
}
```

### Test 4: POST /auth/2fa/verify

```bash
curl -X POST http://localhost:3001/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "eyJhbGc...",
    "code": "123456"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "...",
    "twoFactorEnabled": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Test 5: POST /2fa/disable

```bash
# Optional: include code for extra security
curl -X POST http://localhost:3001/2fa/disable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

**Expected Response:**
```json
{
  "success": true
}
```

---

## Security Verification

### ✅ Checklist

- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] Temp tokens expire after 10 minutes
- [ ] TOTP codes have window of ±1 step (clock drift tolerance)
- [ ] Sensitive fields (`password`, `twoFactorSecret`) are excluded from API responses
- [ ] Error messages are generic (don't leak info)
- [ ] 2FA endpoints require authentication (except `/auth/2fa/verify`)
- [ ] Temp tokens are marked with `twoFactor: true` claim
- [ ] Final access tokens do NOT have `twoFactor` claim

### 🔒 Before Pushing to Public Repo

- [ ] All real API keys rotated or removed from `.env`
- [ ] `.env` is in `.gitignore`
- [ ] No secrets committed to git history
- [ ] Production database URLs not in code
- [ ] JWT_SECRET changed from default

---

## Known TODOs (Future Enhancements)

From code comments:
- [ ] Add rate limiting to prevent brute-force attacks on TOTP codes
- [ ] Add rate limiting to login endpoint
- [ ] Implement backup codes generation and verification
- [ ] Add rate limiting to 2FA setup endpoints

---

## Troubleshooting

### Issue: QR code not displaying
- **Check:** Browser console for errors
- **Verify:** `qrcode` package is installed in `apps/api`
- **Test:** `otpauthUrl` can be manually entered in authenticator app

### Issue: Invalid code even with correct code
- **Check:** Clock sync between server and device
- **Verify:** Code is entered within 30-second window
- **Note:** Window is ±1 step (allows slight clock drift)

### Issue: Temp token expires too quickly
- **Check:** Token expiry is set to 10 minutes in `auth.service.ts`
- **Verify:** System clock is accurate

### Issue: Can't disable 2FA
- **Check:** User is authenticated (valid JWT)
- **Verify:** Optional code verification if code is provided

---

## Test Results Template

```
Date: ___________
Tester: ___________

Migration Status: [ ] Applied [ ] Not Applied
API Server: [ ] Running [ ] Not Running

Enable 2FA: [ ] Pass [ ] Fail
Two-Step Login: [ ] Pass [ ] Fail
Invalid Code Handling: [ ] Pass [ ] Fail
Disable 2FA: [ ] Pass [ ] Fail
Temp Token Expiry: [ ] Pass [ ] Fail

Security Check:
- JWT_SECRET: [ ] Strong [ ] Weak/Default
- API Keys: [ ] Rotated [ ] Need Rotation
- .env in .gitignore: [ ] Yes [ ] No

Notes:
_______________________________________
_______________________________________
```

