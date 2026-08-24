---
name: Data Sourcing Discipline
description: How to source, cite, and tag every quantitative claim in investment research. Use whenever stating a price, multiple, yield, growth rate, or deal term.
---

# Data Sourcing Discipline

Every number in your output must be traceable to something you retrieved during this
run. Your training data has a cutoff; any figure you did not fetch is stale by an
unknown amount.

## Retrieval order

1. **Prices, multiples, fundamentals** → `get_price_data` (FMP). Cite the field.
2. **Filings, disclosures, risk factors** → `search_sec_edgar`. Cite form type and date.
3. **News, earnings, deal announcements** → `fetch_market_news`. Cite outlet and date.
4. **Anything no tool covers** — commodity spot (uranium, silver, copper, lithium),
   PPA megawatts, private deal terms, guidance ranges → **WebSearch / WebFetch**.
   Cite the URL and publication date.
5. **If all of the above fail** → state the figure with
   `[UNVERIFIED — from training data, not fetched]`, or omit it.

## What counts as a citation

A citation names something you actually retrieved: an FMP field, a filing URL, a news
URL. A vendor's name attached to a remembered number is not a citation — "UxC/Cameco
institutional pricing $86.48/lb" is an assertion wearing a citation's clothes.

## When a tool fails

Say so plainly: "FMP returned no data for HGRAF." A stated gap is more useful than a
confident fabrication, because the reader can act on a gap.

## Numerical coherence

- Probabilities of mutually exclusive cases sum to 100%. If cases are nested, say so.
- Percentages, ranges, and totals must be arithmetically consistent with their inputs.
- Round honestly. False precision ($86.48 when the source says "roughly $86") is a
  form of overclaiming.

## Named entities are claims too

A company name is a factual claim, exactly like a price. Fund holdings, peer sets, top
shareholders, deal counterparties — if you did not read the name in tool output this
run, do not write it.

This has already gone wrong: a fund review listed Orano and Uranium One among an ETF's
top holdings. Neither is publicly traded — Orano is French state-owned, Uranium One was
taken private in 2013 — so neither can be in an equity fund. They were plausible
because they are real uranium companies, which is precisely why the error survived.

Before naming any holding, peer, or counterparty, ask: is this from the tool result in
front of me? If not, drop it.

## State your provenance

Open every data-bearing section with one line saying which tool calls produced it and
whether they succeeded:

> _Source: `get_fund_holdings(URNM)` returned 42 holdings; `get_holdings` returned our
> position. `get_price_data` NAV field was null._

When a tool returns an error or an empty result, the correct output is the gap, not a
substitute:

> _`get_fund_holdings(URNM)` returned no data (endpoint unavailable on this plan).
> Holdings, weights and concentration are therefore not reported._

An honest gap costs nothing. A fabricated table costs the reader their ability to trust
any table you produce.

## Arithmetic closes

Percentages that should sum to a total must sum to it. A top-5 weight list of
12+11+11+8+7 is 49%, not 47%. Check your own totals before writing them — an
inconsistency inside a single paragraph tells the reader the numbers were not computed.
