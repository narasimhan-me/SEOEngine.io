#!/usr/bin/env python3
"""
Decomposition Manifest for Idempotent Epic Decomposition.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 3

This module implements decomposition manifests for Epics to enable:
- Idempotent decomposition (no duplicate Stories on repeated runs)
- Delta mode (only create missing Stories when Epic changes)
- Fingerprint-based change detection

Canonical manifest path: reports/{EPIC}-decomposition.json
"""

import os
import json
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field, asdict


def extract_acceptance_criteria(description: str) -> str:
    """Extract Acceptance Criteria section from Epic description.

    Looks for:
    - ## Acceptance Criteria
    - ### Acceptance Criteria
    - Acceptance Criteria:

    Falls back to full description if section not found.

    Args:
        description: Epic description text.

    Returns:
        Acceptance criteria section text, or full description as fallback.
    """
    if not description:
        return ""

    # Patterns to match Acceptance Criteria header
    patterns = [
        r'##\s*Acceptance\s+Criteria\s*\n(.*?)(?=\n##|\n###|$)',
        r'###\s*Acceptance\s+Criteria\s*\n(.*?)(?=\n##|\n###|$)',
        r'Acceptance\s+Criteria:\s*\n(.*?)(?=\n[A-Z][A-Za-z\s]+:|$)',
    ]

    for pattern in patterns:
        match = re.search(pattern, description, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip()

    # Fallback: return full description
    return description


def compute_fingerprint(epic_description: str) -> str:
    """Compute SHA256 fingerprint for an Epic.

    Args:
        epic_description: Full Epic description text.

    Returns:
        SHA256 hex string.
    """
    # Extract acceptance criteria for fingerprint
    ac_section = extract_acceptance_criteria(epic_description)
    combined = f"{epic_description}\n{ac_section}"
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()


def compute_intent_id(summary: str) -> str:
    """Compute deterministic intent ID for a Story summary.

    Args:
        summary: Story summary text.

    Returns:
        SHA256 hex string (first 16 chars for readability).
    """
    # Normalize: lowercase, strip "Implement:", collapse whitespace
    normalized = summary.lower().strip()
    if normalized.startswith("implement:"):
        normalized = normalized[10:].strip()
    normalized = re.sub(r'\s+', ' ', normalized)

    full_hash = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
    return full_hash[:16]


@dataclass
class StoryIntent:
    """Intent for a decomposed Story."""
    intent_id: str
    summary: str
    key: Optional[str] = None  # Jira key once created

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> 'StoryIntent':
        return cls(
            intent_id=data.get('intent_id', ''),
            summary=data.get('summary', ''),
            key=data.get('key'),
        )


@dataclass
class DecompositionManifest:
    """Decomposition manifest for an Epic.

    Canonical path: reports/{EPIC}-decomposition.json

    Fields:
    - epicKey: The Epic key (e.g., "KAN-10")
    - fingerprint: SHA256 of epic description + acceptance criteria
    - children: List of StoryIntent objects
    - created_at: ISO-8601 timestamp of manifest creation
    - updated_at: ISO-8601 timestamp of last update
    """
    epicKey: str
    fingerprint: str
    children: List[StoryIntent] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict:
        return {
            'epicKey': self.epicKey,
            'fingerprint': self.fingerprint,
            'children': [c.to_dict() for c in self.children],
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'DecompositionManifest':
        children = [StoryIntent.from_dict(c) for c in data.get('children', [])]
        return cls(
            epicKey=data.get('epicKey', ''),
            fingerprint=data.get('fingerprint', ''),
            children=children,
            created_at=data.get('created_at', ''),
            updated_at=data.get('updated_at', ''),
        )

    def add_child(self, summary: str, key: Optional[str] = None) -> StoryIntent:
        """Add a child Story intent.

        Args:
            summary: Story summary text.
            key: Jira key if already created.

        Returns:
            The created StoryIntent.
        """
        intent = StoryIntent(
            intent_id=compute_intent_id(summary),
            summary=summary,
            key=key,
        )
        self.children.append(intent)
        return intent

    def find_child_by_intent(self, summary: str) -> Optional[StoryIntent]:
        """Find child by intent ID or normalized summary match.

        Args:
            summary: Story summary to match.

        Returns:
            Matching StoryIntent or None.
        """
        target_id = compute_intent_id(summary)
        for child in self.children:
            if child.intent_id == target_id:
                return child

        # Fallback: normalized summary match
        target_normalized = summary.lower().strip()
        if target_normalized.startswith("implement:"):
            target_normalized = target_normalized[10:].strip()
        target_normalized = re.sub(r'\s+', ' ', target_normalized)

        for child in self.children:
            child_normalized = child.summary.lower().strip()
            if child_normalized.startswith("implement:"):
                child_normalized = child_normalized[10:].strip()
            child_normalized = re.sub(r'\s+', ' ', child_normalized)

            if child_normalized == target_normalized:
                return child

        return None

    def get_missing_intents(self, existing_summaries: List[str]) -> List[StoryIntent]:
        """Get intents that don't have corresponding existing Stories.

        Args:
            existing_summaries: Summaries of existing Stories in Jira.

        Returns:
            List of StoryIntent that need to be created.
        """
        missing = []
        existing_ids = {compute_intent_id(s) for s in existing_summaries}

        for child in self.children:
            if child.intent_id not in existing_ids and child.key is None:
                missing.append(child)

        return missing


class DecompositionManifestStore:
    """Store for decomposition manifests."""

    def __init__(self, repo_path: str, manifest_dir: str = "reports"):
        """Initialize manifest store.

        Args:
            repo_path: Path to repository root.
            manifest_dir: Directory for manifests (default: reports/).
        """
        self.repo_path = Path(repo_path)
        self.manifest_dir = self.repo_path / manifest_dir

    def _manifest_path(self, epic_key: str) -> Path:
        """Get canonical manifest path for an Epic."""
        return self.manifest_dir / f"{epic_key}-decomposition.json"

    def load(self, epic_key: str) -> Optional[DecompositionManifest]:
        """Load manifest for an Epic.

        Args:
            epic_key: The Epic key.

        Returns:
            DecompositionManifest or None if not found.
        """
        path = self._manifest_path(epic_key)
        try:
            if path.exists():
                data = json.loads(path.read_text(encoding='utf-8'))
                return DecompositionManifest.from_dict(data)
        except (json.JSONDecodeError, OSError, KeyError):
            pass
        return None

    def save(self, manifest: DecompositionManifest) -> bool:
        """Save manifest to disk with atomic write.

        Args:
            manifest: The manifest to save.

        Returns:
            True on success, False on failure.
        """
        path = self._manifest_path(manifest.epicKey)
        temp_path = path.with_suffix('.json.tmp')

        try:
            # Ensure directory exists
            self.manifest_dir.mkdir(parents=True, exist_ok=True)

            # Update timestamp
            manifest.updated_at = datetime.now(timezone.utc).isoformat()
            if not manifest.created_at:
                manifest.created_at = manifest.updated_at

            # Write to temp file first
            temp_path.write_text(
                json.dumps(manifest.to_dict(), indent=2, sort_keys=True),
                encoding='utf-8'
            )

            # Atomic replace
            os.replace(str(temp_path), str(path))
            return True
        except (OSError, TypeError):
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass
            return False

    def exists(self, epic_key: str) -> bool:
        """Check if manifest exists for an Epic."""
        return self._manifest_path(epic_key).exists()


def should_decompose(
    store: DecompositionManifestStore,
    epic_key: str,
    epic_description: str,
) -> tuple:
    """Determine if decomposition is needed and what mode.

    Args:
        store: Manifest store instance.
        epic_key: The Epic key.
        epic_description: Current Epic description.

    Returns:
        Tuple of (should_decompose: bool, mode: str, manifest: DecompositionManifest)
        - mode is one of: "new", "delta", "skip"
    """
    current_fingerprint = compute_fingerprint(epic_description)
    existing_manifest = store.load(epic_key)

    if existing_manifest is None:
        # No manifest - create new
        manifest = DecompositionManifest(
            epicKey=epic_key,
            fingerprint=current_fingerprint,
        )
        return (True, "new", manifest)

    if existing_manifest.fingerprint == current_fingerprint:
        # Fingerprint unchanged - skip decomposition
        return (False, "skip", existing_manifest)

    # Fingerprint changed - delta mode
    existing_manifest.fingerprint = current_fingerprint
    return (True, "delta", existing_manifest)
