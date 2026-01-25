#!/usr/bin/env ts-node
/**
 * Jira Ticket Creator
 * 
 * Creates a Jira ticket from a markdown file in docs/jira/
 * 
 * Usage:
 *   ts-node scripts/create-jira-ticket.ts <TICKET-KEY> [--project <PROJECT-KEY>]
 *   OR
 *   pnpm jira:create <TICKET-KEY> [--project <PROJECT-KEY>]
 * 
 * Examples:
 *   pnpm jira:create ISSUE-ACTION-DESTINATION-GAPS-1 --project KAN
 *   pnpm jira:create PRODUCT-IDEA-1 --project EA
 *   pnpm jira:create ISSUE-FIX-KIND-CLARITY-1  # Uses JIRA_PROJECT_KEY from .env
 * 
 * Environment Variables:
 *   JIRA_BASE_URL - Your Jira instance URL (e.g., https://yourcompany.atlassian.net)
 *   JIRA_EMAIL - Your Jira account email
 *   JIRA_API_TOKEN - Your Jira API token (get from https://id.atlassian.com/manage-profile/security/api-tokens)
 *   JIRA_PROJECT_KEY - Default project key (e.g., "KAN" or "EA") - can be overridden with --project flag
 * 
 * Project Key Guidelines:
 *   - EA: Use for product ideas and feature requests
 *   - KAN: Use for Epics, Stories, Tasks, and Bugs
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

interface JiraTicketData {
  summary: string;
  description: string;
  issueType: string;
  priority: string;
  labels: string[];
  components?: string[];
  affectsVersion?: string;
}

interface JiraIssueType {
  id: string;
  name: string;
}

interface JiraPriority {
  id: string;
  name: string;
}

interface JiraComponent {
  id: string;
  name: string;
}

interface JiraVersion {
  id: string;
  name: string;
}

class JiraClient {
  private baseUrl: string;
  private email: string;
  private apiToken: string;
  private projectKey: string;
  private auth: string;

  constructor(projectKey?: string) {
    this.baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '') || '';
    this.email = process.env.JIRA_EMAIL || '';
    this.apiToken = process.env.JIRA_API_TOKEN || '';
    this.projectKey = projectKey || process.env.JIRA_PROJECT_KEY || 'ENGINEO';

    if (!this.baseUrl || !this.email || !this.apiToken) {
      throw new Error(
        'Missing required environment variables:\n' +
        '  - JIRA_BASE_URL (e.g., https://yourcompany.atlassian.net)\n' +
        '  - JIRA_EMAIL (your Jira account email)\n' +
        '  - JIRA_API_TOKEN (get from https://id.atlassian.com/manage-profile/security/api-tokens)\n' +
        '  - JIRA_PROJECT_KEY (optional, defaults to ENGINEO)'
      );
    }

    // Basic auth: base64(email:apiToken)
    this.auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Basic ${this.auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Jira API error (${response.status}): ${response.statusText}\n${errorText}`
      );
    }

    // Handle empty responses (e.g., 204 No Content for transitions)
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

  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple endpoint that requires auth
      await this.request<{ key: string; name: string }>('GET', '/myself');
      return true;
    } catch (error: any) {
      console.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  async getIssueTypes(): Promise<JiraIssueType[]> {
    try {
      // Get issue types from project metadata
      const projectData = await this.request<{ issueTypes: JiraIssueType[] }>(
        'GET',
        `/project/${this.projectKey}`
      );
      return projectData.issueTypes || [];
    } catch (error: any) {
      console.warn(`Failed to get project issue types: ${error.message}`);
      // Fallback: get all issue types
      try {
        return await this.request<JiraIssueType[]>('GET', '/issuetype');
      } catch (fallbackError: any) {
        console.error(`Failed to get issue types: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }

  async getPriorities(): Promise<JiraPriority[]> {
    return this.request<JiraPriority[]>('GET', '/priority');
  }

  async getComponents(): Promise<JiraComponent[]> {
    try {
      const data = await this.request<JiraComponent[]>(
        'GET',
        `/project/${this.projectKey}/components`
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async getVersions(): Promise<JiraVersion[]> {
    try {
      const data = await this.request<JiraVersion[]>(
        'GET',
        `/project/${this.projectKey}/versions`
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async createIssue(data: JiraTicketData): Promise<{ key: string; id: string; self: string }> {
    // Get issue types to find the correct ID
    const issueTypes = await this.getIssueTypes();
    const issueType = issueTypes.find(
      it => it.name.toLowerCase() === data.issueType.toLowerCase() ||
            (it.name.toLowerCase().includes('epic') && data.issueType.toLowerCase().includes('epic')) ||
            (it.name.toLowerCase().includes('bug') && data.issueType.toLowerCase().includes('bug')) ||
            (it.name.toLowerCase().includes('tech') && data.issueType.toLowerCase().includes('tech'))
    ) || issueTypes[0];

    // Get priority
    const priorities = await this.getPriorities();
    const priority = priorities.find(
      p => p.name.toLowerCase() === data.priority.toLowerCase()
    ) || priorities.find(p => p.name.toLowerCase() === 'medium') || priorities[2];

    // Convert description to Jira's ADF format
    // Simple approach: convert markdown-style text to ADF paragraphs
    const lines = data.description.split('\n').filter(l => l.trim());
    const descriptionContent: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Headers
      if (trimmed.startsWith('h2. ')) {
        descriptionContent.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: trimmed.replace(/^h2\.\s+/, '') }],
        });
        continue;
      }
      if (trimmed.startsWith('h3. ')) {
        descriptionContent.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: trimmed.replace(/^h3\.\s+/, '') }],
        });
        continue;
      }
      
      // Regular paragraph - parse inline formatting
      const content: any[] = [];
      let remaining = trimmed;
      
      // Simple parsing for bold (*text*), italic (_text_), and code ({{text}})
      const tokens = remaining.split(/(\*[^*]+\*|_[^_]+_|\{\{[^}]+\}\})/);
      
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
        } else if (token.startsWith('{{') && token.endsWith('}}')) {
          content.push({
            type: 'text',
            text: token.slice(2, -2),
            marks: [{ type: 'code' }],
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

    // Build issue payload
    // Jira summary has a 255 character limit
    const summary = data.summary.length > 255 
      ? data.summary.substring(0, 252) + '...'
      : data.summary;
    
    const issue: any = {
      fields: {
        project: {
          key: this.projectKey,
        },
        summary: summary,
        description: {
          type: 'doc',
          version: 1,
          content: descriptionContent.length > 0 
            ? descriptionContent 
            : [{
                type: 'paragraph',
                content: [{ type: 'text', text: data.description }],
              }],
        },
        issuetype: {
          id: issueType.id,
        },
        priority: {
          id: priority.id,
        },
        labels: data.labels,
      },
    };

    // Add components if specified
    if (data.components && data.components.length > 0) {
      const components = await this.getComponents();
      const componentIds = data.components
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

    // Add affects version if specified
    if (data.affectsVersion) {
      const versions = await this.getVersions();
      const version = versions.find(v => 
        v.name.toLowerCase().includes(data.affectsVersion!.toLowerCase())
      );
      if (version) {
        issue.fields.versions = [{ id: version.id }];
      }
    }

    return this.request<{ key: string; id: string; self: string }>(
      'POST',
      '/issue',
      issue
    );
  }

  async getTransitions(issueKey: string): Promise<Array<{ id: string; name: string; to: { id: string; name: string } }>> {
    const data = await this.request<{ transitions: Array<{ id: string; name: string; to: { id: string; name: string } }> }>(
      'GET',
      `/issue/${issueKey}/transitions`
    );
    return data.transitions || [];
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request(
      'POST',
      `/issue/${issueKey}/transitions`,
      {
        transition: {
          id: transitionId,
        },
      }
    );
  }

  async addComment(issueKey: string, comment: string): Promise<{ id: string; self: string }> {
    return this.request<{ id: string; self: string }>(
      'POST',
      `/issue/${issueKey}/comment`,
      {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      }
    );
  }

  async getIssue(issueKey: string): Promise<{ id: string; key: string; fields: { summary: string; status: { name: string } } }> {
    return this.request<{ id: string; key: string; fields: { summary: string; status: { name: string } } }>(
      'GET',
      `/issue/${issueKey}?fields=summary,status`
    );
  }

  async updateIssue(issueKey: string, data: JiraTicketData): Promise<void> {
    // Convert description to ADF format (same as createIssue)
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

    const summary = data.summary.length > 255 
      ? data.summary.substring(0, 252) + '...'
      : data.summary;

    const updatePayload: any = {
      fields: {
        summary: summary,
        description: {
          type: 'doc',
          version: 1,
          content: descriptionContent.length > 0 ? descriptionContent : [{
            type: 'paragraph',
            content: [{ type: 'text', text: data.description }],
          }],
        },
      },
    };

    // Update labels if provided
    if (data.labels && data.labels.length > 0) {
      updatePayload.fields.labels = data.labels;
    }

    await this.request('PUT', `/issue/${issueKey}`, updatePayload);
  }
}

function parseMarkdownTicket(filePath: string): JiraTicketData {
  const content = readFileSync(filePath, 'utf-8');
  
  // Extract metadata from the header section
  const typeMatch = content.match(/\*\*Type:\*\*\s*(.+?)(?:\n|$)/);
  const priorityMatch = content.match(/\*\*Priority:\*\*\s*(.+?)(?:\n|$)/);
  const componentMatch = content.match(/\*\*Component:\*\*\s*(.+?)(?:\n|$)/);
  const versionMatch = content.match(/\*\*Affects Version:\*\*\s*(.+?)(?:\n|$)/);
  const labelsMatch = content.match(/\*\*Labels:\*\*\s*(.+?)(?:\n|$)/);
  
  // Extract summary from the Summary section or Epic Summary section
  const summarySection = content.match(/## (?:Epic )?Summary\s*\n\n(.+?)(?=\n\n---|\n## |$)/s);
  const summary = summarySection ? summarySection[1].trim() : 'Untitled Issue';
  
  // Extract full description (everything from Summary/Epic Summary onwards, excluding metadata)
  const summaryIndex = content.indexOf('## Epic Summary') >= 0 
    ? content.indexOf('## Epic Summary')
    : content.indexOf('## Summary');
  const descriptionEnd = content.lastIndexOf('## Notes');
  const descriptionContent = descriptionEnd > summaryIndex
    ? content.substring(summaryIndex, descriptionEnd)
    : content.substring(summaryIndex);

  // Convert markdown to Jira's ADF (Atlassian Document Format) compatible text
  // For now, we'll use plain text with minimal formatting
  let cleanDescription = descriptionContent
    .replace(/^#+\s+/gm, '') // Remove markdown headers
    .replace(/##\s+/g, 'h2. ') // Convert ## to h2.
    .replace(/###\s+/g, 'h3. ') // Convert ### to h3.
    .replace(/\*\*(.+?)\*\*/g, '*$1*') // Convert **bold** to *bold*
    .replace(/\*(.+?)\*/g, '_$1_') // Convert *italic* to _italic_
    .replace(/`(.+?)`/g, '{{$1}}') // Convert `code` to {{code}}
    .replace(/^-\s+/gm, '* ') // Convert - to *
    .replace(/^\d+\.\s+/gm, '# ') // Convert numbered lists to # 
    .replace(/---/g, '----') // Convert --- to ----
    .trim();

  const issueType = typeMatch 
    ? (typeMatch[1].includes('Epic') ? 'Epic' :
       typeMatch[1].includes('Bug') ? 'Bug' : 
       typeMatch[1].includes('Tech Debt') ? 'Technical Task' : 
       'Task')
    : 'Task';
  
  const priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';
  
  const components = componentMatch 
    ? componentMatch[1].split('/').map(c => c.trim()).filter(Boolean)
    : [];
  
  const affectsVersion = versionMatch ? versionMatch[1].trim() : undefined;
  
  const labels = labelsMatch 
    ? labelsMatch[1].split(',').map(l => l.trim()).filter(Boolean)
    : [];

  return {
    summary,
    description: cleanDescription,
    issueType,
    priority,
    labels,
    components,
    affectsVersion,
  };
}

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  let ticketKey: string | undefined;
  let projectKey: string | undefined;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' || args[i] === '-p') {
      projectKey = args[i + 1];
      i++; // Skip the next argument as it's the project key value
    } else if (!args[i].startsWith('--') && !args[i].startsWith('-')) {
      // First non-flag argument is the ticket key
      if (!ticketKey) {
        ticketKey = args[i];
      }
    }
  }
  
  if (!ticketKey) {
    console.error('Usage: ts-node scripts/create-jira-ticket.ts <TICKET-KEY> [--project <PROJECT-KEY>]');
    console.error('Example: ts-node scripts/create-jira-ticket.ts ISSUE-ACTION-DESTINATION-GAPS-1 --project KAN');
    console.error('Example: ts-node scripts/create-jira-ticket.ts PRODUCT-IDEA-1 --project EA');
    console.error('\nProject Key Guidelines:');
    console.error('  - EA: Use for product ideas and feature requests');
    console.error('  - KAN: Use for Epics, Stories, Tasks, and Bugs');
    process.exit(1);
  }

  // Get project root (parent of scripts directory)
  // When run via ts-node, process.argv[1] is the script path
  const scriptPath = process.argv[1] || require.main?.filename || __filename;
  const scriptDir = dirname(scriptPath);
  const projectRoot = join(scriptDir, '..');
  const ticketFile = join(projectRoot, 'docs', 'jira', `${ticketKey}.md`);
  
  // Check if file exists
  try {
    readFileSync(ticketFile, 'utf-8');
  } catch (error) {
    console.error(`❌ Ticket file not found: ${ticketFile}`);
    console.error(`   Make sure the file exists in docs/jira/${ticketKey}.md`);
    process.exit(1);
  }

  try {
    console.log(`📄 Reading ticket file: ${ticketFile}`);
    const ticketData = parseMarkdownTicket(ticketFile);
    
    const finalProjectKey = projectKey || process.env.JIRA_PROJECT_KEY || 'ENGINEO';
    
    console.log(`🔗 Connecting to Jira: ${process.env.JIRA_BASE_URL}`);
    console.log(`📦 Project Key: ${finalProjectKey}${projectKey ? ' (from --project flag)' : process.env.JIRA_PROJECT_KEY ? ' (from .env)' : ' (default)'}`);
    const client = new JiraClient(finalProjectKey);
    
    // Test connection first
    console.log(`🔍 Testing Jira connection...`);
    const connectionOk = await client.testConnection();
    if (!connectionOk) {
      console.error(`❌ Failed to connect to Jira. Please check your credentials and Jira instance URL.`);
      process.exit(1);
    }
    console.log(`✅ Connection successful`);
    
    console.log(`📝 Creating issue: ${ticketData.summary}`);
    const result = await client.createIssue(ticketData);
    
    console.log(`\n✅ Successfully created Jira ticket!`);
    console.log(`   Key: ${result.key}`);
    console.log(`   ID: ${result.id}`);
    console.log(`   URL: ${process.env.JIRA_BASE_URL}/browse/${result.key}`);
    console.log(`\n🎉 Ticket created: ${result.key}`);
    
  } catch (error: any) {
    console.error(`\n❌ Error creating Jira ticket:`);
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Check if this is an update command
if (process.argv[2] === 'update') {
  const issueKey = process.argv[3];
  
  if (!issueKey) {
    console.error('Usage: ts-node scripts/create-jira-ticket.ts update <ISSUE-KEY> [--project <PROJECT-KEY>]');
    console.error('Example: ts-node scripts/create-jira-ticket.ts update EA-14 --project EA');
    process.exit(1);
  }

  // Parse project key if provided
  const args = process.argv.slice(3);
  let projectKey: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' || args[i] === '-p') {
      projectKey = args[i + 1];
      i++;
    }
  }

  const finalProjectKey = projectKey || process.env.JIRA_PROJECT_KEY || 'ENGINEO';
  const client = new JiraClient(finalProjectKey);

  (async () => {
    try {
      console.log(`🔗 Connecting to Jira: ${process.env.JIRA_BASE_URL}`);
      console.log(`📦 Project Key: ${finalProjectKey}`);
      
      // Test connection
      const connectionOk = await client.testConnection();
      if (!connectionOk) {
        console.error(`❌ Failed to connect to Jira.`);
        process.exit(1);
      }

      // Get issue info
      const issue = await client.getIssue(issueKey);
      console.log(`\n📋 Issue: ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Current Status: ${issue.fields.status.name}`);

      // Find markdown file - try to get issue summary to find matching file
      const scriptPath = process.argv[1] || require.main?.filename || __filename;
      const scriptDir = dirname(scriptPath);
      const projectRoot = join(scriptDir, '..');
      const jiraDir = join(projectRoot, 'docs', 'jira');
      
      // Try to find file by looking for the issue key or summary in filename
      // First try: issue key without project prefix (e.g., EA-14 -> 14.md or DRAFT-LIFECYCLE-VISIBILITY-1.md)
      let ticketFile = join(jiraDir, `${issueKey.replace(/^[^-]+-/, '')}.md`);
      
      // If that doesn't exist, try to find by searching for files that might match
      if (!existsSync(ticketFile)) {
        // Try common patterns
        const possibleNames = [
          'DRAFT-LIFECYCLE-VISIBILITY-1.md',
          'ISSUE-FIX-ROUTE-INTEGRITY-1.md',
          'ISSUE-FIX-KIND-CLARITY-1.md',
          'ISSUE-ACTION-DESTINATION-GAPS-1.md',
        ];
        
        // For EA-14, we know it's DRAFT-LIFECYCLE-VISIBILITY-1
        if (issueKey === 'EA-14') {
          ticketFile = join(jiraDir, 'DRAFT-LIFECYCLE-VISIBILITY-1.md');
        } else {
          // Try to find by matching summary keywords
          const summaryLower = issue.fields.summary.toLowerCase();
          for (const name of possibleNames) {
            const keyPart = name.replace('.md', '').toLowerCase();
            if (summaryLower.includes(keyPart)) {
              ticketFile = join(jiraDir, name);
              break;
            }
          }
        }
      }
      
      // Check if file exists
      if (!existsSync(ticketFile)) {
        console.error(`❌ Ticket file not found: ${ticketFile}`);
        console.error(`   Tried: ${ticketFile}`);
        console.error(`   Make sure the file exists in docs/jira/`);
        process.exit(1);
      }

      console.log(`📄 Reading ticket file: ${ticketFile}`);
      const ticketData = parseMarkdownTicket(ticketFile);
      
      console.log(`\n🔄 Updating issue...`);
      await client.updateIssue(issueKey, ticketData);
      
      console.log(`✅ Successfully updated ${issueKey}!`);
      console.log(`   URL: ${process.env.JIRA_BASE_URL}/browse/${issueKey}`);
    } catch (error: any) {
      console.error(`\n❌ Error updating Jira ticket:`);
      console.error(error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  })();
} else if (process.argv[2] === 'transition') {
  const issueKey = process.argv[3];
  const action = process.argv[2];
  
  if (!issueKey) {
    console.error('Usage: ts-node scripts/create-jira-ticket.ts update <ISSUE-KEY> [--project <PROJECT-KEY>]');
    console.error('Example: ts-node scripts/create-jira-ticket.ts update EA-11 --project EA');
    process.exit(1);
  }

  // Parse project key if provided
  const args = process.argv.slice(3);
  let projectKey: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' || args[i] === '-p') {
      projectKey = args[i + 1];
      i++;
    }
  }

  const finalProjectKey = projectKey || process.env.JIRA_PROJECT_KEY || 'ENGINEO';
  const client = new JiraClient(finalProjectKey);

  (async () => {
    try {
      console.log(`🔗 Connecting to Jira: ${process.env.JIRA_BASE_URL}`);
      console.log(`📦 Project Key: ${finalProjectKey}`);
      
      // Test connection
      const connectionOk = await client.testConnection();
      if (!connectionOk) {
        console.error(`❌ Failed to connect to Jira.`);
        process.exit(1);
      }

      // Get issue info
      const issue = await client.getIssue(issueKey);
      console.log(`\n📋 Issue: ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Current Status: ${issue.fields.status.name}`);

      if (action === 'transition') {
        // Get available transitions
        const transitions = await client.getTransitions(issueKey);
        const doneTransition = transitions.find(t => 
          t.to.name.toLowerCase() === 'done' || 
          t.name.toLowerCase() === 'done' ||
          t.to.name.toLowerCase().includes('done')
        );

        if (!doneTransition) {
          console.error(`\n❌ No "Done" transition available for ${issueKey}`);
          console.log(`   Available transitions: ${transitions.map(t => t.name).join(', ')}`);
          process.exit(1);
        }

        // Transition to Done
        console.log(`\n🔄 Transitioning to: ${doneTransition.to.name}...`);
        await client.transitionIssue(issueKey, doneTransition.id);
        console.log(`✅ Successfully transitioned ${issueKey} to ${doneTransition.to.name}`);
      }

      // Add completion comment
      const completionComment = `✅ Phase Complete

This Epic has been successfully completed. Key accomplishments:

**FIXUP-3 (2026-01-25) - Semantic CTA Labels:**
- Implemented fix-action kind helper with 4 canonical kinds (AI_PREVIEW_FIX, DIRECT_FIX, GUIDANCE_ONLY, BLOCKED)
- Updated Issues Page CTAs with semantic labels:
  - AI preview: "Review AI fix" with sparkle icon
  - Direct fix: "Fix in workspace" with inventory icon
  - Guidance: "Review guidance" with article icon
- Added dev-time trust guardrails (console warnings for label validation)
- Aligned RCP copy with fix-action kind semantics
- Manual testing documentation completed

**Previous Fixups:**
- FIXUP-1: Anchor integrity and fixKind security
- FIXUP-2: Aggregation surfaces (Products list, Work Queue) fixKind-aware semantics

All acceptance criteria met. Manual testing doc exists and is linked in IMPLEMENTATION_PLAN.md.`;

      console.log(`\n💬 Adding completion comment...`);
      await client.addComment(issueKey, completionComment);
      console.log(`✅ Comment added successfully`);

      console.log(`\n🎉 ${issueKey} updated successfully!`);
      console.log(`   URL: ${process.env.JIRA_BASE_URL}/browse/${issueKey}`);
    } catch (error: any) {
      console.error(`\n❌ Error updating Jira ticket:`);
      console.error(error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  })();
} else {
  main();
}
