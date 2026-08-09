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
