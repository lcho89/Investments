---
name: Valuation Methods
description: How to derive a price target — DCF, trading comparables, and triangulation across methods into a football-field range. Use whenever stating a target price, fair value, or upside percentage.
---

# Valuation Methods

**No price target without a method behind it.** "URNM to $65–75" with no derivation is a
guess wearing a number. Every target names its method, shows its inputs, and states what
would move it.

Pick the method that fits the security:

| Security type | Primary method | Secondary |
|---|---|---|
| Operating company with positive FCF | DCF | Trading comps |
| Operating company, pre-FCF or cyclical trough | Trading comps on normalised earnings | EV/Revenue |
| Miner or resource producer | NAV (reserves × realised price − costs, discounted) | EV/EBITDA on mid-cycle |
| Commodity ETF or physical trust | NAV per unit and premium/discount to NAV | — |
| Broad index fund | No target. Say so — these are allocation decisions, not valuation calls |

For an ETF, index fund, or physical trust, stop here and use the **ETF and Fund
Analysis** skill instead. Valuing a wrapper with a DCF is a category error — there are
no cash flows to discount. That skill covers NAV premium/discount, cost drag,
concentration, and look-through overlap.

---

## Discounted cash flow

**Build the model with `build_dcf_model`** — a real Excel workbook with live formulas,
not a markdown table. It pulls five years of actuals from `get_financials` for the
Historicals sheet, puts your assumptions in editable yellow input cells, and derives
revenue → EBITDA → FCF → terminal value → implied price/share through formulas that
recompute if you change an input. It also produces a 5×5 WACC/terminal-growth
sensitivity grid as live formulas, not typed numbers.

State your assumptions before calling it — the tool does not choose them for you:

1. **Revenue forward five years** — bottom-up where possible: units × price, customers ×
   ARPU, or by segment. State the driver, not just a growth rate.
2. **Cost structure** — COGS, SG&A, R&D, D&A as % of revenue with an explicit trend
   assumption. Anchor on the five-year history and justify any deviation.
3. **EBITDA bridge** — revenue down to EBITDA showing each line's margin contribution.
4. **Unlevered FCF** — EBITDA → taxes → capex → change in working capital.
5. **WACC** — cost of equity via CAPM (risk-free rate, beta, equity risk premium)
   blended with after-tax cost of debt at the actual capital structure. Cite the
   risk-free rate you used and its date.
6. **Terminal value** — both perpetuity growth *and* exit multiple. Compare them. If
   they disagree materially, say so; that disagreement is information.
7. **EV → equity** — subtract net debt, minority interest, preferred.
8. **Per share** — divide by fully diluted shares including options and RSUs.
9. **Sensitivity** is built automatically as a live 5×5 grid around your WACC/terminal
   growth inputs. The single point estimate matters less than the shape of this grid.

Cite the model's file path in your report (e.g. `models/CEG-DCF-2026-08-30.xlsx`) and
state the implied price it produced — do not silently retype the number as if you
derived it by hand. If terminal value is more than ~75% of enterprise value (the model
reports this on the DCF sheet), flag it: that is a statement that you cannot really
value the business, only its perpetuity assumption.

## Trading comparables

**Build the model with `build_comps_model`** — a real Excel workbook, not a markdown
table. It pulls `get_peer_comps`, writes one row per peer with live multiples, and adds
a median/mean/P25/P75 stats block plus implied-EV formulas for the subject — all live,
so replacing or dropping a peer recomputes the range.

- **Peer selection is the analysis.** 8–12 names, comparable on business model, size,
  growth and margins. Justify each inclusion in one line. Drop the ones that are not
  genuinely comparable and say why — a bad peer set produces a confident wrong answer.
- Multiples: EV/Revenue, EV/EBITDA, EV/EBIT, P/E, P/FCF for every peer.
- Growth-adjust: PEG and EV/EBITDA-to-growth, so a fast grower is not called expensive
  purely for growing.
- Statistics: mean, median, p25, p75 for each multiple.
- Flag outliers and explain them before excluding them.
- Apply median and p75 to the subject's metrics for an implied range.
- State whether the subject trades above or below the peer median, and *why* —
  justified by quality, or an opportunity, or a warning.
- Show how sector multiples have moved over three years, so today's median is read in
  context.

## Triangulation — the football field

Bring the ranges together on one view:

```
Method              Low      High     Weight   Note
DCF (base)          $__      $__      __%      terminal = __% of EV
Trading comps       $__      $__      __%      median / p75 EV/EBITDA
52-week range       $__      $__      —        market reference
Analyst targets     $__      $__      —        consensus, n = __
─────────────────────────────────────────────
Concluded range     $__      $__
Current price       $__               → __% to midpoint
```

Weight the methods and justify the weighting — data availability and business type
decide it. Where methods disagree by more than about 30%, that is the finding: say which
assumption drives the gap.

## Expected value

Convert the range into a decision:

```
Bull  $__   P = __%   → +__%
Base  $__   P = __%   → +__%
Bear  $__   P = __%   → −__%
Probability-weighted return: __%
```

Probabilities sum to 100%. Each one names its reasoning — a base rate, a scenario tree,
or an explicit judgement labelled as such. A BUY with a 3:1 upside/downside skew is a
different recommendation from one at 1:1, and the memo must let the reader tell them
apart.

## What must appear in the write-up

Every valuation section states: the method, the key inputs, the output range, the
sensitivity, and the single assumption that most moves the answer. If you could not
build the model — data missing, business not amenable — say that plainly and give the
relative-value read instead. An honest "no defensible target; here is the comp
positioning" beats a fabricated DCF.
