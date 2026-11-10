// Controlled message experiments: how a winning angle gets *declared*, not just favored.
//
// The always-on split test (learning/feedback.js) routes day-to-day volume toward what looks
// best. That is good for pipeline but it never says "this angle won." This module does:
// one segment, four angles, random split, fixed decision rules.
//
// Rules:
//   - No arm is judged before 400 delivered.
//   - A winner is promoted only at 95% confidence (two-proportion z >= 1.96).
//   - A close test gets one extension, then is recorded as inconclusive.
//   - Deliverability is checked before copy gets blamed: an arm bouncing over 4%
//     is a list problem, not a message problem.
//
// Usage: node engine/experiments/abTest.js [seed]
const { mulberry32 } = require("../rng");
const { ANGLES } = require("../config");

const MIN_DELIVERED = 400;
const Z_CRITICAL = 1.96;
const BOUNCE_FLAG = 0.04;

function twoProportionZ(x1, n1, x2, n2) {
  if (!n1 || !n2) return 0;
  const p = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  return se === 0 ? 0 : (x1 / n1 - x2 / n2) / se;
}

// Random split so no arm gets the easier half of the list.
function split(audience, arms, rand) {
  const shuffled = [...audience];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return arms.map((arm, i) => ({ arm, contacts: shuffled.filter((_, k) => k % arms.length === i) }));
}

// Send step. Live: the sequencer API. Mock: true rates per arm, hidden from the decision.
function send(group, trueRate, bounceRate, rand) {
  const r = { sent: group.contacts.length, bounced: 0, delivered: 0, positives: 0 };
  for (let i = 0; i < r.sent; i++) {
    if (rand() < bounceRate) r.bounced++;
    else {
      r.delivered++;
      if (rand() < trueRate) r.positives++;
    }
  }
  return r;
}

const rate = (r) => (r.delivered ? r.positives / r.delivered : 0);
const add = (a, b) => ({ sent: a.sent + b.sent, bounced: a.bounced + b.bounced, delivered: a.delivered + b.delivered, positives: a.positives + b.positives });

function evaluate(results) {
  const ranked = Object.entries(results).sort((a, b) => rate(b[1]) - rate(a[1]));
  const [[best, b], [runner, r]] = ranked;
  const judged = b.delivered >= MIN_DELIVERED && r.delivered >= MIN_DELIVERED;
  const z = twoProportionZ(b.positives, b.delivered, r.positives, r.delivered);
  const badList = ranked.filter(([, x]) => x.bounced / x.sent > BOUNCE_FLAG).map(([k]) => k);
  return { ranked, best, runner, z, judged, winner: judged && z >= Z_CRITICAL, badList };
}

function runExperiment({ segment, audienceSize = 2600, truth, bounce = {}, seed = 1 }) {
  const rand = mulberry32(seed);
  const arms = Object.keys(ANGLES);
  const audience = Array.from({ length: audienceSize }, (_, i) => `${segment}-${i}`);
  const results = {};
  for (const g of split(audience, arms, rand)) results[g.arm] = send(g, truth[g.arm], bounce[g.arm] || 0.02, rand);

  const log = [];
  let ev = evaluate(results);
  log.push(`Initial read: ${ev.best} leads ${ev.runner}, z = ${ev.z.toFixed(2)}`);

  if (!ev.winner) {
    // One extension: half the original audience again, top two arms only.
    for (const arm of [ev.best, ev.runner]) {
      const extra = { contacts: Array.from({ length: Math.round(audienceSize / arms.length / 2) }) };
      results[arm] = add(results[arm], send(extra, truth[arm], bounce[arm] || 0.02, rand));
    }
    ev = evaluate(results);
    log.push(`Extended top two. ${ev.best} vs ${ev.runner}, z = ${ev.z.toFixed(2)}`);
  }

  for (const arm of ev.badList) log.push(`Deliverability flag on ${arm}: bounce over ${BOUNCE_FLAG * 100}%. Fix the list before judging the copy.`);
  const verdict = ev.winner ? { kind: "winner", angle: ev.best, z: ev.z } : { kind: "inconclusive", leaders: [ev.best, ev.runner], z: ev.z };
  log.push(ev.winner ? `Winner: ${ev.best}. Promoted for ${segment}.` : `Inconclusive. ${ev.best} and ${ev.runner} both stay in rotation.`);
  return { segment, results, verdict, log };
}

// Hand a declared result to the learning state, so routing and targeting use it.
function recordVerdict(state, exp) {
  for (const [angle, r] of Object.entries(exp.results)) {
    if (!state.angles[angle]) continue;
    state.angles[angle].alpha += r.positives;
    state.angles[angle].beta += r.delivered - r.positives;
  }
  state.history.push({ label: `experiment ${exp.segment}`, verdict: exp.verdict, at: new Date().toISOString().slice(0, 10) });
  return state;
}

module.exports = { runExperiment, recordVerdict, twoProportionZ, MIN_DELIVERED, Z_CRITICAL };

if (require.main === module) {
  const seed = Number(process.argv[2] || 3);
  // Synthetic true positive-reply rates, hidden from the decision rules.
  const exp = runExperiment({
    segment: "RevOps leaders, 200-1000 employees",
    truth: { competitor_displacement: 0.034, hiring_signal: 0.021, intent_surge: 0.018, stack_fit: 0.009 },
    bounce: { stack_fit: 0.07 },
    seed,
  });
  console.log(`Experiment: ${exp.segment}\n`);
  console.log("Arm                       Delivered  Positive  Rate   Bounce");
  for (const [arm, r] of Object.entries(exp.results)) {
    console.log(`${arm.padEnd(26)}${String(r.delivered).padStart(9)}${String(r.positives).padStart(10)}  ${(rate(r) * 100).toFixed(1).padStart(4)}%  ${((r.bounced / r.sent) * 100).toFixed(1)}%`);
  }
  console.log("\n" + exp.log.join("\n"));
}
