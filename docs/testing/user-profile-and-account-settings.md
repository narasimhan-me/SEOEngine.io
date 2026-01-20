# EngineO.ai – Manual Testing: User Profile & Account Settings

## Overview

- Validate user profile and account settings flows, including:
  - Updating profile information (name, email where supported).
  - Updating security settings (password, 2FA) if applicable.

## Preconditions

- Test user account.
- Access to settings routes (e.g., /settings/profile, /settings/security).

## Test Scenarios (Happy Path)

### Scenario 1 – Update Profile Information

1. Navigate to profile settings.
2. Change fields like display name.
3. Save changes.

Expected:

- Changes persist and are visible after reload/sign-out/sign-in.

### Scenario 2 – Update Security Settings (If Implemented)

1. Navigate to security settings.
2. Update password or 2FA configuration as available.

Expected:

- Changes succeed with clear feedback and no account lockouts.

## Edge Cases

- Invalid input (e.g., invalid email format, too-short passwords).

## Error Handling

- Show clear, field-level validation messages and toast feedback on failure.

## Regression

- Profile and security changes must not break login or other sessions unexpectedly.

## Post-Conditions

- Revert test changes or restore known credentials if needed.

## Known Issues

- Note any profile fields not yet editable and mark them for future work.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
