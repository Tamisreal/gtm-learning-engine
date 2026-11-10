// The loop. Every touch outcome updates the signals that targeted it and the angle
// that messaged it. Angle choice is a split test: angles that book meetings get
// used more, but weaker angles still get tested in proportion to the uncertainty left.
const { betaSample } = require("../rng");
const { mean } = require("./state");

const ANGLE_REQUIRES = {
  competitor_displacement: (keys) => keys.includes("competitor"),
  hiring_signal: (keys) => keys.some((k) => k.startsWith("hiring_")),
  intent_surge: (keys) => keys.includes("intent_surge"),
  stack_fit: (keys) => keys.includes("stack_fit"),
};

function eligibleAngles(signals) {
  const keys = signals.map((s) => s.key);
  return Object.keys(ANGLE_REQUIRES).filter((a) => ANGLE_REQUIRES[a](keys));
}

function chooseAngle(signals, state, rand) {
  const options = eligibleAngles(signals);
  if (!options.length) return null;
  let best = null;
  let bestDraw = -1;
  for (const a of options) {
    const { alpha, beta } = state.angles[a];
    const draw = betaSample(rand, alpha, beta);
    if (draw > bestDraw) [best, bestDraw] = [a, draw];
  }
  return best;
}

// outcome: { accountId, signalKeys: [], angle, meeting: boolean }
function applyOutcomes(state, outcomes, label = "") {
  for (const o of outcomes) {
    const keys = [...new Set(o.signalKeys)].filter((k) => state.signals[k]);
    if (o.meeting) {
      // Credit assignment: a meeting on an account with 4 signals was not caused by all 4.
      // Split one unit of credit by each signal's current share of the predicted rate,
      // so weak signals stop getting rich by riding along with strong ones.
      const p = keys.map((k) => mean(state.signals[k]));
      const total = p.reduce((a, b) => a + b, 0) || 1;
      keys.forEach((k, i) => (state.signals[k].alpha += p[i] / total));
    } else {
      // A miss is evidence against every signal that was present: none of them fired.
      keys.forEach((k) => state.signals[k].beta++);
    }
    if (o.angle && state.angles[o.angle]) {
      o.meeting ? state.angles[o.angle].alpha++ : state.angles[o.angle].beta++;
    }
  }
  const meetings = outcomes.filter((o) => o.meeting).length;
  state.history.push({ label, touches: outcomes.length, meetings, at: new Date().toISOString().slice(0, 10) });
  return state;
}

module.exports = { chooseAngle, eligibleAngles, applyOutcomes };
