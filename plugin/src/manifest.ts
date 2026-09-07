import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Skill bodies live in plugin/skills/*.md so they can be edited as prose.
const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");
const skillBody = (f: string) => readFileSync(join(SKILL_DIR, f), "utf-8");

const manifest: PaperclipPluginManifestV1 = {
  apiVersion: 1,
  id: "investment-research",
  displayName: "Investment Research Orchestrator",
  description:
    "Hierarchical investment research system: sector analysts → portfolio managers → CIO. Covers Nuclear, Commodities, Energy, and Technology themes.",
  version: "0.1.0",
  author: "Investment Research Orchestrator",
  categories: ["connector"],
  capabilities: [
    "companies.read",
    "agents.managed",
    "routines.managed",
    "issues.read",
    "issues.create",
    "issues.update",
    "issue.comments.create",
    "agent.tools.register",
    "skills.managed",
    "events.subscribe",
  ],
  entrypoints: {
    worker: "dist/index.js",
  },
  instanceConfigSchema: {
    type: "object",
    properties: {
      newsApiKey: {
        type: "string",
        description: "NewsAPI key (newsapi.org) for market news",
      },
      fmpApiKey: {
        type: "string",
        description: "Financial Modeling Prep API key for price data and fundamentals",
      },
      repoPath: {
        type: "string",
        description: "Absolute path to the Investments repo (for reading/writing theses)",
        default: "/home/user/Investments",
      },
      adhocPath: {
        type: "string",
        description:
          "Absolute path to the user's ad-hoc analysis folder (produced outside this agent system, e.g. a separate Claude Project on Windows). Read-only; indexed alongside reports/theses by list_reports/search_reports.",
        default: "/mnt/c/Lechern/Investments/adhoc",
      },
    },
  },
  tools: [
    {
      name: "get_holdings",
      displayName: "Get Portfolio Holdings",
      description:
        "Retrieve current portfolio positions. Optionally filter by theme (nuclear|commodities|energy|tech|broad) or account.",
      parametersSchema: {
        type: "object",
        properties: {
          theme: { type: "string", enum: ["nuclear", "commodities", "energy", "tech", "broad"] },
          account: { type: "string", enum: ["brokerage", "brokeragelink_roth", "hsa"] },
        },
      },
    },
    {
      name: "get_account_summary",
      displayName: "Get Account Summary",
      description: "Get aggregated portfolio value and position count by theme and account.",
      parametersSchema: { type: "object", properties: {} },
    },
    {
      name: "search_sec_edgar",
      displayName: "Search SEC EDGAR",
      description:
        "Search SEC EDGAR for filings (10-K, 10-Q, 8-K) for a ticker or company name. Returns filing metadata and optionally fetches filing text.",
      parametersSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Ticker symbol or company name" },
          formType: { type: "string", description: "Filing form type", default: "10-K" },
          fetchText: { type: "boolean", description: "Fetch and return text of most recent filing", default: false },
        },
      },
    },
    {
      name: "fetch_market_news",
      displayName: "Fetch Market News",
      description: "Fetch recent news articles for a ticker symbol or topic.",
      parametersSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          days: { type: "number", default: 7 },
          maxArticles: { type: "number", default: 10 },
        },
      },
    },
    {
      name: "get_price_data",
      displayName: "Get Price Data",
      description: "Get price history, key financials, and ratios for a ticker.",
      parametersSchema: {
        type: "object",
        required: ["symbol"],
        properties: {
          symbol: { type: "string" },
          includeFinancials: { type: "boolean", default: true },
        },
      },
    },
    {
      name: "get_financials",
      displayName: "Get 5-Year Financials",
      description:
        "Five years of income statement, balance sheet and cash flow with derived margins, FCF per diluted share, net cash, leverage and coverage ratios, plus CAGRs. Use for any financial profile table — never estimate these figures.",
      parametersSchema: {
        type: "object",
        required: ["symbol"],
        properties: { symbol: { type: "string" }, years: { type: "number", default: 5 } },
      },
    },
    {
      name: "get_peer_comps",
      displayName: "Get Peer Comparables",
      description:
        "Peer group with EV/Revenue, EV/EBITDA, EV/FCF, P/E, PEG, ROIC and growth, plus distribution statistics. Use for any relative-valuation or premium/discount claim.",
      parametersSchema: {
        type: "object",
        required: ["symbol"],
        properties: {
          symbol: { type: "string" },
          extraPeers: { type: "array", items: { type: "string" } },
        },
      },
    },
    {
      name: "get_ownership",
      displayName: "Get Ownership and Insider Activity",
      description:
        "Institutional ownership percentage, top 5 holders, and insider buying/selling over the last 12 months.",
      parametersSchema: {
        type: "object",
        required: ["symbol"],
        properties: { symbol: { type: "string" } },
      },
    },
    {
      name: "get_fund_holdings",
      displayName: "Get Fund Holdings",
      description:
        "ETF or fund holdings, weights, sector mix, expense ratio and concentration. Use for look-through analysis — computing true single-name exposure across funds plus direct positions.",
      parametersSchema: {
        type: "object",
        required: ["symbol"],
        properties: { symbol: { type: "string" }, top: { type: "number", default: 25 } },
      },
    },
    {
      name: "build_dcf_model",
      displayName: "Build DCF Model (xlsx)",
      description:
        "Build a real Excel DCF workbook with live formulas — Assumptions, Historicals, DCF, and a 5x5 Sensitivity grid. Changing an Assumptions cell recomputes the model in Excel. Saved to models/. Use instead of typing a DCF as markdown.",
      parametersSchema: {
        type: "object",
        required: ["symbol", "assumptions"],
        properties: {
          symbol: { type: "string" },
          assumptions: {
            type: "object",
            required: ["revenueGrowthPct", "terminalGrowthPct", "exitMultipleEbitda", "wacc"],
            properties: {
              revenueGrowthPct: { type: "array", items: { type: "number" }, minItems: 5, maxItems: 5 },
              terminalGrowthPct: { type: "number" },
              exitMultipleEbitda: { type: "number" },
              wacc: { type: "number" },
              grossMarginPct: { type: "number" },
              operatingMarginPct: { type: "number" },
              taxRatePct: { type: "number" },
              capexPctRevenue: { type: "number" },
              nwcPctRevenueChange: { type: "number" },
              sharesOutstandingDiluted: { type: "number" },
              netDebt: { type: "number" },
            },
          },
        },
      },
    },
    {
      name: "build_comps_model",
      displayName: "Build Comps Model (xlsx)",
      description:
        "Build a real Excel trading-comparables workbook — live peer multiples, stats block, implied EV formulas. Saved to models/. Use instead of typing a comps table as markdown.",
      parametersSchema: {
        type: "object",
        required: ["symbol"],
        properties: {
          symbol: { type: "string" },
          extraPeers: { type: "array", items: { type: "string" } },
        },
      },
    },
    {
      name: "list_reports",
      displayName: "List Past Reports",
      description:
        "List reports written previously, newest first, with a one-line summary. Includes the user's ad-hoc analysis folder (source: adhoc), not just agent output. Call before writing a new report so you continue from the last one rather than starting over.",
      parametersSchema: {
        type: "object",
        properties: {
          agent: { type: "string" },
          since: { type: "string" },
          limit: { type: "number", default: 40 },
        },
      },
    },
    {
      name: "read_report",
      displayName: "Read a Past Report",
      description:
        "Read a previously written report by path, e.g. reports/nuclear-analyst/2026-08-22.md, or an ad-hoc analysis path returned by list_reports/search_reports, e.g. adhoc/NVDA-notes.md.",
      parametersSchema: {
        type: "object",
        required: ["path"],
        properties: { path: { type: "string" } },
      },
    },
    {
      name: "search_reports",
      displayName: "Search Past Reports and Theses",
      description:
        "Full-text search across every report and thesis we have written, plus the user's ad-hoc analysis folder (paths prefixed adhoc/). Use to find what we previously concluded before asserting something new.",
      parametersSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 25 },
          context: { type: "number", default: 1 },
        },
      },
    },
    {
      name: "read_thesis",
      displayName: "Read Investment Thesis",
      description: "Read the stored investment thesis for a ticker from the theses/ directory.",
      parametersSchema: {
        type: "object",
        required: ["symbol"],
        properties: { symbol: { type: "string" } },
      },
    },
    {
      name: "write_thesis",
      displayName: "Write Investment Thesis",
      description: "Save or update the investment thesis for a ticker to the theses/ directory.",
      parametersSchema: {
        type: "object",
        required: ["symbol", "content"],
        properties: {
          symbol: { type: "string" },
          content: { type: "string" },
        },
      },
    },
  ],
  agents: [
    {
      agentKey: "nuclear-analyst",
      displayName: "Nuclear Analyst",
      title: "Sector Analyst — Nuclear & Uranium",
      role: "engineer",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
    {
      agentKey: "commodities-analyst",
      displayName: "Commodities Analyst",
      title: "Sector Analyst — Silver, Copper & Lithium",
      role: "engineer",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
    {
      agentKey: "energy-analyst",
      displayName: "Energy Analyst",
      title: "Sector Analyst — Oil, Gas & Power",
      role: "engineer",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
    {
      agentKey: "semis-analyst",
      displayName: "Semis & AI Analyst",
      title: "Sector Analyst — Semiconductors & AI Hardware",
      role: "engineer",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
    {
      agentKey: "tech-analyst",
      displayName: "Tech & Software Analyst",
      title: "Sector Analyst — Software & Consumer Technology",
      role: "engineer",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
    {
      agentKey: "pm-energy-commodities",
      displayName: "PM: Energy & Commodities",
      title: "Portfolio Manager — Energy & Commodities",
      role: "pm",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
    {
      agentKey: "pm-technology",
      displayName: "PM: Technology",
      title: "Portfolio Manager — Technology",
      role: "pm",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
    {
      agentKey: "portfolio-risk-analyst",
      displayName: "Portfolio Risk Analyst",
      title: "Cross-Portfolio Risk Analyst",
      role: "engineer",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
    {
      agentKey: "cio",
      displayName: "CIO",
      title: "Chief Investment Officer",
      role: "ceo",
      adapterType: "claude_local",
      instructions: { content: "" },
    },
  ],
  skills: [
    {
      skillKey: "standing-commands",
      displayName: "Standing Commands",
      description:
        "Short commands the human PM uses and what each expands to. Use whenever an issue is terse — 'weekly report', 'refresh URNM', 'coverage sweep' — so the full protocol runs without being spelled out.",
      markdown: skillBody("standing-commands.md"),
    },
    {
      skillKey: "data-sourcing",
      displayName: "Data Sourcing Discipline",
      description:
        "How to source, cite, and tag every quantitative claim. Use whenever stating a price, multiple, yield, or deal term.",
      markdown: skillBody("data-sourcing.md"),
    },
    {
      skillKey: "investment-thesis",
      displayName: "Investment Thesis Method",
      description:
        "How to write, update, and revise a per-ticker thesis, including rating-change discipline. Use before any write_thesis call.",
      markdown: skillBody("investment-thesis.md"),
    },
    {
      skillKey: "equity-research-standard",
      displayName: "Equity Research Standard",
      description:
        "House standard for a full company write-up: business profile, five-year financials from 10-Ks, valuation ratios vs peers, ownership, risks. Use for any initiation or deep-dive.",
      markdown: skillBody("equity-research-standard.md"),
    },
    {
      skillKey: "valuation-methods",
      displayName: "Valuation Methods",
      description:
        "How to derive a price target — DCF, trading comparables, triangulation into a football-field range and expected value. Use whenever stating a target, fair value, or upside percentage.",
      markdown: skillBody("valuation-methods.md"),
    },
    {
      skillKey: "fund-analysis",
      displayName: "ETF and Fund Analysis",
      description:
        "How to analyse an ETF, index fund, or physical trust — NAV premium/discount, cost drag, look-through exposure, and overlap with the rest of the book. Use for any wrapper rather than an operating company.",
      markdown: skillBody("fund-analysis.md"),
    },
    {
      skillKey: "company-categorization",
      displayName: "Company Categorisation and Sell Discipline",
      description:
        "Classify a holding as slow grower, stalwart, cyclical, fast grower, turnaround, or asset play, run the category-specific analysis, and apply the matching sell triggers.",
      markdown: skillBody("company-categorization.md"),
    },
    {
      skillKey: "report-continuity",
      displayName: "Report Continuity",
      description:
        "How to build on prior work rather than starting fresh — read your last report, search what we concluded before, and lead with what changed. Use before writing any report, memo, or thesis update.",
      markdown: skillBody("report-continuity.md"),
    },
    {
      skillKey: "pm-challenge",
      displayName: "PM Challenge Protocol",
      description:
        "How a PM stress-tests an analyst recommendation and makes the correction persist. Use when reviewing analyst output.",
      markdown: skillBody("pm-challenge.md"),
    },
  ],
  routines: [
    {
      routineKey: "morning-brief",
      title: "Morning Market Brief",
      description: "Overnight moves, headlines, and flags for any position >3% move. Mon–Fri 7am ET.",
      assigneeRef: { resourceKind: "agent", resourceKey: "cio" },
      triggers: [
        {
          kind: "schedule",
          label: "Weekday 7am ET",
          enabled: false,
          cronExpression: "0 7 * * 1-5",
          timezone: "America/New_York",
          signingMode: null,
          replayWindowSec: null,
        },
      ],
    },
    {
      routineKey: "weekly-deep-research",
      title: "Weekly Deep Research",
      description: "Full thesis review and SEC filing digest for each sector. Mondays 8am ET.",
      assigneeRef: { resourceKind: "agent", resourceKey: "pm-energy-commodities" },
      triggers: [
        {
          kind: "schedule",
          label: "Monday 8am ET",
          enabled: false,
          cronExpression: "0 8 * * 1",
          timezone: "America/New_York",
          signingMode: null,
          replayWindowSec: null,
        },
      ],
    },
    {
      routineKey: "portfolio-risk-check",
      title: "Weekly Portfolio Risk Check",
      description: "Correlation, concentration, max drawdown, beta, and currency exposure. Fridays 9am ET.",
      assigneeRef: { resourceKind: "agent", resourceKey: "portfolio-risk-analyst" },
      triggers: [
        {
          kind: "schedule",
          label: "Friday 9am ET",
          enabled: false,
          cronExpression: "0 9 * * 5",
          timezone: "America/New_York",
          signingMode: null,
          replayWindowSec: null,
        },
      ],
    },
    {
      routineKey: "coverage-sweep",
      title: "Coverage and Staleness Sweep",
      description:
        "Run scripts/coverage.py, then assign refreshes for the largest uncovered or stale positions. Keeps every holding under live coverage rather than whatever the agents happened to think of. Wednesdays 8am ET.",
      assigneeRef: { resourceKind: "agent", resourceKey: "cio" },
      triggers: [
        {
          kind: "schedule",
          label: "Wednesday 8am ET",
          enabled: false,
          cronExpression: "0 8 * * 3",
          timezone: "America/New_York",
          signingMode: null,
          replayWindowSec: null,
        },
      ],
    },
    {
      routineKey: "calibration-review",
      title: "Quarterly Calibration Review",
      description:
        "Score the Call Record in every thesis: which calls were right, at what stated confidence, and is conviction calibrated to hit rate. Promote recurring errors into instruction files. 1st of Jan/Apr/Jul/Oct.",
      assigneeRef: { resourceKind: "agent", resourceKey: "cio" },
      triggers: [
        {
          kind: "schedule",
          label: "Quarterly, 1st at 9am ET",
          enabled: false,
          cronExpression: "0 9 1 1,4,7,10 *",
          timezone: "America/New_York",
          signingMode: null,
          replayWindowSec: null,
        },
      ],
    },
    {
      routineKey: "monthly-investment-memo",
      title: "Monthly Investment Memo (IC)",
      description:
        "CIO drafts Investment Memo and convenes IC with human PM for approval. 1st of month 8am ET.",
      assigneeRef: { resourceKind: "agent", resourceKey: "cio" },
      triggers: [
        {
          kind: "schedule",
          label: "1st of month 8am ET",
          enabled: false,
          cronExpression: "0 8 1 * *",
          timezone: "America/New_York",
          signingMode: null,
          replayWindowSec: null,
        },
      ],
    },
  ],
};

export default manifest;
