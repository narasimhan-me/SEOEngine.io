# Commit Guide - Feature/Lavanya Branch

## Step-by-Step Commit Instructions

### Step 1: Check Current Status

```bash
cd /Users/lavanya/engineo/EngineO.ai
git status
```

**Expected:** You should see modified/new files listed.

### Step 2: Switch to Feature Branch

```bash
# If branch doesn't exist, create it
git checkout -b feature/Lavanya

# If branch exists, switch to it
git checkout feature/Lavanya
```

### Step 3: Stage All Changes

```bash
git add -A
```

**Verify staged files:**

```bash
git status
```

### Step 4: Commit (Pre-commit Hook Will Run)

```bash
git commit -m "feat: Add commit gate and push gate infrastructure

- Add unit test configuration (jest.unit.config.ts)
- Add critical integration test suite (test/integration/critical/)
- Add Husky pre-commit and pre-push hooks
- Add billing webhook idempotency integration tests
- Update handleCheckoutCompleted() to track event IDs for full idempotency
- Configure ESLint to exclude test files from linting
- Add test:unit and test:api:critical scripts

Commit Gate:
- Unit test suite runs in ~1-2 minutes
- Pre-commit hook: lint + type-check + unit tests

Push Gate:
- Critical integration suite (26 tests)
- Pre-push hook: lint + format + type-check + unit tests + critical integration tests
- Covers: permissions, onboarding, preview→apply, billing, idempotency"
```

## Troubleshooting

### If Commit Fails Due to Pre-commit Hook

The pre-commit hook will run automatically and may fail if:

1. **Linting errors** in source files
2. **TypeScript type errors**
3. **Unit test failures**

#### Option A: Fix Issues and Retry

1. **Fix linting errors:**

   ```bash
   cd apps/api
   pnpm lint
   # Fix the errors shown
   ```

2. **Fix type errors:**

   ```bash
   cd apps/api
   pnpm exec tsc --noEmit
   # Fix the errors shown
   ```

3. **Fix test failures:**

   ```bash
   pnpm test:unit
   # Fix the failing tests
   ```

4. **Retry commit:**
   ```bash
   git add -A
   git commit -m "feat: Add commit gate and push gate infrastructure"
   ```

#### Option B: Skip Pre-commit Hook (Not Recommended)

**Only use if you need to commit work-in-progress:**

```bash
git commit --no-verify -m "feat: Add commit gate and push gate infrastructure"
```

⚠️ **Warning:** This bypasses all safety checks. Only use for WIP commits.

### If Branch Doesn't Exist

```bash
# Create and switch to branch
git checkout -b feature/Lavanya

# Then proceed with staging and commit
git add -A
git commit -m "feat: Add commit gate and push gate infrastructure"
```

### If Files Are Not Staged

```bash
# Check what's not staged
git status

# Stage specific files
git add apps/api/jest.unit.config.ts
git add apps/api/jest.critical-integration.config.ts
git add .husky/
git add package.json
git add apps/api/package.json
# ... etc

# Or stage everything
git add -A
```

## Verify Commit Success

After committing, verify:

```bash
# Check latest commit
git log --oneline -1

# Check current branch
git branch --show-current

# Check if there are uncommitted changes
git status
```

## Expected Files in Commit

### New Files:

- `apps/api/jest.unit.config.ts`
- `apps/api/jest.critical-integration.config.ts`
- `apps/api/test/integration/critical/auth-entitlements.test.ts`
- `apps/api/test/integration/critical/onboarding-checklist.test.ts`
- `apps/api/test/integration/critical/automation-playbook-runs.test.ts`
- `apps/api/test/integration/critical/seo-apply-persistence.test.ts`
- `apps/api/test/integration/critical/billing-webhook-idempotency.test.ts`
- `.husky/pre-commit`
- `.husky/pre-push`
- `.husky/_/husky.sh`
- `apps/api/COMMIT_GATE_REVIEW.md`
- `apps/api/PUSH_GATE_REVIEW.md`
- `apps/api/PUSH_GATE_CONFIRMATION.md`
- `COMMIT_GATE_SETUP_COMPLETE.md`
- `COMMIT_CHANGES.md`

### Modified Files:

- `package.json`
- `apps/api/package.json`
- `apps/api/src/billing/billing.service.ts`
- `apps/api/.eslintrc.js`

## Next Steps After Commit

1. **Push to remote:**

   ```bash
   git push origin feature/Lavanya
   ```

   (This will trigger the pre-push hook)

2. **Create Pull Request** (if using GitHub/GitLab)

3. **Verify hooks work:**
   - Make a test change
   - Try to commit (pre-commit hook should run)
   - Try to push (pre-push hook should run)
