# Testing Runbook

## Every session

**Terminal 1** — server, leave open:
```bash
cd ~/Investments && bash scripts/start.sh
```

**Terminal 2** — after any `git pull`:
```bash
cd ~/Investments && git pull && bash scripts/deploy.sh
```

UI: http://127.0.0.1:3100
Files from Windows: `\\wsl$\Ubuntu\home\lechernho\Investments`

---

## Test ladder — cheapest first

Run these in order. Each one is a gate: if it fails, fix before spending more.

### 1. Single analyst (~cents)
Issue → assign **Nuclear Analyst**:
> Update the thesis for URNM. Use get_holdings for our position and cost basis,
> get_price_data for the current price, and save with write_thesis.

Check:
```bash
cat theses/URNM.md
grep -o 'http[^ )]*' theses/URNM.md      # should list real URLs
grep -i unverified theses/URNM.md         # tags where nothing was fetchable
```
Pass = position matches holdings.json, price is live, citations are URLs,
rating either unchanged or explicitly justified, probabilities coherent.

### 2. PM delegation (~$1-3)
Issue → assign **PM: Energy & Commodities**:
> Produce your weekly PM report. Task each analyst for their sector update,
> challenge at least one assumption, and record the ruling in the thesis.

Check the **Analyst Challenges** section specifically. Pass = it caught something
real (incoherent numbers, unexplained rating change, missing citation) and wrote
the ruling into a thesis file under `## Standing Corrections`.

### 3. Full loop (~$5-15) — in this order
1. PM: Energy & Commodities — weekly report
2. PM: Technology — weekly report
3. Portfolio Risk Analyst — "Weekly risk report: concentration, correlation, macro,
   and a bear case for each BUY the PMs proposed."
4. CIO — "PM and risk reports are complete. Draft the monthly Investment Memo and
   convene the IC."

1–3 can run in parallel. 4 must be last — the CIO needs the others to exist.

Then **you chair the IC**: read the memo, push back, comment your decision.
The CIO records it and distributes. Nothing is actionable until you approve.

### 4. Enable schedules — only after a clean full loop
- Weekly Deep Research (Mon 8am) — on
- Portfolio Risk Check (Fri 9am) — on
- Monthly Investment Memo (1st, 8am) — on
- Morning Brief — leave OFF until you have a month of cost data

Routines fire only while `start.sh` is running. A sleeping laptop skips that run
entirely; it does not catch up.

---

## After each run

```bash
git add theses reports && git commit -m "Agent output $(date +%F)" && git push
```

Committing is what makes output reviewable over time — you can diff this week's
thesis against last week's and see exactly what changed.

---

## What to watch for

| Symptom | Meaning | Fix |
|---|---|---|
| Numbers with no URL and no `[UNVERIFIED]` tag | Sourcing discipline slipping | Tighten `plugin/skills/data-sourcing.md` |
| Rating changed with no explanation | The defect that corrupts memos silently | PM should reject; if it doesn't, tighten `pm-challenge.md` |
| Probabilities summing past 100% | Analysis is decorative, not real | Log in `reports/LESSONS.md`; consider Sonnet for analysts |
| Files outside `theses/` or `reports/` | Path rules not being followed | Check agent `cwd` in deploy output |
| `acpx_session_config_failed` ... does not advertise 'effort' | Adapter chose the ACP lane, which rejects `effort` | Already fixed: `engine: "cli"` is pinned in deploy.sh. Re-run deploy, then retry the blocked issue. |
| `Command not found in PATH: "claude"` in server.log | Server process has a different PATH than your shell | Restart the server (`Ctrl+C`, then `bash scripts/start.sh`). deploy.sh also pins the absolute CLI path. |
| Issue stuck in `blocked` after a failed run | Paperclip's recovery couldn't find a live execution path | Fix the cause, redeploy, then reopen the issue and move it back to `todo` so it gets picked up |
| Same error every week | Correction isn't persisting | Promote it into the analyst's instruction file |

Instruction and skill files take effect on the **next run** — edit and go, no redeploy.
Only `deploy.sh` changes (models, budgets, hierarchy) need a redeploy.

---

## Cost control

Caps are per-agent monthly ceilings, set in `scripts/deploy.sh`:
analysts $3, risk $5, PMs $10, CIO $20.

The account-level cap at claude.ai/settings/usage is separate and hits first —
that is what stopped runs earlier.

Cheapest useful test is always a single Haiku analyst. Never debug plumbing with
a PM run.
