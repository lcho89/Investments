import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative, resolve, sep } from "path";

/** Keep every path inside the repo — these are agent-supplied strings. */
function safeResolve(repoPath: string, rel: string): string | null {
  const root = resolve(repoPath);
  const full = resolve(root, rel);
  return full === root || full.startsWith(root + sep) ? full : null;
}

function walk(dir: string, out: string[] = [], exts = [".md"]): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out, exts);
    else if (exts.some((e) => entry.name.toLowerCase().endsWith(e))) out.push(p);
  }
  return out;
}

// Ad-hoc analyses are produced outside this repo (a separate Claude Project,
// saved on the Windows side) and only read, never written, from here — a
// looser extension list and a boundary check against adhocPath rather than
// repoPath is enough.
function safeResolveWithin(root: string, full: string): string | null {
  const r = resolve(root);
  const f = resolve(full);
  return f === r || f.startsWith(r + sep) ? f : null;
}

function listAdhoc(adhocPath?: string): { path: string; date: string | null; modified: string; sizeBytes: number }[] {
  if (!adhocPath || !existsSync(adhocPath)) return [];
  const root = resolve(adhocPath);
  return walk(root, [], [".md", ".txt"]).map((f) => {
    const rel = "adhoc/" + relative(root, f).split(sep).join("/");
    return { path: rel, date: dateFrom(f), modified: statSync(f).mtime.toISOString().slice(0, 10), sizeBytes: statSync(f).size };
  });
}

/** First heading, or first non-empty line — enough to tell reports apart in a list. */
function summarise(text: string): string {
  for (const line of text.split("\n").slice(0, 40)) {
    const t = line.trim();
    if (!t || t.startsWith("---") || /^_/.test(t)) continue;
    return t.replace(/^#+\s*/, "").slice(0, 120);
  }
  return "";
}

const dateFrom = (p: string) => (p.match(/(\d{4}-\d{2}-\d{2})/) ?? [])[1] ?? null;

export function listReports(
  repoPath: string,
  opts: { agent?: string; since?: string; limit?: number; adhocPath?: string } = {}
): object {
  const base = safeResolve(repoPath, "reports");
  if (!base) return { error: "invalid path" };
  const agentFiles = walk(base).map((f) => {
    const rel = relative(resolve(repoPath), f);
    return {
      path: rel,
      agent: relative(base, f).split(sep)[0] ?? "",
      date: dateFrom(rel),
      modified: statSync(f).mtime.toISOString().slice(0, 10),
      sizeBytes: statSync(f).size,
      source: "agent" as const,
    };
  });
  const adhocFiles = listAdhoc(opts.adhocPath).map((r) => ({ ...r, agent: "adhoc", source: "adhoc" as const }));

  const files = [...agentFiles, ...adhocFiles]
    .filter((r) => !opts.agent || r.agent.toLowerCase().includes(opts.agent.toLowerCase()))
    .filter((r) => !opts.since || (r.date ?? r.modified) >= opts.since)
    .sort((a, b) => (b.date ?? b.modified).localeCompare(a.date ?? a.modified));

  const limited = files.slice(0, opts.limit ?? 40);
  return {
    count: files.length,
    returned: limited.length,
    reports: limited.map((r) => ({
      ...r,
      summary: summarise(
        readFileSync(
          r.source === "adhoc"
            ? join(resolve(opts.adhocPath!), r.path.slice("adhoc/".length))
            : join(resolve(repoPath), r.path),
          "utf-8"
        )
      ),
    })),
    note:
      "Read your own most recent report before writing a new one, and say what changed since it. " +
      "'source: adhoc' entries came from the user's separate ad-hoc analysis folder, not from an agent — check those too before calling a subject uncovered.",
  };
}

export function readReport(repoPath: string, path: string, adhocPath?: string): object {
  if (path.startsWith("adhoc/")) {
    if (!adhocPath) return { error: "no ad-hoc path configured" };
    const full = safeResolveWithin(adhocPath, join(resolve(adhocPath), path.slice("adhoc/".length)));
    if (!full) return { error: "path outside the ad-hoc directory" };
    if (!existsSync(full)) return { error: `not found: ${path}` };
    const content = readFileSync(full, "utf-8");
    const MAX = 60000;
    return { path, truncated: content.length > MAX, content: content.slice(0, MAX) };
  }
  const full = safeResolve(repoPath, path);
  if (!full) return { error: "path outside the repository" };
  if (!existsSync(full)) return { error: `not found: ${path}` };
  const content = readFileSync(full, "utf-8");
  const MAX = 60000;
  return {
    path,
    truncated: content.length > MAX,
    content: content.slice(0, MAX),
  };
}

/**
 * Search across reports, theses, and (if configured) the user's ad-hoc
 * analysis folder. This is the institutional memory: what did we conclude
 * about this before, and has our view moved?
 */
export function searchReports(
  repoPath: string,
  query: string,
  opts: { limit?: number; context?: number; adhocPath?: string } = {}
): object {
  const root = resolve(repoPath);
  const files: { f: string; rel: string }[] = [
    ...walk(join(root, "reports")).map((f) => ({ f, rel: relative(root, f) })),
    ...walk(join(root, "theses")).map((f) => ({ f, rel: relative(root, f) })),
  ];
  if (opts.adhocPath && existsSync(opts.adhocPath)) {
    const adhocRoot = resolve(opts.adhocPath);
    for (const f of walk(adhocRoot, [], [".md", ".txt"])) {
      files.push({ f, rel: "adhoc/" + relative(adhocRoot, f).split(sep).join("/") });
    }
  }
  const needle = query.toLowerCase();
  const ctx = opts.context ?? 1;
  const hits: any[] = [];

  for (const { f, rel } of files) {
    const lines = readFileSync(f, "utf-8").split("\n");
    lines.forEach((line, i) => {
      if (!line.toLowerCase().includes(needle)) return;
      hits.push({
        path: rel,
        date: dateFrom(rel),
        line: i + 1,
        excerpt: lines
          .slice(Math.max(0, i - ctx), i + ctx + 1)
          .join("\n")
          .trim()
          .slice(0, 400),
      });
    });
  }

  hits.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return {
    query,
    totalMatches: hits.length,
    matches: hits.slice(0, opts.limit ?? 25),
    note:
      hits.length === 0
        ? "No prior coverage found. Say so — this is a new subject for us."
        : "Newest first. 'adhoc/' paths are from the user's separate ad-hoc analysis folder. Check whether our current view differs from these, and explain any change.",
  };
}
