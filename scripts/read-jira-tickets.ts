#!/usr/bin/env ts-node
/**
 * Jira Ticket Reader
 *
 * Reads Jira tickets from EA and KAN projects for AI agents
 *
 * Usage:
 *   ts-node scripts/read-jira-tickets.ts <TICKET-KEY>
 *   ts-node scripts/read-jira-tickets.ts --list [--project EA|KAN|ALL]
 *   ts-node scripts/read-jira-tickets.ts --search <QUERY>
 *
 * Examples:
 *   ts-node scripts/read-jira-tickets.ts EA-14
 *   ts-node scripts/read-jira-tickets.ts --list --project EA
 *   ts-node scripts/read-jira-tickets.ts --list --project ALL
 *   ts-node scripts/read-jira-tickets.ts --search "DRAFT-LIFECYCLE"
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
  envContent.split('\n').forEach((line) => {
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

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: any;
    status: { name: string; id: string };
    issuetype: { name: string; id: string };
    priority?: { name: string; id: string };
    labels: string[];
    components?: Array<{ name: string; id: string }>;
    created: string;
    updated: string;
    assignee?: { displayName: string; emailAddress: string };
    reporter?: { displayName: string; emailAddress: string };
  };
  self: string;
}

interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

class JiraClient {
  private baseUrl: string;
  private email: string;
  private apiToken: string;
  private auth: string;

  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '') || '';
    this.email = process.env.JIRA_EMAIL || '';
    this.apiToken = process.env.JIRA_API_TOKEN || '';

    if (!this.baseUrl || !this.email || !this.apiToken) {
      throw new Error(
        'Missing required environment variables:\n' +
          '  - JIRA_BASE_URL\n' +
          '  - JIRA_EMAIL\n' +
          '  - JIRA_API_TOKEN'
      );
    }

    this.auth = Buffer.from(`${this.email}:${this.apiToken}`).toString(
      'base64'
    );
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: 'application/json',
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
    if (
      response.status === 204 ||
      contentLength === '0' ||
      !contentType?.includes('application/json')
    ) {
      return {} as T;
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request<JiraIssue>(
      'GET',
      `/issue/${issueKey}?fields=summary,description,status,issuetype,priority,labels,components,created,updated,assignee,reporter`
    );
  }

  async searchIssues(
    jql: string,
    maxResults: number = 100,
    nextPageToken?: string
  ): Promise<JiraSearchResult> {
    // Use the new /search/jql endpoint with GET
    const params = new URLSearchParams({
      jql: jql,
      maxResults: maxResults.toString(),
      fields:
        'summary,description,status,issuetype,priority,labels,components,created,updated,assignee,reporter',
    });

    if (nextPageToken) {
      params.append('nextPageToken', nextPageToken);
    }

    const url = `${this.baseUrl}/rest/api/3/search/jql?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<JiraSearchResult>;
  }

  async listProjectIssues(
    projectKey: string,
    maxResults: number = 100
  ): Promise<JiraIssue[]> {
    const jql = `project = ${projectKey} ORDER BY created DESC`;
    const result = await this.searchIssues(jql, maxResults);
    return result.issues;
  }
}

function formatDescription(description: any): string {
  if (!description) return '';
  if (typeof description === 'string') return description;

  if (description.type === 'doc' && description.content) {
    return formatAdfContent(description.content);
  }

  return JSON.stringify(description, null, 2);
}

function formatAdfContent(content: any[]): string {
  if (!Array.isArray(content)) return '';

  return content
    .map((node) => {
      if (node.type === 'paragraph') {
        return formatAdfParagraph(node);
      } else if (node.type === 'heading') {
        const level = node.attrs?.level || 2;
        const text = formatAdfText(node.content || []);
        return `${'#'.repeat(level)} ${text}`;
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        return formatAdfList(node);
      } else if (node.type === 'codeBlock') {
        return formatAdfText(node.content || []);
      }
      return formatAdfText(node.content || []);
    })
    .join('\n\n');
}

function formatAdfParagraph(node: any): string {
  return formatAdfText(node.content || []);
}

function formatAdfList(node: any): string {
  if (!node.content || !Array.isArray(node.content)) return '';

  return node.content
    .map((item: any, index: number) => {
      const prefix = node.type === 'orderedList' ? `${index + 1}.` : '-';
      const text = formatAdfText(item.content || []);
      return `${prefix} ${text}`;
    })
    .join('\n');
}

function formatAdfText(content: any[]): string {
  if (!Array.isArray(content)) return '';

  return content
    .map((node) => {
      if (node.type === 'text') {
        let text = node.text || '';
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === 'strong') {
              text = `**${text}**`;
            } else if (mark.type === 'em') {
              text = `_${text}_`;
            } else if (mark.type === 'code') {
              text = `\`${text}\``;
            }
          }
        }
        return text;
      }
      return '';
    })
    .join('');
}

function formatIssue(
  issue: JiraIssue,
  includeDescription: boolean = true
): string {
  const lines: string[] = [];

  lines.push(`# ${issue.key}: ${issue.fields.summary}`);
  lines.push('');
  lines.push(`**Type:** ${issue.fields.issuetype.name}`);
  lines.push(`**Status:** ${issue.fields.status.name}`);
  if (issue.fields.priority) {
    lines.push(`**Priority:** ${issue.fields.priority.name}`);
  }
  if (issue.fields.labels && issue.fields.labels.length > 0) {
    lines.push(`**Labels:** ${issue.fields.labels.join(', ')}`);
  }
  if (issue.fields.components && issue.fields.components.length > 0) {
    lines.push(
      `**Components:** ${issue.fields.components.map((c) => c.name).join(', ')}`
    );
  }
  lines.push(`**Created:** ${new Date(issue.fields.created).toLocaleString()}`);
  lines.push(`**Updated:** ${new Date(issue.fields.updated).toLocaleString()}`);
  if (issue.fields.assignee) {
    lines.push(`**Assignee:** ${issue.fields.assignee.displayName}`);
  }
  if (issue.fields.reporter) {
    lines.push(`**Reporter:** ${issue.fields.reporter.displayName}`);
  }
  lines.push(`**URL:** ${process.env.JIRA_BASE_URL}/browse/${issue.key}`);
  lines.push('');

  if (includeDescription && issue.fields.description) {
    lines.push('---');
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(formatDescription(issue.fields.description));
    lines.push('');
  }

  return lines.join('\n');
}

function formatIssueSummary(issue: JiraIssue): string {
  return `${issue.key} | ${issue.fields.status.name} | ${issue.fields.issuetype.name} | ${issue.fields.summary}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage:');
    console.error('  ts-node scripts/read-jira-tickets.ts <TICKET-KEY>');
    console.error(
      '  ts-node scripts/read-jira-tickets.ts --list [--project EA|KAN|ALL]'
    );
    console.error('  ts-node scripts/read-jira-tickets.ts --search <QUERY>');
    console.error('');
    console.error('Examples:');
    console.error('  ts-node scripts/read-jira-tickets.ts EA-14');
    console.error('  ts-node scripts/read-jira-tickets.ts --list --project EA');
    console.error(
      '  ts-node scripts/read-jira-tickets.ts --list --project ALL'
    );
    console.error(
      '  ts-node scripts/read-jira-tickets.ts --search "DRAFT-LIFECYCLE"'
    );
    process.exit(1);
  }

  const client = new JiraClient();

  try {
    // Single ticket lookup
    if (!args[0].startsWith('--')) {
      const issueKey = args[0];
      console.log(`📋 Fetching ticket: ${issueKey}\n`);

      const issue = await client.getIssue(issueKey);
      console.log(formatIssue(issue));

      return;
    }

    // List tickets
    if (args[0] === '--list') {
      let projectFilter = 'ALL';
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--project' && args[i + 1]) {
          projectFilter = args[i + 1].toUpperCase();
          break;
        }
      }

      const projects =
        projectFilter === 'ALL' ? ['EA', 'KAN'] : [projectFilter];

      console.log(`📋 Listing tickets from: ${projects.join(', ')}\n`);

      for (const projectKey of projects) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Project: ${projectKey}`);
        console.log('='.repeat(60));

        const issues = await client.listProjectIssues(projectKey, 100);

        if (issues.length === 0) {
          console.log('No tickets found.');
          continue;
        }

        console.log(`\nFound ${issues.length} ticket(s):\n`);
        console.log('Key | Status | Type | Summary');
        console.log('-'.repeat(80));

        for (const issue of issues) {
          console.log(formatIssueSummary(issue));
        }
      }

      return;
    }

    // Search tickets
    if (args[0] === '--search') {
      const query = args.slice(1).join(' ');

      if (!query) {
        console.error('Error: Search query is required');
        process.exit(1);
      }

      console.log(`🔍 Searching for: "${query}"\n`);

      const jql = `(project = EA OR project = KAN) AND (summary ~ "${query}" OR description ~ "${query}") ORDER BY created DESC`;
      const result = await client.searchIssues(jql, 50);

      if (result.issues.length === 0) {
        console.log('No tickets found matching the search query.');
        return;
      }

      console.log(`Found ${result.issues.length} ticket(s):\n`);

      for (const issue of result.issues) {
        console.log(formatIssue(issue, false));
        console.log('\n' + '-'.repeat(80) + '\n');
      }

      return;
    }

    console.error(`Unknown command: ${args[0]}`);
    process.exit(1);
  } catch (error: any) {
    console.error(`\n❌ Error reading Jira tickets:`);
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
