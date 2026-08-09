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
| Nuclear / Commodities / Energy / Semis / Tech analysts | Sonnet 4.6 | $8 each | their PM |

Agents run through the Claude Code CLI (`claude_local` adapter), so usage draws on
the Claude subscription rather than a separate API bill.

## Updating holdings

`portfolio/holdings.json` is generated from the "Investments" Google Sheet
(tabs: taxable brokerage, 401k, Roth). Refresh it when positions change — the
agents read cost basis from this file, and stale data produces confident but
wrong recommendations.
