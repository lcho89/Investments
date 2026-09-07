#!/usr/bin/env bash
# One-shot deploy: onboard Paperclip, build+install plugin, create company,
# configure LLM from env vars. Idempotent — safe to re-run after container resets.
#
# Usage:
#   ANTHROPIC_API_KEY=sk-ant-... bash scripts/deploy.sh
# Optional env: OPENROUTER_API_KEY, NEWSAPI_KEY, FMP_API_KEY, PAPERCLIP_MODEL
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API=http://localhost:3100/api
MODEL="${PAPERCLIP_MODEL:-claude-fable-5}"

# ── 1. Server must be running (started separately) ──────────────────
if ! curl -sf $API/health >/dev/null 2>&1; then
  # Try starting a previously-onboarded instance in the background.
  if [ -d "$HOME/.paperclip/instances" ]; then
    echo "==> Starting Paperclip in background..."
    nohup npx -y paperclipai run &>/tmp/paperclip.log &
    for i in $(seq 1 45); do
      sleep 2
      curl -sf $API/health >/dev/null 2>&1 && break
    done
  fi
  if ! curl -sf $API/health >/dev/null 2>&1; then
    echo "Paperclip server is not running and needs its first-run wizard."
    echo "In a SEPARATE terminal, run:   npx -y paperclipai run"
    echo "Answer the prompts (defaults are fine), leave it running,"
    echo "then re-run this script here."
    exit 1
  fi
fi
echo "==> Server healthy."

# ── 2. Build plugin ─────────────────────────────────────────────────
cd "$REPO_DIR/plugin"
# Always install: npm's own lockfile check makes this a fast no-op when nothing
# changed, and a stale node_modules missing a newly-added dependency (like the
# exceljs addition) is exactly what an existence-only check like
# `[ -d node_modules ] || npm install` fails to catch.
npm install --silent
npm run build --silent
echo "==> Plugin built."

# ── 3. Install plugin (replace any existing record) ─────────────────
# Always uninstall first: a prior failed install leaves a non-ready record
# that blocks reinstall, and this guarantees the latest build is loaded.
npx paperclipai plugin uninstall investment-research >/dev/null 2>&1 || true
npx paperclipai plugin install "$REPO_DIR/plugin"
echo "==> Plugin installed."

