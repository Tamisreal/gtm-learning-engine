// TOFU: turn raw account data into named signals.
// Deterministic on purpose: string matching on HTML and job titles needs no LLM.
const { COMPETITORS, STACK_SIGNALS, HIRING_SIGNALS } = require("../config");

function scanHtml(html, defs) {
  const lower = html.toLowerCase();
  return defs
    .map((d) => ({ name: d.name, evidence: d.keywords.find((k) => lower.includes(k)) }))
    .filter((d) => d.evidence);
}

function detectSignals(account) {
  const signals = [];

  for (const c of scanHtml(account.html, COMPETITORS)) {
    signals.push({ key: "competitor", label: `Uses ${c.name}`, detail: c.name, evidence: `HTML contains "${c.evidence}"` });
  }

  const stack = scanHtml(account.html, STACK_SIGNALS);
  if (stack.length) {
    signals.push({ key: "stack_fit", label: `Runs ${stack.map((s) => s.name).join(", ")}`, detail: stack.map((s) => s.name), evidence: stack.map((s) => s.evidence).join(", ") });
  }

  for (const h of HIRING_SIGNALS) {
    const job = account.openJobs.find((j) => h.pattern.test(j));
    if (job) signals.push({ key: h.name, label: `Hiring: ${job}`, detail: job, evidence: "open job posting" });
  }

  if (account.intent && account.intent.score >= 70) {
    signals.push({ key: "intent_surge", label: `Researching "${account.intent.topic}"`, detail: account.intent.topic, evidence: `intent score ${account.intent.score}` });
  }

  return signals;
}

module.exports = { detectSignals };
