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
