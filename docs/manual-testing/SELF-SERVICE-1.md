# SELF-SERVICE-1 Manual Testing Guide

## Feature: Customer Self-Service Control Plane

**Priority:** High
**Testkit Seed:** `seed-self-service-user`, `seed-self-service-editor`, `seed-self-service-viewer`

---

## Prerequisites

1. API running on localhost:3001
2. Web app running on localhost:3000
3. Database with migrations applied
4. (Optional) Stripe test mode configured for billing tests

---

## Test Scenarios

### D1: Profile Management

#### T1.1: View Profile

1. Login as OWNER user
2. Navigate to Settings > Profile
3. **Verify:**
   - Email field is read-only
   - Name field is editable
   - Timezone dropdown shows options
   - Locale dropdown shows options
   - Account Role field is read-only
   - "Changes are audited" copy is visible

#### T1.2: Update Profile

1. Login as OWNER user
2. Navigate to Settings > Profile
3. Update name to "Manual Test User"
4. Select a different timezone
5. Select a different locale
6. Click "Save Changes"
7. **Verify:**
   - Success message appears
   - Page reload preserves changes

#### T1.3: Profile Read-Only for VIEWER

1. Login as VIEWER user (use seed-self-service-viewer)
2. Navigate to Settings > Profile
3. **Verify:**
   - All editable fields are disabled
   - "read-only access" notice is visible
   - Save button is not visible

---

### D2: Organization / Stores

#### T2.1: View Organization

1. Login as OWNER user
2. Navigate to Settings > Organization
3. **Verify:**
   - Organization name field is editable
   - Connected stores list is visible
   - "Connect New Store" link is visible

#### T2.2: Update Organization Name

1. Login as OWNER user
2. Navigate to Settings > Organization
3. Enter a new organization name
4. Click "Save"
5. **Verify:**
   - Success message appears
   - Organization name persists on reload

#### T2.3: Disconnect Store (Owner Only)

1. Login as OWNER user with connected store
2. Navigate to Settings > Organization
3. Click "Disconnect" on a store
4. Click "Confirm" in the confirmation prompt
5. **Verify:**
   - Store is removed from list
   - Success message appears

#### T2.4: EDITOR Cannot Disconnect Stores

1. Login as EDITOR user
2. Navigate to Settings > Organization
3. **Verify:**
   - Disconnect buttons are NOT visible
   - "Only account owners can disconnect" message is visible

#### T2.5: VIEWER Read-Only Organization

1. Login as VIEWER user
2. Navigate to Settings > Organization
3. **Verify:**
   - Organization name field is disabled
   - "read-only access" notice is visible
   - No disconnect buttons visible

---

### D3: Plan & Billing

#### T3.1: View Billing as OWNER

1. Login as OWNER user
2. Navigate to Settings > Billing
3. **Verify:**
   - Current plan is displayed
   - AI usage quota bar is visible
   - "Billing handled via Stripe" message is visible
   - Plan cards show Upgrade/Downgrade buttons (not "Owner Only")

#### T3.2: Manage Billing as OWNER

1. Login as OWNER user with paid plan
2. Navigate to Settings > Billing
3. Click "Manage Billing"
4. **Verify:**
   - Redirects to Stripe Portal (or error in test mode)

#### T3.3: EDITOR Read-Only Billing

1. Login as EDITOR user
2. Navigate to Settings > Billing
3. **Verify:**
   - Read-only notice is visible
   - Plan buttons show "Owner Only"
   - "Manage Billing" button is disabled
   - "Only account owners can manage billing" text is visible

#### T3.4: VIEWER Read-Only Billing

1. Login as VIEWER user
2. Navigate to Settings > Billing
3. **Verify:**
   - Same restrictions as EDITOR

---

### D4: AI Usage

#### T4.1: View AI Usage

1. Login as OWNER user (with AI runs seeded)
2. Navigate to Settings > AI Usage
3. **Verify:**
   - Period label shows current month
   - Total AI runs displayed
   - Quota used percentage displayed
   - Progress bar reflects usage
   - Reuse effectiveness section visible
   - "APPLY never uses AI" message is visible

#### T4.2: Reuse Metrics Display

1. Login as user with reuse history
2. Navigate to Settings > AI Usage
3. **Verify:**
   - Reused outputs count is displayed
   - New AI generations count is displayed
   - Reuse effectiveness percentage is calculated correctly

---

### D5: Preferences

#### T5.1: View Preferences

1. Login as OWNER user
2. Navigate to Settings > Preferences
3. **Verify:**
   - Notification toggles are visible
   - Default behavior settings are visible
   - All toggles are enabled (clickable)

#### T5.2: Update Preferences

1. Login as OWNER user
2. Navigate to Settings > Preferences
3. Toggle "Quota Warning Notifications" off
4. Toggle "Auto-open Issues Tab" on
5. Click "Save Preferences"
6. **Verify:**
   - Success message appears
   - Preferences persist on reload

#### T5.3: VIEWER Read-Only Preferences

1. Login as VIEWER user
2. Navigate to Settings > Preferences
3. **Verify:**
   - All toggles are disabled
   - "read-only access" notice is visible
   - Save button is not visible

---

### D6: Security

#### T6.1: View Sessions

1. Login as OWNER user
2. Navigate to Settings > Security
3. **Verify:**
   - Active Sessions section is visible
   - Current session is marked as "This session"
   - Device info is displayed (if available)
   - Last seen time is displayed

#### T6.2: Sign Out All Sessions

1. Login as OWNER user from two browsers/devices
2. Navigate to Settings > Security
3. Click "Sign Out All Other Sessions"
4. **Verify:**
   - Success message appears
   - Other browser/device session is invalidated
   - Current session remains active

---

### D7: Help & Support

#### T7.1: View Help Page

1. Login as any user
2. Navigate to Settings > Help
3. **Verify:**
   - Help Center section with link to docs
   - Contact Support section with email
   - Report an Issue section with GitHub link

---

### Account Menu Navigation

#### T8.1: Account Menu Links

1. Login as any user
2. Click "Account" in top navigation
3. **Verify:**
   - Dropdown opens
   - User name and email displayed
   - All menu items visible:
     - Profile
     - Organization / Stores
     - Plan & Billing
     - AI Usage
     - Preferences
     - Security
     - Help & Support
     - Sign out

#### T8.2: Menu Navigation

1. Click each menu item
2. **Verify:** Each navigates to correct page and menu closes

---

### Settings Hub

#### T9.1: Settings Hub Cards

1. Navigate to /settings
2. **Verify:**
   - All settings cards are displayed
   - Each card links to correct page
   - Icons are displayed correctly

---

## API Testing (curl/Postman)

### Get Profile

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/account/profile
```

### Update Profile

```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","timezone":"America/New_York"}' \
  http://localhost:3001/account/profile
```

### Get AI Usage

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/account/ai-usage
```

### Sign Out All

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3001/account/sign-out-all
```

---

## Expected Test Counts

| Category     | Tests  |
| ------------ | ------ |
| Profile      | 3      |
| Organization | 5      |
| Billing      | 4      |
| AI Usage     | 2      |
| Preferences  | 3      |
| Security     | 2      |
| Help         | 1      |
| Navigation   | 3      |
| **Total**    | **23** |

---

## Bug Reporting

If you find issues:

1. Note the test scenario (e.g., T3.2)
2. Capture browser console logs
3. Capture network requests
4. Note user role (OWNER/EDITOR/VIEWER)
5. Report in GitHub Issues with `[SELF-SERVICE-1]` prefix
