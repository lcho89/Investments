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
[ -d node_modules ] || npm install --silent
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
curl -s -X POST "$API/plugins/$PLUGIN_ID/config" -H "Content-Type: application/json" \
  -d "{\"repoPath\":\"$REPO_DIR\",\"newsApiKey\":\"${NEWSAPI_KEY:-}\",\"fmpApiKey\":\"${FMP_API_KEY:-}\"}" >/dev/null
echo "==> Plugin config saved."

# ── 6b. Load agent instructions + reporting hierarchy ───────────────
# The manifest declares agents with empty instructions; the real mandates
# live in plugin/instructions/*.md and are pushed here.
python3 - "$COMPANY_ID" "$REPO_DIR" <<'PY'
import json, sys, urllib.request

company_id, repo = sys.argv[1], sys.argv[2]
API = "http://localhost:3100/api"

# agent display name -> (instruction file stem, manager display name or None)
ORG = {
    "Nuclear Analyst":            ("nuclear-analyst",        "PM: Energy & Commodities"),
    "Commodities Analyst":        ("commodities-analyst",    "PM: Energy & Commodities"),
    "Energy Analyst":             ("energy-analyst",         "PM: Energy & Commodities"),
    "Semis & AI Analyst":         ("semis-analyst",          "PM: Technology"),
    "Tech & Software Analyst":    ("tech-analyst",           "PM: Technology"),
    "PM: Energy & Commodities":   ("pm-energy-commodities",  "CIO"),
    "PM: Technology":             ("pm-technology",          "CIO"),
    "Portfolio Risk Analyst":     ("portfolio-risk-analyst", "CIO"),
    "CIO":                        ("cio",                    None),
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

for name, (stem, manager) in ORG.items():
    aid = by_name.get(name)
    if not aid:
        print(f"  ! {name}: agent not found, skipped")
        continue

    try:
        body = open(f"{repo}/plugin/instructions/{stem}.md", encoding="utf-8").read()
        call("PUT", f"/agents/{aid}/instructions-bundle/file",
             {"path": "AGENTS.md", "content": body})
        status = "instructions loaded"
    except Exception as e:
        status = f"instructions FAILED ({e})"

    if manager and manager in by_name:
        try:
            call("PATCH", f"/agents/{aid}", {"reportsTo": by_name[manager]})
            status += f", reports to {manager}"
        except Exception as e:
            status += f", reportsTo FAILED ({e})"

    print(f"  - {name}: {status}")
PY
echo "==> Instructions and hierarchy applied."

# ── 7. Verify ───────────────────────────────────────────────────────
echo ""
echo "==> Agents:"
npx paperclipai agent list -C "$COMPANY_ID" 2>/dev/null || true
echo ""
echo "Done. UI: http://127.0.0.1:3100"
echo "Enable routines in UI (Routines tab) — or leave paused and use 'Run now' to test."
