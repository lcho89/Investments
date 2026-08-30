#!/usr/bin/env bash
# Collect everything needed to diagnose a failure, in one pass.
# Run:  bash scripts/doctor.sh 2>&1 | tail -80
# Then paste the output.
export PATH="$HOME/.npm-global/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
API=http://localhost:3100/api

line() { printf '\n=== %s ===\n' "$1"; }

line "ENVIRONMENT"
echo "date:      $(date)"
echo "pwd:       $(pwd)"
echo "node:      $(node -v 2>&1)"
echo "claude:    $(command -v claude || echo 'NOT FOUND ON PATH')  $(claude --version 2>&1 | head -1)"
echo "git head:  $(git log --oneline -1 2>&1)"
echo "git clean: $(git status --porcelain | wc -l) modified file(s)"

line "SERVER"
if curl -sf $API/health >/dev/null 2>&1; then
  curl -s $API/health
  echo
else
  echo "NOT RUNNING — start it in another terminal: bash scripts/start.sh"
fi

line "PLUGIN"
npx paperclipai plugin inspect investment-research 2>&1 | head -5
echo "--- lastError (blank is good) ---"
curl -s $API/plugins 2>/dev/null | python3 -c "
import sys, json
try:
    for p in json.load(sys.stdin):
        if p.get('pluginKey') == 'investment-research':
            print('status:', p.get('status'))
            print('version:', p.get('version'))
            print('tools:', len(p.get('manifestJson', {}).get('tools', [])))
            print('skills:', len(p.get('manifestJson', {}).get('skills', [])))
            print('lastError:', p.get('lastError') or '(none)')
except Exception as e:
    print('could not read plugins:', e)
" 2>&1

line "BUDGETS"
_CID=$(curl -s $API/companies 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if d else '')" 2>/dev/null)
if [ -n "$_CID" ]; then
  curl -s "$API/companies/$_CID/agents" 2>/dev/null > /tmp/_agents.json
  python3 - /tmp/_agents.json <<'BUDGETPY'
import sys, json
agents = json.load(open(sys.argv[1]))
for a in agents:
    cap = a.get("budgetMonthlyCents", 0)
    spent = a.get("spentMonthlyCents", 0)
    if cap:
        pct = spent / cap * 100
        flag = "  <-- AT OR OVER CAP" if spent >= cap else ("  <-- near cap" if pct > 80 else "")
        print("%-28s $%7.2f / $%6.2f  (%5.1f%%)%s" % (a["name"][:26], spent/100, cap/100, pct, flag))
BUDGETPY
  rm -f /tmp/_agents.json
fi

line "AGENTS"
COMPANY_ID=$(curl -s $API/companies 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if d else '')" 2>/dev/null)
echo "companyId: ${COMPANY_ID:-NONE}"
if [ -n "$COMPANY_ID" ]; then
  curl -s "$API/companies/$COMPANY_ID/agents" 2>/dev/null | python3 -c "
import sys, json
for a in json.load(sys.stdin):
    cfg = a.get('adapterConfig') or {}
    print(f\"{a['name'][:26]:<28} {a.get('status',''):<10} {cfg.get('model','NO MODEL'):<20} engine={cfg.get('engine','?')} cmd={'set' if cfg.get('command') else 'MISSING'}\")
" 2>&1 | head -15
fi

line "DATA"
python3 -c "
import json
d = json.load(open('portfolio/holdings.json'))
t = sum(a['totalValue'] for a in d['accounts'].values())
print('holdings asOf:', d['asOf'], '| total: \$%0.0f' % t, '|', len(d['accounts']), 'accounts')
" 2>&1
echo "theses:  $(ls theses/*.md 2>/dev/null | wc -l) files"
echo "reports: $(find reports -name '*.md' 2>/dev/null | wc -l) files"
echo -n "FMP key: "
if [ -n "${FMP_API_KEY:-}" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://financialmodelingprep.com/api/v3/profile/URNM?apikey=$FMP_API_KEY")
  echo "set (profile endpoint HTTP $code)"
else
  echo "not in this shell's env (may still be stored in plugin config)"
fi

line "RECENT ERRORS (server log)"
LOG="$HOME/.paperclip/instances/default/logs/server.log"
if [ -f "$LOG" ]; then
  grep -iE 'error|failed|denied|not found|limit' "$LOG" | tail -25
else
  echo "no log at $LOG"
fi

line "END — paste everything above"
