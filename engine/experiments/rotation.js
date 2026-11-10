// Message rotation: how the outbound program teaches itself which message to send.
//
// Every segment (ICP x seniority) gets its own message library. A VP and a manager at
// the same company do not respond to the same email, so each segment learns on its own.
//
// Each week, per segment:
//   1. Three variants are live, split evenly. The rest wait on the bench.
//   2. A variant is judged only after 400 delivered.
//   3. If the leader beats it at 95% confidence, it is retired and the next bench
//      variant takes its slot. "This one isn't working, swap it out."
//   4. If an arm bounces over 4%, it is paused as a list problem. Copy is not blamed.
//   5. When the bench is empty and the leader beats every live arm at 95%, the segment
//      goes all in: 100% of volume to the winner.
//   6. All-in is watched. If the winner's reply rate drops significantly below what it
//      earned during the test, the segment reopens with the runners-up.
//
// Compared against a static program: write three messages per segment, split evenly,
// never change them. Same volume, same contacts, same hidden reply rates.
//
// Usage:
//   node engine/experiments/rotation.js            one 16-week run, week-by-week log (seed 7)
//   node engine/experiments/rotation.js --trials 50   repeat over 50 seeds, report spread
const fs = require("fs");
const path = require("path");
const { mulberry32 } = require("../rng");
const { twoProportionZ, MIN_DELIVERED, Z_CRITICAL } = require("./abTest");
const { ICPS, SENIORITIES, MESSAGE_LIBRARY } = require("../config");

const LIVE_SLOTS = 3;
const WEEKLY_SENDS = 900; // per segment
const WEEKS = 16;
const BOUNCE_FLAG = 0.04;
const BASE_BOUNCE = 0.02;
const DRIFT_WEEKS = 3; // all-in winner is re-checked on its last 3 weeks

const rate = (a) => (a.delivered ? a.positives / a.delivered : 0);
const fresh = (id) => ({ id, sent: 0, bounced: 0, delivered: 0, positives: 0, weekly: [] });

// Synthetic ground truth, hidden from every decision. Reply rate depends on the variant,
// the seniority it was written for, and how well it fits the ICP. Seeded, so reproducible.
function hiddenTruth(seed) {
  const rand = mulberry32(seed * 7919);
  const truth = {};
  for (const icp of ICPS) {
    for (const sen of SENIORITIES) {
      for (const v of MESSAGE_LIBRARY[sen.id]) {
        const fit = v.fits.includes(icp.id) ? 1.6 : 1;
        const noise = 0.7 + rand() * 0.6;
        truth[`${icp.id}|${sen.id}|${v.id}`] = {
          reply: Math.min(0.08, sen.baseRate * v.strength * fit * noise),
          // Occasionally one variant is sent to a stale slice of the list.
          bounce: rand() < 0.06 ? 0.07 : BASE_BOUNCE,
        };
      }
    }
  }
  return truth;
}

function send(arm, n, t, rand, week) {
  const w = { sent: n, bounced: 0, delivered: 0, positives: 0 };
  for (let i = 0; i < n; i++) {
    if (rand() < t.bounce) w.bounced++;
    else {
      w.delivered++;
      if (rand() < t.reply) w.positives++;
    }
  }
  for (const k of ["sent", "bounced", "delivered", "positives"]) arm[k] += w[k];
  arm.weekly.push({ week, ...w });
  return w;
}

// Split n as evenly as possible across k arms.
const shares = (n, k) => Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));

