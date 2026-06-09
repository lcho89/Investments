import { readFileSync } from "fs";
import { join } from "path";

interface Position {
  symbol: string;
  name: string;
  theme: string;
  qty: number | null;
  avgCost: number | null;
  lastPrice: number | null;
  totalValue: number | null;
}

interface Account {
  label: string;
  positions: Position[];
}

interface Holdings {
  asOf: string;
  accounts: Record<string, Account>;
}

function loadHoldings(repoPath: string): Holdings {
  const path = join(repoPath, "portfolio", "holdings.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function getHoldings(
  repoPath: string,
  theme?: string,
  account?: string
): { asOf: string; positions: (Position & { account: string })[] } {
  const data = loadHoldings(repoPath);
  const results: (Position & { account: string })[] = [];

  for (const [accountKey, accountData] of Object.entries(data.accounts)) {
    if (account && accountKey !== account) continue;
    for (const pos of accountData.positions) {
      if (theme && pos.theme !== theme) continue;
      results.push({ ...pos, account: accountKey });
    }
  }

  return { asOf: data.asOf, positions: results };
}

export function getAccountSummary(repoPath: string): object {
  const data = loadHoldings(repoPath);
  const byTheme: Record<string, { count: number; totalValue: number | null }> = {};
  const byAccount: Record<string, { label: string; count: number; totalValue: number | null }> = {};

  for (const [accountKey, accountData] of Object.entries(data.accounts)) {
    byAccount[accountKey] = { label: accountData.label, count: 0, totalValue: null };
    for (const pos of accountData.positions) {
      byAccount[accountKey].count++;
      if (pos.totalValue !== null) {
        byAccount[accountKey].totalValue = (byAccount[accountKey].totalValue ?? 0) + pos.totalValue;
      }
      if (!byTheme[pos.theme]) byTheme[pos.theme] = { count: 0, totalValue: null };
      byTheme[pos.theme].count++;
      if (pos.totalValue !== null) {
        byTheme[pos.theme].totalValue = (byTheme[pos.theme].totalValue ?? 0) + pos.totalValue;
      }
    }
  }

  return { asOf: data.asOf, byTheme, byAccount };
}
