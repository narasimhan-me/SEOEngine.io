"""
Jira API client with support for both standard and Product Discovery APIs.

Extracted from engine.py for modularization (Guardrails v2).
"""

import requests
from typing import Optional, List

from adf import text_to_adf, parse_adf_to_text


class JiraClient:
    """Jira API client with support for both standard and Product Discovery APIs"""

    def __init__(self, config):
        """Initialize Jira client.

        Args:
            config: Configuration object with jira_url, jira_username, jira_token,
                   product_discovery_project, and software_project attributes.
        """
        self.config = config
        self.base_url = config.jira_url.rstrip('/')
        self.auth = (config.jira_username, config.jira_token)
        self.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

    def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to Jira API"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == 'GET':
                response = requests.get(url, auth=self.auth, headers=self.headers, params=data)
            elif method == 'POST':
                response = requests.post(url, auth=self.auth, headers=self.headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, auth=self.auth, headers=self.headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code >= 400:
                return {'error': True, 'status': response.status_code, 'message': response.text}

            if response.text:
                return response.json()
            return {'success': True}
        except Exception as e:
            return {'error': True, 'message': str(e)}

    def test_connection(self) -> bool:
        """Test Jira connection"""
        result = self._request('GET', '/rest/api/3/myself')
        if 'error' not in result and 'accountId' in result:
            print(f"[SYSTEM] Connected to Jira as: {result.get('displayName', 'Unknown')}")
            return True
        print(f"[SYSTEM] Jira connection failed: {result}")
        return False

    def search_issues(self, jql: str, fields: List[str] = None, max_results: int = 50) -> List[dict]:
        """Search for issues using JQL (uses new search/jql endpoint)"""
        payload = {
            'jql': jql,
            'maxResults': max_results,
        }
        if fields:
            payload['fields'] = fields

        result = self._request('POST', '/rest/api/3/search/jql', payload)

        if 'error' in result:
            print(f"[ERROR] Search failed: {result}")
            return []

        return result.get('issues', [])

    def get_ideas_todo(self) -> List[dict]:
        """Get Ideas (Initiatives) with exact 'TO DO' status from Product Discovery project

        Note: We filter by status = 'TO DO' (exact match), not statusCategory = 'To Do'.
        This ensures we only get Ideas that are explicitly marked as TO DO,
        not those in 'Parking lot' or other statuses within the To Do category.
        """
        jql = f'project = {self.config.product_discovery_project} AND status = "TO DO" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'issuetype', 'description', 'labels'])

    def get_epics_todo(self) -> List[dict]:
        """Get Epics with exact 'To Do' status from software project

        Note: KAN project uses 'To Do' (title case), different from EA's 'TO DO'.
        """
        jql = f'project = {self.config.software_project} AND issuetype = Epic AND status = "To Do" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'description', 'parent', 'labels'])

    def get_stories_todo(self) -> List[dict]:
        """Get Stories with exact 'To Do' status from software project"""
        jql = f'project = {self.config.software_project} AND issuetype = Story AND status = "To Do" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'description', 'parent', 'labels'])

    def get_stories_in_progress(self) -> List[dict]:
        """Get Stories in progress (for verification)

        Note: Uses statusCategory for In Progress as there may be multiple
        in-progress statuses (e.g., 'In Progress', 'In Review', etc.)
        """
        jql = f"project = {self.config.software_project} AND issuetype = Story AND statusCategory = 'In Progress' ORDER BY created ASC"
        return self.search_issues(jql, ['summary', 'status', 'description', 'parent', 'labels'])

    def get_executable_work_items(self) -> List[dict]:
        """Get executable work items (Stories and Bugs) with To Do or In Progress status.

        Bug Execution Enablement: Bugs are treated as first-class executable work items
        alongside Stories, subject to the same guardrails pipeline.

        Note: Uses exact status names 'To Do' and 'In Progress' to exclude 'In Review'.
        """
        jql = f'project = {self.config.software_project} AND issuetype IN (Story, Bug) AND status IN ("To Do", "In Progress") ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'issuetype', 'description', 'labels', 'parent'])

    def get_issue(self, issue_key: str) -> Optional[dict]:
        """Get a specific issue by key"""
        result = self._request('GET', f'/rest/api/3/issue/{issue_key}')
        if 'error' in result:
            print(f"[ERROR] Failed to get issue {issue_key}: {result}")
            return None
        return result

    def create_epic(self, summary: str, description: str, parent_key: str = None, labels: Optional[List[str]] = None) -> Optional[str]:
        """Create an Epic in the software project"""
        payload = {
            'fields': {
                'project': {'key': self.config.software_project},
                'summary': summary,
                'description': self._text_to_adf(description),
                'issuetype': {'name': 'Epic'}
            }
        }

        if labels:
            payload['fields']['labels'] = labels

        result = self._request('POST', '/rest/api/3/issue', payload)

        if 'error' in result:
            print(f"[ERROR] Failed to create Epic: {result}")
            return None

        return result.get('key')

    def create_story(self, summary: str, description: str, epic_key: str = None, labels: Optional[List[str]] = None) -> Optional[str]:
        """Create a Story in the software project"""
        payload = {
            'fields': {
                'project': {'key': self.config.software_project},
                'summary': summary,
                'description': self._text_to_adf(description),
                'issuetype': {'name': 'Story'}
            }
        }

        if epic_key:
            payload['fields']['parent'] = {'key': epic_key}

        if labels:
            payload['fields']['labels'] = labels

        result = self._request('POST', '/rest/api/3/issue', payload)

        if 'error' in result:
            print(f"[ERROR] Failed to create Story: {result}")
            return None

        return result.get('key')

    def transition_issue(self, issue_key: str, status_name: str) -> bool:
        """Transition an issue to a new status"""
        # First get available transitions
        result = self._request('GET', f'/rest/api/3/issue/{issue_key}/transitions')

        if 'error' in result:
            print(f"[ERROR] Failed to get transitions: {result}")
            return False

        transitions = result.get('transitions', [])
        target_transition = None

        for t in transitions:
            if t['name'].lower() == status_name.lower() or t['to']['name'].lower() == status_name.lower():
                target_transition = t
                break

        if not target_transition:
            print(f"[ERROR] Transition to '{status_name}' not available for {issue_key}")
            return False

        result = self._request('POST', f'/rest/api/3/issue/{issue_key}/transitions', {
            'transition': {'id': target_transition['id']}
        })

        return 'error' not in result

    def add_comment(self, issue_key: str, comment: str) -> bool:
        """Add a comment to an issue"""
        payload = {
            'body': self._text_to_adf(comment)
        }

        result = self._request('POST', f'/rest/api/3/issue/{issue_key}/comment', payload)
        return 'error' not in result

    def _text_to_adf(self, text: str) -> dict:
        """Convert plain text to Atlassian Document Format (delegates to adf module)"""
        return text_to_adf(text)

    def parse_adf_to_text(self, adf: dict) -> str:
        """Parse Atlassian Document Format to plain text (delegates to adf module)"""
        return parse_adf_to_text(adf)
