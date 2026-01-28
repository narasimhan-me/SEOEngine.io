#!/usr/bin/env python3
"""
Blocking escalation persistence for Supervisor reconciliation.

Blocking escalations:

Apply ONLY to a single Story (KAN-* Story) auto-close.
Are idempotent per (issueKey, root_cause).
Are restart-safe via persistence.
Auto-clear when the Story is Done in Jira.
Persistence path is configurable via ENGINEO_BLOCKING_ESCALATIONS_PATH.
Default: .engineo/blocking_escalations.json (repo-root, gitignored via .engineo/)
"""

import os
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

DEFAULT_REL_PATH = ".engineo/blocking_escalations.json"
SCHEMA_VERSION = 1


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class BlockingEscalation:
    issueKey: str
    root_cause: str
    created_at: str
    last_seen_at: str
    active: bool = True
    resolved_at: Optional[str] = None
    details: str = ""


class BlockingEscalationsStore:
    def __init__(self, repo_path: str, path_override: Optional[str] = None):
        raw = path_override or os.environ.get("ENGINEO_BLOCKING_ESCALATIONS_PATH", DEFAULT_REL_PATH)
        p = Path(raw)
        self.path = p if p.is_absolute() else (Path(repo_path) / raw)
        self._items: List[BlockingEscalation] = []
        self._load_error: Optional[str] = None

    @property
    def load_error(self) -> Optional[str]:
        return self._load_error

    def load(self) -> bool:
        self._load_error = None
        if not self.path.exists():
            self._items = []
            return True

        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                raw_items = data
            elif isinstance(data, dict):
                raw_items = data.get("items", [])
            else:
                raw_items = []

            items: List[BlockingEscalation] = []
            for obj in raw_items:
                if not isinstance(obj, dict):
                    continue
                items.append(
                    BlockingEscalation(
                        issueKey=obj.get("issueKey", ""),
                        root_cause=obj.get("root_cause", ""),
                        created_at=obj.get("created_at", "") or _now_iso(),
                        last_seen_at=obj.get("last_seen_at", "") or _now_iso(),
                        active=bool(obj.get("active", True)),
                        resolved_at=obj.get("resolved_at"),
                        details=obj.get("details", "") or "",
                    )
                )

            self._items = [i for i in items if i.issueKey and i.root_cause]
            return True
        except Exception as e:
            self._items = []
            self._load_error = (str(e) or "unknown").strip()[:200]
            return False

    def save(self) -> bool:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "version": SCHEMA_VERSION,
                "items": [asdict(i) for i in self._items],
            }
            tmp = self.path.with_suffix(self.path.suffix + ".tmp")
            tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
            os.replace(str(tmp), str(self.path))
            return True
        except Exception:
            try:
                tmp.unlink(missing_ok=True)
            except Exception:
                pass
            return False

    def has_active(self, issue_key: str) -> bool:
        if self._load_error:
            return True
        return any(i.issueKey == issue_key and i.active for i in self._items)

    def active_root_causes_for(self, issue_key: str) -> List[str]:
        if self._load_error:
            return ["ESCALATIONS_STORE_LOAD_ERROR"]
        causes = sorted({i.root_cause for i in self._items if i.issueKey == issue_key and i.active})
        return causes

    def upsert_active(self, issue_key: str, root_cause: str, details: str = "") -> None:
        now = _now_iso()
        # If store load failed, do not mutate on disk (fail-closed behavior handled by caller)
        if self._load_error:
            return

        for item in self._items:
            if item.issueKey == issue_key and item.root_cause == root_cause and item.active:
                item.last_seen_at = now
                if details:
                    item.details = details
                self.save()
                return

        self._items.append(
            BlockingEscalation(
                issueKey=issue_key,
                root_cause=root_cause,
                created_at=now,
                last_seen_at=now,
                active=True,
                resolved_at=None,
                details=details or "",
            )
        )
        self.save()

    def resolve_all_for_issue(self, issue_key: str) -> int:
        if self._load_error:
            return 0

        now = _now_iso()
        changed = 0
        for item in self._items:
            if item.issueKey == issue_key and item.active:
                item.active = False
                item.resolved_at = now
                item.last_seen_at = now
                changed += 1

        if changed:
            self.save()
        return changed

    def auto_resolve_done_issues(self, jira, is_done_status_func) -> int:
        """Resolve active escalations when Jira says the Story is Done.

        Args:
            jira: JiraClient (must implement get_issue()).
            is_done_status_func: callable(status_name, status_category_name) -> bool
        """
        if self._load_error:
            return 0

        resolved_count = 0
        active_issue_keys = sorted({i.issueKey for i in self._items if i.active})
        for key in active_issue_keys:
            issue = jira.get_issue(key)
            if not issue:
                continue
            status = issue.get("fields", {}).get("status", {}) or {}
            status_name = status.get("name", "")
            status_cat = (status.get("statusCategory", {}) or {}).get("name", "")
            if is_done_status_func(status_name, status_cat):
                resolved_count += self.resolve_all_for_issue(key)

        return resolved_count
