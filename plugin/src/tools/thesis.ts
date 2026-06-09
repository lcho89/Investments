import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

function thesisPath(repoPath: string, symbol: string): string {
  return join(repoPath, "theses", `${symbol.toUpperCase()}.md`);
}

export function readThesis(repoPath: string, symbol: string): { symbol: string; content: string | null } {
  const path = thesisPath(repoPath, symbol);
  if (!existsSync(path)) {
    return { symbol: symbol.toUpperCase(), content: null };
  }
  return { symbol: symbol.toUpperCase(), content: readFileSync(path, "utf-8") };
}

export function writeThesis(repoPath: string, symbol: string, content: string): { symbol: string; path: string } {
  const dir = join(repoPath, "theses");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = thesisPath(repoPath, symbol);
  const header = `# ${symbol.toUpperCase()} — Investment Thesis\n_Last updated: ${new Date().toISOString().slice(0, 10)}_\n\n`;
  writeFileSync(path, header + content, "utf-8");
  return { symbol: symbol.toUpperCase(), path };
}
