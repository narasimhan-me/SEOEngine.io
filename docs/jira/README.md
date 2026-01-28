# Jira Integration

This directory contains Jira ticket templates and a script to automatically create tickets in Jira.

## Setup

### 1. Get Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a label (e.g., "EngineO.ai Script")
4. Copy the token (you'll only see it once!)

### 2. Configure Environment Variables

Add these to your `.env` file in the project root (or `apps/api/.env`):

```bash
# Jira Configuration
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
JIRA_PROJECT_KEY=ENGINEO
```

**Note:** Never commit `.env` files with real credentials to version control.

### 3. Install Dependencies

The script uses `ts-node` and `dotenv` which should already be available in the project. If not:

```bash
pnpm add -D ts-node dotenv
```

## Usage

### Create a Ticket from a Markdown File

1. Create a ticket file in `docs/jira/` following the format of existing tickets
2. Run the script:

```bash
pnpm jira:create ISSUE-ACTION-DESTINATION-GAPS-1
```

Or directly:

```bash
ts-node --project apps/api/tsconfig.json scripts/create-jira-ticket.ts ISSUE-ACTION-DESTINATION-GAPS-1
```

The script will:

- Read the markdown file from `docs/jira/{TICKET-KEY}.md`
- Parse metadata (Type, Priority, Component, Labels, etc.)
- Create the ticket in Jira
- Print the ticket URL

## Ticket File Format

Ticket files should follow this format:

```markdown
# Jira Issue: ISSUE-KEY-1

**Type:** Bug / Tech Debt  
**Priority:** Medium  
**Component:** Component Name  
**Affects Version:** Version Name  
**Labels:** label1, label2, label3

---

## Summary

Brief summary of the issue.

---

## Background / Context

Detailed background information.

---

## Acceptance Criteria

- Criterion 1
- Criterion 2

---

## Notes

Additional notes.
```

## Troubleshooting

### "Missing required environment variables"

- Make sure you've set `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and optionally `JIRA_PROJECT_KEY`
- Check that your `.env` file is in the correct location

### "Jira API error (401)"

- Verify your email and API token are correct
- Make sure your Jira account has permission to create issues in the project

### "Jira API error (404)"

- Check that `JIRA_PROJECT_KEY` matches your actual Jira project key
- Verify the project exists and you have access

### Issue Type Not Found

- The script tries to match issue types by name
- If "Bug / Tech Debt" doesn't match, it will use the first available issue type
- You may need to adjust the issue type name in your ticket file

## Security Notes

- API tokens are sensitive credentials - treat them like passwords
- Never commit `.env` files with real tokens
- Rotate tokens if they're ever exposed
- Use different tokens for different environments (dev/staging/prod)
