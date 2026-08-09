# Prompt Library

Copy-paste into a new issue and assign to the named agent.

## Test ladder

### 1. Single analyst — plumbing check (~cents)
**Assign to: Nuclear Analyst**
```
Update the investment thesis for URNM.

Call read_thesis first, then get_holdings for our position and cost basis, then
get_price_data for the current price. Fetch uranium spot from the web and cite the
URL. Save the result with write_thesis.

If your rating differs from what is already in the thesis file, say so and explain
why. If nothing material has changed, say that instead of manufacturing a revision.
```

### 2. PM delegation — hierarchy check (~$1-3)
**Assign to: PM: Energy & Commodities**
```
Produce your weekly PM report.

Task each of your three analysts for their sector update. Review what comes back
against the Investment Thesis Method and PM Challenge Protocol skills: check for
uncited figures, incoherent probabilities, and any rating that changed without
explanation.

Challenge at least one load-bearing assumption. Record the resolution in the
affected thesis file under "## Standing Corrections", and append any recurring
error to reports/LESSONS.md.

Save your report to reports/pm-energy-commodities/YYYY-MM-DD.md.
```

### 3. Full loop
Run 3a-3c first (parallel is fine), then 3d.

**3a. Assign to: PM: Energy & Commodities** — use the prompt from step 2.

**3b. Assign to: PM: Technology**
```
Produce your weekly PM report for the technology book.

Task the Semis & AI Analyst and the Tech & Software Analyst for their updates.
Challenge at least one assumption and record the resolution in the affected thesis.

Pay particular attention to whether our tech exposure is providing diversification
or just correlated beta to the index funds we already hold.

Save to reports/pm-technology/YYYY-MM-DD.md.
```

**3c. Assign to: Portfolio Risk Analyst**
```
Produce the weekly portfolio risk report.

Use get_holdings across all accounts. Cover concentration (top positions by weight,
theme concentration), correlation (which positions move together — treat near-perfect
pairs as one position), macro factor exposure (USD, rates, China), and liquidity
(flag OTC and thinly traded names).

Produce an explicit bear case for every BUY the PMs are proposing this cycle, with a
probability estimate and an estimated portfolio loss if it materialises.

Save to reports/portfolio-risk-analyst/YYYY-MM-DD.md.
```

**3d. Assign to: CIO** (only after 3a-3c finish)
```
Both PM reports and the risk report are complete.

Draft the monthly Investment Memo. Pull from the PM reports and the risk analyst's
work; verify anything that looks load-bearing rather than accepting it. Challenge any
PM recommendation that lacks a bear case.

Then convene the Investment Committee: open an issue tagged ic-pending containing the
memo, the proposed actions, any dissenting PM views, and your open questions for me.
Stop there and wait — nothing is actionable until I approve.

Save the memo to reports/cio/YYYY-MM-DD-investment-memo.md.
```

## Ad-hoc prompts

| Purpose | Agent | Prompt |
|---|---|---|
| Refresh one thesis | the sector's analyst | `Update the thesis for <TICKER>. read_thesis first, get_holdings for our position, get_price_data for price, web search for anything else. Explain any rating change.` |
| Check a single position | the sector's analyst | `We hold <TICKER>. Is the thesis still intact? Cite everything. If nothing changed, say so.` |
| Earnings reaction | the sector's analyst | `<TICKER> reported. Pull the release and any 8-K, compare against our thesis, and tell me whether the thesis strengthened, weakened, or is unchanged.` |
| Tax-aware trim check | PM | `Which positions are up enough to consider trimming? Separate taxable from 401k/Roth — I care about the capital-gains consequence in the taxable account.` |
| Concentration check | Portfolio Risk Analyst | `What is my largest correlated exposure across all accounts? Treat highly correlated pairs as single positions.` |
| Stress test | Portfolio Risk Analyst | `If AI datacenter capex growth halved, what happens to this portfolio? Name the positions that would move together and estimate the drawdown.` |
| New idea vetting | the sector's analyst | `I am considering <TICKER>. Build the bull and bear case, check how it correlates with what we already own, and give me a verdict with confidence.` |
| Weekly catch-up | CIO | `Summarise what changed in the portfolio this week and what needs my attention. Be brief — flag only what is decision-relevant.` |

## Prompting notes

- **Name the tools** you expect to be used. It measurably improves whether they get called.
- **Give permission to find nothing.** "If nothing changed, say so" prevents manufactured revisions.
- **Ask for the rating delta**, not just the rating. An unexplained flip is the defect that corrupts memos.
- **Say where to save it.** Reinforces the path rules.
