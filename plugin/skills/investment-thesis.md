---
name: Investment Thesis Method
description: How to write, update, and revise a per-ticker investment thesis, including rating-change discipline. Use before any write_thesis call.
---

# Investment Thesis Method

## Read before you write

Call `read_thesis` for the ticker first, every time. You have no memory of previous
runs — that file is your memory. Honor any `## Standing Corrections` section; those
are rulings already made by a PM. Do not relitigate them.

## Structure

```
## Thesis
One paragraph: what has to be true for this to work.

## Category
Slow grower / Stalwart / Cyclical / Fast grower / Turnaround / Asset play
— one-sentence defence. See the Company Categorisation skill.

## Position
Shares, average cost, current price, unrealised P/L, account, % of portfolio.
From `get_holdings`. Aggregate across accounts.

## Business
Moat mechanism, customers and concentration, competitive structure. Named
mechanisms, not adjectives.

## Financial Profile
Five-year table from `get_financials`: revenue and CAGR, gross and operating
margin trend in percentage points, FCF per diluted share, net cash, leverage
and coverage. Nulls reported as "not reported", never estimated.

## Valuation
Method, inputs, output range, sensitivity, and the assumption that moves it
most. Peer comps from `get_peer_comps` with each peer justified. See the
Valuation Methods skill. For an ETF or trust: NAV premium/discount and
underlying exposure instead.

## Expected Value
Bull / Base / Bear prices with probabilities summing to 100%, and the
probability-weighted return.

## Catalysts
- Catalyst — timeframe, and the observable event that confirms it

## Risks
- Risk — severity, and the observable event that would confirm it materialising

## Sell Triggers
The category's triggers, each marked not triggered / watch / TRIGGERED, with
today's reading. This is the falsification test.

## Ownership
Institutional %, top holders, insider activity over 12 months, from
`get_ownership`.

## Verdict
BUY / HOLD / SELL — Confidence: High / Medium / Speculative
Target: $__ (method) | Horizon: __ months

## Standing Corrections
PM rulings, dated. Append only.

## Call Record
| Date | Verdict | Price | Target | Outcome at review |
Append one row per review. Never rewrite history — this is how conviction gets
calibrated against hit rate.
```

A thesis missing Category, Valuation, Expected Value or Sell Triggers is
incomplete. Say so at the top rather than quietly omitting them.

## Rating-change discipline

If your rating differs from the rating currently in the thesis file, you must state
that it changed and why, naming the specific new information that drove it. A rating
that moves without explanation is a defect — it silently corrupts every downstream
report that inherits it.

If nothing material changed, say "No change since <date>" and explain briefly why the
thesis still holds. "No change" is a legitimate finding. Do not manufacture a revision
to appear productive.

## Distinguish conviction from certainty

Confidence tags describe the strength of your evidence, not the attractiveness of the
idea. A thesis can be High conviction and Speculative confidence at once — say so
rather than blending them.
