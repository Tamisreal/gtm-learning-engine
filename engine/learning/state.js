// The engine's memory: one Beta(alpha, beta) per signal and per message angle.
// alpha = meetings booked, beta = touches without a meeting (plus the prior).
const fs = require("fs");
const path = require("path");
const { PRIOR, ANGLES } = require("../config");

const DIR = path.join(__dirname, "..", "..", "state");
const FILE = path.join(DIR, "learning.json");
const CONTENT_HOOKS = ["contrarian", "data", "how_to", "story"];
const SIGNAL_KEYS =["competitor", "stack_fit", "hiring_revops", "hiring_sdr", "hiring_marketing_ops", "intent_surge"];

function fresh() {
  const beta = () => ({ ...PRIOR });
  return {
    signals: Object.fromEntries(SIGNAL_KEYS.map((k) => [k, beta()])),
    angles: Object.fromEntries(Object.keys(ANGLES).map((k) => [k, beta()])),
    // Marketing hooks share the same memory as outbound angles. One engine, one loop.
    content: Object.fromEntries(CONTENT_HOOKS.map((k) => [k, { alpha: 1, beta: 49 }])), // ~2% CTR prior
    history: [],
  };
}

function load() {
  if (!fs.existsSync(FILE)) return fresh();
  const s = JSON.parse(fs.readFileSync(FILE, "utf8"));
  s.content ||= fresh().content;
  return s;
}

function save(state) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
}

const mean = ({ alpha, beta }) => alpha / (alpha + beta);

if (require.main === module && process.argv.includes("--reset")) {
  save(fresh());
  console.log("Learning state reset to priors.");
}

module.exports = { load, save, fresh, mean };
