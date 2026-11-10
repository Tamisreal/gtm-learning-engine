// Search demand capture from a Search Console export.
// Finds bottom-of-funnel, long-tail queries the site already gets impressions for but
// does not win: page 1-3 positions, low CTR, buying intent. Each becomes a short,
// specific page brief (~400 words answering exactly that query).
//
// Live: Search Console API (searchanalytics.query by query + page). Mock: seeded export.
const { mulberry32, pick } = require("../rng");

const INTENT = /\b(pricing|cost|vs|alternative|alternatives|best|tool|software|for|how to|template)\b/i;
const HEADS = ["signal based outbound", "revops automation", "cold email deliverability", "crm data hygiene", "ai sdr", "lead scoring model"];
const MODS = ["pricing", "vs clay", "alternatives", "for b2b saas", "how to set up", "template", "tool", "best practices", "examples", "for small sales teams"];

function exportRows(seed = 21) {
  const rand = mulberry32(seed);
  const rows = [];
  for (const h of HEADS) {
    rows.push({ query: h, impressions: Math.round(2000 + rand() * 8000), clicks: 0, position: Number((18 + rand() * 30).toFixed(1)) });
    for (let i = 0; i < 5; i++) {
      const q = `${h} ${pick(rand, MODS)}`;
      const impressions = Math.round(40 + rand() * 900);
      const position = Number((3 + rand() * 35).toFixed(1));
      rows.push({ query: q, impressions, clicks: Math.round(impressions * (position < 10 ? 0.03 : 0.004) * rand()), position });
    }
  }
  for (const r of rows) r.ctr = r.impressions ? Number((r.clicks / r.impressions).toFixed(4)) : 0;
  return rows;
}

function opportunities(rows, { minWords = 3, minImpr = 100, posRange = [5, 30] } = {}) {
  return rows
    .filter((r) => r.query.split(" ").length >= minWords && INTENT.test(r.query))
    .filter((r) => r.impressions >= minImpr && r.position >= posRange[0] && r.position <= posRange[1])
    // Expected extra clicks if this query reached a top-3 position (~10% CTR).
    .map((r) => ({ ...r, upside: Math.round(r.impressions * 0.1 - r.clicks) }))
    .sort((a, b) => b.upside - a.upside);
}

function pageBrief(o) {
  return {
    query: o.query,
    title: o.query.replace(/\b\w/g, (c) => c.toUpperCase()),
    targetWords: 415,
    outline: ["Direct answer in the first two sentences", "Who this is for and who it is not", "Steps or comparison table", "One worked example", "Next step"],
    evidence: `${o.impressions} impressions at position ${o.position}, ${o.clicks} clicks`,
    upside: `${o.upside} more clicks per period at top-3`,
  };
}

module.exports = { exportRows, opportunities, pageBrief };

if (require.main === module) {
  const rows = exportRows();
  const ops = opportunities(rows);
  console.log(`${rows.length} queries in export, ${ops.length} long-tail buying-intent opportunities\n`);
  for (const o of ops.slice(0, 8)) console.log(`${String(o.upside).padStart(4)} upside | pos ${String(o.position).padStart(4)} | ${o.impressions} impr | ${o.query}`);
  console.log("\nTop brief:", JSON.stringify(pageBrief(ops[0]), null, 2));
}
