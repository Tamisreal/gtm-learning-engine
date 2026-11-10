// Shared by run.js (one pass, real outputs) and simulate.js (many passes, learning curve).
const { detectSignals } = require("./signals/detect");
const { scoreAccount, tierAccounts } = require("./scoring/score");
const { chooseAngle } = require("./learning/feedback");

function plan(accounts, state, rand) {
  const scored = accounts.map((account) => {
    const signals = detectSignals(account);
    return { account, signals, score: scoreAccount(signals, state) };
  });
  return tierAccounts(scored).map((r) => ({ ...r, angle: chooseAngle(r.signals, state, rand) }));
}

module.exports = { plan };
