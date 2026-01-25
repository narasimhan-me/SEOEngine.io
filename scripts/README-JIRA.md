# Jira Ticket Scripts for AI Agents

This directory contains scripts for interacting with Jira tickets in the EA and KAN projects.

## Available Scripts

### 1. Jira CRUD Operations (`jira-crud.ts`) ⭐ **Recommended for AI Agents**

Unified CRUD interface for all Jira operations. Use this for programmatic ticket management.

**Usage:**
```bash
# CREATE - Create a new ticket
pnpm jira create --project EA --type Task --summary "Title" --description "Description"
pnpm jira create --project KAN --type Bug --summary "Title" --priority High --labels "trust,issues-engine"

# READ - Read a specific ticket
pnpm jira read <TICKET-KEY>
# Example: pnpm jira read EA-14

# LIST - List all tickets from a project
pnpm jira list --project EA
pnpm jira list --project KAN
pnpm jira list --project ALL  # Lists from both EA and KAN

# SEARCH - Search tickets across both projects
pnpm jira search "DRAFT-LIFECYCLE"
pnpm jira search "ISSUE-FIX"

# UPDATE - Update ticket fields
pnpm jira update <TICKET-KEY> --summary "New title"
pnpm jira update <TICKET-KEY> --description "New description"
pnpm jira update <TICKET-KEY> --labels "new,labels"
pnpm jira update <TICKET-KEY> --priority High

# DELETE - Delete a ticket (use with caution!)
pnpm jira delete <TICKET-KEY>

# TRANSITION - Change ticket status
pnpm jira transition <TICKET-KEY> --status Done
pnpm jira transition <TICKET-KEY> --status "In Progress"

# COMMENT - Add a comment to a ticket
pnpm jira comment <TICKET-KEY> --comment "This is a comment"
```

**Project Guidelines:**
- **EA**: Use for product ideas and feature requests
- **KAN**: Use for Epics, Stories, Tasks, and Bugs

### 2. Create Jira Tickets from Markdown (`create-jira-ticket.ts`)

Creates Jira tickets from markdown files in `docs/jira/`. Useful when you have a markdown template.

**Usage:**
```bash
# Create a ticket from markdown file
pnpm jira:create <TICKET-KEY> [--project EA|KAN]

# Examples
pnpm jira:create DRAFT-LIFECYCLE-VISIBILITY-1 --project KAN
pnpm jira:create PRODUCT-IDEA-1 --project EA

# Update an existing ticket from markdown
pnpm jira:create update EA-14 --project EA

# Transition ticket to Done
pnpm jira:create transition EA-11 --project EA
```

### 3. Read Jira Tickets (`read-jira-tickets.ts`)

Reads Jira tickets from EA and KAN projects. Useful for AI agents to understand project context.

**Usage:**
```bash
# Read a specific ticket
pnpm jira:read <TICKET-KEY>
# Example: pnpm jira:read EA-14

# List all tickets from a project
pnpm jira:read --list --project EA
pnpm jira:read --list --project KAN
pnpm jira:read --list --project ALL  # Lists from both EA and KAN

# Search tickets across both projects
pnpm jira:read --search "DRAFT-LIFECYCLE"
pnpm jira:read --search "ISSUE-FIX"
```

**Output Format:**
- Single ticket: Full ticket details with description
- List: Summary table with Key, Status, Type, Summary
- Search: Full ticket details (without description) for matching tickets

## Environment Variables

Required in `.env` file:
```
JIRA_BASE_URL=https://engineo-ai.atlassian.net
JIRA_EMAIL=admin@engineo.ai
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=KAN  # Default project (can be overridden with --project flag)
```

## For AI Agents

### Recommended Workflow

When working on implementation tasks, use `jira-crud.ts` for all operations:

```bash
# 1. Read the phase ticket to understand requirements
pnpm jira read EA-14

# 2. Search for related tickets
pnpm jira search "DRAFT-LIFECYCLE"

# 3. Create a new bug ticket if needed
pnpm jira create --project KAN --type Bug --summary "Bug title" --description "Bug description" --labels "trust,issues-engine"

# 4. Update ticket with progress
pnpm jira update EA-14 --description "Updated description with progress"

# 5. Add a comment with implementation notes
pnpm jira comment EA-14 --comment "Implementation complete. All patches applied."

# 6. When complete, transition to Done
pnpm jira transition EA-14 --status Done
```

### Common Operations

**Create a bug ticket:**
```bash
pnpm jira create --project KAN --type Bug --summary "Issue title" \
  --description "Issue description" --priority Medium \
  --labels "trust,issues-engine,frontend-only"
```

**Create a task/idea ticket:**
```bash
pnpm jira create --project EA --type Task --summary "Feature idea" \
  --description "Detailed description" --priority High
```

**Update multiple fields:**
```bash
pnpm jira update EA-14 --summary "Updated title" \
  --description "Updated description" --labels "new,labels"
```

**List all tickets from a project:**
```bash
pnpm jira list --project EA
pnpm jira list --project KAN
pnpm jira list --project ALL
```

## File Structure

- `docs/jira/*.md` - Markdown files for tickets (source of truth)
- `scripts/jira-crud.ts` - **Unified CRUD operations** (recommended for AI agents)
- `scripts/create-jira-ticket.ts` - Create/update/transition tickets from markdown files
- `scripts/read-jira-tickets.ts` - Read/list/search tickets (legacy, use `jira-crud.ts` instead)

## CRUD Operations Summary

| Operation | Command | Description |
|-----------|---------|-------------|
| **Create** | `pnpm jira create --project EA --type Task --summary "Title"` | Create a new ticket |
| **Read** | `pnpm jira read EA-14` | Read a specific ticket |
| **List** | `pnpm jira list --project EA` | List all tickets from a project |
| **Search** | `pnpm jira search "query"` | Search tickets across EA and KAN |
| **Update** | `pnpm jira update EA-14 --summary "New title"` | Update ticket fields |
| **Delete** | `pnpm jira delete EA-14` | Delete a ticket (use with caution) |
| **Transition** | `pnpm jira transition EA-14 --status Done` | Change ticket status |
| **Comment** | `pnpm jira comment EA-14 --comment "Text"` | Add a comment to a ticket |
