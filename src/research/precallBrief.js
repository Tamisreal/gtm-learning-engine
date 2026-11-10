// MOFU: one-page brief an AE reads in two minutes before a first call.
// Facts come from the signal layer. The LLM only drafts discovery questions, and only if enabled.
const llm = require("../llm");

const QUESTIONS = {
  competitor: (s) => `What made you pick ${s.detail}, and what would have to be true to revisit it?`,
  stack_fit: () => "Who owns the CRM today, and what breaks between marketing and sales handoff?",
  hiring_revops: (s) => `What is the ${s.detail} expected to fix in the first 90 days?`,
  hiring_sdr: () => "How long does a new SDR take to book their first meeting today?",
  hiring_marketing_ops: () => "Which MQL definition does sales actually trust?",
  intent_surge: (s) => `What started the look at ${s.detail}, and who else is involved?`,
};

async function buildBrief(row) {
  const a = row.account;
  const contact = a.contacts[0];
  let questions = row.signals.map((s) => QUESTIONS[s.key](s));
  const draft = await llm.complete(
    `Given these verified signals about ${a.name}: ${row.signals.map((s) => s.label).join("; ")}. ` +
      "Write 3 sharp discovery questions for a first sales call, one per line, no numbering, no em dashes. Do not invent facts.",
    { maxTokens: 250 }
  );
  if (draft) questions = draft.split("\n").filter(Boolean).slice(0, 3);

  return [
    `## ${a.name}  (Tier ${row.tier}, fit ${(row.score * 100).toFixed(1)}%)`,
    `**Industry:** ${a.industry}  |  **Size:** ~${a.employees}  |  **Domain:** ${a.domain}`,
    `**Primary contact:** ${contact.name}, ${contact.title}`,
    "",
    "**Why now (verified signals)**",
    ...row.signals.map((s) => `- ${s.label}  _(${s.evidence})_`),
    "",
    `**Opening angle:** ${row.angle}`,
    "",
    "**Discovery questions**",
    ...questions.map((q) => `- ${q}`),
    "",
  ].join("\n");
}

module.exports = { buildBrief };
