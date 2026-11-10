// Proves the loop works. A hidden "market" decides which signals and angles truly book
// meetings. The engine starts knowing nothing (equal priors), sends a batch each cycle,
// observes outcomes, and updates. Compare against a static team that never learns.
//
// Usage: node src/simulate.js [--cycles 10] [--runs 30] [--save]
const fs = require("fs");
const path = require("path");
const { mulberry32 } = require("./rng");
const state = require("./learning/state");
const { applyOutcomes } = require("./learning/feedback");
const { detectSignals } = require("./signals/detect");
const { plan } = require("./pipeline");

// Ground truth the engine never sees. Synthetic, chosen so the "obvious" signal
// (stack_fit: they run a CRM) is weak and the less obvious ones are strong.
const TRUTH = {
  signals: { competitor: 0.2, hiring_revops: 0.22, hiring_sdr: 0.1, hiring_marketing_ops: 0.05, intent_surge: 0.14, stack_fit: 0.03 },
  angleLift: { competitor_displacement: 1.3, hiring_signal: 1.2, intent_surge: 1.0, stack_fit: 0.6 },
  base: 0.02,
};

function trueRate(signalKeys, angle) {
  let miss = 1 - TRUTH.base;
  for (const k of new Set(signalKeys)) miss *= 1 - TRUTH.signals[k];
  return Math.min(0.95, (1 - miss) * (TRUTH.angleLift[angle] || 1));
}

const arg = (name, d) => (process.argv.includes(name) ? Number(process.argv[process.argv.indexOf(name) + 1]) : d);
const CYCLES = arg("--cycles", 10);
const RUNS = arg("--runs", 30); // average many independent runs so the curve is not luck
const BATCH = 15; // accounts a rep can work per cycle

const accounts = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "accounts.json"), "utf8"));

// Static baseline: works the accounts with the most signals, always leads with stack fit when it can.
const staticExpected = accounts
  .map((a) => detectSignals(a))
  .sort((x, y) => y.length - x.length)
  .slice(0, BATCH)
  .reduce((n, sig) => n + trueRate(sig.map((z) => z.key), sig.some((z) => z.key === "stack_fit") ? "stack_fit" : null), 0);

const perCycle = Array(CYCLES).fill(0);
let last;
for (let run = 0; run < RUNS; run++) {
  const rand = mulberry32(1000 + run);
  const s = state.fresh();
  for (let c = 0; c < CYCLES; c++) {
    const chosen = plan(accounts, s, rand).filter((r) => r.angle).slice(0, BATCH);
    const outcomes = chosen.map((r) => {
      const keys = r.signals.map((x) => x.key);
      const p = trueRate(keys, r.angle);
      return { accountId: r.account.id, signalKeys: keys, angle: r.angle, meeting: rand() < p, p };
    });
    perCycle[c] += outcomes.reduce((n, o) => n + o.p, 0) / RUNS;
    applyOutcomes(s, outcomes, `sim cycle ${c + 1}`);
  }
  last = s;
}

console.log(`Expected meetings per ${BATCH} accounts worked (avg of ${RUNS} runs)\n`);
console.log(`Static playbook, never learns: ${staticExpected.toFixed(2)}`);
perCycle.forEach((v, i) => {
  const lift = ((v / staticExpected - 1) * 100).toFixed(0);
  console.log(`Cycle ${String(i + 1).padStart(2)}: ${v.toFixed(2)}  ${"#".repeat(Math.round(v * 6))}  (${lift >= 0 ? "+" : ""}${lift}% vs static)`);
});

const fmt = (obj) =>
  Object.entries(obj)
    .sort((a, b) => state.mean(b[1]) - state.mean(a[1]))
    .map(([k, b]) => `  ${k.padEnd(24)} ${(state.mean(b) * 100).toFixed(1)}%`)
    .join("\n");
console.log("\nWhat one run learned about signals:\n" + fmt(last.signals));
console.log("\nWhat one run learned about angles:\n" + fmt(last.angles));

if (process.argv.includes("--save")) {
  state.save(last);
  console.log("\nSaved learned state. 'npm start' now scores with these weights.");
}
console.log("\nMarket, accounts and outcomes are synthetic. The point is the mechanism, not the numbers.");
