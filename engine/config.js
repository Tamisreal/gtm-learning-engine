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


// Message rotation segments. Each ICP x seniority pair learns its own winning message.
const ICPS = [
  { id: "saas", label: "Mid-market SaaS" },
  { id: "fintech", label: "Fintech" },
];
const SENIORITIES = [
  { id: "vp", label: "VP and above", baseRate: 0.014 },
  { id: "director", label: "Director", baseRate: 0.019 },
  { id: "manager", label: "Manager", baseRate: 0.024 },
];

// Message variants per seniority, in the order they go live. The first three start; the
// rest wait on the bench. strength and fits only drive the synthetic reply rates.
const MESSAGE_LIBRARY = {
  vp: [
    { id: "vp-board-number", strength: 1.0, fits: ["fintech"], line: "The pipeline number your board asks about, and where it leaks." },
    { id: "vp-competitor-switch", strength: 1.5, fits: ["saas"], line: "Teams leaving {competitor} cut ramp time in half. Here is how." },
    { id: "vp-peer-proof", strength: 0.8, fits: [], line: "How a peer team your size rebuilt outbound in one quarter." },
    { id: "vp-cost-per-meeting", strength: 1.7, fits: ["fintech"], line: "What one qualified meeting costs you today, and what it should." },
    { id: "vp-headcount", strength: 1.1, fits: ["saas"], line: "Hiring {open_role}? The first 90 days decide the number." },
  ],
  director: [
    { id: "dir-hiring-ramp", strength: 1.2, fits: ["saas"], line: "You are hiring {open_role}. Here is how they hit quota in month two." },
    { id: "dir-forecast", strength: 0.9, fits: ["fintech"], line: "Forecast calls that end in 15 minutes because the data is already right." },
    { id: "dir-stack-fit", strength: 0.7, fits: [], line: "This sits on top of {crm}. Nothing to migrate." },
    { id: "dir-intent", strength: 1.6, fits: ["saas", "fintech"], line: "Your team is researching {topic}. Three accounts are too." },
    { id: "dir-teardown", strength: 1.0, fits: [], line: "A teardown of your current sequence, free, in five minutes." },
  ],
  manager: [
    { id: "mgr-time-back", strength: 1.0, fits: [], line: "Your reps spend six hours a week on research. Here is it in one click." },
    { id: "mgr-bounce", strength: 1.4, fits: ["fintech"], line: "One in eight emails your team sends is to someone who left." },
    { id: "mgr-template", strength: 0.8, fits: ["saas"], line: "The opening line template our best rep uses." },
    { id: "mgr-call-notes", strength: 1.3, fits: ["saas"], line: "Call notes that write themselves into {crm}." },
    { id: "mgr-quick-win", strength: 0.9, fits: [], line: "One change to your sequence that moves replies this week." },
  ],
};

module.exports = { ICPS, SENIORITIES, MESSAGE_LIBRARY, COMPETITORS, STACK_SIGNALS, HIRING_SIGNALS, ANGLES, PRIOR, TIER_SHARES, BASELINE_RATE };
