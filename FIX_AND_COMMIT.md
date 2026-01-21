# Fix Linting Errors and Commit

## Issue

The pre-commit hook is failing due to linting errors in source files. The main errors are:

- Unused variables/imports
- Variables that should be prefixed with `_` if intentionally unused

## Solution Options

### Option 1: Fix Linting Errors (Recommended)

**Step 1: Check linting errors**

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api
pnpm lint
```

**Step 2: Fix the errors**

The main errors are unused variables. Fix them by either:

- Removing unused imports/variables
- Prefixing with `_` if intentionally unused (e.g., `_project` instead of `project`)

**Common fixes:**

- `BadRequestException` imported but not used → Remove import
- `_` or `__` assigned but not used → Already correct (should be allowed)
- `missingCount`, `totalQuestions`, `signals` not used → Prefix with `_` or remove

**Step 3: Retry commit**

```bash
cd /Users/lavanya/engineo/EngineO.ai
git add -A
git commit -m "feat: Add commit gate and push gate infrastructure"
```

### Option 2: Temporarily Skip Pre-commit Hook

If you need to commit work-in-progress and fix linting later:

```bash
cd /Users/lavanya/engineo/EngineO.ai

# Switch to branch
git checkout -b feature/Lavanya

# Stage changes
git add -A

# Commit with --no-verify to skip hooks
git commit --no-verify -m "feat: Add commit gate and push gate infrastructure (WIP - linting to be fixed)"
```

⚠️ **Note:** This bypasses safety checks. Fix linting errors before pushing.

### Option 3: Make Pre-commit Hook More Lenient (Temporary)

You can temporarily make the pre-commit hook only warn on linting errors:

```bash
# Edit .husky/pre-commit
# Change the linting section to:
echo "📝 Running linter on source files..."
cd apps/api
pnpm exec eslint "src/**/*.ts" --fix || {
  echo "⚠️  Linting issues found, but continuing..."
  # Don't exit, just warn
}
cd ../..
```

Then commit:

```bash
git add -A
git commit -m "feat: Add commit gate and push gate infrastructure"
```

## Recommended Approach

**Best practice:** Fix the linting errors first, then commit. This ensures code quality.

**Quick fix script:**

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api

# Auto-fix what can be fixed
pnpm exec eslint "src/**/*.ts" --fix

# Check remaining errors
pnpm exec eslint "src/**/*.ts" | grep "error"

# Fix manually:
# - Remove unused imports
# - Prefix unused variables with _
# - Remove unused variables if not needed
```

## Files with Known Linting Errors

Based on the earlier output, these files have errors:

- `src/admin/admin.service.ts` - Unused `BadRequestException`
- `src/auth/auth.service.ts` - Unused `_` variables (should be allowed)
- `src/projects/answer-engine.service.ts` - Unused `missingCount`, `totalQuestions`
- `src/projects/automation-playbooks.service.ts` - Unused `BadRequestException`
- `src/projects/deo-issues.service.ts` - Unused `signals`
- `src/projects/deo-score.service.ts` - Unused `DeoScoreV2Breakdown`
- `src/projects/local-discovery.service.ts` - Unused constants
- `src/projects/media-accessibility.service.ts` - Unused imports
- `src/projects/offsite-signals.service.ts` - Unused constants
- `src/projects/projects.service.ts` - Unused `project` variables
- `src/users/users.service.ts` - Unused `_` variables (should be allowed)

## After Fixing

Once linting errors are fixed:

```bash
cd /Users/lavanya/engineo/EngineO.ai

# Ensure you're on the right branch
git checkout -b feature/Lavanya

# Stage all changes
git add -A

# Commit (pre-commit hook will run and should pass)
git commit -m "feat: Add commit gate and push gate infrastructure

- Add unit test configuration (jest.unit.config.ts)
- Add critical integration test suite (test/integration/critical/)
- Add Husky pre-commit and pre-push hooks
- Add billing webhook idempotency integration tests
- Update handleCheckoutCompleted() to track event IDs for full idempotency
- Configure ESLint to exclude test files from linting
- Add test:unit and test:api:critical scripts
- Fix linting errors in source files"
```

## Verify Commit

```bash
# Check commit was created
git log --oneline -1

# Check branch
git branch --show-current

# Check status (should be clean)
git status
```
