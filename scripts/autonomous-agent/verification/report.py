"""
Verification report utilities.

Extracted from engine.py for modularization (Guardrails v2).
"""

from pathlib import Path


def report_path(repo_path: str, story_key: str, report_dir: str) -> Path:
    """Get full path to verification report.

    Args:
        repo_path: Path to repository root.
        story_key: Jira story key (e.g., KAN-123).
        report_dir: Report directory name.

    Returns:
        Path object to verification report.
    """
    return Path(repo_path) / report_dir / f"{story_key}-verification.md"


def report_exists(path: Path) -> bool:
    """Check if verification report exists.

    Args:
        path: Path to verification report.

    Returns:
        True if report exists.
    """
    return path.exists()


def report_has_checklist(path: Path, header: str) -> bool:
    """Check if verification report contains required checklist header.

    Args:
        path: Path to verification report.
        header: Required checklist header (e.g., "## Checklist").

    Returns:
        True if report contains the header.
    """
    try:
        content = path.read_text()
        return header in content
    except Exception:
        return False
