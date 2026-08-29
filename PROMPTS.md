# Command Reference

You do not need to copy prompts from this file. Just say the command — the agents
know what each one expands to (see the Standing Commands skill).

## The short version

| Say this | To | Get |
|---|---|---|
| `weekly report` | any analyst | Sector update, sell-trigger readings, thesis updates, flags |
| `weekly report` | a PM | Tasks analysts, challenges an assumption, records the ruling |
| `risk report` | Risk Analyst | Concentration, correlation, macro, liquidity, bear cases |
| `monthly memo` | CIO | Investment Memo + IC convening, then waits for you |
| `refresh URNM` | the sector's analyst | Brings one thesis current |
| `deep dive CEG` | the sector's analyst | Full Equity Research Standard — expensive, thorough |
| `fund review URNM` | the sector's analyst | ETF wrapper analysis, no DCF |
| `earnings PANW` | the sector's analyst | Reaction vs our thesis |
| `vet OKLO` | the sector's analyst | A name we don't own, incl. overlap and funding |
| `look-through` | Risk Analyst | True single-name exposure across funds |
| `stress AI capex halves` | Risk Analyst | Named shock, drawdown in $ and % |
| `trim check` | a PM | Tax-aware, taxable vs 401k/Roth |
| `coverage sweep` | CIO | Runs coverage.py, assigns the biggest gaps |
| `calibration review` | CIO | Scores past calls, hit rate by confidence tier |
| `open items` | CIO or a PM | Every follow-up and its status — what was promised and never delivered |

## Modifiers

Append to any command:

- `quick` — shortest defensible version
- `full` — complete standard, no abbreviating
- `since 2026-07-01` — restrict the delta window
- `just CEG` — scope to one name

Example: `weekly report quick`, `refresh CEG full`, `open items since 2026-07-01`.

## What happens automatically

Every command starts with the agent reading its own last report, the relevant theses,
and searching prior coverage — then leading with what changed. You do not need to ask
for that.

## If you want to be more specific

Longer prompts still work and override the shorthand. Useful when you want something
the standard protocol would not cover:

```
Value CEG using a DCF. Show the 5x5 sensitivity across WACC and terminal growth, and
tell me which single assumption moves the answer most.
```

```
Compare our three silver vehicles — SILJ, SLVR, PSLV. Which would you keep and why?
Consider tax cost of exiting each.
```

```
We are 6% uranium across URNM, URNJ and SRUUF. If spot stays at $86 through Q1 2027,
what does each position do, and which would you cut first?
```
