# Postman Test Guide: Crawl Trigger Endpoint

This guide provides step-by-step instructions to test the `POST /crawl/trigger` endpoint using Postman.

## Prerequisites

- Postman app installed
- API server running on `http://localhost:3001`
- Admin user credentials:
  - Email: `testadmin@engineo.ai`
  - Password: `testpass123`
  - OR use your existing admin account

## Step 1: Login and Get JWT Token

### 1.1 Create Login Request

1. Open Postman
2. Click **New** → **HTTP Request**
3. Set the request method to **POST**
4. Enter URL: `http://localhost:3001/auth/login`
5. Go to **Headers** tab and add:
   - Key: `Content-Type`
   - Value: `application/json`

### 1.2 Add Request Body

1. Go to **Body** tab
2. Select **raw** and **JSON** format
3. Enter the following JSON:

```json
{
  "email": "testadmin@engineo.ai",
  "password": "testpass123",
  "captchaToken": "1x00000000000000000000AA"
}
```

**Note:** The `captchaToken` value `1x00000000000000000000AA` is a test token that works in development mode.

### 1.3 Send Request and Copy Token

1. Click **Send**
2. You should receive a response like:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "testadmin@engineo.ai",
    "role": "ADMIN"
  }
}
```

3. **Copy the `accessToken` value** - you'll need it for the next steps

## Step 2: Get a Project ID

### 2.1 Create Get Projects Request

1. Create a new request: **New** → **HTTP Request**
2. Set method to **GET**
3. Enter URL: `http://localhost:3001/projects`
4. Go to **Headers** tab and add:
   - Key: `Authorization`
   - Value: `Bearer <paste-your-accessToken-here>`
   - (Replace `<paste-your-accessToken-here>` with the token from Step 1.3)

### 2.2 Send Request and Copy Project ID

1. Click **Send**
2. You should receive an array of projects:

```json
[
  {
    "id": "cmirnfw1a00021xd1kwyuqyhp",
    "name": "Test Project",
    "domain": "example.com",
    ...
  }
]
```

3. **Copy the `id` of the first project** - you'll need it for verification

## Step 3: Check Initial State (Before Crawl)

### 3.1 Get Initial CrawlResult Count

1. Create a new request: **New** → **HTTP Request**
2. Set method to **GET**
3. Enter URL: `http://localhost:3001/projects/<project-id>/crawl-results`
   - Replace `<project-id>` with the ID from Step 2.2
4. Add **Authorization** header with your Bearer token
5. Click **Send**
6. **Note the count** of items in the response array (e.g., if array has 6 items, count = 6)

### 3.2 Get Initial lastCrawledAt

1. Create a new request: **New** → **HTTP Request**
2. Set method to **GET**
3. Enter URL: `http://localhost:3001/projects/<project-id>`
   - Replace `<project-id>` with the ID from Step 2.2
4. Add **Authorization** header with your Bearer token
5. Click **Send**
6. **Note the `lastCrawledAt` value** (may be `null`)

## Step 4: Trigger the Crawl

### 4.1 Create Crawl Trigger Request

1. Create a new request: **New** → **HTTP Request**
2. Set method to **POST**
3. Enter URL: `http://localhost:3001/crawl/trigger`
4. Go to **Headers** tab and add:
   - Key: `Authorization`
   - Value: `Bearer <paste-your-accessToken-here>`
   - Key: `Content-Type`
   - Value: `application/json`

### 4.2 Send Request

1. Click **Send**
2. You should receive a success response:

```json
{
  "message": "Crawl scheduler triggered successfully"
}
```

**If you get a 404 error:**

- Make sure only one API server is running on port 3001
- Restart the API server to ensure the route is registered

**If you get a 403 Forbidden error:**

- Verify your user has `ADMIN` role
- Check that the Bearer token is valid and not expired

## Step 5: Wait for Crawl to Process

The crawl runs synchronously in development mode (without Redis). Wait **15-20 seconds** for the crawl to complete.

## Step 6: Verify New CrawlResult Rows

### 6.1 Check Final CrawlResult Count

1. Repeat **Step 3.1** (GET `/projects/<project-id>/crawl-results`)
2. Compare the count with the initial count from Step 3.1
3. **Expected:** The count should increase (new CrawlResult rows were created)

### 6.2 Get Latest CrawlResult

1. In the response from Step 6.1, find the item with the latest `scannedAt` timestamp
2. **Note the `scannedAt` value** of the most recent CrawlResult

## Step 7: Verify Project.lastCrawledAt

### 7.1 Check Updated lastCrawledAt

1. Repeat **Step 3.2** (GET `/projects/<project-id>`)
2. Check the `lastCrawledAt` value
3. **Expected Results:**
   - `lastCrawledAt` should no longer be `null` (if it was null before)
   - `lastCrawledAt` should match the latest `CrawlResult.scannedAt` from Step 6.2
   - The timestamp should be recent (within the last minute)

## Step 8: Verification Checklist

✅ **Crawl Trigger Endpoint:**

- [ ] POST `/crawl/trigger` returns 200/201 with success message
- [ ] No 404 errors (route is registered)
- [ ] No 403 errors (admin authentication works)

✅ **New CrawlResult Rows:**

- [ ] Final CrawlResult count > Initial CrawlResult count
- [ ] New rows have recent `scannedAt` timestamps

✅ **Project.lastCrawledAt:**

- [ ] `lastCrawledAt` is updated (not null if it was null before)
- [ ] `lastCrawledAt` matches the latest `CrawlResult.scannedAt`
- [ ] Timestamp is recent

## Troubleshooting

### Issue: 404 Not Found on `/crawl/trigger`

**Solution:**

1. Check that the API server is running: `curl http://localhost:3001/health`
2. Ensure only one API server process is running on port 3001
3. Restart the API server to register the route
4. Check API logs for route registration: `[RouterExplorer] Mapped {/crawl/trigger, POST} route`

### Issue: 403 Forbidden

**Solution:**

1. Verify your user has `ADMIN` role
2. Check that the Bearer token is valid (not expired)
3. Try logging in again to get a fresh token

### Issue: No New CrawlResult Rows

**Possible Causes:**

- Project doesn't have a `domain` set
- Crawl is still processing (wait longer)
- Crawl failed silently (check API logs)

**Solution:**

1. Ensure the project has a `domain` field set
2. Wait 30+ seconds and check again
3. Check API server logs for crawl errors

### Issue: lastCrawledAt Not Updated

**Possible Causes:**

- Crawl didn't complete successfully
- Project has no domain to crawl
- Crawl service error

**Solution:**

1. Check API server logs for errors
2. Verify project has a valid domain
3. Try triggering the crawl again

## Postman Collection Setup (Optional)

You can save these requests as a Postman Collection:

1. In Postman, click **New** → **Collection**
2. Name it: "EngineO Crawl Test"
3. Add all the requests from Steps 1-7
4. Create an environment variable:
   - Variable: `baseUrl` = `http://localhost:3001`
   - Variable: `accessToken` = (set after login)
   - Variable: `projectId` = (set after getting projects)
5. Use variables in URLs: `{{baseUrl}}/crawl/trigger`
6. Use variable in Authorization header: `Bearer {{accessToken}}`

This allows you to easily re-run the test sequence.
