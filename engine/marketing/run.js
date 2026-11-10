// Marketing loop, same shape as outbound:
//   research (what the market is talking about) -> choose hook (learned) -> draft
//   -> guardrails -> publish with tracking -> outcomes -> update what the engine believes
//
// Usage: node engine/marketing/run.js [--cycles 8]
// Outcomes are simulated from hidden CTRs. Live, they come back from UTM-tagged clicks.
const state = require("../learning/state");
const { mulberry32 } = require("../rng");
const { briefs } = require("./research");
const { draft, chooseHook, carouselSpec } = require("./generate");
const { MockPublisher } = require("./publish");
const fs = require("fs");
const path = require("path");

// Hidden from the engine. Synthetic.
const TRUE_CTR = { contrarian: 0.031, data: 0.042, how_to: 0.024, story: 0.018 };
const IMPRESSIONS_PER_POST = 1500;

async function main() {
  const cycles = process.argv.includes("--cycles") ? Number(process.argv[process.argv.indexOf("--cycles") + 1]) : 8;
  const s = state.load();
  const rand = mulberry32(17);
  const pub = new MockPublisher();
  const topics = briefs(3);

  console.log("Research: top topics this month (breadth x volume x recency)");
  for (const t of topics) console.log(`  ${t.score}  ${t.topic}  (${t.facts.join(", ")})`);
  console.log("\nCycle | Hooks used               | Clicks | Learned CTR by hook");

  for (let c = 1; c <= cycles; c++) {
    const used = [];
    let clicks = 0;
    for (const brief of topics) {
      const hook = chooseHook(s, rand);
      const d = await draft(brief, hook);
      if (!d.guardrails.pass) continue; // fail closed
      await pub.publish(d, ["linkedin"]);
      let k = 0;
      for (let i = 0; i < IMPRESSIONS_PER_POST; i++) if (rand() < TRUE_CTR[hook]) k++;
      s.content[hook].alpha += k;
      s.content[hook].beta += IMPRESSIONS_PER_POST - k;
      clicks += k;
      used.push(hook);
    }
    const learned = Object.entries(s.content)
      .map(([h, b]) => `${h} ${(state.mean(b) * 100).toFixed(1)}%`)
      .join(", ");
    console.log(`${String(c).padStart(5)} | ${used.join(", ").padEnd(24)} | ${String(clicks).padStart(6)} | ${learned}`);
  }

  const best = Object.entries(s.content).sort((a, b) => state.mean(b[1]) - state.mean(a[1]))[0][0];
  const sample = await draft(topics[0], best);
  fs.writeFileSync(path.join(path.dirname(pub.flush()), "carousel_spec.json"), JSON.stringify(carouselSpec(topics[0], best), null, 2));
  console.log(`\nBest hook so far: ${best} (truth: data > contrarian > how_to > story)`);
  console.log(`Sample draft [${sample.source}, guardrails ${sample.guardrails.pass ? "pass" : "FAIL"}]:\n  ${sample.text}`);
  state.save(s);
  console.log("\nOutputs in out/marketing/. Learned hook rates saved to the shared state.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
