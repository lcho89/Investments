---
name: Report Continuity
description: How to build on prior work rather than starting fresh — read your last report, search what we concluded before, and lead with what changed. Use before writing any report, memo, or thesis update.
---

# Report Continuity

You have no memory between runs. What you wrote last week is not in your head — it is on
disk, and it only helps if you go and read it.

Without this step every report restates the same background, silently contradicts last
week's conclusion, and gives the reader no way to see what actually moved. A weekly
report that could have been written in any week is not worth its cost.

## Before you write anything

1. **`list_reports`** filtered to your own slug. Find your most recent report.
2. **`read_report`** on it. Note what you concluded, what you flagged, and what you said
   you would follow up on.
3. **`read_thesis`** for each ticker you will touch — including the Standing Corrections
   and Call Record.
4. **`search_reports`** for the ticker or theme before asserting anything about it. If we
   have written about it before, your new view must be reconciled with the old one.
5. Check for **`source: adhoc`** entries in `list_reports`, or `adhoc/...` paths in
   `search_reports` results. These come from the user's own separate ad-hoc analysis
   (done outside this agent system) — read them with `read_report`. Do not treat a
   ticker as uncovered just because no agent has a thesis on file if ad-hoc work exists;
   fold in or explicitly reconcile against the user's own prior conclusions.

## Lead with what changed

Open every recurring report with a delta, not a preamble:

```
## Since my last report (reports/<slug>/<date>.md)

**Changed:** <what moved, with the number then and the number now>
**Unchanged:** <what held — briefly, so the reader knows it was checked, not skipped>
**Open items from last time:** <each one: done / still open / dropped, and why>
```

If nothing material changed, say exactly that and keep the report short. A two-paragraph
"no change, triggers unread, here is why the thesis still holds" is a better product than
three pages restating the same case. Length is not evidence of work.

## Reconcile, never silently contradict

If your current view differs from what we previously wrote, say so explicitly and name
what changed your mind — new data, a corrected error, or a genuine reassessment. Quote
the prior claim.

> Last month I put uranium spot at $86.48/lb and called the range stable. It is now
> $__ (source), so the stagnation point I made then no longer holds.

An unacknowledged reversal is the failure mode that corrupts the memo chain: the CIO
inherits your new number with no idea the old one existed.

## Close the loop you opened

Anything you flagged for follow-up is a debt. Each cycle, report its status. A task that
was assigned and never mentioned again — like the LNG force-majeure review that was
ordered, promised, and quietly never delivered — is how a gate silently opens.
