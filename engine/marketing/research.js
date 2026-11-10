// What is the market talking about this month? Pull recent posts from several sources,
// group by topic, rank by engagement that shows up in more than one place.
// A topic hot on one site is noise. A topic rising on four is a content brief.
//
// Live: Reddit, Hacker News, X, YouTube and LinkedIn APIs or scrapers. Mock: seeded posts.
const { mulberry32, pick } = require("../rng");

const SOURCES = ["reddit", "hackernews", "x", "youtube", "linkedin"];
const TOPICS = {
  "AI SDR replies feel generic": ["ai sdr", "generic", "reply rate"],
  "Cold email deliverability after the 2024 sender rules": ["deliverability", "spam", "dmarc"],
  "RevOps owning the AI stack": ["revops", "ai stack", "ownership"],
  "Intent data accuracy": ["intent data", "6sense", "accuracy"],
  "Signal-based outbound vs volume": ["signals", "volume", "outbound"],
  "CRM hygiene before AI": ["crm", "data quality", "hygiene"],
};

function pullPosts(days = 30, seed = 11) {
  const rand = mulberry32(seed);
  const names = Object.keys(TOPICS);
  return Array.from({ length: 400 }, (_, i) => {
    const topic = pick(rand, names);
    const hot = topic === "AI SDR replies feel generic" || topic === "CRM hygiene before AI";
    return {
      id: `P${i}`,
      source: pick(rand, SOURCES),
      topic,
      ageDays: Math.floor(rand() * days),
      engagement: Math.round((hot ? 80 : 20) * (0.3 + rand() * 2)),
      url: `https://example.com/post/${i}`,
    };
  });
}

function rankTopics(posts) {
  const by = {};
  for (const p of posts) {
    const t = (by[p.topic] ||= { topic: p.topic, posts: 0, engagement: 0, sources: new Set(), recent: 0, examples: [] });
    t.posts++;
    t.engagement += p.engagement;
    t.sources.add(p.source);
    if (p.ageDays < 7) t.recent += p.engagement;
    if (t.examples.length < 3) t.examples.push(`${p.source}: ${p.url}`);
  }
  return Object.values(by)
    .map((t) => ({
      ...t,
      sources: [...t.sources],
      // Breadth x volume x recency. Single-source spikes rank low by design.
      score: Math.round(t.sources.size *Math.log1p(t.engagement) * (1 + t.recent / Math.max(1, t.engagement))),
    }))
    .sort((a, b) => b.score - a.score);
}

function briefs(n = 3) {
  return rankTopics(pullPosts())
    .slice(0, n)
    .map((t) => ({
      topic: t.topic,
      facts: [`${t.posts} posts`, `${t.sources.length} sources`, `${t.engagement} total engagements`],
      sources: t.examples,
      score: t.score,
    }));
}

module.exports = { pullPosts, rankTopics, briefs, TOPICS };
