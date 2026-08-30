# Weekly Runbook

The order that keeps every step grounded in current data — each one depends on
something the step before it produced. Copy the prompt, assign it to the named
agent, wait for it to finish before starting the next one. Steps in the same
phase can run in parallel.

---

## Phase 0 — Data must be current (do this first, always)

**Step 0.1 — Refresh holdings** (you run this, not an agent)
```bash
cd ~/Investments
python3 scripts/refresh_holdings.py
git add portfolio/holdings.json && git commit -m "Refresh holdings" && git push
```
Skip this and every agent reasons on stale positions. Do it every time you've traded
since the last run — this is the one step nothing downstream can catch for you.

**Step 0.2 — Coverage sweep**
Assign to: **CIO**
```
coverage sweep
```
Tells you which holdings have no thesis, which are stale, which are partial —
sorted biggest-and-worst first. This is your actual worklist for Phase 2; don't
skip it and guess.

---

## Phase 1 — Sector analysts (parallel — all five can run at once)

**Step 1.1**
Assign to: **Nuclear Analyst**
```
weekly report
```

**Step 1.2**
Assign to: **Commodities Analyst**
```
weekly report
```

**Step 1.3**
Assign to: **Energy Analyst**
```
weekly report
```

**Step 1.4**
Assign to: **Semis & AI Analyst**
```
weekly report
```

**Step 1.5**
Assign to: **Tech & Software Analyst**
```
weekly report
```

Each of these reads its own last report, checks sell triggers on its book, updates
any thesis that moved, and flags anything for its PM. Wait for all five before
Phase 2 — the PMs need this output to review.

---

## Phase 2 — Coverage work (use the Step 0.2 worklist)

For each gap the coverage sweep flagged, pick the right depth:

**Step 2.1 — No thesis exists, position is significant**
Assign to: the sector's analyst
```
deep dive <TICKER>
```
Full standard — five-year financials, comps, ownership, category, DCF or comps
model as a real Excel file, expected value. Expensive; reserve for the largest gaps.

**Step 2.2 — Thesis exists but is stale or partial**
Assign to: the sector's analyst
```
refresh <TICKER>
```
Faster — brings one thesis current without rebuilding it from scratch.

**Step 2.3 — Position is a fund or ETF**
Assign to: the sector's analyst
```
fund review <TICKER>
```
Wrapper mechanics, NAV premium/discount, look-through — not a deep dive, funds get
their own standard.

Work top-down through the coverage sweep list. Three to five names per week is
sustainable; don't try to clear the whole backlog in one cycle.

---

## Phase 3 — Portfolio managers (after Phase 1 finishes for their book)

**Step 3.1**
Assign to: **PM: Energy & Commodities**
```
weekly report
```
Tasks its three analysts (redundant if Phase 1 already ran them this week — say
so and skip re-tasking), reviews their output, challenges an assumption, records
the ruling.

**Step 3.2**
Assign to: **PM: Technology**
```
weekly report
```

---

## Phase 4 — Risk (after Phase 3, needs the PMs' proposed actions)

**Step 4.1**
Assign to: **Portfolio Risk Analyst**
```
risk report
```
Concentration, correlation, macro exposure, liquidity, tax placement, and a bear
case with a probability for every BUY the PMs proposed this cycle.

**Step 4.2 — monthly only, or after a big rebalance**
Assign to: **Portfolio Risk Analyst**
```
look-through
```
True single-name exposure across every fund we hold, using total portfolio value
as the denominator.

---

## Phase 5 — CIO (monthly, or on demand)

**Step 5.1**
Assign to: **CIO**
```
monthly memo
```
Reads the prior memo, pulls Phase 3 and Phase 4 output, verifies load-bearing
claims independently, drafts the Investment Memo, opens the IC issue, and stops —
nothing is actionable until you approve it in that thread.

**Step 5.2 — quarterly**
Assign to: **CIO**
```
calibration review
```
Scores the Call Records: hit rate by confidence tier, by analyst, by category.
This is the only step that tells you whether the system is actually any good.

---

## After every cycle

```bash
cd ~/Investments
git add theses reports models && git commit -m "Weekly cycle $(date +%F)" && git push
```

Commits the theses, reports, and any Excel models produced, so you can diff this
week against last week later.

---

## Cadence at a glance

| Phase | How often |
|---|---|
| 0 — Refresh + coverage sweep | Every cycle, first |
| 1 — Analyst weekly reports | Weekly |
| 2 — Coverage gaps | Weekly, 3–5 names |
| 3 — PM reports | Weekly |
| 4 — Risk report | Weekly; look-through monthly |
| 5 — CIO memo | Monthly |
| 5.2 — Calibration review | Quarterly |

## Ad hoc, any time

Outside this cycle, `trim check`, `open items`, `earnings <TICKER>`, `vet <TICKER>`,
and `stress <scenario>` all work standalone — see `PROMPTS.md` for the full list.
