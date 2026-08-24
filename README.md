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

## Updating holdings — do this after you trade

`portfolio/holdings.json` is the agents' only view of what you own. It does not
update itself. Trade on Tuesday and every agent still reasons on Monday's cost
basis, producing confident, well-sourced, wrong recommendations.

### One-time setup (~10 min)

Install rclone and authorise Google Drive. Nothing is published; the token stays
on this machine.

```bash
sudo -v ; curl https://rclone.org/install.sh | sudo bash
pip install openpyxl
rclone config
```

In `rclone config`: `n` (new remote) → name it **gdrive** → storage **drive** →
accept the blank client_id/secret → scope **2** (read-only) → blank root/service
account → `y` to use auto config (opens a browser to sign in) → `n` to team
drive → `y` to confirm → `q` to quit.

Then fetch the workbook once and see the tab names:

```bash
python3 scripts/refresh_holdings.py     # fetches; will error on placeholder tabs
python3 scripts/list-tabs.py
```

Put the three real tab names into `portfolio/sources.json`, replacing the
`REPLACE_WITH_*` placeholders. If your sheet is not named exactly `Investments`
at the Drive root, adjust `rclone.remote` too (e.g. `gdrive:Finance/Investments`).

### After that, every time you trade

Update the sheet as usual, then:

```bash
cd ~/Investments
python3 scripts/refresh_holdings.py
git add portfolio/holdings.json && git commit -m "Refresh holdings" && git push
```

One command. It pulls the current sheet, rebuilds `holdings.json` from all three
tabs, and skips any row marked sold. Run it before any weekly cycle — agents warn
when `asOf` is more than five days old, but a warning is not current data.

**Manual fallback** if you would rather not authorise Drive: export each tab
(File > Download > CSV) into `portfolio/exports/`, and in `sources.json` replace
each account's `"tab"` with `"file": "portfolio/exports/<name>.csv"`.

