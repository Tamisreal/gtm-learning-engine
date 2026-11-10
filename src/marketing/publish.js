// Publishing adapter shaped like a multi-platform scheduler (Blotato, Buffer, etc.):
// one call, several platforms, one tracking link per post so outcomes trace back to
// the hook and topic that produced them. Mock writes to out/marketing/.
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "..", "out", "marketing");

function trackingUrl(post) {
  const q = new URLSearchParams({ utm_source: post.platform, utm_medium: "social", utm_campaign: post.topicSlug, utm_content: post.hook });
  return `https://example.com/demo?${q}`;
}

class MockPublisher {
  constructor() {
    this.log = [];
  }
  async publish(item, platforms = ["linkedin", "x"]) {
    if (!item.guardrails.pass) throw new Error(`Refusing to publish: ${JSON.stringify(item.guardrails.violations)}`);
    const topicSlug = item.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const posts = platforms.map((platform) => {
      const post = { id: `${platform}-${this.log.length + 1}`, platform, topicSlug, hook: item.hook, text: item.text };
      return { ...post, link: trackingUrl(post) };
    });
    this.log.push(...posts);
    return posts;
  }
  flush() {
    fs.mkdirSync(OUT, { recursive: true });
    const file = path.join(OUT, "published.json");
    fs.writeFileSync(file, JSON.stringify(this.log, null, 2));
    return file;
  }
}

module.exports = { MockPublisher, OUT };
