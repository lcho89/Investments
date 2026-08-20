import { definePlugin, runWorker, z } from "@paperclipai/plugin-sdk";
import { getHoldings, getAccountSummary } from "./tools/portfolio.js";
import { searchSecEdgar, fetchMarketNews, getPriceData } from "./tools/research.js";
import { readThesis, writeThesis } from "./tools/thesis.js";
import { getFinancials, getPeerComps, getOwnership } from "./tools/financials.js";

const configSchema = z.object({
  newsApiKey: z.string().optional(),
  fmpApiKey: z.string().optional(),
  repoPath: z.string().default(process.env.HOME ? `${process.env.HOME}/Investments` : "/home/user/Investments"),
});

type Config = z.infer<typeof configSchema>;

const AGENT_KEYS = [
  "nuclear-analyst",
  "commodities-analyst",
  "energy-analyst",
  "semis-analyst",
  "tech-analyst",
  "pm-energy-commodities",
  "pm-technology",
  "portfolio-risk-analyst",
  "cio",
];

const SKILL_KEYS = [
  "data-sourcing",
  "investment-thesis",
  "equity-research-standard",
  "valuation-methods",
  "company-categorization",
  "pm-challenge",
];

const ROUTINE_KEYS = [
  "morning-brief",
  "weekly-deep-research",
  "portfolio-risk-check",
  "monthly-investment-memo",
];

