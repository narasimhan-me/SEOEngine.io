#!/usr/bin/env ts-node
/**
 * Create Phase Tickets in EA Project
 * Creates phase tickets directly without markdown files
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Load environment variables from project root .env file
const scriptPath = process.argv[1] || require.main?.filename || __filename;
const scriptDir = dirname(scriptPath);
const projectRoot = join(scriptDir, '..');
const envPath = join(projectRoot, '.env');

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

interface PhaseTicket {
  phaseName: string;
  summary: string;
  description: string;
  type: string;
  priority: string;
  labels: string[];
  components?: string[];
}

// Import JiraClient from create-jira-ticket.ts
// For simplicity, we'll inline the necessary parts
class JiraClient {
  private baseUrl: string;
  private email: string;
  private apiToken: string;
  private projectKey: string;
  private auth: string;

  constructor(projectKey: string) {
    this.baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '') || '';
    this.email = process.env.JIRA_EMAIL || '';
    this.apiToken = process.env.JIRA_API_TOKEN || '';
    this.projectKey = projectKey;

    if (!this.baseUrl || !this.email || !this.apiToken) {
      throw new Error('Missing required Jira environment variables');
    }

    this.auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    if (response.status === 204 || contentLength === '0' || !contentType?.includes('application/json')) {
      return {} as T;
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  async getIssueTypes(): Promise<Array<{ id: string; name: string }>> {
    try {
      const projectData = await this.request<{ issueTypes: Array<{ id: string; name: string }> }>(
        'GET',
        `/project/${this.projectKey}`
      );
      return projectData.issueTypes || [];
    } catch {
      return this.request<Array<{ id: string; name: string }>>('GET', '/issuetype');
    }
  }

  async getPriorities(): Promise<Array<{ id: string; name: string }>> {
    return this.request<Array<{ id: string; name: string }>>('GET', '/priority');
  }

  async createIssue(data: PhaseTicket): Promise<{ key: string; id: string; self: string }> {
    const issueTypes = await this.getIssueTypes();
    const issueType = issueTypes.find(
      it => it.name.toLowerCase() === data.type.toLowerCase() ||
            (it.name.toLowerCase().includes('task') && data.type.toLowerCase().includes('task'))
    ) || issueTypes[0];

    const priorities = await this.getPriorities();
    const priority = priorities.find(
      p => p.name.toLowerCase() === data.priority.toLowerCase()
    ) || priorities.find(p => p.name.toLowerCase() === 'medium') || priorities[2];

    // Convert description to ADF format
    const lines = data.description.split('\n').filter(l => l.trim());
    const descriptionContent: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith('h2. ')) {
        descriptionContent.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: trimmed.replace(/^h2\.\s+/, '') }],
        });
        continue;
      }
      
      const content: any[] = [];
      const tokens = trimmed.split(/(\*[^*]+\*|_[^_]+_)/);
      
      for (const token of tokens) {
        if (!token) continue;
        
        if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
          content.push({
            type: 'text',
            text: token.slice(1, -1),
            marks: [{ type: 'strong' }],
          });
        } else if (token.startsWith('_') && token.endsWith('_') && token.length > 2) {
          content.push({
            type: 'text',
            text: token.slice(1, -1),
            marks: [{ type: 'em' }],
          });
        } else {
          content.push({ type: 'text', text: token });
        }
      }
      
      if (content.length > 0) {
        descriptionContent.push({
          type: 'paragraph',
          content: content,
        });
      }
    }

    const issue: any = {
      fields: {
        project: { key: this.projectKey },
        summary: data.summary.length > 255 ? data.summary.substring(0, 252) + '...' : data.summary,
        description: {
          type: 'doc',
          version: 1,
          content: descriptionContent.length > 0 ? descriptionContent : [{
            type: 'paragraph',
            content: [{ type: 'text', text: data.description }],
          }],
        },
        issuetype: { id: issueType.id },
        priority: { id: priority.id },
        labels: data.labels,
      },
    };

    return this.request<{ key: string; id: string; self: string }>('POST', '/issue', issue);
  }
}

const phases: PhaseTicket[] = [
  {
    phaseName: 'ISSUE-FIX-ROUTE-INTEGRITY-1',
    summary: 'ISSUE-FIX-ROUTE-INTEGRITY-1: Issues Decision Engine — No Dead Clicks',
    description: `h2. Overview

ISSUE-FIX-ROUTE-INTEGRITY-1 eliminates "dead clicks" in the Issues Engine by implementing a centralized destination map that serves as the source of truth for issue action availability. Every clickable action now leads to a valid, implemented destination with explicit blocked states when actions are unavailable.

h2. Key Features

* Issue Action Destination Map: Centralized getIssueActionDestinations() function that models where each action (fix/open/viewAffected) leads
* Explicit Blocked States: When actions are unavailable, "Blocked" chip is shown with tooltip explaining why (no fake CTAs)
* Destination Priority: Fix → View affected → Open → Blocked (truthful fallback hierarchy)
* External Link Safety: External "Open" links (Shopify admin) use target="_blank" and rel="noopener noreferrer"
* Dev-Time Guardrails: Non-fatal console warnings in development when actionable issues lack fix destinations (mapping gap detection)
* Route Context Preservation: All internal links include returnTo param for back navigation

h2. Status

✅ Complete
Date Completed: 2026-01-25`,
    type: 'Task',
    priority: 'High',
    labels: ['trust', 'issues-engine', 'route-integrity'],
  },
  {
    phaseName: 'ISSUE-FIX-KIND-CLARITY-1',
    summary: 'ISSUE-FIX-KIND-CLARITY-1: Diagnostic vs Fixable Issue CTA Semantics',
    description: `h2. Overview

ISSUE-FIX-KIND-CLARITY-1 eliminates semantic ambiguity in Issue row actions by making the "kind" of fix explicit at the point of decision, without adding new flows or backend changes.

h2. Goals

* Distinguish DIAGNOSTIC issues (informational, no direct fix) from EDIT/AI issues (actionable with direct fix surface)
* Show "Review" CTA for DIAGNOSTIC issues (not "Fix") in Issues Engine + DEO Overview
* Show blue "diagnostic" arrival callout (not yellow "anchor not found") for DIAGNOSTIC issues
* Add "View related issues" CTA for DIAGNOSTIC arrival callout

h2. Key Changes

* IssueFixKind Type: Added IssueFixKind = 'EDIT' | 'AI' | 'DIAGNOSTIC' to issue-to-fix-path.ts
* Fix-Action Kind Helper: Created issueFixActionKind.ts with 4 canonical kinds (AI_PREVIEW_FIX, DIRECT_FIX, GUIDANCE_ONLY, BLOCKED)
* Issues Page CTA Updates: Updated issues/page.tsx with semantic labels ("Review AI fix", "Fix in workspace", "Review guidance")
* Dev-Time Trust Guardrails: Added console warnings for label validation

h2. Status

✅ Complete
Date Completed: 2026-01-25 (FIXUP-3)`,
    type: 'Task',
    priority: 'High',
    labels: ['trust', 'issues-engine', 'fix-clarity', 'ui-clarity'],
  },
  {
    phaseName: 'DRAFT-LIFECYCLE-VISIBILITY-1',
    summary: 'DRAFT-LIFECYCLE-VISIBILITY-1: Make the draft lifecycle explicit and unmistakable everywhere it appears',
    description: `h2. Overview

Make the draft lifecycle explicit and unmistakable everywhere it appears, so users always know whether a draft exists, is saved, has been applied, and what will happen next.

h2. Core Trust Goal

A user must always know:
* Whether a draft exists
* Whether it is saved
* Whether it has been applied
* What will happen next if they click

If the state is ambiguous, the UI must default to conservative language and disabled actions.

h2. Canonical Draft States

* NO_DRAFT: No draft exists, no apply possible
* GENERATED (UNSAVED): Preview exists, not persisted, Apply must be disabled
* SAVED (NOT APPLIED): Persisted draft exists, Apply is available
* APPLIED: Draft has been applied, no further apply action

h2. Status

📋 In Progress`,
    type: 'Task',
    priority: 'Medium',
    labels: ['trust', 'issues-engine', 'draft-lifecycle', 'frontend-only'],
  },
  {
    phaseName: 'ISSUE-ACTION-DESTINATION-GAPS-1',
    summary: 'ISSUE-ACTION-DESTINATION-GAPS-1: Known destination gaps that should be addressed to expand fix/open coverage safely',
    description: `h2. Overview

Some Issue row actions intentionally fall back to Blocked due to missing or incomplete action destinations (e.g., missing Shopify admin URLs or unsupported asset types). These are not regressions, but known destination gaps that should be addressed to expand fix/open coverage safely.

h2. Background

As part of ISSUE-FIX-ROUTE-INTEGRITY-1, we introduced a strict Issue Action Destination Map to eliminate dead clicks and misleading CTAs. This phase intentionally chose truthfulness over coverage: if a destination cannot be proven reachable → action is blocked.

h2. Known Gaps

* Non-Product Asset Issues (Pages / Collections): "Open" action is Blocked unless a valid shopifyAdminUrl is present
* Issues without primaryProductId: "Open" defaults to product workspace when primaryProductId exists
* Issue types marked isActionableNow but lacking destination metadata: Guardrail logs warn in dev mode

h2. Status

📋 Deferred (not blocking)`,
    type: 'Bug / Tech Debt',
    priority: 'Medium',
    labels: ['trust', 'issues-engine', 'route-integrity', 'deferred'],
  },
];

async function main() {
  const client = new JiraClient('EA');

  console.log(`🔗 Connecting to Jira: ${process.env.JIRA_BASE_URL}`);
  console.log(`📦 Project: EA\n`);

  for (const phase of phases) {
    try {
      console.log(`📝 Creating: ${phase.summary}`);
      const result = await client.createIssue(phase);
      console.log(`✅ Created: ${result.key} - ${result.id}`);
      console.log(`   URL: ${process.env.JIRA_BASE_URL}/browse/${result.key}\n`);
    } catch (error: any) {
      console.error(`❌ Failed to create ${phase.phaseName}: ${error.message}\n`);
    }
  }

  console.log(`🎉 Phase ticket creation complete!`);
}

main().catch(console.error);
