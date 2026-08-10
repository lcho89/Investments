# Investment Research Orchestration

A Paperclip agent hierarchy that researches this portfolio: sector analysts →
portfolio managers → CIO, with all final recommendations gated behind a
human-chaired Investment Committee.

## Daily use

**After every reboot**, start the server and leave the window open:

```bash
cd ~/Investments
bash scripts/start.sh
```

Then open <http://127.0.0.1:3100>. That's it — agents and routines resume
automatically. Scheduled routines only fire while this is running, so if the
machine is asleep at 7am, that morning's brief is skipped.

To stop: `Ctrl+C` in that window.

## After changing config or pulling updates

```bash
cd ~/Investments
git pull
bash scripts/deploy.sh          # rebuilds plugin, re-syncs agents/models/budgets
```

Safe to re-run any time. Add keys inline when they change:

```bash
FMP_API_KEY=... NEWSAPI_KEY=... bash scripts/deploy.sh
```

To avoid pasting keys each time, put them in `~/.bashrc` once:

```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.bashrc
echo 'export FMP_API_KEY=...' >> ~/.bashrc
source ~/.bashrc
```

## Layout

| Path | What |
|---|---|
| `portfolio/holdings.json` | Positions, cost basis, by account. Source of truth for agents. |
| `plugin/instructions/*.md` | Each agent's mandate. Edit these to change behavior — no redeploy needed. |
| `theses/<TICKER>.md` | Per-ticker investment theses, written by agents. |
| `reports/<agent>/<date>.md` | Periodic agent reports. |
| `scripts/start.sh` | Start the server (after reboot). |
| `scripts/deploy.sh` | Provision/refresh agents, models, budgets. Idempotent. |

## The agents

| Agent | Model | Budget/mo | Reports to |
|---|---|---|---|
| CIO | Fable 5 | $20 | you |
| PM: Energy & Commodities | Sonnet 4.6 | $10 | CIO |
| PM: Technology | Sonnet 4.6 | $10 | CIO |
| Portfolio Risk Analyst | Sonnet 4.6 | $5 | CIO |
| Nuclear / Commodities / Energy / Semis / Tech analysts | Haiku 4.5 | $3 each | their PM |

Agents run through the Claude Code CLI (`claude_local` adapter), so usage draws on
the Claude subscription rather than a separate API bill.

## Updating holdings — do this after you trade

`portfolio/holdings.json` is the agents' only view of what you own. It does not
update itself. Trade on Tuesday and every agent still reasons on Monday's cost
basis, producing confident, well-sourced, wrong recommendations.

**One-time setup.** In the Google Sheet: File > Share > Publish to web, pick a
tab, choose CSV, publish. Do that for the taxable, 401k, and Roth tabs, then put
the URLs in `portfolio/sources.json`:

```json
{
  "accounts": [
    {"key": "taxable", "label": "Stock brokerage (taxable)", "category": "taxable",    "csvUrl": "https://docs.google.com/.../pub?gid=0&single=true&output=csv"},
    {"key": "401k",    "label": "401k",                      "category": "retirement", "csvUrl": "..."},
    {"key": "roth",    "label": "Roth",                      "category": "retirement", "csvUrl": "..."}
  ]
}
```

Published CSVs need no auth, so this works unattended.

**After that, whenever you trade** (update the sheet first):

```bash
python3 scripts/refresh_holdings.py
git add portfolio/holdings.json && git commit -m "Refresh holdings" && git push
```

Run it before any weekly cycle. Agents warn when `asOf` is more than 5 days old,
but a warning is not a substitute for current data.