function runSegment(icp, sen, truth, rand, log) {
  const key = (vid) => `${icp.id}|${sen.id}|${vid}`;
  const library = MESSAGE_LIBRARY[sen.id];
  let live = library.slice(0, LIVE_SLOTS).map((v) => fresh(v.id));
  const bench = library.slice(LIVE_SLOTS).map((v) => v.id);
  const retired = [];
  const paused = [];
  let allIn = null; // { id, testRate, week }
  let positives = 0;
  const say = (week, msg) => log.push({ segment: `${icp.label} / ${sen.label}`, week, msg });

  for (let week = 1; week <= WEEKS; week++) {
    if (allIn) {
      const arm = live.find((a) => a.id === allIn.id);
      positives += send(arm, WEEKLY_SENDS, truth[key(arm.id)], rand, week).positives;
      // Drift check on the winner's recent weeks against its test-period rate.
      const recent = arm.weekly.slice(-DRIFT_WEEKS).reduce((s, w) => ({ d: s.d + w.delivered, p: s.p + w.positives }), { d: 0, p: 0 });
      if (week - allIn.week >= DRIFT_WEEKS && twoProportionZ(allIn.testPos, allIn.testDel, recent.p, recent.d) >= Z_CRITICAL) {
        say(week, `Drift: ${arm.id} fell from ${(allIn.testRate * 100).toFixed(1)}% to ${((recent.p / recent.d) * 100).toFixed(1)}%. Reopening the test.`);
        allIn = null;
      }
      continue;
    }

    const split = shares(WEEKLY_SENDS, live.length);
    live.forEach((arm, i) => (positives += send(arm, split[i], truth[key(arm.id)], rand, week).positives));

    // Deliverability first: a bouncing arm is a list problem, not a copy problem.
    for (const arm of [...live]) {
      if (arm.sent >= 200 && arm.bounced / arm.sent > BOUNCE_FLAG) {
        live = live.filter((a) => a !== arm);
        paused.push(arm.id);
        say(week, `Paused ${arm.id}: ${((arm.bounced / arm.sent) * 100).toFixed(1)}% bounce. Fix the list before judging the copy.`);
        if (bench.length) live.push(fresh(bench.shift()));
      }
    }

    const ranked = [...live].sort((a, b) => rate(b) - rate(a));
    const leader = ranked[0];
    if (leader.delivered < MIN_DELIVERED) continue;

    // Swap out anything the leader has beaten.
    for (const arm of ranked.slice(1)) {
      if (arm.delivered < MIN_DELIVERED) continue;
      const z = twoProportionZ(leader.positives, leader.delivered, arm.positives, arm.delivered);
      if (z < Z_CRITICAL) continue;
      live = live.filter((a) => a !== arm);
      retired.push(arm.id);
      const next = bench.shift();
      if (next) live.push(fresh(next));
      say(week, `Retired ${arm.id} (${(rate(arm) * 100).toFixed(1)}% vs leader ${leader.id} ${(rate(leader) * 100).toFixed(1)}%, z=${z.toFixed(2)})${next ? `. Swapped in ${next}.` : "."}`);
    }

    // All in when nothing is left to test and nothing live is close.
    const others = live.filter((a) => a !== leader);
    const beatsAll = others.every((a) => a.delivered >= MIN_DELIVERED && twoProportionZ(leader.positives, leader.delivered, a.positives, a.delivered) >= Z_CRITICAL);
    if (!bench.length && beatsAll) {
      allIn = { id: leader.id, testRate: rate(leader), testPos: leader.positives, testDel: leader.delivered, week };
      say(week, `All in on ${leader.id} at ${(rate(leader) * 100).toFixed(1)}%. 100% of volume from week ${week + 1}.`);
    }
  }

  const best = [...live].sort((a, b) => rate(b) - rate(a))[0];
  return {
    segment: `${icp.label} / ${sen.label}`,
    status: allIn ? `all in: ${allIn.id}` : `still testing, leader ${best.id}`,
    winner: allIn?.id || null,
    trueBest: library.reduce((b, v) => (truth[key(v.id)].reply > truth[key(b.id)].reply ? v : b)).id,
    retired,
    paused,
    positives,
  };
}

// Static program: first three variants, even split, never touched.
function runStatic(icp, sen, truth, rand) {
  let positives = 0;
  const arms = MESSAGE_LIBRARY[sen.id].slice(0, LIVE_SLOTS).map((v) => fresh(v.id));
  for (let week = 1; week <= WEEKS; week++) {
    const split = shares(WEEKLY_SENDS, arms.length);
    arms.forEach((a, i) => (positives += send(a, split[i], truth[`${icp.id}|${sen.id}|${a.id}`], rand, week).positives));
  }
  return positives;
}

