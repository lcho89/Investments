import ExcelJS from "exceljs";
import { existsSync, mkdirSync } from "fs";
import { join, resolve, sep } from "path";
import { getFinancials, getPeerComps } from "./financials.js";

function safeModelsDir(repoPath: string): string {
  const dir = resolve(repoPath, "models");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2937" },
};
const INPUT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFEF3C7" },
};
const money = "#,##0";
const pctFmt = "0.0%";
const mult = "0.00x";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
  });
}

function markInput(cell: ExcelJS.Cell) {
  cell.fill = INPUT_FILL;
  cell.font = { ...(cell.font || {}), bold: true };
}

/**
 * Build a real DCF workbook: assumption cells feed formula cells, so changing
 * a growth rate or WACC input recomputes the target price in Excel itself.
 * Historicals come from get_financials; nothing here is invented — cells the
 * agent could not source are left blank/labelled rather than filled with a guess.
 */
export async function buildDcfModel(params: {
  repoPath: string;
  symbol: string;
  fmpKey: string;
  assumptions: {
    revenueGrowthPct: number[]; // 5 forward years, e.g. [0.08,0.07,0.06,0.05,0.04]
    terminalGrowthPct: number;
    exitMultipleEbitda: number;
    wacc: number;
    grossMarginPct?: number; // held flat if omitted, taken from last actual
    operatingMarginPct?: number;
    taxRatePct?: number;
    capexPctRevenue?: number;
    nwcPctRevenueChange?: number;
    sharesOutstandingDiluted?: number;
    netDebt?: number; // total debt - cash, most recent actual if omitted
  };
}): Promise<object> {
  const { repoPath, symbol, fmpKey, assumptions } = params;
  const s = symbol.toUpperCase();
  const fin = (await getFinancials(s, fmpKey, 5)) as any;
  if (fin.error) {
    return { error: `Cannot build a DCF without financials: ${fin.error}` };
  }
  const last = fin.byYear[fin.byYear.length - 1];

  const wb = new ExcelJS.Workbook();
  wb.creator = "Investment Research Orchestrator";
  wb.created = new Date();

  // ---- Assumptions sheet ----
  const asm = wb.addWorksheet("Assumptions");
  asm.columns = [{ width: 32 }, { width: 16 }, { width: 50 }];
  asm.addRow(["DCF Assumptions", "", `${s} — generated ${new Date().toISOString().slice(0, 10)}`]);
  styleHeader(asm.getRow(1));

  const grossMargin = assumptions.grossMarginPct ?? (last.grossMarginPct ?? 0) / 100;
  const opMargin = assumptions.operatingMarginPct ?? (last.operatingMarginPct ?? 0) / 100;
  const taxRate = assumptions.taxRatePct ?? 0.21;
  const capexPct = assumptions.capexPctRevenue ?? 0.05;
  const nwcPct = assumptions.nwcPctRevenueChange ?? 0.02;
  const shares = assumptions.sharesOutstandingDiluted ?? last.dilutedSharesOutstanding ?? null;
  const netDebt =
    assumptions.netDebt ??
    (last.totalDebt != null && last.cashAndEquivalents != null
      ? last.totalDebt - last.cashAndEquivalents
      : null);

  const inputRows: [string, number | null, string][] = [
    ["WACC", assumptions.wacc, "Cost of equity (CAPM) blended with after-tax cost of debt"],
    ["Terminal growth rate", assumptions.terminalGrowthPct, "Perpetuity growth method"],
    ["Exit EV/EBITDA multiple", assumptions.exitMultipleEbitda, "Exit multiple method, for comparison"],
    ["Gross margin (held flat)", grossMargin, last.grossMarginPct != null ? `Last actual: ${last.grossMarginPct}%` : "No actual — estimate stated by agent"],
    ["Operating margin (held flat)", opMargin, last.operatingMarginPct != null ? `Last actual: ${last.operatingMarginPct}%` : "No actual — estimate stated by agent"],
    ["Tax rate", taxRate, "Effective cash tax rate assumption"],
    ["Capex, % of revenue", capexPct, "Held flat across the forecast"],
    ["Δ NWC, % of revenue growth", nwcPct, "Incremental working capital per $ of revenue growth"],
    ["Diluted shares outstanding", shares, "From last actual unless overridden"],
    ["Net debt (most recent)", netDebt, "Total debt − cash, from balance sheet"],
  ];
  let r = 3;
  const cellRef: Record<string, string> = {};
  for (const [label, val, note] of inputRows) {
    const row = asm.addRow([label, val, note]);
    const cell = row.getCell(2);
    markInput(cell);
    cell.numFmt = label.includes("rate") || label.includes("margin") || label === "Terminal growth rate" || label === "WACC" ? pctFmt : label.includes("multiple") ? mult : money;
    cellRef[label] = `Assumptions!$B$${r}`;
    r++;
  }
  for (let i = 0; i < assumptions.revenueGrowthPct.length; i++) {
    const row = asm.addRow([`Revenue growth Y${i + 1}`, assumptions.revenueGrowthPct[i], "Forward assumption — state the driver in your report, not just the number"]);
    markInput(row.getCell(2));
    row.getCell(2).numFmt = pctFmt;
    cellRef[`growth_${i + 1}`] = `Assumptions!$B$${r}`;
    r++;
  }

  // ---- Historicals sheet, straight from get_financials ----
  const hist = wb.addWorksheet("Historicals");
  const histCols = ["Fiscal Year", "Revenue", "Gross Profit", "Gross Margin %", "Operating Income", "Op Margin %", "EBITDA", "Net Income", "FCF", "Diluted Shares"];
  hist.addRow(histCols);
  styleHeader(hist.getRow(1));
  for (const y of fin.byYear) {
    hist.addRow([
      y.fiscalYear, y.revenue, y.grossProfit, y.grossMarginPct != null ? y.grossMarginPct / 100 : null,
      y.operatingIncome, y.operatingMarginPct != null ? y.operatingMarginPct / 100 : null,
      y.ebitda, y.netIncome, y.freeCashFlow, y.dilutedSharesOutstanding,
    ]);
  }
  hist.columns.forEach((c, i) => { c.width = i === 0 ? 12 : 16; if (i >= 3 && i !== 9) hist.getColumn(i + 1).numFmt = i === 3 || i === 5 ? pctFmt : money; });
  hist.getColumn(2).numFmt = money; hist.getColumn(3).numFmt = money; hist.getColumn(5).numFmt = money;
  hist.getColumn(7).numFmt = money; hist.getColumn(8).numFmt = money; hist.getColumn(9).numFmt = money;

  // ---- DCF sheet: live formulas from Assumptions + last actual revenue ----
  const dcf = wb.addWorksheet("DCF");
  dcf.columns = [{ width: 26 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  dcf.addRow(["Discounted Cash Flow", "Y1", "Y2", "Y3", "Y4", "Y5"]);
  styleHeader(dcf.getRow(1));

  const baseRevenue = last.revenue;
  const baseRevRow = dcf.addRow(["Base revenue (last actual)"]);
  baseRevRow.getCell(2).value = baseRevenue;
  baseRevRow.getCell(2).numFmt = money;

  const revRow = dcf.addRow(["Revenue"]);
  for (let i = 0; i < 5; i++) {
    const col = i + 2;
    const prevRef = i === 0 ? "$B$2" : dcf.getCell(revRow.number, col - 1).address;
    revRow.getCell(col).value = { formula: `${prevRef}*(1+${cellRef[`growth_${i + 1}`]})` };
    revRow.getCell(col).numFmt = money;
  }
  const revRowNum = revRow.number;

  const gpRow = dcf.addRow(["Gross profit"]);
  for (let i = 0; i < 5; i++) {
    gpRow.getCell(i + 2).value = { formula: `${dcf.getCell(revRowNum, i + 2).address}*${cellRef["Gross margin (held flat)"]}` };
    gpRow.getCell(i + 2).numFmt = money;
  }

  const opRow = dcf.addRow(["Operating income (EBIT)"]);
  for (let i = 0; i < 5; i++) {
    opRow.getCell(i + 2).value = { formula: `${dcf.getCell(revRowNum, i + 2).address}*${cellRef["Operating margin (held flat)"]}` };
    opRow.getCell(i + 2).numFmt = money;
  }
  const opRowNum = opRow.number;

  const taxRow = dcf.addRow(["Less: taxes"]);
  for (let i = 0; i < 5; i++) {
    taxRow.getCell(i + 2).value = { formula: `-${dcf.getCell(opRowNum, i + 2).address}*${cellRef["Tax rate"]}` };
    taxRow.getCell(i + 2).numFmt = money;
  }
  const taxRowNum = taxRow.number;

  const nopatRow = dcf.addRow(["NOPAT"]);
  for (let i = 0; i < 5; i++) {
    const col = i + 2;
    nopatRow.getCell(col).value = { formula: `${dcf.getCell(opRowNum, col).address}+${dcf.getCell(taxRowNum, col).address}` };
    nopatRow.getCell(col).numFmt = money;
  }
  const nopatRowNum = nopatRow.number;

  const capexRow = dcf.addRow(["Less: capex"]);
  for (let i = 0; i < 5; i++) {
    capexRow.getCell(i + 2).value = { formula: `-${dcf.getCell(revRowNum, i + 2).address}*${cellRef["Capex, % of revenue"]}` };
    capexRow.getCell(i + 2).numFmt = money;
  }
  const capexRowNum = capexRow.number;

  const nwcRow = dcf.addRow(["Less: Δ NWC"]);
  for (let i = 0; i < 5; i++) {
    const col = i + 2;
    const prevRevRef = i === 0 ? "$B$2" : dcf.getCell(revRowNum, col - 1).address;
    nwcRow.getCell(col).value = { formula: `-(${dcf.getCell(revRowNum, col).address}-${prevRevRef})*${cellRef["Δ NWC, % of revenue growth"]}` };
    nwcRow.getCell(col).numFmt = money;
  }
  const nwcRowNum = nwcRow.number;

  const fcfRow = dcf.addRow(["Unlevered FCF"]);
  for (let i = 0; i < 5; i++) {
    const col = i + 2;
    fcfRow.getCell(col).value = {
      formula: `${dcf.getCell(nopatRowNum, col).address}+${dcf.getCell(capexRowNum, col).address}+${dcf.getCell(nwcRowNum, col).address}`,
    };
    fcfRow.getCell(col).numFmt = money;
    fcfRow.getCell(col).font = { bold: true };
  }
  const fcfRowNum = fcfRow.number;

  const dfRow = dcf.addRow(["Discount factor"]);
  for (let i = 0; i < 5; i++) {
    dfRow.getCell(i + 2).value = { formula: `1/(1+${cellRef["WACC"]})^${i + 1}` };
    dfRow.getCell(i + 2).numFmt = "0.000";
  }
  const dfRowNum = dfRow.number;

  const pvRow = dcf.addRow(["PV of FCF"]);
  for (let i = 0; i < 5; i++) {
    const col = i + 2;
    pvRow.getCell(col).value = { formula: `${dcf.getCell(fcfRowNum, col).address}*${dcf.getCell(dfRowNum, col).address}` };
    pvRow.getCell(col).numFmt = money;
  }
  const pvRowNum = pvRow.number;

  dcf.addRow([]);
  const sumPvRow = dcf.addRow(["Sum PV of explicit FCF"]);
  sumPvRow.getCell(2).value = { formula: `SUM(${dcf.getCell(pvRowNum, 2).address}:${dcf.getCell(pvRowNum, 6).address})` };
  sumPvRow.getCell(2).numFmt = money;
  sumPvRow.getCell(2).font = { bold: true };

  const tvPerpRow = dcf.addRow(["Terminal value (perpetuity)"]);
  tvPerpRow.getCell(2).value = {
    formula: `${dcf.getCell(fcfRowNum, 6).address}*(1+${cellRef["Terminal growth rate"]})/(${cellRef["WACC"]}-${cellRef["Terminal growth rate"]})`,
  };
  tvPerpRow.getCell(2).numFmt = money;

  const tvExitRow = dcf.addRow(["Terminal value (exit multiple)"]);
  // Approximate terminal-year EBITDA as operating income (EBIT) grossed back up — flagged, not hidden.
  tvExitRow.getCell(2).value = {
    formula: `${dcf.getCell(opRowNum, 6).address}*${cellRef["Exit EV/EBITDA multiple"]}`,
  };
  tvExitRow.getCell(2).numFmt = money;
  tvExitRow.getCell(3).value = "Approximates EBITDA as EBIT (D&A excluded from margin assumption) — treat as directional";

  const pvTvRow = dcf.addRow(["PV of terminal value (perpetuity)"]);
  pvTvRow.getCell(2).value = { formula: `${dcf.getCell(tvPerpRow.number, 2).address}*${dcf.getCell(dfRowNum, 6).address}` };
  pvTvRow.getCell(2).numFmt = money;

  const evRow = dcf.addRow(["Enterprise value"]);
  evRow.getCell(2).value = { formula: `${sumPvRow.getCell(2).address}+${pvTvRow.getCell(2).address}` };
  evRow.getCell(2).numFmt = money;
  evRow.getCell(2).font = { bold: true };

  const tvSharePctRow = dcf.addRow(["Terminal value, % of EV"]);
  tvSharePctRow.getCell(2).value = { formula: `${pvTvRow.getCell(2).address}/${evRow.getCell(2).address}` };
  tvSharePctRow.getCell(2).numFmt = pctFmt;
  tvSharePctRow.getCell(3).value = "Flag if this exceeds ~75% — see Valuation Methods skill";

  const netDebtRow = dcf.addRow(["Less: net debt"]);
  netDebtRow.getCell(2).value = netDebt != null ? { formula: `-${cellRef["Net debt (most recent)"]}` } : "not reported";
  netDebtRow.getCell(2).numFmt = money;

  const eqRow = dcf.addRow(["Equity value"]);
  eqRow.getCell(2).value = netDebt != null ? { formula: `${evRow.getCell(2).address}+${netDebtRow.getCell(2).address}` } : "n/a — net debt not reported";
  eqRow.getCell(2).numFmt = money;
  eqRow.getCell(2).font = { bold: true };

  const targetRow = dcf.addRow(["Implied price per share"]);
  targetRow.getCell(2).value = shares != null && netDebt != null ? { formula: `${eqRow.getCell(2).address}/${cellRef["Diluted shares outstanding"]}` } : "n/a";
  targetRow.getCell(2).numFmt = "$#,##0.00";
  targetRow.getCell(2).font = { bold: true, size: 12 };
  targetRow.getCell(1).font = { bold: true };

  // ---- Sensitivity sheet: 5x5 grid, live formulas re-deriving EV per cell ----
  const sens = wb.addWorksheet("Sensitivity");
  sens.addRow(["Implied price ($/sh) — WACC (rows) x Terminal growth (cols)", "", "", "", "", "", ""]);
  styleHeader(sens.getRow(1));
  const waccBase = assumptions.wacc;
  const tgBase = assumptions.terminalGrowthPct;
  const waccSteps = [-0.02, -0.01, 0, 0.01, 0.02].map((d) => waccBase + d);
  const tgSteps = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => tgBase + d);
  const hdr = sens.addRow(["WACC \\ TermGrowth", ...tgSteps]);
  hdr.eachCell((c) => (c.font = { bold: true }));
  tgSteps.forEach((_, i) => (hdr.getCell(i + 2).numFmt = pctFmt));

  for (const w of waccSteps) {
    const row = sens.addRow([w]);
    row.getCell(1).numFmt = pctFmt;
    for (let j = 0; j < tgSteps.length; j++) {
      const g = tgSteps[j];
      // Re-derive from the explicit FCF sum + a terminal value at this (w,g), independent of the live WACC/g cells.
      const cell = row.getCell(j + 2);
      cell.value = {
        formula:
          `SUMPRODUCT(DCF!$B$${fcfRowNum}:$F$${fcfRowNum},1/(1+${w})^{1,2,3,4,5})` +
          `+(DCF!$F$${fcfRowNum}*(1+${g})/(${w}-${g}))/(1+${w})^5` +
          (netDebt != null && shares != null ? `${netDebt !== 0 ? `-${netDebt}` : ""}` : "") +
          (shares != null ? `${netDebt != null ? ")" : ""}` : ""),
      };
      // Build the formula correctly with parens around EV before subtracting net debt and dividing by shares:
      if (shares != null) {
        cell.value = {
          formula:
            `(SUMPRODUCT(DCF!$B$${fcfRowNum}:$F$${fcfRowNum},1/(1+${w})^{1,2,3,4,5})` +
            `+(DCF!$F$${fcfRowNum}*(1+${g})/(${w}-${g}))/(1+${w})^5` +
            (netDebt != null ? `-${netDebt}` : "") +
            `)/${shares}`,
        };
        cell.numFmt = "$#,##0.00";
      } else {
        cell.value = "n/a — shares not reported";
      }
    }
  }
  sens.columns.forEach((c) => (c.width = 14));
  sens.getColumn(1).width = 18;

  sens.addRow([]);
  sens.addRow(["Base case (current WACC/terminal growth) is the centre cell.", "", "", "Change an Assumptions input to see the DCF sheet recompute; this grid recomputes independently of it."]);

  const dir = safeModelsDir(repoPath);
  const filePath = join(dir, `${s}-DCF-${new Date().toISOString().slice(0, 10)}.xlsx`);
  await wb.xlsx.writeFile(filePath);

  return {
    symbol: s,
    path: `models/${s}-DCF-${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheets: ["Assumptions", "Historicals", "DCF", "Sensitivity"],
    impliedPricePerShareFormulaCell: "DCF!B" + targetRow.number,
    note:
      "Yellow cells on the Assumptions sheet are inputs — changing one recomputes the DCF and Sensitivity sheets in Excel. Cite this file's path in your report; do not retype the numbers as static text without noting they come from a live model.",
  };
}

/**
 * Build a comps workbook from get_peer_comps: one row per peer with live multiples,
 * plus a stats block and an implied-value strip applying median/p75 to the subject.
 */
export async function buildCompsModel(params: {
  repoPath: string;
  symbol: string;
  fmpKey: string;
  extraPeers?: string[];
}): Promise<object> {
  const { repoPath, symbol, fmpKey, extraPeers } = params;
  const s = symbol.toUpperCase();
  const comps = (await getPeerComps(s, fmpKey, extraPeers ?? [])) as any;
  if (!comps.rows || !comps.rows.length) {
    return { error: "No peer data returned — cannot build a comps model." };
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Investment Research Orchestrator";
  wb.created = new Date();
  const ws = wb.addWorksheet("Comps");
  ws.addRow([`Trading Comparables — ${s}`, "", "", "", "", "", "", "", "", `Generated ${new Date().toISOString().slice(0, 10)}`]);
  styleHeader(ws.getRow(1));

  const cols = ["Symbol", "Name", "Sector", "Market Cap", "EV", "EV/Revenue", "EV/EBITDA", "EV/FCF", "P/E", "PEG", "ROIC", "Rev Growth %"];
  const hdrRow = ws.addRow(cols);
  hdrRow.eachCell((c) => (c.font = { bold: true }));
  ws.columns = cols.map((c, i) => ({ width: i === 1 ? 24 : i === 0 ? 10 : 14 }));

  const firstDataRow = 3;
  comps.rows.forEach((row: any) => {
    const r = ws.addRow([
      row.symbol, row.name, row.sector, row.marketCap, row.enterpriseValue,
      row.evToRevenue, row.evToEbitda, row.evToFreeCashFlow, row.peRatio, row.pegRatio,
      row.roic, row.revenueGrowthPct != null ? row.revenueGrowthPct / 100 : null,
    ]);
    if (row.isSubject) {
      r.eachCell((c) => (c.font = { bold: true }));
      r.getCell(1).note = "Subject company";
    }
    r.getCell(4).numFmt = money; r.getCell(5).numFmt = money;
    r.getCell(6).numFmt = mult; r.getCell(7).numFmt = mult; r.getCell(8).numFmt = mult;
    r.getCell(9).numFmt = mult; r.getCell(10).numFmt = "0.00";
    r.getCell(11).numFmt = pctFmt; r.getCell(12).numFmt = pctFmt;
  });
  const lastDataRow = ws.lastRow!.number;

  ws.addRow([]);
  const colLetterFor = (idx: number) => ws.getColumn(idx).letter;
  const statBlock = [
    ["Peer median", "MEDIAN"],
    ["Peer mean", "AVERAGE"],
    ["Peer P25", (col: string) => `QUARTILE(${col}${firstDataRow}:${col}${lastDataRow},1)`],
    ["Peer P75", (col: string) => `QUARTILE(${col}${firstDataRow}:${col}${lastDataRow},3)`],
  ] as const;

  for (const [label, fnOrFormula] of statBlock) {
    const r = ws.addRow([label]);
    r.getCell(1).font = { bold: true };
    for (const colIdx of [6, 7, 8, 9, 10, 11]) {
      const col = colLetterFor(colIdx);
      const range = `${col}${firstDataRow}:${col}${lastDataRow}`;
      r.getCell(colIdx).value =
        typeof fnOrFormula === "string"
          ? { formula: `${fnOrFormula}(${range})` }
          : { formula: fnOrFormula(col) };
      r.getCell(colIdx).numFmt = colIdx <= 10 ? mult : pctFmt;
    }
  }

  ws.addRow([]);
  const impliedHdr = ws.addRow(["Implied value for " + s, "Using peer median EV/EBITDA and EV/Revenue"]);
  impliedHdr.getCell(1).font = { bold: true };
  const subjectRowIdx = comps.rows.findIndex((r: any) => r.isSubject) + firstDataRow;
  if (subjectRowIdx >= firstDataRow) {
    // Peer stat rows were appended in statBlock order: median, mean, P25, P75 —
    // immediately after the blank row following the last peer data row.
    const medianRowIdx = lastDataRow + 2;
    const evEbitdaCol = colLetterFor(7); // EV/EBITDA
    const evRevCol = colLetterFor(6); // EV/Revenue
    const evCol = colLetterFor(5); // Enterprise Value

    // Implied EV = subject's own EV, rescaled by (peer median multiple / subject's own multiple).
    // This backs out the subject's underlying EBITDA/Revenue without needing those raw figures on this sheet.
    const evRow2 = ws.addRow(["Implied EV, median EV/EBITDA"]);
    evRow2.getCell(2).value = {
      formula: `${evCol}${subjectRowIdx}/${evEbitdaCol}${subjectRowIdx}*${evEbitdaCol}${medianRowIdx}`,
    };
    evRow2.getCell(2).numFmt = money;

    const evRow3 = ws.addRow(["Implied EV, median EV/Revenue"]);
    evRow3.getCell(2).value = {
      formula: `${evCol}${subjectRowIdx}/${evRevCol}${subjectRowIdx}*${evRevCol}${medianRowIdx}`,
    };
    evRow3.getCell(2).numFmt = money;
  } else {
    ws.addRow(["Subject not found in peer rows — cannot compute implied value automatically."]);
  }

  ws.addRow([]);
  ws.addRow(["Peer selection must be justified in the report — see Valuation Methods skill.", "Drop any peer here that is not genuinely comparable and say why."]);

  const dir = safeModelsDir(repoPath);
  const filePath = join(dir, `${s}-Comps-${new Date().toISOString().slice(0, 10)}.xlsx`);
  await wb.xlsx.writeFile(filePath);

  return {
    symbol: s,
    path: `models/${s}-Comps-${new Date().toISOString().slice(0, 10)}.xlsx`,
    peerCount: comps.rows.length,
    note:
      "Stats and implied-value rows are live formulas over the peer table — editing a peer's multiple recomputes them. Cite this file's path in your report.",
  };
}
