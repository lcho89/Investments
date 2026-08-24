---
name: ETF and Fund Analysis
description: How to analyse an ETF, index fund, or physical trust — NAV premium/discount, cost drag, look-through exposure, and overlap with the rest of the book. Use for any position that is a wrapper rather than an operating company.
---

# ETF and Fund Analysis

A fund is a wrapper. Valuing the wrapper with a DCF is a category error — there are no
cash flows to discount, only a claim on assets someone else owns. Analyse the wrapper's
mechanics and the underlying exposure separately, and say that is what you did.

Roughly half this portfolio is funds and trusts. They are not a residual to be waved
through with "index exposure, no action" — a fund can carry more single-name risk than
a direct position and cost more to hold.

## 1. Identify the wrapper type

| Type | Examples here | What actually matters |
|---|---|---|
| Broad index fund | VTI, FXAIX, FTIHX, VOO | Cost, and what it already gives you — this is the overlap source |
| Sector or thematic ETF | COPX, SILJ, URNM, URNJ, LITP, FENY, XAR | Holdings concentration, index methodology, rebalancing rules |
| Physical trust | PHYS, PSLV, SRUUF | Premium/discount to NAV, custody, redemption terms, fee drag |
| Target-date / managed | VFFVX, VFIFX, DBMF | Glide path or strategy, and whether it duplicates exposure you hold directly |

## 2. Wrapper mechanics

Pull `get_fund_holdings` and `get_price_data`.

- **Expense ratio.** State it in basis points and in dollars per year on the actual
  position. A 0.75% fee on a $12k position is $90 a year — small, but it compounds
  against the thesis and belongs in the write-up.
- **Premium or discount to NAV.** Essential for closed-end structures and physical
  trusts. SRUUF and PSLV can trade meaningfully away from NAV, and buying at a premium
  means the commodity must move before you break even. State the current level and its
  range over the past year.
- **Liquidity.** Average volume and, for OTC names, the bid/ask spread. A position that
  takes multiple sessions to exit at a discount is a different risk than the same dollar
  amount in a liquid ETF. Flag it.
- **Index methodology.** For thematic ETFs, what does the index actually select and
  weight on? Many "uranium" or "copper" ETFs hold royalty companies, diversified miners,
  or utilities that are only partly exposed to the theme. If the fund's top holdings do
  not deliver the exposure the thesis assumes, that is the finding.

## 3. Concentration — is it diversification or a concentrated bet?

From `get_fund_holdings`. **Every holding name and weight must come from that call.**
If it returns an error or no rows, write "holdings not available — not reported" and
move on. Never list holdings from memory: a plausible-but-wrong holding is undetectable
to your PM and poisons the concentration and overlap analysis downstream.

- Top 5 and top 10 weights. Above roughly 50% in the top 10, the fund is a concentrated
  bet wearing a diversified label. Say so.
- Name the top holdings and their weights. "URNM gives us uranium exposure" is weaker
  than "URNM is 22% Cameco and 16% Kazatomprom, so it is substantially a two-name bet
  on incumbent producers rather than on spot."
- Sector weights, where the fund claims a sector but drifts.

## 4. Look-through — the calculation that matters most here

True exposure to a name is:

```
direct position value
  + Σ (fund position value × that name's weight in the fund)
```

Do this before calling any single-name exposure small. In this portfolio the live cases
are the AI and semiconductor names — a direct holding plus weight inside VTI, FXAIX and
any sector ETF is **one exposure, not four**. The same applies to uranium producers
appearing in both URNM and URNJ, and to silver miners across SILJ, SLVR and PSLV.

Report it as a table:

```
| Name | Direct | Via fund A | Via fund B | Total $ | % of portfolio |
```

Two rules on this table:
- **Weights come from `get_fund_holdings`.** Without them there is no look-through —
  say so rather than substituting a guess at the overlap percentage.
- **The denominator is total portfolio value across all accounts**, from
  `get_account_summary`. Not one account. Stating a percentage against a single
  account's balance overstates concentration and is a common error.

Two conclusions follow, and both belong in the memo:
- **Concentration** is higher than the position list suggests.
- **Overlapping funds** may be redundant. Three vehicles for one theme is complexity
  without added exposure; say which one you would keep and why.

## 5. Valuation, such as it is

There is no price target for a diversified index fund, and inventing one is worse than
declining. Write "no target — allocation decision, not a valuation call" and move on.

For thematic funds and trusts, value the *underlying*:

- Physical trust: NAV per unit versus the commodity spot price, plus the premium or
  discount. That is the whole valuation.
- Miner ETF: the driver is the commodity price and producer margins. Give the commodity
  price deck you are assuming, the fund's sensitivity to it, and what the fund does at
  the bull and bear commodity levels. Cite spot from a fetched source.
- Where the fund's top holdings are few enough to matter, a weighted view of their
  individual valuations is legitimate — say you did that and show the weights.

## 6. Sell triggers for funds

Funds still need falsification conditions. Use these alongside the category triggers for
the underlying theme:

- Premium to NAV widens beyond its historical range — you are paying for access
- Expense ratio raised, or a cheaper vehicle appears for the same exposure
- Index methodology changes so the fund no longer delivers the intended exposure
- Concentration drifts such that it duplicates something already held directly
- Liquidity deteriorates — spread widens, volume falls, AUM shrinks toward closure risk
- The underlying thesis breaks — the commodity or theme trigger fires

## What must appear in the write-up

Wrapper type, expense ratio in bps and dollars, premium/discount where applicable,
top-10 concentration, look-through overlap with the rest of the book, the underlying
exposure assessment, and sell triggers. Explicitly: **no DCF, and say why not.**
