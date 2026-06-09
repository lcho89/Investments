#!/usr/bin/env bash
# Bootstrap the Investment Research Paperclip plugin.
# Run once after cloning the repo. Safe to re-run (idempotent).

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_DIR="$REPO_DIR/plugin"

echo "==> Investment Research Orchestrator — Setup"
echo "    Repo: $REPO_DIR"
echo ""

# ── 1. Build plugin ──────────────────────────────────────────────────────────
echo "==> Installing plugin dependencies..."
cd "$PLUGIN_DIR"
npm install --silent

echo "==> Building plugin TypeScript..."
npm run build

# ── 2. Start server if not running ──────────────────────────────────────────
echo "==> Checking Paperclip server..."
if ! curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
  echo "    Server not running. Starting..."
  bash /root/.paperclip/instances/default/start.sh &
  echo "    Waiting for server..."
  for i in $(seq 1 30); do
    sleep 2
    if curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
      echo "    Server ready."
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "ERROR: Server did not start in 60s. Check logs at /root/.paperclip/instances/default/logs/"
      exit 1
    fi
  done
else
  echo "    Server already running."
fi

# ── 3. Install plugin ────────────────────────────────────────────────────────
echo "==> Installing plugin into Paperclip..."
npx paperclipai plugin install "$PLUGIN_DIR"

# ── 4. Configure plugin (optional keys) ─────────────────────────────────────
echo ""
echo "==> (Optional) API key configuration"
echo "    You can configure keys now or later via the Paperclip UI."
echo ""

configure_key() {
  local key_name="$1"
  local env_var="$2"
  local description="$3"
  if [ -n "${!env_var:-}" ]; then
    echo "    $key_name: using \$$env_var from environment"
  else
    echo "    $key_name ($description)"
    read -rp "    Enter value (or press Enter to skip): " val
    if [ -n "$val" ]; then
      export "$env_var"="$val"
    fi
  fi
}

configure_key "NewsAPI Key"              "NEWSAPI_KEY"         "newsapi.org — market news"
configure_key "FMP API Key"              "FMP_API_KEY"          "financialmodelingprep.com — prices/fundamentals"
configure_key "Anthropic API Key"        "ANTHROPIC_API_KEY"    "Claude for PM and CIO agents"
configure_key "OpenRouter API Key"       "OPENROUTER_API_KEY"   "Hermes for sector analyst agents"

# ── 5. Done ──────────────────────────────────────────────────────────────────
echo ""
echo "==> Setup complete!"
echo ""
echo "    Next steps:"
echo "    1. Open http://127.0.0.1:3100 to see the Paperclip UI"
echo "    2. Configure LLM providers under Settings → LLM"
echo "    3. The plugin will have provisioned 9 agents and 4 routines"
echo "    4. Routines are paused by default — enable them once LLM keys are set"
echo ""
echo "    Configure LLM (Claude for PMs/CIO):"
echo "      npx paperclipai configure --section llm"
echo ""
echo "    To manually trigger a routine:"
echo "      npx paperclipai issue create --title 'Morning Brief' --assignee cio"
echo ""
