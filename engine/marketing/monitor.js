// Competitor content monitor. Watch competitor accounts, classify what they posted in the
// last 24 hours, and draft a response asset when a post is getting traction.
// Nothing publishes on its own: drafts go to an approval queue and a person approves.
//
//   node engine/marketing/monitor.js             scan and queue drafts
//   node engine/marketing/monitor.js approve ID  publish one queued draft
const fs = require("fs");
const path = require("path");
const { mulberry32, pick } = require("../rng");
const { draft } = require("./generate");
const { MockPublisher, OUT } = require("./publish");

const QUEUE = path.join(OUT, "approval_queue.json");
const COMPETITORS = ["@legacycrm", "@blastmail", "@pipeforge"];
const SUBJECTS = ["AI SDR replies feel generic", "Intent data accuracy", "CRM hygiene before AI", "Signal-based outbound vs volume"];

// Live: platform API or scraper. Mock: seeded feed.
function fetchFeed(seed = 5) {
  const rand = mulberry32(seed);
  return Array.from({ length: 18 }, (_, i) => ({
    id: `C${i + 1}`,
    account: pick(rand, COMPETITORS),
    hoursAgo: Math.floor(rand() * 72),
    media: pick(rand, ["video", "carousel", "text"]),
    topic: pick(rand, SUBJECTS),
    engagement: Math.round(rand() * 900),
  }));
}

// Rule-based: traction relative to that account's own average, not a fixed number.
function worthAnswering(post, feed) {
  const own = feed.filter((p) => p.account === post.account);
  const avg = own.reduce((n, p) => n + p.engagement, 0) / own.length;
  return post.hoursAgo <= 24 && post.engagement >= 1.5 * avg;
}

async function scan() {
  const feed = fetchFeed();
  const recent = feed.filter((p) => p.hoursAgo <= 24);
  const picks = recent.filter((p) => worthAnswering(p, feed));
  const queue = [];
  for (const p of picks) {
    // Our response takes the other side of their angle, using our own facts only.
    const d = await draft({ topic: p.topic, facts: [`${p.engagement} engagements`] }, "contrarian");
    queue.push({ id: `Q-${p.id}`, trigger: p, status: d.guardrails.pass ? "awaiting_approval" : "blocked", draft: d });
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2));
  return { scanned: feed.length, last24h: recent.length, byMedia: count(recent, "media"), queued: queue };
}

const count = (arr, k) => arr.reduce((m, x) => ((m[x[k]] = (m[x[k]] || 0) + 1), m), {});

async function approve(id) {
  const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
  const item = queue.find((q) => q.id === id);
  if (!item) return `No queued item ${id}.`;
  if (item.status !== "awaiting_approval") return `${id} is ${item.status}, not publishable.`;
  const pub = new MockPublisher();
  const posts = await pub.publish(item.draft);
  item.status = "published";
  fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2));
  pub.flush();
  return `Published ${id} to ${posts.map((p) => p.platform).join(", ")}.`;
}

module.exports = { scan, approve, fetchFeed, worthAnswering };

if (require.main === module) {
  const [cmd, id] = process.argv.slice(2);
  if (cmd === "approve") approve(id).then(console.log);
  else
    scan().then((r) => {
      console.log(`Scanned ${r.scanned} competitor posts, ${r.last24h} in the last 24h (${JSON.stringify(r.byMedia)}).`);
      for (const q of r.queued) console.log(`  ${q.id} [${q.status}] ${q.trigger.account} ${q.trigger.media} on "${q.trigger.topic}" (${q.trigger.engagement} eng)\n    -> ${q.draft.text}`);
      console.log(`Queue: ${QUEUE}\nApprove with: node engine/marketing/monitor.js approve <id>`);
    });
}
