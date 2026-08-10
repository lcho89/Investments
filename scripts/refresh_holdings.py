#!/usr/bin/env python3
"""Rebuild portfolio/holdings.json from published Google Sheet CSV tabs.

Each account tab is published to the web as CSV (File > Share > Publish to web >
pick the tab > CSV), and its URL goes in portfolio/sources.json. No auth needed.

Usage:  python3 scripts/refresh_holdings.py
"""
import csv, io, json, re, sys, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "portfolio" / "sources.json"
OUT = ROOT / "portfolio" / "holdings.json"

THEME = {}
for t in "URNJ URNM SRUUF CEG VST CCJ NXE UEC UUUU DNN URG OKLO SMR NNE BWXT ASPI LEU".split(): THEME[t] = "nuclear"
for t in "SILJ PSLV COPX COPP LITP LIT SGDM SGDJ HGRAF SLV SLVR AG PAAS CEF SBSW".split(): THEME[t] = "commodities"
for t in "BNO USO ET LNG FENY BX HLOGF EQT DVN OXY CVX MMP PWR GEV PBD".split(): THEME[t] = "energy"
for t in "PANW TSLA MCHI NVDA AVGO TSM MU CRWD ZS CYBR NOW SNOW DDOG ESTC TEAM MDB MSFT AAPL AMD PLTR NBIS MRVL UBER SE APP DIS".split(): THEME[t] = "tech"
for t in "VTI FSPSX FXAIX FPADX VTV SPYI DBMF XAR INVH APD PHYS JEPI SCHD QQQ VOO VT VWO EWY SMH FHLC FSMAX FTIHX JLGMX VFFVX VFIFX VIVIX IBIT ETHA SPCX".split(): THEME[t] = "broad"


def num(s):
    if s is None:
        return None
    s = re.sub(r"[$,%\s]", "", str(s)).replace("\\", "")
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    try:
        return float(s)
    except ValueError:
        return None


def parse_csv(text):
    """Find the header row, then read positions until the table ends."""
    rows = list(csv.reader(io.StringIO(text)))
    header_i = None
    for i, r in enumerate(rows):
        low = [c.strip().lower() for c in r]
        if any("ticker" in c for c in low) and any("quantity" in c for c in low):
            header_i, header = i, low
            break
    if header_i is None:
        raise ValueError("no header row containing both 'ticker' and 'quantity'")

    def col(*names):
        for n in names:
            for j, c in enumerate(header):
                if c.startswith(n):
                    return j
        return None

    ci = {k: col(*v) for k, v in {
        "name": ("stock", "fund", "401k"), "sym": ("ticker", "stock ticker"),
        "price": ("price",), "qty": ("quantity", "shares"),
        "value": ("value",), "cost": ("cost",), "sold": ("sold",),
    }.items()}
    if ci["sym"] is None or ci["qty"] is None:
        raise ValueError("could not locate ticker/quantity columns")

    out = []
    for r in rows[header_i + 1:]:
        if len(r) <= ci["sym"]:
            continue
        sym = r[ci["sym"]].strip().upper().replace("\\", "")
        if not re.fullmatch(r"[A-Z]{1,6}", sym):
            continue
        if ci["sold"] is not None and len(r) > ci["sold"] and r[ci["sold"]].strip():
            continue  # closed position
        qty = num(r[ci["qty"]])
        if not qty or qty <= 0:
            continue
        get = lambda k: num(r[ci[k]]) if ci[k] is not None and len(r) > ci[k] else None
        out.append({
            "symbol": sym,
            "name": r[ci["name"]].strip().replace("\\", "") if ci["name"] is not None and len(r) > ci["name"] else "",
            "theme": THEME.get(sym, "other"),
            "qty": round(qty, 4),
            "avgCost": get("cost"),
            "lastPrice": get("price"),
            "totalValue": round(get("value"), 2) if get("value") else None,
        })
    return out


def main():
    if not SOURCES.exists():
        sys.exit(
            f"Missing {SOURCES}.\n\n"
            "Create it like this, using Publish-to-web CSV URLs:\n"
            '{\n'
            '  "accounts": [\n'
            '    {"key": "taxable",    "label": "Stock brokerage (taxable)", "category": "taxable",    "csvUrl": "https://docs.google.com/.../pub?gid=0&single=true&output=csv"},\n'
            '    {"key": "401k",       "label": "401k",                      "category": "retirement", "csvUrl": "..."},\n'
            '    {"key": "roth",       "label": "Roth",                      "category": "retirement", "csvUrl": "..."}\n'
            '  ]\n'
            '}\n'
        )

    cfg = json.loads(SOURCES.read_text())
    accounts, problems = {}, []
    for a in cfg["accounts"]:
        try:
            with urllib.request.urlopen(a["csvUrl"], timeout=30) as r:
                text = r.read().decode("utf-8", "replace")
            positions = parse_csv(text)
            if not positions:
                problems.append(f"{a['key']}: parsed 0 positions")
            accounts[a["key"]] = {
                "label": a["label"], "category": a["category"],
                "totalValue": round(sum(p["totalValue"] or 0 for p in positions), 2),
                "positions": positions,
            }
            print(f"  {a['label']:28} {len(positions):3} positions  ${accounts[a['key']]['totalValue']:>11,.2f}")
        except Exception as e:
            problems.append(f"{a['key']}: {e}")
            print(f"  {a['label']:28} FAILED: {e}")

    if problems and not accounts:
        sys.exit("Refresh failed; holdings.json left unchanged.\n" + "\n".join(problems))

    OUT.write_text(json.dumps({
        "asOf": date.today().isoformat(),
        "source": "Google Sheets 'Investments', published CSV tabs",
        "note": "Regenerated by scripts/refresh_holdings.py. Do not hand-edit; edit the sheet and re-run.",
        "accounts": accounts,
    }, indent=2) + "\n")

    total = sum(a["totalValue"] for a in accounts.values())
    print(f"\nWrote {OUT.relative_to(ROOT)} — ${total:,.2f} across {len(accounts)} accounts, as of {date.today()}")
    if problems:
        print("\nWARNING — some tabs failed:\n  " + "\n  ".join(problems))


if __name__ == "__main__":
    main()
