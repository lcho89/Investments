---
name: Equity Research Standard
description: The house standard for a full company write-up — business profile, five-year financial profile from 10-Ks, valuation ratios against peers, ownership, and risks. Use for any initiation, annual refresh, or deep-dive on a holding.
---

# Equity Research Standard

This is the bar for a full write-up. A note that skips sections is a partial and must
say so at the top: "Partial — sections X and Y not completed because Z."

Start by pulling the data. `get_financials` for the five-year tables, `get_peer_comps`
for relative valuation, `get_ownership` for holders and insiders, `search_sec_edgar`
with `fetchText: true` for the 10-K itself. Every table below comes from those calls,
never from recall. Where a field returns null, write "not reported" — do not fill it.

## 1. Investment Thesis

**Business rationale.** Why is this worth owning? What is the special sauce, and what
is the moat — scale, switching costs, network effects, regulatory position, low-cost
resource, brand? Name the mechanism, not the adjective. "Strong moat" is not an answer;
"20-year contracted PPAs with investment-grade counterparties covering 75% of output"
is.

**Management.** Track record on operations and on capital allocation — those are
different skills. Has the board shaped strategy or rubber-stamped it? Look at what they
have done with cash over five years, not what they say in the letter.

**Growth.** How fast, is it sustainable, organic or acquired? What secular trend
carries it? How does the rate compare to peers? Separate operating growth from
financial engineering — buybacks, refinancings, NOL usage flatter EPS without adding
business value, and must be called out where present. `get_financials` gives you
revenue and EPS CAGR plus diluted share change; if EPS CAGR far exceeds revenue CAGR
while share count falls, say so explicitly.

**Margins.** Gross and operating over five years, against the company's own history and
against peers. State the trajectory in percentage points, not adjectives. If below
peers, is there a specific, dated path to closing the gap, or is it structural?

**Capital returns.** Buyback and dividend programs. Is FCF sufficient to cover the
dividend — show the coverage. A dividend funded by debt is a different security than
one funded by cash flow.

**M&A.** Track record on deals. Current environment and whether targets are actionable
at sane prices. Is the company itself a target? Non-core assets that could be separated?

**Valuation.** Premium or discount to peers and to its own history, with the number. Is
it cheap *relative to* business quality, growth, margin potential and returns — not
cheap in the abstract.

**Catalysts.** What specifically drives a re-rating, and when. Earnings beats, product
launches, capital-return announcements, regulatory decisions. A catalyst without a date
range is a hope.

## 2. Business Profile

- Core business, sector, position in the value chain
- Products and services, with revenue breakdown where disclosed
- Customers: concentration, named large customers, end-markets
- Geographic exposure and international footprint
- Competition: how many, how concentrated — monopoly, oligopoly, fragmented — and where
  this company sits

## 3. Financial Profile (five-year tables, USD unless a percentage)

From `get_financials`. Present as tables, oldest year first, with the fiscal year
labelled and the filing linked.

| Line | Requirement |
|---|---|
| Revenue | 5 years, by segment where disclosed, YoY growth and 5-year CAGR |
| Gross profit | Dollars and % of revenue, by segment where available |
| Operating expense | S&M, R&D, G&A each as % of revenue, per year |
| Operating profit | Dollars and % of revenue |
| EPS | Diluted, YoY, CAGR |
| Free cash flow | Per year and per diluted share. State which definition you used |
| Net cash | Cash − total debt, per year, with the change each year; debt/equity |
| Credit stats | Debt/EBITDA, net debt/EBITDA, EBITDA/interest, (EBITDA−capex)/interest |

Line items are named differently across filings. Use the nearest comparable and say
which line you mapped.

## 4. Valuation Ratios

- Market cap = price × fully diluted shares. Enterprise value = market cap + total debt
  + preferred + minority interest − cash.
- Pull 3–4 closest comparables on size and product, plus whatever `get_peer_comps`
  returns. **Justify each peer.** Drop any that are not genuinely comparable and say why.
- P/E current and forward, versus peers, industry, and the company's own history.
- EV/Revenue, EV/FCF and/or EV/EBITDA on the same three comparisons.
- ROIC: EBIT×(1−tax) ÷ (working capital + net PP&E + other operating assets).
- Dividend yield from the most recent quarterly dividend annualised.

All per-share figures use fully diluted shares.

## 5. Ownership

Institutional ownership percentage, top five holders, and insider transactions over the
last twelve months — both directions. Note that option exercises and grants are not
open-market buying; read the rows before calling it a signal.

## 6. Risks

What would derail the thesis. Work through the 10-K risk factors and keep the ones that
are live rather than boilerplate. Add risks the filing omits — competitive, commodity,
political, counterparty. For each, say what observable event would tell you it is
happening.
