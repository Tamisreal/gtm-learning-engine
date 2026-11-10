// Everything a GTM team would tune lives here, not in code.

// Competitor / tech fingerprints detected in raw page HTML.
// Fictional vendors. In production this list came from win/loss notes and Gong mentions.
const COMPETITORS = [
  { name: "LegacyCRM Suite", keywords: ["legacycrm", "lcrm-embed"] },
  { name: "BlastMail", keywords: ["blastmail.io", "bm-form"] },
  { name: "PipeForge", keywords: ["pipeforge", "pf-widget"] },
];

// Tech that indicates the account can buy and integrate (fit, not displacement).
const STACK_SIGNALS = [
  { name: "salesforce", keywords: ["force.com", "salesforce", "pardot"] },
  { name: "hubspot", keywords: ["hs-scripts", "hubspot", "hsforms"] },
  { name: "6sense", keywords: ["6sc.co", "6sense"] },
  { name: "gong", keywords: ["gong.io"] },
];

// Job titles that signal an active buying motion.
const HIRING_SIGNALS = [
  { name: "hiring_revops", pattern: /rev(enue)?\s*ops|revenue operations|gtm engineer/i },
  { name: "hiring_sdr", pattern: /\b(sdr|bdr|sales development)\b/i },
  { name: "hiring_marketing_ops", pattern: /marketing ops|demand gen/i },
];

// Message angles the engine chooses between. The learning loop decides which wins.
const ANGLES = {
  competitor_displacement: "Lead with the competitor detected on their site and the switching pain.",
  hiring_signal: "Lead with the role they are hiring for and the ramp problem it creates.",
  intent_surge: "Lead with the topic they are researching right now.",
  stack_fit: "Lead with how this plugs into the CRM and tools they already run.",
};

// Starting prior for every signal: Beta(alpha, beta). Weak prior = learns fast.
const PRIOR = { alpha: 1, beta: 9 }; // roughly a 10% meeting rate assumption

// Tiers are relative (share of the ranked list), so they stay stable as the model's
// absolute probabilities move. A = researched + personalized by hand-level quality.
const TIER_SHARES = { A: 0.2, B: 0.3 }; // remainder is C (nurture)

// Rate every account starts with before any signal fires.
const BASELINE_RATE = 0.02;

module.exports = { COMPETITORS, STACK_SIGNALS, HIRING_SIGNALS, ANGLES, PRIOR, TIER_SHARES, BASELINE_RATE };
