// Proof snapshot: show a prospect data they cannot get on their own.
//
// 1. Pick a topic the prospect cares about (their intent topic, or one a rep passes in).
// 2. Count how often it appears across the internal dataset, broken down by region.
// 3. Render the results view and screenshot it with Playwright.
// 4. Embed the screenshot in the email: "data centers came up 412 times across 37 states."
//
// The email stops being a claim about the product and becomes a sample of it.
//
// Clean-room: the dataset is synthetic and the results page is generic. In production the
// screenshot was taken of the real internal product. Playwright is optional:
//   npm i playwright && npx playwright install chromium
//
// Usage: node src/proof/snapshot.js "data centers" ACC-001
const fs = require("fs");
const path = require("path");
const { mulberry32, pick } = require("../rng");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "out", "proof");

const REGIONS = ["AZ", "CA", "CO", "FL", "GA", "IL", "IN", "MA", "MI", "MN", "NC", "NJ", "NV", "NY", "OH", "OR", "PA", "TN", "TX", "UT", "VA", "WA", "WI"];
const TOPICS = ["data centers", "artificial intelligence", "energy grid", "water rights", "broadband", "privacy", "workforce training"];

// Synthetic corpus: 3,000 documents, each mentioning a few topics a few times.
function corpus() {
  const rand = mulberry32(99);
  return Array.from({ length: 3000 }, (_, i) => ({
    id: `DOC-${i + 1}`,
    region: pick(rand, REGIONS),
    month: 1 + Math.floor(rand() * 10),
    mentions: Object.fromEntries(TOPICS.filter(() => rand() < 0.25).map((t) => [t, 1 + Math.floor(rand() * 6)])),
  }));
}

function countHits(topic) {
  const t = topic.toLowerCase();
  const docs = corpus().filter((d) => d.mentions[t]);
  const byRegion = {};
  for (const d of docs) byRegion[d.region] = (byRegion[d.region] || 0) + d.mentions[t];
  const total = Object.values(byRegion).reduce((a, b) => a + b, 0);
  const top = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);
  return { topic, total, documents: docs.length, regions: top.length, top };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function renderResults(hits) {
  const max = hits.top[0] ? hits.top[0][1] : 1;
  const bars = hits.top
    .slice(0, 10)
    .map(([r, n]) => `<tr><td>${r}</td><td><div class="bar" style="width:${Math.round((n / max) * 100)}%"></div></td><td class="n">${n}</td></tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:system-ui,sans-serif;margin:0;padding:24px;width:760px;background:#fff;color:#111}
  .q{border:1px solid #ccc;border-radius:6px;padding:10px 12px;font-size:15px}
  .kpis{display:flex;gap:12px;margin:16px 0}.k{flex:1;border:1px solid #e5e5e5;border-radius:8px;padding:12px}
  .k b{display:block;font-size:26px}.k span{color:#666;font-size:13px}
  table{width:100%;border-collapse:collapse}td{padding:4px 6px;font-size:13px}td:first-child{width:40px}.bar{height:12px;background:#4f46e5;border-radius:3px}.n{text-align:right;width:50px}
  </style></head><body>
  <div class="q">Search: "${esc(hits.topic)}"  |  This session</div>
  <div class="kpis"><div class="k"><b>${hits.total.toLocaleString()}</b><span>mentions</span></div>
  <div class="k"><b>${hits.documents.toLocaleString()}</b><span>documents</span></div>
  <div class="k"><b>${hits.regions}</b><span>regions</span></div></div>
  <table>${bars}</table></body></html>`;
}

async function screenshot(htmlFile, pngFile) {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    return null; // optional dependency not installed
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 808, height: 300 } });
  await page.goto("file://" + htmlFile);
  await page.screenshot({ path: pngFile, fullPage: true });
  await browser.close();
  return pngFile;
}

function buildEmail(account, contact, hits, imageFile) {
  const first = contact.name.split(" ")[0];
  const [topRegion, topCount] = hits.top[0] || ["", 0];
  return {
    to: contact.email,
    subject: `${hits.topic}: ${hits.total} mentions this session`,
    html: `<p>Hi ${esc(first)},</p>
<p>I ran "${esc(hits.topic)}" for ${esc(account.name)}. It came up <b>${hits.total} times</b> across ${hits.documents} documents in ${hits.regions} regions this session, most in ${topRegion} (${topCount}).</p>
${imageFile ? '<p><img src="cid:proof" alt="search results" width="600"></p>' : ""}
<p>Happy to send the full breakdown for the regions you cover.</p>`,
    attachments: imageFile ? [{ cid: "proof", path: imageFile }] : [],
  };
}

async function run(topic, accountId) {
  const accounts = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "accounts.json"), "utf8"));
  const account = accounts.find((a) => a.id === accountId) || accounts[0];
  const hits = countHits(topic || (account.intent && account.intent.topic) || TOPICS[0]);
  fs.mkdirSync(OUT, { recursive: true });
  const htmlFile = path.join(OUT, `${account.id}.html`);
  fs.writeFileSync(htmlFile, renderResults(hits));
  const png = await screenshot(htmlFile, path.join(OUT, `${account.id}.png`));
  const email = buildEmail(account, account.contacts[0], hits, png);
  fs.writeFileSync(path.join(OUT, `${account.id}.email.json`), JSON.stringify(email, null, 2));
  return { hits, htmlFile, png, email };
}

module.exports = { countHits, renderResults, buildEmail, run, TOPICS };

if (require.main === module) {
  run(process.argv[2], process.argv[3]).then(({ hits, htmlFile, png, email }) => {
    console.log(`"${hits.topic}": ${hits.total} mentions, ${hits.documents} documents, ${hits.regions} regions`);
    console.log(png ? `Screenshot: ${png}` : `Results page: ${htmlFile}\n(Playwright not installed, so no PNG. npm i playwright && npx playwright install chromium)`);
    console.log(`Email draft: ${email.subject}`);
  });
}