function runProgram(seed) {
  const truth = hiddenTruth(seed);
  const log = [];
  const segments = [];
  let staticPositives = 0;
  ICPS.forEach((icp, i) => {
    SENIORITIES.forEach((sen, j) => {
      // Same random stream for both programs in each segment, so the comparison is fair.
      const stream = seed * 1000 + i * 10 + j;
      segments.push(runSegment(icp, sen, truth, mulberry32(stream), log));
      staticPositives += runStatic(icp, sen, truth, mulberry32(stream));
    });
  });
  const rotationPositives = segments.reduce((s, x) => s + x.positives, 0);
  return { seed, segments, log, rotationPositives, staticPositives };
}

module.exports = { runProgram, hiddenTruth, WEEKS, WEEKLY_SENDS };

function main() {
  const t = process.argv.indexOf("--trials");
  const totalSends = ICPS.length * SENIORITIES.length * WEEKS * WEEKLY_SENDS;
  if (t > -1) {
    const n = Number(process.argv[t + 1] || 50);
    const lifts = [];
    let found = 0;
    let wrong = 0;
    let called = 0;
    for (let s = 1; s <= n; s++) {
      const r = runProgram(s);
      lifts.push(r.rotationPositives / r.staticPositives - 1);
      for (const seg of r.segments) {
        if (!seg.winner) continue;
        called++;
        if (seg.winner === seg.trueBest) found++;
        else wrong++;
      }
    }
    lifts.sort((a, b) => a - b);
    const mean = lifts.reduce((a, b) => a + b, 0) / n;
    const pct = (x) => `${(x * 100).toFixed(0)}%`;
    const q = (p) => lifts[Math.floor(p * (n - 1))];
    console.log(`${n} trials (seeds 1-${n}), ${ICPS.length * SENIORITIES.length} segments, ${WEEKS} weeks, ${totalSends.toLocaleString()} sends per program per trial.\n`);
    console.log(`Positive replies, rotation vs static three-message split:`);
    console.log(`  mean lift ${pct(mean)}   median ${pct(q(0.5))}   10th-90th percentile ${pct(q(0.1))} to ${pct(q(0.9))}   worst ${pct(lifts[0])}`);
    console.log(`\nSegments that went all in: ${called} of ${n * ICPS.length * SENIORITIES.length}.`);
    console.log(`  picked the true best message: ${found}   picked a different one: ${wrong}`);
    console.log(`\nSynthetic data. The reply rates are invented; the decision rules are the point.`);
    return;
  }

  const seed = 7;
  const r = runProgram(seed);
  const bySegment = {};
  for (const e of r.log) (bySegment[e.segment] ||= []).push(e);
  console.log(`Seed ${seed}. ${r.segments.length} segments (ICP x seniority), ${WEEKLY_SENDS} sends per segment per week, ${WEEKS} weeks.\n`);
  for (const seg of r.segments) {
    console.log(`${seg.segment}`);
    for (const e of bySegment[seg.segment] || []) console.log(`  wk ${String(e.week).padStart(2)}  ${e.msg}`);
    console.log(`  -> ${seg.status}. ${seg.positives} positive replies.\n`);
  }
  const lift = r.rotationPositives / r.staticPositives - 1;
  console.log(`Total positive replies: rotation ${r.rotationPositives}, static three-message split ${r.staticPositives} (${lift >= 0 ? "+" : ""}${(lift * 100).toFixed(0)}%).`);
  console.log(`Same ${totalSends.toLocaleString()} sends. Run with --trials 50 for the spread across seeds.`);
  const out = path.join(__dirname, "..", "..", "out");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "message_rotation.json"), JSON.stringify({ segments: r.segments, log: r.log }, null, 2));
}

if (require.main === module) main();
