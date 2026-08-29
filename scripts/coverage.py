#!/usr/bin/env python3
"""Coverage and staleness report across the portfolio.

Answers, for every position we hold: is there a thesis, when was it last touched,
does it meet the current standard, and when were its sell triggers last read?

This is the worklist the weekly cycle should be driven from. Without it, agents
re-analyse whatever they happened to think of and holdings quietly go uncovered
for months.

Usage:
  python3 scripts/coverage.py            # human-readable report
  python3 scripts/coverage.py --json     # machine-readable, for agents
"""
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOLDINGS = ROOT / "portfolio" / "holdings.json"
THESES = ROOT / "theses"

# A thesis is considered current if reviewed within this many days.
FRESH_DAYS = 45
STALE_DAYS = 90

# Sections the current standard requires. Missing ones make a thesis partial.
REQUIRED = {
    "Category": r"^##\s+Category",
    "Valuation": r"^##\s+Valuation",
    "Expected Value": r"^##\s+Expected Value",
    "Sell Triggers": r"^##\s+Sell Triggers",
    "Call Record": r"^##\s+Call Record",
}


def parse_date(text: str):
    m = re.search(r"_Last updated:\s*(\d{4}-\d{2}-\d{2})", text) or re.search(
        r"(\d{4}-\d{2}-\d{2})", text[:400]
    )
    if not m:
        return None
    try:
        return datetime.strptime(m.group(1), "%Y-%m-%d").date()
    except ValueError:
        return None


def main() -> int:
    as_json = "--json" in sys.argv
    if not HOLDINGS.exists():
        print(f"No holdings at {HOLDINGS}. Run scripts/refresh_holdings.py first.")
        return 1

    data = json.loads(HOLDINGS.read_text())
    today = date.today()

    positions = {}
    for acct in data.get("accounts", {}).values():
        for p in acct.get("positions", []):
            sym = p["symbol"]
            row = positions.setdefault(
                sym, {"symbol": sym, "theme": p.get("theme"), "value": 0.0, "accounts": []}
            )
            row["value"] += p.get("totalValue") or 0
            row["accounts"].append(acct.get("label"))

    total = sum(r["value"] for r in positions.values()) or 1.0

    rows = []
    for sym, r in positions.items():
        path = THESES / f"{sym}.md"
        entry = {
            **r,
            "value": round(r["value"], 2),
            "pctOfPortfolio": round(r["value"] / total * 100, 2),
            "hasThesis": path.exists(),
            "lastUpdated": None,
            "daysSinceUpdate": None,
            "missingSections": list(REQUIRED),
            "status": "NO THESIS",
        }
        if path.exists():
            text = path.read_text(encoding="utf-8", errors="replace")
            d = parse_date(text)
            entry["missingSections"] = [
                name
                for name, pat in REQUIRED.items()
                if not re.search(pat, text, re.M)
            ]
            if d:
                age = (today - d).days
                entry["lastUpdated"] = d.isoformat()
                entry["daysSinceUpdate"] = age
                if age > STALE_DAYS:
                    entry["status"] = "STALE"
                elif entry["missingSections"]:
                    entry["status"] = "PARTIAL"
                elif age > FRESH_DAYS:
                    entry["status"] = "DUE"
                else:
                    entry["status"] = "CURRENT"
            else:
                entry["status"] = "UNDATED"
        rows.append(entry)

    # Worst first, then by size — the biggest uncovered position is the priority.
    order = {"NO THESIS": 0, "STALE": 1, "UNDATED": 2, "PARTIAL": 3, "DUE": 4, "CURRENT": 5}
    rows.sort(key=lambda r: (order[r["status"]], -r["value"]))

    orphans = sorted(
        p.stem for p in THESES.glob("*.md") if p.stem.upper() not in positions
    )

    if as_json:
        print(json.dumps({
            "asOf": data.get("asOf"),
            "generated": today.isoformat(),
            "totalValue": round(total, 2),
            "freshDays": FRESH_DAYS,
            "staleDays": STALE_DAYS,
            "positions": rows,
            "thesesForPositionsNoLongerHeld": orphans,
        }, indent=2))
        return 0

    counts = {}
    for r in rows:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    uncovered = sum(r["value"] for r in rows if r["status"] in ("NO THESIS", "STALE"))

    print(f"Coverage report — holdings as of {data.get('asOf')}, generated {today}")
    print(f"{len(rows)} positions, ${total:,.0f} total\n")
    print("  " + "  ".join(f"{k}: {v}" for k, v in sorted(counts.items(), key=lambda x: order[x[0]])))
    print(f"  ${uncovered:,.0f} ({uncovered/total*100:.1f}%) has no thesis or a stale one\n")

    print(f"{'STATUS':<10} {'SYM':<7} {'VALUE':>11} {'%':>6}  {'AGE':>5}  MISSING")
    print("-" * 78)
    for r in rows:
        age = f"{r['daysSinceUpdate']}d" if r["daysSinceUpdate"] is not None else "—"
        missing = ", ".join(r["missingSections"]) if r["hasThesis"] else ""
        print(
            f"{r['status']:<10} {r['symbol']:<7} {r['value']:>11,.0f} "
            f"{r['pctOfPortfolio']:>5.1f}% {age:>6}  {missing[:34]}"
        )

    if orphans:
        print(f"\nTheses for positions no longer held: {', '.join(orphans)}")
        print("Consider archiving these, and record the exit in the Call Record first.")

    print(
        f"\nFresh < {FRESH_DAYS}d · DUE {FRESH_DAYS}-{STALE_DAYS}d · STALE > {STALE_DAYS}d\n"
        "Work the list top-down: biggest uncovered position first."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
