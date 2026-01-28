# Environment Variables

Supported environment variables for the autonomous-agent execution engine.

## Required

| Variable | Alias | Description |
|----------|-------|-------------|
| `JIRA_URL` | | Jira instance URL |
| `JIRA_USERNAME` | `JIRA_EMAIL` | Jira username or email |
| `JIRA_TOKEN` | `JIRA_API_TOKEN` | Jira API token |
| `GITHUB_TOKEN` | | GitHub personal access token |

## Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `REPO_PATH` | *(hardcoded in code)* | Path to repository |
| `FEATURE_BRANCH` | `feature/agent` | Git branch for autonomous work |
| `PRODUCT_DISCOVERY_PROJECT` | `EA` | Jira Product Discovery project key |
| `SOFTWARE_PROJECT` | `KAN` | Jira Software project key |
| `ESCALATION_EMAIL` | *(hardcoded in code)* | Email for human escalations |
| `GMAIL_ADDRESS` | | Gmail address for escalation emails |
| `GMAIL_APP_PASSWORD` | | Gmail app password |
| `ENGINE_MAX_CHANGED_FILES` | `15` | Guardrails diff budget override |

## Precedence

Environment variables already set take precedence over `.env` (env > .env).

The engine loads `.env` from the following locations (first found wins):
1. `scripts/autonomous-agent/.env`
2. Repository root `.env`

## Security

Do not commit `.env` files containing secrets.
