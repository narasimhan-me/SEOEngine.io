#!/bin/bash
#
# EngineO Autonomous Multi-Persona Execution Engine Runner
#
# This script starts the autonomous execution engine that coordinates:
# - UEP (Unified Executive Persona) - Reads Ideas, creates Epics (Opus model)
# - Supervisor - Decomposes Epics into Stories with PATCH BATCH specs (Opus model)
# - Developer - Applies patches, writes code, updates docs (Sonnet model)
#
# NOTE: No API key required! All personas use Claude Code CLI with --model flag.
#       Ensure 'claude' is installed: npm install -g @anthropic-ai/claude-code
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================="
echo " EngineO Autonomous Execution Engine"
echo "=========================================="
echo ""

# Load environment variables from ~/.zshrc (if exists)
if [ -f "$HOME/.zshrc" ]; then
    echo "[SETUP] Loading environment from ~/.zshrc..."
    source "$HOME/.zshrc" 2>/dev/null || true
fi

# Load .env file (if exists) - fills missing vars only
load_dotenv() {
    local envfile="$1"
    if [ -f "$envfile" ]; then
        echo "[SETUP] Loading environment from $envfile..."
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and blank lines
            [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
            # Strip 'export ' prefix if present
            line="${line#export }"
            # Parse KEY=VALUE
            if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"
                value="${BASH_REMATCH[2]}"
                # Strip surrounding quotes
                value="${value#\"}" && value="${value%\"}"
                value="${value#\'}" && value="${value%\'}"
                # Only set if not already set (env > .env)
                if [ -z "${!key}" ]; then
                    export "$key=$value"
                fi
            fi
        done < "$envfile"
    fi
}

# Try .env in script dir first, then repo root
load_dotenv "$SCRIPT_DIR/.env"
load_dotenv "$REPO_ROOT/.env"

# Apply credential aliases (JIRA_EMAIL -> JIRA_USERNAME, JIRA_API_TOKEN -> JIRA_TOKEN)
[ -z "$JIRA_USERNAME" ] && [ -n "$JIRA_EMAIL" ] && export JIRA_USERNAME="$JIRA_EMAIL"
[ -z "$JIRA_TOKEN" ] && [ -n "$JIRA_API_TOKEN" ] && export JIRA_TOKEN="$JIRA_API_TOKEN"

# Verify required environment variables
REQUIRED_VARS=("JIRA_URL" "JIRA_USERNAME" "JIRA_TOKEN" "GITHUB_TOKEN")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "[ERROR] Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these in ~/.zshrc or scripts/autonomous-agent/.env"
    echo "See .env.example for template."
    exit 1
fi

echo "[SETUP] Environment variables loaded:"
echo "  JIRA_URL: $JIRA_URL"
echo "  JIRA_USERNAME: $JIRA_USERNAME"
echo "  JIRA_TOKEN: ${JIRA_TOKEN:0:10}..."
echo "  GITHUB_TOKEN: ${GITHUB_TOKEN:0:10}..."
echo ""

# Export repo path
export REPO_PATH="$REPO_ROOT"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is required but not installed."
    exit 1
fi

# Check Claude Code CLI
if ! command -v claude &> /dev/null; then
    echo "[ERROR] Claude Code CLI is required but not installed."
    echo "       Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

echo "[SETUP] Claude Code CLI found: $(claude --version 2>&1 | head -1)"

# Install dependencies if needed
if ! python3 -c "import requests" 2>/dev/null; then
    echo "[SETUP] Installing required Python packages..."
    pip3 install requests
fi

echo "[SETUP] Starting engine..."
echo ""

# Run the engine
cd "$SCRIPT_DIR"
python3 engine.py "$@"
