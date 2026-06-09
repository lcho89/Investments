import { definePlugin, runWorker, z } from "@paperclipai/plugin-sdk";
import { getHoldings, getAccountSummary } from "./tools/portfolio.js";
import { searchSecEdgar, fetchMarketNews, getPriceData } from "./tools/research.js";
import { readThesis, writeThesis } from "./tools/thesis.js";

const configSchema = z.object({
  newsApiKey: z.string().optional().describe("NewsAPI key for market news"),
  fmpApiKey: z.string().optional().describe("Financial Modeling Prep API key"),
  repoPath: z.string().default("/home/user/Investments").describe("Path to Investments repo"),
});

const plugin = definePlugin({
  async setup(ctx) {
    const cfg = configSchema.parse(await ctx.config.get());
    const repoPath = cfg.repoPath ?? "/home/user/Investments";

    ctx.tools.register(
      "get_holdings",
      {
        displayName: "Get Portfolio Holdings",
        description: "Retrieve current portfolio positions. Optionally filter by theme or account.",
        parametersSchema: {
          type: "object",
          properties: {
            theme: { type: "string", enum: ["nuclear", "commodities", "energy", "tech", "broad"] },
            account: { type: "string", enum: ["brokerage", "brokeragelink_roth", "hsa"] },
          },
        },
      },
      async (params) => {
        const { theme, account } = params as { theme?: string; account?: string };
        return { data: getHoldings(repoPath, theme, account) };
      }
    );

    ctx.tools.register(
      "get_account_summary",
      {
        displayName: "Get Account Summary",
        description: "Get aggregated portfolio value and position count by theme and account.",
        parametersSchema: { type: "object", properties: {} },
      },
      async () => ({ data: getAccountSummary(repoPath) })
    );

    ctx.tools.register(
      "search_sec_edgar",
      {
        displayName: "Search SEC EDGAR",
        description: "Search SEC EDGAR for filings (10-K, 10-Q, 8-K) for a ticker or company name.",
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
        const { query, formType, fetchText } = params as { query: string; formType?: string; fetchText?: boolean };
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
      async (params) => {
        const { query, days, maxArticles } = params as { query: string; days?: number; maxArticles?: number };
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
      async (params) => {
        const { symbol, includeFinancials } = params as { symbol: string; includeFinancials?: boolean };
        if (!cfg.fmpApiKey) return { error: "FMP API key not configured" };
        return { data: await getPriceData(symbol, cfg.fmpApiKey, includeFinancials ?? true) };
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
      async (params) => {
        const { symbol } = params as { symbol: string };
        const result = readThesis(repoPath, symbol);
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
      async (params) => {
        const { symbol, content } = params as { symbol: string; content: string };
        return { data: writeThesis(repoPath, symbol, content) };
      }
    );

    // Auto-provision agents and routines when a company is created or on startup
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
    const ROUTINE_KEYS = [
      "morning-brief",
      "weekly-deep-research",
      "portfolio-risk-check",
      "monthly-investment-memo",
    ];

    async function provisionCompany(companyId: string) {
      ctx.logger.info("Provisioning agents and routines", { companyId });
      for (const key of AGENT_KEYS) {
        try {
          await ctx.agents.managed.reconcile(key, companyId);
          ctx.logger.info(`Reconciled agent ${key}`, { companyId });
        } catch (err: unknown) {
          ctx.logger.error(`Failed to reconcile agent ${key}`, { companyId, err });
        }
      }
      for (const key of ROUTINE_KEYS) {
        try {
          await ctx.routines.managed.reconcile(key, companyId);
          ctx.logger.info(`Reconciled routine ${key}`, { companyId });
        } catch (err: unknown) {
          ctx.logger.error(`Failed to reconcile routine ${key}`, { companyId, err });
        }
      }
    }

    ctx.events.on("company.created", async (event) => {
      await provisionCompany(event.companyId);
    });

    // Provision for all existing companies on startup
    try {
      const companies = await ctx.companies.list();
      for (const company of companies) {
        await provisionCompany(company.id);
      }
    } catch (err: unknown) {
      ctx.logger.warn("Could not list companies on startup", { err });
    }

    ctx.logger.info("Investment Research plugin ready", { repoPath });
  },

  async onHealth() {
    return { status: "ok" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
