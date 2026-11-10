// Competitor HTML scan: fetch each account's website (homepage + the subpages where
// tools actually live), read the raw page source, and record which competitor or stack
// fingerprints appear, with the exact evidence and the URL it was found on.
//
// Competitor tools rarely show up in visible text. They show up as script tags, form
// actions, iframe sources and widget IDs, usually on an action, contact or demo page.
//
// Usage:
//   node engine/signals/scanSites.js                     scan seed accounts (offline, uses stored HTML)
//   node engine/signals/scanSites.js --live urls.txt     fetch real sites, one domain per line
//   node engine/signals/scanSites.js --live urls.txt --resume   skip domains already in the output
const fs = require("fs");
const path = require("path");
const { COMPETITORS, STACK_SIGNALS } = require("../config");

const OUT = path.join(__dirname, "..", "..", "out", "competitor_scan.csv");
const TIMEOUT_MS = 10_000; // per request
const DELAY_MS = 500; // between requests, be polite
const MAX_BYTES = 500_000; // read at most 500KB of HTML per page

// Where embeds actually live. Checked in addition to the homepage.
const SUBPATHS = ["/contact", "/demo", "/get-started", "/take-action", "/action-center", "/resources", "/pricing"];

// Never flag your own product or brands you have acquired, or you flag your own customers.
const IGNORE = ["our-product.example", "acquired-brand.example"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; site-scan)" } });
    if (!res.ok || !(res.headers.get("content-type") || "").includes("html")) return null;
    const reader = res.body.getReader();
    let html = "";
    let bytes = 0;
    while (bytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      html += Buffer.from(value).toString("utf8");
    }
    reader.cancel().catch(() => {});
    return html;
  } catch {
    return null; // timeouts, DNS failures, TLS errors: record as unreachable, never crash the batch
  } finally {
    clearTimeout(t);
  }
}

function fingerprints(html, url) {
  const lower = html.toLowerCase();
  if (IGNORE.some((k) => lower.includes(k))) return [];
  const hits = [];
  for (const [kind, defs] of [["competitor", COMPETITORS], ["stack", STACK_SIGNALS]]) {
    for (const d of defs) {
      const k = d.keywords.find((kw) => lower.includes(kw));
      if (!k) continue;
      // Keep ~80 chars of surrounding source as evidence a rep can check.
      const i = lower.indexOf(k);
      const snippet = html.slice(Math.max(0, i - 40), i + k.length + 40).replace(/\s+/g, " ").trim();
      hits.push({ kind, name: d.name, keyword: k, url, snippet });
    }
  }
  return hits;
}

async function scanDomain(domain) {
  const base = domain.startsWith("http") ? domain.replace(/\/$/, "") : `https://${domain}`;
  const found = new Map(); // one row per (kind, name): first URL it was found on wins
  let reachable = false;
  for (const p of ["", ...SUBPATHS]) {
    const html = await fetchHtml(base + p);
    if (html) {
      reachable = true;
      for (const h of fingerprints(html, base + p)) if (!found.has(h.kind + h.name)) found.set(h.kind + h.name, h);
    }
    await sleep(DELAY_MS);
  }
  return { domain, reachable, hits: [...found.values()] };
}

const csvCell = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const HEADER = "domain,reachable,kind,name,keyword,url,evidence";

function toRows(result) {
  if (!result.hits.length) return [[result.domain, result.reachable, "", "", "", "", ""]];
  return result.hits.map((h) => [result.domain, true, h.kind, h.name, h.keyword, h.url, h.snippet]);
}

async function main() {
  const live = process.argv.indexOf("--live");
  let results;
  if (live > -1) {
    const domains = fs.readFileSync(process.argv[live + 1], "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const done = process.argv.includes("--resume") && fs.existsSync(OUT) ? new Set(fs.readFileSync(OUT, "utf8").split("\n").slice(1).map((l) => l.split(",")[0].replace(/"/g, ""))) : new Set();
    results = [];
    for (const d of domains.filter((x) => !done.has(x))) {
      const r = await scanDomain(d);
      results.push(r);
      console.log(`${d}: ${r.reachable ? r.hits.map((h) => h.name).join(", ") || "no fingerprints" : "unreachable"}`);
    }
  } else {
    // Offline: same matching logic over the seed accounts' stored homepage HTML.
    const accounts = require("../../data/accounts.json");
    results = accounts.map((a) => ({ domain: a.domain, reachable: true, hits: fingerprints(a.html, `https://${a.domain}/`) }));
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const append = process.argv.includes("--resume") && fs.existsSync(OUT);
  const body = results.flatMap(toRows).map((r) => r.map(csvCell).join(",")).join("\n");
  fs.writeFileSync(OUT, append ? fs.readFileSync(OUT, "utf8") + "\n" + body : HEADER + "\n" + body);

  const withComp = results.filter((r) => r.hits.some((h) => h.kind === "competitor"));
  console.log(`\nScanned ${results.length} domains. ${withComp.length} run a competitor:`);
  for (const r of withComp.slice(0, 10)) {
    const h = r.hits.find((x) => x.kind === "competitor");
    console.log(`  ${r.domain.padEnd(28)} ${h.name.padEnd(16)} ${h.snippet}`);
  }
  console.log(`\nFull results: out/competitor_scan.csv`);
}

module.exports = { scanDomain, fingerprints, fetchHtml };
if (require.main === module) main();
