// Scores accounts with weights the engine learned, not weights someone guessed.
// P(meeting) = noisy-OR over fired signals: 1 - (1 - base) * prod(1 - p_signal).
const { mean } = require("../learning/state");
const { TIER_SHARES, BASELINE_RATE } = require("../config");

function scoreAccount(signals, state) {
  const keys = [...new Set(signals.map((s) => s.key))];
  let miss = 1 - BASELINE_RATE;
  for (const k of keys) miss *= 1 - mean(state.signals[k]);
  return 1 - miss;
}

function tierAccounts(scored) {
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const aCut = Math.round(ranked.length * TIER_SHARES.A);
  const bCut = aCut + Math.round(ranked.length * TIER_SHARES.B);
  return ranked.map((r, i) => ({ ...r, tier: i < aCut ? "A" : i < bCut ? "B" : "C" }));
}

module.exports = { scoreAccount, tierAccounts };
