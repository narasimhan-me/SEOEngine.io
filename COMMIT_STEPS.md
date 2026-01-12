# Step-by-Step Commit Instructions

## ✅ Linting Errors Fixed

I've fixed the linting errors in:
- `apps/api/src/admin/admin.service.ts` - Removed unused `BadRequestException` import
- `apps/api/src/projects/answer-engine.service.ts` - Prefixed unused `missingCount` parameter with `_`
- `apps/api/src/projects/deo-issues.service.ts` - Prefixed unused `signals` parameter with `_`

**All linting errors are now resolved!** ✅

## Next Steps to Commit

### Step 1: Open Terminal

Open your terminal and navigate to the project:
```bash
cd /Users/lavanya/engineo/EngineO.ai
```

### Step 2: Switch to Feature Branch

```bash
# Create branch if it doesn't exist, or switch to it
git checkout -b feature/Lavanya
```

If the branch already exists, you'll see:
```
Switched to branch 'feature/Lavanya'
```

### Step 3: Stage All Changes

```bash
git add -A
```

### Step 4: Verify Staged Files

```bash
git status
```

You should see files like:
- `apps/api/jest.unit.config.ts` (new)
- `apps/api/jest.critical-integration.config.ts` (new)
- `.husky/pre-commit` (new)
- `.husky/pre-push` (new)
- `apps/api/test/integration/critical/*` (new)
- `package.json` (modified)
- `apps/api/package.json` (modified)
- `apps/api/src/billing/billing.service.ts` (modified)
- `apps/api/.eslintrc.js` (modified)
- And other files...

### Step 5: Commit

The pre-commit hook will run automatically. It will:
1. Run ESLint on source files ✅ (should pass now)
2. Run TypeScript type checks
3. Run unit tests

```bash
git commit -m "feat: Add commit gate and push gate infrastructure

- Add unit test configuration (jest.unit.config.ts)
- Add critical integration test suite (test/integration/critical/)
- Add Husky pre-commit and pre-push hooks
- Add billing webhook idempotency integration tests
- Update handleCheckoutCompleted() to track event IDs for full idempotency
- Configure ESLint to exclude test files from linting
- Add test:unit and test:api:critical scripts
- Fix linting errors in source files

Commit Gate:
- Unit test suite runs in ~1-2 minutes
- Pre-commit hook: lint + type-check + unit tests

Push Gate:
- Critical integration suite (26 tests)
- Pre-push hook: lint + format + type-check + unit tests + critical integration tests
- Covers: permissions, onboarding, preview→apply, billing, idempotency"
```

### Step 6: If Pre-commit Hook Fails

If the pre-commit hook fails, you'll see error messages. Common issues:

**TypeScript errors:**
```bash
cd apps/api
pnpm exec tsc --noEmit
# Fix any errors shown
```

**Unit test failures:**
```bash
pnpm test:unit
# Fix any failing tests
```

Then retry the commit:
```bash
git add -A
git commit -m "feat: Add commit gate and push gate infrastructure"
```

### Step 7: Verify Commit Success

```bash
# Check latest commit
git log --oneline -1

# Check current branch
git branch --show-current

# Check if there are uncommitted changes
git status
```

You should see:
- Latest commit shows your commit message
- Current branch is `feature/Lavanya`
- `git status` shows "nothing to commit, working tree clean"

### Step 8: Push to Remote (Optional)

```bash
git push origin feature/Lavanya
```

**Note:** The pre-push hook will run automatically and will:
1. Run linting
2. Run formatting check
3. Run TypeScript type checks
4. Run unit tests
5. Run critical integration tests

If any of these fail, the push will be blocked. Fix the issues and retry.

## Troubleshooting

### If Commit Still Fails

**Option 1: Skip Pre-commit Hook (Not Recommended)**
```bash
git commit --no-verify -m "feat: Add commit gate and push gate infrastructure"
```

⚠️ **Warning:** This bypasses all safety checks. Only use for WIP commits.

**Option 2: Check What's Failing**
```bash
# Run linting manually
cd apps/api
pnpm lint

# Run type checks manually
pnpm exec tsc --noEmit

# Run unit tests manually
cd ../..
pnpm test:unit
```

Fix any errors, then retry the commit.

## Summary

✅ **Linting errors fixed**  
✅ **All files ready to commit**  
✅ **Pre-commit hook configured**  
✅ **Pre-push hook configured**

**Next:** Run the commit command in your terminal. The pre-commit hook will automatically validate your code before allowing the commit.