const plugin = definePlugin({
  async setup(ctx) {
    // Config is company-scoped, so it must be read per-invocation, never at setup.
    async function config(companyId: string): Promise<Config> {
      try {
        return configSchema.parse(await ctx.config.get(companyId));
      } catch {
        return configSchema.parse({});
      }
    }

    ctx.tools.register(
      "get_holdings",
      {
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
      async (params, runCtx) => {
        const { theme, account } = params as { theme?: string; account?: string };
        const cfg = await config(runCtx.companyId);
        return { data: getHoldings(cfg.repoPath, theme, account) };
      }
    );

    ctx.tools.register(
      "get_account_summary",
      {
        displayName: "Get Account Summary",
        description: "Get aggregated portfolio value and position count by theme and account.",
        parametersSchema: { type: "object", properties: {} },
      },
      async (_params, runCtx) => {
        const cfg = await config(runCtx.companyId);
        return { data: getAccountSummary(cfg.repoPath) };
      }
    );

    ctx.tools.register(
      "search_sec_edgar",
      {
        displayName: "Search SEC EDGAR",
        description:
          "Search SEC EDGAR for filings (10-K, 10-Q, 8-K) for a ticker or company name. Free, no API key required.",
        parametersSchema: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string" },
            formType: { type: "string", default: "10-K" },
            fetchText: { type: "boolean", default: false },
          },
        },
      },
      async (params) => {
        const { query, formType, fetchText } = params as {
          query: string;
          formType?: string;
          fetchText?: boolean;
        };
        return { data: await searchSecEdgar(query, formType ?? "10-K", fetchText ?? false) };
      }
    );

    ctx.tools.register(
      "fetch_market_news",
      {
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
      async (params, runCtx) => {
        const { query, days, maxArticles } = params as {
          query: string;
          days?: number;
          maxArticles?: number;
        };
        const cfg = await config(runCtx.companyId);
        if (!cfg.newsApiKey) return { error: "NewsAPI key not configured" };
        return { data: await fetchMarketNews(query, cfg.newsApiKey, days ?? 7, maxArticles ?? 10) };
      }
    );

    ctx.tools.register(
      "get_price_data",
      {
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
      async (params, runCtx) => {
        const { symbol, includeFinancials } = params as {
          symbol: string;
          includeFinancials?: boolean;
        };
        const cfg = await config(runCtx.companyId);
        if (!cfg.fmpApiKey) return { error: "FMP API key not configured" };
        return { data: await getPriceData(symbol, cfg.fmpApiKey, includeFinancials ?? true) };
      }
    );

    ctx.tools.register(
      "get_financials",
      {
        displayName: "Get 5-Year Financials",
        description:
          "Five years of income statement, balance sheet and cash flow with derived margins, FCF per diluted share, net cash, leverage and coverage ratios, plus CAGRs. Use this for any financial profile table — never estimate these figures.",
        parametersSchema: {
          type: "object",
          required: ["symbol"],
          properties: {
            symbol: { type: "string" },
            years: { type: "number", default: 5 },
          },
        },
      },
      async (params, runCtx) => {
        const { symbol, years } = params as { symbol: string; years?: number };
        const cfg = await config(runCtx.companyId);
        if (!cfg.fmpApiKey) return { error: "FMP API key not configured" };
        return { data: await getFinancials(symbol, cfg.fmpApiKey, years ?? 5) };
      }
    );

    ctx.tools.register(
      "get_peer_comps",
      {
        displayName: "Get Peer Comparables",
        description:
          "Peer group with EV/Revenue, EV/EBITDA, EV/FCF, P/E, PEG, ROIC and growth, plus min/p25/median/mean/p75/max across peers. Use for any relative-valuation or premium/discount claim.",
        parametersSchema: {
          type: "object",
          required: ["symbol"],
          properties: {
            symbol: { type: "string" },
            extraPeers: {
              type: "array",
              items: { type: "string" },
              description: "Additional tickers to force into the peer set",
            },
          },
        },
      },
      async (params, runCtx) => {
        const { symbol, extraPeers } = params as { symbol: string; extraPeers?: string[] };
        const cfg = await config(runCtx.companyId);
        if (!cfg.fmpApiKey) return { error: "FMP API key not configured" };
        return { data: await getPeerComps(symbol, cfg.fmpApiKey, extraPeers ?? []) };
      }
    );

    ctx.tools.register(
      "get_ownership",
      {
        displayName: "Get Ownership and Insider Activity",
        description:
          "Institutional ownership percentage, top 5 holders, and insider buying/selling over the last 12 months.",
        parametersSchema: {
          type: "object",
          required: ["symbol"],
          properties: { symbol: { type: "string" } },
        },
      },
      async (params, runCtx) => {
        const { symbol } = params as { symbol: string };
        const cfg = await config(runCtx.companyId);
        if (!cfg.fmpApiKey) return { error: "FMP API key not configured" };
        return { data: await getOwnership(symbol, cfg.fmpApiKey) };
      }
    );

    ctx.tools.register(
      "read_thesis",
      {
        displayName: "Read Investment Thesis",
        description: "Read the stored investment thesis for a ticker from the theses/ directory.",
        parametersSchema: {
          type: "object",
          required: ["symbol"],
          properties: { symbol: { type: "string" } },
        },
      },
      async (params, runCtx) => {
        const { symbol } = params as { symbol: string };
        const cfg = await config(runCtx.companyId);
        const result = readThesis(cfg.repoPath, symbol);
        return { data: result, content: result.content ?? undefined };
      }
    );

    ctx.tools.register(
      "write_thesis",
      {
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
      async (params, runCtx) => {
        const { symbol, content } = params as { symbol: string; content: string };
        const cfg = await config(runCtx.companyId);
        return { data: writeThesis(cfg.repoPath, symbol, content) };
      }
    );

    async function provisionCompany(companyId: string) {
      for (const key of AGENT_KEYS) {
        try {
          await ctx.agents.managed.reconcile(key, companyId);
        } catch (err: unknown) {
          ctx.logger.error(`Failed to reconcile agent ${key}`, { companyId, err });
        }
      }
      for (const key of SKILL_KEYS) {
        try {
          await ctx.skills.managed.reconcile(key, companyId);
        } catch (err: unknown) {
          ctx.logger.error(`Failed to reconcile skill ${key}`, { companyId, err });
        }
      }
      for (const key of ROUTINE_KEYS) {
        try {
          await ctx.routines.managed.reconcile(key, companyId);
        } catch (err: unknown) {
          ctx.logger.error(`Failed to reconcile routine ${key}`, { companyId, err });
        }
      }
      ctx.logger.info("Provisioned agents and routines", { companyId });
    }

    ctx.events.on("company.created", async (event) => {
      await provisionCompany(event.companyId);
    });

    try {
      for (const company of await ctx.companies.list()) {
        await provisionCompany(company.id);
      }
    } catch (err: unknown) {
      ctx.logger.warn("Could not provision existing companies at startup", { err });
    }

    ctx.logger.info("Investment Research plugin ready");
  },

  async onHealth() {
    return { status: "ok" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
