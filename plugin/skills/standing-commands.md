---
name: Standing Commands
description: Short commands the human PM uses and what each one expands to. Use whenever an issue is terse — "weekly report", "refresh URNM", "coverage sweep" — so the full protocol runs without it being spelled out.
---

# Standing Commands

The human PM writes short instructions. Each one below expands to a full protocol. Run
the whole protocol, not the literal words.

**Every command begins the same way:** `list_reports` for your own slug → `read_report`
on your most recent → `read_thesis` for tickers involved → `search_reports` for prior
coverage. Then lead with what changed. See the Report Continuity skill.

If a command is ambiguous, pick the most useful reading, state which you chose in one
line, and proceed. Do not stall waiting for clarification on a routine request.

---

## For analysts

**`weekly report`** — your sector's weekly update.
Prices and fundamentals for your holdings via `get_price_data`; anything material from
`fetch_market_news` and `search_sec_edgar`; sell-trigger reading for each thesis; flags
for the PM. Update any thesis that materially changed via `write_thesis`. Save to
`reports/<your-slug>/YYYY-MM-DD.md`. Lead with the delta since your last report.

**`refresh <TICKER>`** — bring one thesis current.
`read_thesis` first. Pull `get_holdings`, `get_price_data`, and `get_financials` where
it is an operating company. Update the sections that moved, honour Standing Corrections,
justify any rating change against the prior rating, and append to the Call Record.

**`deep dive <TICKER>`** / **`initiate <TICKER>`** — the full Equity Research Standard.
All six sections, five-year financials, justified peer comps, ownership, risks,
categorisation with sell triggers, a derived price target with method and sensitivity,
and bull/base/bear with probabilities summing to 100%. This is expensive; it is meant to be.

**`fund review <TICKER>`** — an ETF, index fund, or trust.
The ETF and Fund Analysis skill: wrapper type, expense ratio in bps and dollars on our
actual position, premium/discount to NAV, top-10 concentration from `get_fund_holdings`,
look-through overlap against the rest of the book, sell triggers. No DCF, and say why not.

**`earnings <TICKER>`** — reaction to a report.
Pull the release and any 8-K. Compare against our thesis. State whether the thesis
strengthened, weakened, or is unchanged, and what specifically moved.

**`vet <TICKER>`** — a name we do not own.
Deep dive plus: how it correlates with what we already hold, whether it duplicates
existing exposure, and where the money would come from.

## For portfolio managers

**`weekly report`** — your book's PM report.
Task each analyst for their sector update. Review what comes back against the Investment
Thesis Method and PM Challenge Protocol: uncited figures, incoherent probabilities,
unexplained rating changes, holdings that do not exist. Challenge at least one
load-bearing assumption. Record the ruling in the affected thesis under Standing
Corrections and append recurring errors to `reports/LESSONS.md`.

**`coverage`** — what in your book is uncovered or stale.
Read `scripts/coverage.py` output. Assign refreshes largest-first. Confirm sell triggers
were read this cycle for every thesis you own.

**`trim check`** — tax-aware review.
Which positions are up enough to consider trimming. Separate taxable from 401k and Roth
— only the taxable account carries capital-gains consequences.

**`open items`** — accountability sweep.
Every follow-up assigned in your book over the last 60 days and its status: delivered,
still open, or dropped. Name anything promised and never delivered.

## For the risk analyst

**`risk report`** — the weekly risk package.
Concentration, correlation (treat near-perfect pairs as one position), macro factor
exposure, liquidity, tax placement. A bear case with a probability for every BUY the PMs
propose.

**`look-through`** — true single-name exposure.
`get_fund_holdings` on every fund we own; compute direct position plus each name's weight
inside every fund. Denominator is total portfolio value across all accounts.

**`stress <scenario>`** — a named shock.
e.g. `stress AI capex halves`, `stress uranium to $70`. Name the positions that move
together and estimate the drawdown in dollars and percent.

## For the CIO

**`morning brief`** — overnight moves, >3% flagged, today's watch list. Keep it short.

**`monthly memo`** — the Investment Memo and IC convening. Verification table, sector
views, proposed actions each with target, method, expected value, size and funding
source, risk summary, call-record review, open questions, dissents. Then stop and wait
for the human chair.

**`coverage sweep`** — run `scripts/coverage.py`, report the coverage percentage, assign
the largest gaps, name anything unowned.

**`calibration review`** — score the Call Records: hit rate by confidence tier, by
analyst, by category. Error taxonomy. Append recurring failures to `reports/LESSONS.md`
with the specific instruction change you recommend.

**`open items`** — every outstanding follow-up across all agents, with status.

---

## Modifiers

Any command accepts these:

- **`quick`** — the shortest defensible version. Skip the full standard, say you did.
- **`full`** — the complete standard even where you would normally abbreviate.
- **`since <date>`** — restrict the delta window.
- **`just <ticker>`** — scope to one name.

Example: `weekly report quick`, `refresh CEG full`, `open items since 2026-07-01`.