# ── 4. Company (create if none) ─────────────────────────────────────
COMPANY_ID=$(curl -s $API/companies | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if d else '')")
if [ -z "$COMPANY_ID" ]; then
  COMPANY_ID=$(curl -s -X POST $API/companies -H "Content-Type: application/json" \
    -d '{"name":"Investment Research","shortName":"investments"}' \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
  echo "==> Company created: $COMPANY_ID"
  sleep 8  # let plugin auto-provision agents+routines via company.created event
else
  echo "==> Company exists: $COMPANY_ID"
fi

# ── 5. LLM config (Anthropic) ───────────────────────────────────────
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  npx paperclipai configure --section llm --non-interactive \
    --llm-provider claude --llm-model "$MODEL" --llm-api-key "$ANTHROPIC_API_KEY" 2>/dev/null \
  || curl -s -X POST $API/llms -H "Content-Type: application/json" \
    -d "{\"provider\":\"anthropic\",\"model\":\"$MODEL\",\"apiKey\":\"$ANTHROPIC_API_KEY\"}" >/dev/null \
  || echo "  (LLM config endpoint differs on this version — run: npx paperclipai configure --section llm)"
  echo "==> LLM configured: $MODEL"
else
  echo "==> SKIPPED LLM config (set ANTHROPIC_API_KEY)"
fi

# ── 6. Plugin tool keys ─────────────────────────────────────────────
PLUGIN_ID=$(curl -s $API/plugins | python3 -c "import sys,json;print([p['id'] for p in json.load(sys.stdin) if p['pluginKey']=='investment-research'][0])")
ADHOC_PATH="${ADHOC_PATH:-/mnt/c/Lechern/Investments/adhoc}"
curl -s -X POST "$API/plugins/$PLUGIN_ID/config" -H "Content-Type: application/json" \
  -d "{\"repoPath\":\"$REPO_DIR\",\"adhocPath\":\"$ADHOC_PATH\",\"newsApiKey\":\"${NEWSAPI_KEY:-}\",\"fmpApiKey\":\"${FMP_API_KEY:-}\"}" >/dev/null
echo "==> Plugin config saved."

# ── 6b. Load agent instructions + reporting hierarchy ───────────────
# Resolve the Claude Code CLI to an absolute path. The Paperclip server may run
# with a different PATH than this shell (e.g. started before ~/.bashrc was
# updated), and a bare "claude" then fails with: Command not found in PATH.
CLAUDE_BIN="$(command -v claude || true)"
if [ -z "$CLAUDE_BIN" ]; then
  echo "WARNING: 'claude' not found on PATH. Agents cannot run without it."
  echo "  Install:  npm install -g @anthropic-ai/claude-code"
  CLAUDE_BIN="claude"
else
  echo "==> Claude CLI: $CLAUDE_BIN"
fi
# The manifest declares agents with empty instructions; the real mandates
# live in plugin/instructions/*.md and are pushed here.
python3 - "$COMPANY_ID" "$REPO_DIR" "$CLAUDE_BIN" <<'PY'
import json, sys, urllib.request

company_id, repo, claude_bin = sys.argv[1], sys.argv[2], sys.argv[3]
API = "http://localhost:3100/api"

# display name -> (instruction stem, manager, model, monthly budget USD)
# Analysts run Sonnet. Haiku followed the output format precisely but filled it
# with invention — non-existent fund holdings, manufactured metrics, arithmetic
# that did not close. Format compliance without factual grounding is the worst
# failure mode here, because the output looks more rigorous than it is.
# CIO runs Opus — the deepest-reasoning tier, and the most expensive. Deliberate
# choice for the highest-stakes agent: the monthly memo verifies every PM claim
# independently and is the last check before anything is actionable. It also
# runs least often (~monthly) of any agent, so the per-token cost applies to
# the fewest calls. This is the agent most likely to push the account toward
# its monthly spend cap, though — override with CIO_MODEL=claude-sonnet-4-6
# (or claude-fable-5) if that becomes a recurring problem.
import os as _os
cio_model = _os.environ.get("CIO_MODEL", "claude-opus-4-8")

ORG = {
    "Nuclear Analyst":          ("nuclear-analyst",        "PM: Energy & Commodities", "claude-sonnet-4-6", 8),
    "Commodities Analyst":      ("commodities-analyst",    "PM: Energy & Commodities", "claude-sonnet-4-6", 8),
    "Energy Analyst":           ("energy-analyst",         "PM: Energy & Commodities", "claude-sonnet-4-6", 8),
    "Semis & AI Analyst":       ("semis-analyst",          "PM: Technology",           "claude-sonnet-4-6", 8),
    "Tech & Software Analyst":  ("tech-analyst",           "PM: Technology",           "claude-sonnet-4-6", 8),
    "Portfolio Risk Analyst":   ("portfolio-risk-analyst", "CIO",                      "claude-sonnet-4-6", 5),
    "PM: Energy & Commodities": ("pm-energy-commodities",  "CIO",                      "claude-sonnet-4-6", 10),
    "PM: Technology":           ("pm-technology",          "CIO",                      "claude-sonnet-4-6", 10),
    "CIO":                      ("cio",                    None,                       cio_model,           20),
}

def call(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"{API}{path}", data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or "{}")

agents = call("GET", f"/companies/{company_id}/agents")
by_name = {a["name"]: a["id"] for a in agents}

for name, (stem, manager, model, budget) in ORG.items():
    aid = by_name.get(name)
    if not aid:
        print(f"  ! {name}: agent not found, skipped")
        continue

    patch = {
        "adapterType": "claude_local",
        "adapterConfig": {
            # Pin the CLI lane. Left on auto, the adapter may select ACP, which
            # rejects the `effort` option and fails with acpx_session_config_failed.
            "engine": "cli",
            "command": claude_bin,
            "model": model,
            "cwd": repo,
            "instructionsFilePath": f"{repo}/plugin/instructions/{stem}.md",
            "maxTurnsPerRun": 40,
            "timeoutSec": 900,
        },
        "budgetMonthlyCents": budget * 100,
    }
    if manager and manager in by_name:
        patch["reportsTo"] = by_name[manager]

    try:
        call("PATCH", f"/agents/{aid}", patch)
        line = f"{model}, ${budget}/mo"
        if manager:
            line += f", reports to {manager}"
        print(f"  - {name}: {line}")
    except Exception as e:
        print(f"  ! {name}: FAILED ({e})")
PY
echo "==> Instructions and hierarchy applied."

# ── 7. Verify ───────────────────────────────────────────────────────
echo ""
echo "==> Agents:"
npx paperclipai agent list -C "$COMPANY_ID" 2>/dev/null || true
echo ""
echo "Done. UI: http://127.0.0.1:3100"
echo "Agents run via the Claude Code CLI. If not installed:  npm install -g @anthropic-ai/claude-code && claude"
echo "Then enable routines in the UI, or use Run now to test one cycle."
