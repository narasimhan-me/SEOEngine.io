"""
State ledger for idempotent Epic/Story tracking.

Extracted from engine.py for modularization (Guardrails v2).
"""

import os
import re
import json
import tempfile
from pathlib import Path
from typing import Optional


class StateLedger:
    """State ledger for tracking EA-to-KAN mappings and story runs.

    Provides atomic file operations for state persistence.
    """

    def __init__(self, repo_path: str, ledger_path: str, version: int):
        """Initialize state ledger.

        Args:
            repo_path: Path to repository root.
            ledger_path: Relative path from repo_path to ledger file.
            version: Ledger schema version.
        """
        self.repo_path = Path(repo_path)
        self.ledger_path = ledger_path
        self.version = version
        self.state_path = self.repo_path / ledger_path

    def load(self) -> dict:
        """Load state ledger from disk, creating if missing.

        Guardrails v1 FIXUP-2: Includes one-time migration from legacy paths.
        """
        try:
            # Check canonical path first
            if self.state_path.exists():
                with open(self.state_path, 'r') as f:
                    state = json.load(f)
                    if state.get('version') == self.version:
                        return state

            # One-time migration: check legacy paths from prior fixups
            legacy_paths = [
                self.repo_path / '.engineo' / 'state.json',  # FIXUP-3 legacy
                self.repo_path / 'state.json',  # repo-root legacy from FIXUP-2
            ]
            migrated_state = None
            for legacy_path in legacy_paths:
                if legacy_path.exists() and legacy_path != self.state_path:
                    try:
                        with open(legacy_path, 'r') as f:
                            legacy_state = json.load(f)
                            if legacy_state.get('version') == self.version:
                                migrated_state = legacy_state
                                print(f"[SYSTEM] Migrated ledger from legacy path: {legacy_path}")
                                # Remove legacy file after migration
                                legacy_path.unlink()
                                break
                    except Exception:
                        pass

            if migrated_state:
                self._save_raw(migrated_state)
                return migrated_state

            # Create default state
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            default_state = {
                "version": self.version,
                "ea_to_kan": {},
                "kan_story_runs": {}
            }
            self._save_raw(default_state)
            return default_state
        except Exception as e:
            print(f"[SYSTEM] Error loading state ledger: {e}")
            return {"version": self.version, "ea_to_kan": {}, "kan_story_runs": {}}

    def save(self, state: dict) -> None:
        """Save state ledger to disk (atomic write via temp file + rename)."""
        self._save_raw(state)

    def _save_raw(self, state: dict) -> None:
        """Atomic write of state ledger."""
        try:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            # Write to temp file then rename for atomicity
            fd, temp_path = tempfile.mkstemp(dir=self.state_path.parent, suffix='.json')
            try:
                with os.fdopen(fd, 'w') as f:
                    json.dump(state, f, indent=2)
                os.rename(temp_path, self.state_path)
            except:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                raise
        except Exception as e:
            print(f"[SYSTEM] Error saving state ledger: {e}")

    def ea_label(self, ea_key: str) -> str:
        """Produce Jira-safe label from EA key: EA-18 -> source-ea-18"""
        # Only allow [a-z0-9-]
        normalized = ea_key.lower().replace('_', '-')
        return f"source-{re.sub(r'[^a-z0-9-]', '', normalized)}"

    def extract_ea_key(self, text: str) -> Optional[str]:
        """Extract EA key from text (e.g., [EA-18] or EA-18)"""
        match = re.search(r'(?:\[)?(EA-\d+)(?:\])?', text, re.IGNORECASE)
        return match.group(1).upper() if match else None
