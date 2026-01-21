# Security Checklist for Phase 8 (2FA) & Production Readiness

## ✅ Current Status

### Migration

- [x] Migration `add_two_factor_auth` exists
- [x] Migration applied to database
- [x] Schema includes `twoFactorEnabled` and `twoFactorSecret` fields

### Code Implementation

- [x] 2FA module implemented (`two-factor-auth`)
- [x] Auth service updated for 2FA flow
- [x] Frontend pages for 2FA setup and login
- [x] Temp token mechanism with 10-minute expiry

### Security Configuration

- [x] `.env` is in `.gitignore` (verified)
- [ ] **JWT_SECRET** - ⚠️ **ACTION REQUIRED** (see below)
- [ ] **API Keys** - ⚠️ **ACTION REQUIRED** (see below)

---

## 🔒 CRITICAL: Security Actions Required

### 1. JWT_SECRET Strength Check

**Current Code Behavior:**

- Falls back to `'default-secret-change-in-production'` if `JWT_SECRET` not set
- This is **INSECURE** for production

**Action Required:**

1. Check `apps/api/.env` for `JWT_SECRET`
2. If missing or set to default, generate a strong secret:

   ```bash
   # Generate a strong 32-byte secret (base64 encoded = 44 chars)
   openssl rand -base64 32

   # Or using Node.js:
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. Add to `apps/api/.env`:
   ```
   JWT_SECRET=your-generated-secret-here
   ```
4. **Minimum requirements:**
   - At least 32 characters
   - Random (not predictable)
   - Different for each environment (dev/staging/prod)

**Verification:**

```bash
# Check if JWT_SECRET is set (without revealing value)
cd apps/api
grep -q "^JWT_SECRET=" .env && echo "✅ JWT_SECRET is set" || echo "❌ JWT_SECRET is missing"
```

### 2. API Keys Rotation

**Before pushing to any public repository:**

1. **Rotate these keys in `apps/api/.env`:**
   - `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`
   - `AI_API_KEY` (OpenAI/Gemini/Anthropic)
   - `STRIPE_SECRET_KEY` (if configured)
   - Any other third-party API keys

2. **For each key:**
   - Generate new keys in the respective service dashboard
   - Update `.env` with new keys
   - Test that the new keys work
   - Revoke old keys

3. **Verify `.env` is not committed:**
   ```bash
   git status apps/api/.env
   # Should show: "nothing to commit" or file should not appear
   ```

### 3. Database URL Security

- [ ] Ensure production database URL is NOT in `.env` if committing
- [ ] Use environment-specific configs (`.env.development`, `.env.production`)
- [ ] For production, use environment variables set in deployment platform

---

## 🧪 Testing Checklist

### Pre-Test Setup

- [ ] API server restarted after migration
- [ ] JWT_SECRET is set and strong
- [ ] Authenticator app installed (Google Authenticator, 1Password, etc.)

### Test Scenarios

- [ ] Enable 2FA via `/settings/security`
- [ ] Scan QR code and verify code generation
- [ ] Complete 2FA enablement with valid code
- [ ] Test two-step login flow (email/password → 2FA code)
- [ ] Test invalid code rejection
- [ ] Test temp token expiry (wait 10+ minutes)
- [ ] Test disabling 2FA
- [ ] Verify normal login after disabling 2FA

See `PHASE8_TEST_GUIDE.md` for detailed test procedures.

---

## 📋 Code Security Review

### ✅ Good Practices Found

1. **Sensitive Data Exclusion:**
   - `password` and `twoFactorSecret` excluded from API responses
   - Proper destructuring to remove sensitive fields

2. **Token Security:**
   - Temp tokens marked with `twoFactor: true` claim
   - 10-minute expiry on temp tokens
   - Final tokens don't include `twoFactor` claim

3. **Error Messages:**
   - Generic error messages (don't leak info)
   - "Invalid or expired code" instead of "Wrong code"

4. **TOTP Verification:**
   - Window of ±1 step for clock drift tolerance
   - Base32 encoding for secrets

### ⚠️ TODOs (Future Enhancements)

From code comments, these should be implemented before production:

1. **Rate Limiting:**
   - [ ] Add rate limiting to `/auth/login`
   - [ ] Add rate limiting to `/auth/2fa/verify`
   - [ ] Add rate limiting to `/2fa/setup-init`
   - [ ] Add rate limiting to `/2fa/enable`

2. **Backup Codes:**
   - [ ] Implement backup codes generation
   - [ ] Implement backup codes verification
   - [ ] Store backup codes securely (hashed)

3. **Additional Security:**
   - [ ] Add IP-based rate limiting
   - [ ] Add account lockout after N failed attempts
   - [ ] Add email notification on 2FA enable/disable

---

## 🚀 Production Deployment Checklist

Before deploying to production:

### Environment Variables

- [ ] `JWT_SECRET` is strong and unique for production
- [ ] All API keys are production keys (not dev/test)
- [ ] Database URL points to production database
- [ ] `NODE_ENV=production` is set

### Security Headers

- [ ] HTTPS enforced
- [ ] CORS configured for production domain only
- [ ] Security headers set (HSTS, CSP, etc.)

### Monitoring

- [ ] Error logging configured
- [ ] Failed login attempts logged
- [ ] 2FA enable/disable events logged
- [ ] Rate limiting alerts configured

### Testing

- [ ] All test scenarios from `PHASE8_TEST_GUIDE.md` passed
- [ ] Load testing performed
- [ ] Security audit completed

---

## 📝 Quick Commands

### Generate Strong JWT Secret

```bash
openssl rand -base64 32
```

### Check Migration Status

```bash
cd apps/api
npx prisma migrate status
```

### Verify .env is Ignored

```bash
git check-ignore apps/api/.env
# Should output: apps/api/.env
```

### Check for Committed Secrets

```bash
# Search git history for potential secrets (be careful!)
git log --all --full-history --source -- apps/api/.env
```

---

## 🔗 Related Documents

- `PHASE8_TEST_GUIDE.md` - Detailed testing procedures
- `IMPLEMENTATION_PLAN.md` - Phase 8 implementation details

---

**Last Updated:** $(date)
**Status:** Ready for testing (security actions required)
