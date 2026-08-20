const BASE = "https://financialmodelingprep.com/api";

async function fmp(path: string, key: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}apikey=${key}`, {
    headers: { "User-Agent": "investment-research-plugin/0.2" },
  });
  if (!res.ok) return { _error: `HTTP ${res.status} for ${path.split("?")[0]}` };
  const json = await res.json();
  if (json && (json as any)["Error Message"]) return { _error: (json as any)["Error Message"] };
  return json;
}

const pick = (o: any, keys: string[]) =>
  o ? Object.fromEntries(keys.map((k) => [k, o[k] ?? null])) : null;

const pct = (num: number | null, den: number | null) =>
  num !== null && den !== null && den !== 0 ? Number(((num / den) * 100).toFixed(2)) : null;

function cagr(first: number | null, last: number | null, years: number) {
  if (first === null || last === null || first <= 0 || last <= 0 || years <= 0) return null;
  return Number((((last / first) ** (1 / years) - 1) * 100).toFixed(2));
}

/**
 * Five-year statements with the derived lines the research checklist requires:
 * segment-free revenue trend, margin stack, FCF, net cash, leverage and coverage.
 * Ordered oldest-first so year-over-year reads naturally.
 */
export async function getFinancials(symbol: string, key: string, years = 5): Promise<object> {
  const s = symbol.toUpperCase();
  const [inc, bal, cf, metrics, ratios, ev] = await Promise.all([
    fmp(`/v3/income-statement/${s}?limit=${years}`, key),
    fmp(`/v3/balance-sheet-statement/${s}?limit=${years}`, key),
    fmp(`/v3/cash-flow-statement/${s}?limit=${years}`, key),
    fmp(`/v3/key-metrics/${s}?limit=${years}`, key),
    fmp(`/v3/ratios/${s}?limit=${years}`, key),
    fmp(`/v3/enterprise-values/${s}?limit=${years}`, key),
  ]);

  const errors = [inc, bal, cf, metrics, ratios, ev]
    .filter((r) => r && (r as any)._error)
    .map((r) => (r as any)._error);
  const arr = (x: any) => (Array.isArray(x) ? [...x].reverse() : []); // oldest first
  const I = arr(inc), B = arr(bal), C = arr(cf), M = arr(metrics), R = arr(ratios), E = arr(ev);

  if (!I.length) {
    return {
      symbol: s,
      error: "No income statement data returned. Do not estimate these figures — report the gap.",
      details: errors,
    };
  }

  const byYear = I.map((i: any, idx: number) => {
    const b = B[idx] ?? {}, c = C[idx] ?? {}, m = M[idx] ?? {}, r = R[idx] ?? {}, e = E[idx] ?? {};
    const revenue = i.revenue ?? null;
    const cash = b.cashAndCashEquivalents ?? null;
    const totalDebt = b.totalDebt ?? null;
    return {
      fiscalYear: i.calendarYear ?? null,
      period: i.period ?? null,
      reportedCurrency: i.reportedCurrency ?? null,
      filingUrl: i.finalLink ?? i.link ?? null,

      revenue,
      grossProfit: i.grossProfit ?? null,
      grossMarginPct: pct(i.grossProfit ?? null, revenue),
      sellingGeneralAndAdmin: i.sellingGeneralAndAdministrativeExpenses ?? null,
      sgaPctOfRevenue: pct(i.sellingGeneralAndAdministrativeExpenses ?? null, revenue),
      researchAndDevelopment: i.researchAndDevelopmentExpenses ?? null,
      rdPctOfRevenue: pct(i.researchAndDevelopmentExpenses ?? null, revenue),
      operatingIncome: i.operatingIncome ?? null,
      operatingMarginPct: pct(i.operatingIncome ?? null, revenue),
      ebitda: i.ebitda ?? null,
      ebitdaMarginPct: pct(i.ebitda ?? null, revenue),
      netIncome: i.netIncome ?? null,
      netMarginPct: pct(i.netIncome ?? null, revenue),
      epsDiluted: i.epsdiluted ?? i.epsDiluted ?? null,
      dilutedSharesOutstanding: i.weightedAverageShsOutDil ?? null,

      operatingCashFlow: c.operatingCashFlow ?? null,
      capex: c.capitalExpenditure ?? null,
      freeCashFlow: c.freeCashFlow ?? null,
      fcfPerDilutedShare:
        c.freeCashFlow != null && i.weightedAverageShsOutDil
          ? Number((c.freeCashFlow / i.weightedAverageShsOutDil).toFixed(4))
          : null,
      dividendsPaid: c.dividendsPaid ?? null,
      shareRepurchase: c.commonStockRepurchased ?? null,

      cashAndEquivalents: cash,
      totalDebt,
      netCash: cash !== null && totalDebt !== null ? cash - totalDebt : null,
      totalEquity: b.totalStockholdersEquity ?? null,
      debtToEquity: r.debtEquityRatio ?? null,
      netDebtToEbitda:
        totalDebt !== null && cash !== null && i.ebitda
          ? Number(((totalDebt - cash) / i.ebitda).toFixed(2))
          : null,
      ebitdaToInterest:
        i.ebitda && i.interestExpense ? Number((i.ebitda / i.interestExpense).toFixed(2)) : null,
      ebitdaLessCapexToInterest:
        i.ebitda && i.interestExpense && c.capitalExpenditure != null
          ? Number(((i.ebitda + c.capitalExpenditure) / i.interestExpense).toFixed(2))
          : null,

      roic: m.roic ?? null,
      roe: m.roe ?? null,
      enterpriseValue: e.enterpriseValue ?? null,
      inventory: b.inventory ?? null,
      inventoryTurnover: r.inventoryTurnover ?? null,
    };
  });

  const n = byYear.length - 1;
  const f = byYear[0], l = byYear[n];
  return {
    symbol: s,
    yearsReturned: byYear.length,
    note: "Ordered oldest to newest. Nulls mean the field was not reported — say so rather than estimating.",
    dataErrors: errors.length ? errors : undefined,
    trends: {
      revenueCagrPct: cagr(f.revenue, l.revenue, n),
      ebitdaCagrPct: cagr(f.ebitda, l.ebitda, n),
      epsCagrPct: cagr(f.epsDiluted, l.epsDiluted, n),
      fcfCagrPct: cagr(f.freeCashFlow, l.freeCashFlow, n),
      grossMarginChangePts:
        f.grossMarginPct !== null && l.grossMarginPct !== null
          ? Number((l.grossMarginPct - f.grossMarginPct).toFixed(2))
          : null,
      operatingMarginChangePts:
        f.operatingMarginPct !== null && l.operatingMarginPct !== null
          ? Number((l.operatingMarginPct - f.operatingMarginPct).toFixed(2))
          : null,
      dilutedShareChangePct:
        f.dilutedSharesOutstanding && l.dilutedSharesOutstanding
          ? Number(
              (((l.dilutedSharesOutstanding - f.dilutedSharesOutstanding) /
                f.dilutedSharesOutstanding) *
                100).toFixed(2)
            )
          : null,
    },
    byYear,
  };
}

/** Peer set with the multiples needed for a comps table. */
export async function getPeerComps(
  symbol: string,
  key: string,
  extraPeers: string[] = []
): Promise<object> {
  const s = symbol.toUpperCase();
  const peerRes = await fmp(`/v4/stock_peers?symbol=${s}`, key);
  const auto: string[] = Array.isArray(peerRes) ? peerRes[0]?.peersList ?? [] : [];
  const universe = Array.from(
    new Set([s, ...extraPeers.map((p) => p.toUpperCase()), ...auto])
  ).slice(0, 13);

  const rows = await Promise.all(
    universe.map(async (t) => {
      const [prof, ttm, growth] = await Promise.all([
        fmp(`/v3/profile/${t}`, key),
        fmp(`/v3/key-metrics-ttm/${t}`, key),
        fmp(`/v3/financial-growth/${t}?limit=1`, key),
      ]);
      const p = Array.isArray(prof) ? prof[0] : null;
      const k = Array.isArray(ttm) ? ttm[0] : null;
      const g = Array.isArray(growth) ? growth[0] : null;
      const revGrowth = g?.revenueGrowth != null ? Number((g.revenueGrowth * 100).toFixed(2)) : null;
      const pe = k?.peRatioTTM ?? null;
      return {
        symbol: t,
        isSubject: t === s,
        name: p?.companyName ?? null,
        sector: p?.sector ?? null,
        industry: p?.industry ?? null,
        marketCap: p?.mktCap ?? null,
        enterpriseValue: k?.enterpriseValueTTM ?? null,
        evToRevenue: k?.evToSalesTTM ?? null,
        evToEbitda: k?.enterpriseValueOverEBITDATTM ?? null,
        evToFreeCashFlow: k?.evToFreeCashFlowTTM ?? null,
        peRatio: pe,
        priceToBook: k?.pbRatioTTM ?? null,
        roic: k?.roicTTM ?? null,
        revenueGrowthPct: revGrowth,
        pegRatio: pe && revGrowth && revGrowth > 0 ? Number((pe / revGrowth).toFixed(2)) : null,
        dividendYieldPct:
          k?.dividendYieldTTM != null ? Number((k.dividendYieldTTM * 100).toFixed(2)) : null,
      };
    })
  );

  const stat = (field: string) => {
    const v = rows
      .filter((r) => !r.isSubject)
      .map((r: any) => r[field])
      .filter((x): x is number => typeof x === "number" && isFinite(x))
      .sort((a, b) => a - b);
    if (!v.length) return null;
    const q = (p: number) => Number(v[Math.floor((v.length - 1) * p)].toFixed(2));
    return {
      count: v.length,
      min: Number(v[0].toFixed(2)),
      p25: q(0.25),
      median: q(0.5),
      mean: Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)),
      p75: q(0.75),
      max: Number(v[v.length - 1].toFixed(2)),
    };
  };

  return {
    subject: s,
    peerSource: auto.length ? "FMP stock_peers plus any peers you supplied" : "supplied peers only",
    note:
      "Peer stats exclude the subject. Justify each peer's inclusion in your write-up; drop any that are not genuinely comparable on business model, size, and growth.",
    peerStats: {
      evToRevenue: stat("evToRevenue"),
      evToEbitda: stat("evToEbitda"),
      evToFreeCashFlow: stat("evToFreeCashFlow"),
      peRatio: stat("peRatio"),
      pegRatio: stat("pegRatio"),
      roic: stat("roic"),
      revenueGrowthPct: stat("revenueGrowthPct"),
    },
    rows,
  };
}

/** Institutional ownership concentration and recent insider activity. */
export async function getOwnership(symbol: string, key: string): Promise<object> {
  const s = symbol.toUpperCase();
  const [holders, insiders, float] = await Promise.all([
    fmp(`/v3/institutional-holder/${s}`, key),
    fmp(`/v4/insider-trading?symbol=${s}&page=0`, key),
    fmp(`/v4/shares_float?symbol=${s}`, key),
  ]);

  const H = Array.isArray(holders) ? holders : [];
  const top5 = [...H]
    .sort((a, b) => (b.shares ?? 0) - (a.shares ?? 0))
    .slice(0, 5)
    .map((h) => ({ holder: h.holder, shares: h.shares, dateReported: h.dateReported, change: h.change }));

  const cutoff = Date.now() - 365 * 86400000;
  const I = (Array.isArray(insiders) ? insiders : []).filter(
    (t: any) => t.transactionDate && Date.parse(t.transactionDate) >= cutoff
  );
  const bucket = (kinds: string[]) =>
    I.filter((t: any) => kinds.some((k) => (t.transactionType ?? "").startsWith(k)));
  const buys = bucket(["P-", "A-"]);
  const sells = bucket(["S-", "D-"]);
  const sum = (rows: any[]) =>
    rows.reduce((a, t) => a + (t.securitiesTransacted ?? 0) * (t.price ?? 0), 0);

  const f = Array.isArray(float) ? float[0] : null;
  return {
    symbol: s,
    institutionalOwnershipPct: f?.percentageOfInstitutionalHolders ?? null,
    freeFloat: f?.floatShares ?? null,
    outstandingShares: f?.outstandingShares ?? null,
    topHolders: top5,
    insiderLast12Months: {
      buyTransactions: buys.length,
      sellTransactions: sells.length,
      approxBuyValueUsd: Math.round(sum(buys)),
      approxSellValueUsd: Math.round(sum(sells)),
      netSignal:
        buys.length === 0 && sells.length === 0
          ? "no reported insider activity"
          : sum(buys) > sum(sells)
            ? "net buying"
            : "net selling",
      recent: I.slice(0, 12).map((t: any) => ({
        date: t.transactionDate,
        name: t.reportingName,
        role: t.typeOfOwner,
        type: t.transactionType,
        shares: t.securitiesTransacted,
        price: t.price,
      })),
    },
    note:
      "Insider buckets are inferred from SEC transaction codes (P/A = acquisition, S/D = disposition). Grants and option exercises inflate 'buying' — read the recent rows before drawing a conclusion.",
  };
}
