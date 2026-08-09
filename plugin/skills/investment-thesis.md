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

## Position
Shares, average cost, current price, unrealized P/L, account. From `get_holdings`.

## Catalysts
- Catalyst (timeframe, and what observable event confirms it)

## Risks
- Risk (severity, and what observable event would confirm it materializing)

## Model
Valuation metrics with sources.

## Verdict
BUY / HOLD / SELL — Confidence: High / Medium / Speculative

## Standing Corrections
PM rulings, dated. Append only.
```

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
