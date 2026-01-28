# AUTONOMOUS-AGENT-OBSERVABILITY-HARDENING-1 Verification

## Checklist

### PATCH 1 - Configurable hard timeout (default 4 hours)
- [x] `CLAUDE_TIMEOUT_SECONDS` default changed to `14400` (4 hours)
- [x] Added `CLAUDE_TIMEOUT_ENV_VAR = "ENGINEO_CLAUDE_TIMEOUT_SECONDS"` constant
- [x] Added `CLAUDE_PER_TICKET_TIMEOUT_MAX = 8 * 60 * 60` (8 hour cap)
- [x] In `ExecutionEngine.__init__()`: compute `self.claude_timeout_seconds` from env or default
- [x] Logged effective timeout at startup: `Claude timeout configured: <seconds>s (<hours>h)`
- [x] Added `_parse_per_ticket_timeout()` pure helper for `HARD TIMEOUT: <minutes>` parsing
- [x] Per-ticket override capped at 8 hours, logged when applied

### PATCH 2 - Tee structured logs to console AND run-scoped log file
- [x] Created `self.logs_dir = Path(self.config.repo_path) / "logs"` with `mkdir(parents=True, exist_ok=True)`
- [x] Set `self.engine_log_path = self.logs_dir / f"engine-{self.run_id}.log"`
- [x] Updated `ExecutionEngine.log()` to write to both stdout and file
- [x] File format: `[timestamp] [role] message` (same as console)

### PATCH 3 - Log rotation (delete logs older than 2 days)
- [x] Added `rotate_logs(log_dir: Path, max_age_days: int = 2) -> int` helper function
- [x] Called in `__init__()` after logs dir creation
- [x] Logged summary: `Log rotation: deleted N old logs (>2 days)`

### PATCH 4 - Stream REAL Claude output via PTY
- [x] Added `import pty` to imports
- [x] Replaced `subprocess.PIPE` with `pty.openpty()` in `_invoke_claude_code()`
- [x] Process spawned with `stdin=slave_fd, stdout=slave_fd, stderr=slave_fd`
- [x] Parent closes slave_fd immediately after spawn
- [x] Read from master_fd with `select.select` + `os.read(master_fd, 4096)`
- [x] Line-buffer (`line_buf`) to handle partial chunks and prevent cross-chunk leakage
- [x] Redaction via `_redact_secrets()` applied to each complete line
- [x] Output via `self.log("CLAUDE", ...)` (goes to both console and log file)
- [x] Heartbeat: `Claude still running... (elapsed: Xm Ys)` every 30s of silence
- [x] Timeout uses computed `timeout_seconds` (from env or per-ticket override)
- [x] Proper master_fd cleanup in finally block
- [x] Per-attempt artifact written with redacted content

### PATCH 5 - Flush guarantees (no buffering surprises)
- [x] `ExecutionEngine.log()` uses `print(..., flush=True)` for stdout
- [x] File append uses `f.flush()` after each write
- [x] PTY streaming loop emits via `self.log()` only (no raw prints)

### PATCH 6 - Verification artifact
- [x] Created this timestamped verification report

## Definition of Done Verification

| Criterion | Status |
|-----------|--------|
| Default timeout logged as 14400s (4h) when env var unset | PASS |
| `ENGINEO_CLAUDE_TIMEOUT_SECONDS` overrides timeout and is logged once | PASS |
| `engine-<run_id>.log` created; contains engine logs + Claude output lines with role [CLAUDE] | PASS |
| Log rotation deletes logs older than 2 days and logs the deleted count | PASS |
| Claude output is visible during execution (not only heartbeats) because PTY is used | PASS |
| No secrets printed to console or log (tokens redacted) | PASS |

## Test Results
```
19 passed in 0.21s
```

## Files Modified
- `engine.py` - All patches implemented

## New Constants Added
- `CLAUDE_TIMEOUT_SECONDS = 14400` (was 300)
- `CLAUDE_TIMEOUT_ENV_VAR = "ENGINEO_CLAUDE_TIMEOUT_SECONDS"`
- `CLAUDE_PER_TICKET_TIMEOUT_MAX = 8 * 60 * 60`

## New Functions Added
- `rotate_logs(log_dir, max_age_days)` - Log rotation helper
- `_parse_per_ticket_timeout(description)` - Parse HARD TIMEOUT from description
- `_select_newest_verification_report(issue_key, relpaths, mtimes)` - Pure helper (restored)

## Key Changes to Existing Functions
- `ExecutionEngine.__init__()` - Added logs dir setup, log rotation, timeout config
- `ExecutionEngine.log()` - Now tees to console AND log file with flush
- `ExecutionEngine._invoke_claude_code()` - PTY streaming, line buffering, per-ticket timeout
