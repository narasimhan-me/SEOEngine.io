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

# Load environment variables
if [ -f "$HOME/.zshrc" ]; then
    echo "[SETUP] Loading environment from ~/.zshrc..."
    source "$HOME/.zshrc"
fi

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
    echo "Please set these in ~/.zshrc and try again."
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
