#!/usr/bin/env ts-node
/**
 * Jira CRUD Operations for AI Agents
 * 
 * Provides Create, Read, Update, Delete operations for Jira tickets
 * 
 * Usage:
 *   CREATE:
 *     ts-node scripts/jira-crud.ts create --project EA --type Task --summary "Title" --description "Description"
 *     ts-node scripts/jira-crud.ts create --project KAN --type Bug --summary "Title" --priority High --labels "trust,issues-engine"
 *   
 *   READ:
 *     ts-node scripts/jira-crud.ts read <TICKET-KEY>
 *     ts-node scripts/jira-crud.ts list --project EA
 *     ts-node scripts/jira-crud.ts search "query"
 *   
 *   UPDATE:
 *     ts-node scripts/jira-crud.ts update <TICKET-KEY> --summary "New title" --description "New description"
 *     ts-node scripts/jira-crud.ts update <TICKET-KEY> --labels "new,labels"
 *   
 *   DELETE:
 *     ts-node scripts/jira-crud.ts delete <TICKET-KEY>
 *   
 *   TRANSITION:
 *     ts-node scripts/jira-crud.ts transition <TICKET-KEY> --status Done
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Load environment variables
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

interface CreateTicketInput {
  project: string;
  type: string;
  summary: string;
  description?: string;
  priority?: string;
  labels?: string[];
  components?: string[];
}

class JiraCRUD {
  private baseUrl: string;
  private email: string;
  private apiToken: string;
  private auth: string;

  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '') || '';
    this.email = process.env.JIRA_EMAIL || '';
    this.apiToken = process.env.JIRA_API_TOKEN || '';

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

  async getIssueTypes(projectKey: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const projectData = await this.request<{ issueTypes: Array<{ id: string; name: string }> }>(
        'GET',
        `/project/${projectKey}`
      );
      return projectData.issueTypes || [];
    } catch {
      return this.request<Array<{ id: string; name: string }>>('GET', '/issuetype');
    }
  }

  async getPriorities(): Promise<Array<{ id: string; name: string }>> {
    return this.request<Array<{ id: string; name: string }>>('GET', '/priority');
  }

  async getComponents(projectKey: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const data = await this.request<Array<{ id: string; name: string }>>(
        'GET',
        `/project/${projectKey}/components`
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async createIssue(input: CreateTicketInput): Promise<{ key: string; id: string; self: string }> {
    const issueTypes = await this.getIssueTypes(input.project);
    const issueType = issueTypes.find(
      it => it.name.toLowerCase() === input.type.toLowerCase() ||
            (it.name.toLowerCase().includes('bug') && input.type.toLowerCase().includes('bug')) ||
            (it.name.toLowerCase().includes('task') && input.type.toLowerCase().includes('task')) ||
            (it.name.toLowerCase().includes('epic') && input.type.toLowerCase().includes('epic'))
    ) || issueTypes[0];

    const priorities = await this.getPriorities();
    const priority = input.priority 
      ? priorities.find(p => p.name.toLowerCase() === input.priority!.toLowerCase()) 
        || priorities.find(p => p.name.toLowerCase() === 'medium') 
        || priorities[2]
      : priorities.find(p => p.name.toLowerCase() === 'medium') || priorities[2];

    // Convert description to ADF format
    const descriptionContent = this.textToAdf(input.description || '');

    const issue: any = {
      fields: {
        project: { key: input.project },
        summary: input.summary.length > 255 ? input.summary.substring(0, 252) + '...' : input.summary,
        description: {
          type: 'doc',
          version: 1,
          content: descriptionContent.length > 0 ? descriptionContent : [{
            type: 'paragraph',
            content: [{ type: 'text', text: input.description || '' }],
          }],
        },
        issuetype: { id: issueType.id },
        priority: { id: priority.id },
        labels: input.labels || [],
      },
    };

    // Add components if specified
    if (input.components && input.components.length > 0) {
      const components = await this.getComponents(input.project);
      const componentIds = input.components
        .map(compName => {
          const comp = components.find(c => 
            c.name.toLowerCase().includes(compName.toLowerCase()) ||
            compName.toLowerCase().includes(c.name.toLowerCase())
          );
          return comp ? { id: comp.id } : null;
        })
        .filter(Boolean);
      
      if (componentIds.length > 0) {
        issue.fields.components = componentIds;
      }
    }

    return this.request<{ key: string; id: string; self: string }>('POST', '/issue', issue);
  }

  async readIssue(issueKey: string): Promise<JiraIssue> {
    return this.request<JiraIssue>(
      'GET',
      `/issue/${issueKey}?fields=summary,description,status,issuetype,priority,labels,components,created,updated,assignee,reporter`
    );
  }

  async listIssues(projectKey: string, maxResults: number = 100): Promise<JiraIssue[]> {
    const jql = `project = ${projectKey} ORDER BY created DESC`;
    const params = new URLSearchParams({
      jql: jql,
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,issuetype,priority,labels,components,created,updated,assignee,reporter'
    });
    
    const url = `${this.baseUrl}/rest/api/3/search/jql?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const result = await response.json() as JiraSearchResult;
    return result.issues || [];
  }

  async searchIssues(query: string, maxResults: number = 50): Promise<JiraIssue[]> {
    const jql = `(project = EA OR project = KAN) AND (summary ~ "${query}" OR description ~ "${query}") ORDER BY created DESC`;
    const params = new URLSearchParams({
      jql: jql,
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,issuetype,priority,labels,components,created,updated,assignee,reporter'
    });
    
    const url = `${this.baseUrl}/rest/api/3/search/jql?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const result = await response.json() as JiraSearchResult;
    return result.issues || [];
  }

  async updateIssue(issueKey: string, updates: {
    summary?: string;
    description?: string;
    labels?: string[];
    priority?: string;
  }): Promise<void> {
    const fields: any = {};

    if (updates.summary) {
      fields.summary = updates.summary.length > 255 
        ? updates.summary.substring(0, 252) + '...' 
        : updates.summary;
    }

    if (updates.description !== undefined) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: this.textToAdf(updates.description).length > 0 
          ? this.textToAdf(updates.description)
          : [{ type: 'paragraph', content: [{ type: 'text', text: updates.description || '' }] }],
      };
    }

    if (updates.labels) {
      fields.labels = updates.labels;
    }

    if (updates.priority) {
      const priorities = await this.getPriorities();
      const priority = priorities.find(p => p.name.toLowerCase() === updates.priority!.toLowerCase());
      if (priority) {
        fields.priority = { id: priority.id };
      }
    }

    await this.request('PUT', `/issue/${issueKey}`, { fields });
  }

  async deleteIssue(issueKey: string): Promise<void> {
    await this.request('DELETE', `/issue/${issueKey}`);
  }

  async getTransitions(issueKey: string): Promise<Array<{ id: string; name: string; to: { id: string; name: string } }>> {
    const data = await this.request<{ transitions: Array<{ id: string; name: string; to: { id: string; name: string } }> }>(
      'GET',
      `/issue/${issueKey}/transitions`
    );
    return data.transitions || [];
  }

  async transitionIssue(issueKey: string, statusName: string): Promise<void> {
    const transitions = await this.getTransitions(issueKey);
    const transition = transitions.find(t => 
      t.to.name.toLowerCase() === statusName.toLowerCase() ||
      t.name.toLowerCase() === statusName.toLowerCase()
    );

    if (!transition) {
      throw new Error(`No transition found to status: ${statusName}. Available: ${transitions.map(t => t.to.name).join(', ')}`);
    }

    await this.request('POST', `/issue/${issueKey}/transitions`, {
      transition: { id: transition.id },
    });
  }

  async addComment(issueKey: string, comment: string): Promise<{ id: string; self: string }> {
    return this.request<{ id: string; self: string }>(
      'POST',
      `/issue/${issueKey}/comment`,
      {
        body: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: comment }],
          }],
        },
      }
    );
  }

  private textToAdf(text: string): any[] {
    if (!text) return [];
    
    const lines = text.split('\n').filter(l => l.trim());
    const content: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        content.push({ type: 'paragraph', content: [] });
        continue;
      }
      
      if (trimmed.startsWith('## ')) {
        content.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: trimmed.replace(/^##\s+/, '') }],
        });
        continue;
      }
      
      if (trimmed.startsWith('### ')) {
        content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: trimmed.replace(/^###\s+/, '') }],
        });
        continue;
      }
      
      const paragraphContent: any[] = [];
      const tokens = trimmed.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
      
      for (const token of tokens) {
        if (!token) continue;
        
        if (token.startsWith('**') && token.endsWith('**')) {
          paragraphContent.push({
            type: 'text',
            text: token.slice(2, -2),
            marks: [{ type: 'strong' }],
          });
        } else if (token.startsWith('*') && token.endsWith('*') && !token.startsWith('**')) {
          paragraphContent.push({
            type: 'text',
            text: token.slice(1, -1),
            marks: [{ type: 'em' }],
          });
        } else if (token.startsWith('`') && token.endsWith('`')) {
          paragraphContent.push({
            type: 'text',
            text: token.slice(1, -1),
            marks: [{ type: 'code' }],
          });
        } else {
          paragraphContent.push({ type: 'text', text: token });
        }
      }
      
      if (paragraphContent.length > 0) {
        content.push({
          type: 'paragraph',
          content: paragraphContent,
        });
      }
    }
    
    return content.length > 0 ? content : [{ type: 'paragraph', content: [{ type: 'text', text: text }] }];
  }
}

function parseArgs(): { command: string; args: Record<string, string | string[]> } {
  const args = process.argv.slice(2);
  const command = args[0];
  const parsed: Record<string, string | string[]> = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        const value = args[i + 1];
        if (key === 'labels' || key === 'components') {
          parsed[key] = value.split(',').map(v => v.trim());
        } else {
          parsed[key] = value;
        }
        i++;
      } else {
        parsed[key] = 'true';
      }
    }
  }

  return { command, args: parsed };
}

function formatIssue(issue: JiraIssue): string {
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
  lines.push(`**URL:** ${process.env.JIRA_BASE_URL}/browse/${issue.key}`);
  return lines.join('\n');
}

async function main() {
  const { command, args } = parseArgs();
  const client = new JiraCRUD();

  try {
    switch (command) {
      case 'create': {
        if (!args.project || !args.type || !args.summary) {
          console.error('Error: --project, --type, and --summary are required');
          process.exit(1);
        }

        const ticket = await client.createIssue({
          project: args.project as string,
          type: args.type as string,
          summary: args.summary as string,
          description: args.description as string,
          priority: args.priority as string,
          labels: args.labels as string[],
          components: args.components as string[],
        });

        console.log(`✅ Created ticket: ${ticket.key}`);
        console.log(`   ID: ${ticket.id}`);
        console.log(`   URL: ${process.env.JIRA_BASE_URL}/browse/${ticket.key}`);
        break;
      }

      case 'read': {
        const issueKey = process.argv[3];
        if (!issueKey) {
          console.error('Error: Ticket key required');
          process.exit(1);
        }

        const issue = await client.readIssue(issueKey);
        console.log(formatIssue(issue));
        break;
      }

      case 'list': {
        const project = (args.project as string) || 'ALL';
        const projects = project === 'ALL' ? ['EA', 'KAN'] : [project];

        for (const projectKey of projects) {
          console.log(`\n📋 ${projectKey} Project:`);
          const issues = await client.listIssues(projectKey);
          issues.forEach(issue => {
            console.log(`  ${issue.key} | ${issue.fields.status.name} | ${issue.fields.summary.substring(0, 60)}...`);
          });
        }
        break;
      }

      case 'search': {
        const query = process.argv.slice(3).join(' ');
        if (!query) {
          console.error('Error: Search query required');
          process.exit(1);
        }

        const issues = await client.searchIssues(query);
        console.log(`Found ${issues.length} ticket(s):\n`);
        issues.forEach(issue => {
          console.log(formatIssue(issue));
          console.log('');
        });
        break;
      }

      case 'update': {
        const issueKey = process.argv[3];
        if (!issueKey) {
          console.error('Error: Ticket key required');
          process.exit(1);
        }

        await client.updateIssue(issueKey, {
          summary: args.summary as string,
          description: args.description as string,
          labels: args.labels as string[],
          priority: args.priority as string,
        });

        console.log(`✅ Updated ticket: ${issueKey}`);
        break;
      }

      case 'delete': {
        const issueKey = process.argv[3];
        if (!issueKey) {
          console.error('Error: Ticket key required');
          process.exit(1);
        }

        await client.deleteIssue(issueKey);
        console.log(`✅ Deleted ticket: ${issueKey}`);
        break;
      }

      case 'transition': {
        const issueKey = process.argv[3];
        const status = args.status as string;
        
        if (!issueKey || !status) {
          console.error('Error: Ticket key and --status required');
          process.exit(1);
        }

        await client.transitionIssue(issueKey, status);
        console.log(`✅ Transitioned ${issueKey} to ${status}`);
        break;
      }

      case 'comment': {
        const issueKey = process.argv[3];
        const comment = args.comment as string || process.argv.slice(4).join(' ');
        
        if (!issueKey || !comment) {
          console.error('Error: Ticket key and comment required');
          process.exit(1);
        }

        await client.addComment(issueKey, comment);
        console.log(`✅ Added comment to ${issueKey}`);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error('\nAvailable commands: create, read, list, search, update, delete, transition, comment');
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
