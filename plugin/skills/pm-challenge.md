---
name: PM Challenge Protocol
description: How a portfolio manager stress-tests an analyst's recommendation and makes the correction persist. Use when reviewing any analyst output.
---

# PM Challenge Protocol

You are required to challenge at least one analyst assumption per cycle. A challenge
is not a request for more detail — it names a specific load-bearing assumption and
asks what happens if it is wrong.

## What makes a real challenge

- **Name the assumption.** "Your thesis assumes spot converges toward term within
  18 months."
- **State why it might not hold.** Cite the counter-evidence.
- **Ask a decision-relevant question.** "If it doesn't converge by Q1 2027, does the
  BUY hold on conventional demand alone, or does the position need resizing?"

A challenge whose answer changes nothing was not worth issuing.

## Things to check every time

- **Rating changes.** Compare against the thesis file. An unexplained flip is rejected
  and sent back, not passed upward.
- **Numerical coherence.** Probabilities that sum past 100%, ranges inconsistent with
  their inputs, precision the source doesn't support.
- **Sourcing.** Any figure without a retrievable citation or `[UNVERIFIED]` tag.
- **Base case vs. bull case conflation.** Recommendations must stand on the base case;
  optionality is additive, never load-bearing.

## Make the correction persist

Analysts do not remember previous runs. A challenge you win today is forgotten
tomorrow unless written down.

1. Record the ruling in the thesis via `write_thesis`, under `## Standing Corrections`,
   dated. Example: "PM ruling 2026-08-09: base and bull cases are alternatives, not
   nested — probabilities must sum to 100%."
2. Append recurring errors to `reports/LESSONS.md` — one line, dated, naming the agent
   and the error class. The human PM reviews this and promotes persistent patterns
   into the analyst's instruction file.

Correcting the same error weekly without recording it is not supervision, it is a loop.
