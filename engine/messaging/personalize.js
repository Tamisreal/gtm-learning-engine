// TOFU: signal + chosen angle -> first line an SDR can send, written into CRM fields
// so it shows up in the sequence tool (Gong Engage, Outreach, HubSpot sequences) as a merge field.
const { ANGLES } = require("../config");
const llm = require("../llm");

function signalFor(angle, signals) {
  const map = { competitor_displacement: "competitor", intent_surge: "intent_surge", stack_fit: "stack_fit" };
  return angle === "hiring_signal" ? signals.find((s) => s.key.startsWith("hiring_")) : signals.find((s) => s.key === map[angle]);
}

const TEMPLATES = {
  competitor_displacement: (a, s) => `Noticed ${a.name} runs ${s.detail} on its site. Teams that switch usually do it because reporting stops matching what reps actually do.`,
  hiring_signal: (a, s) => `Saw ${a.name} is hiring a ${s.detail}. That hire usually inherits a pipeline process nobody wrote down.`,
  intent_surge: (a, s) => `Your team looks like it is evaluating ${s.detail} right now, so timing may be useful here.`,
  stack_fit: (a, s) => `Since ${a.name} already runs ${[].concat(s.detail).join(" and ")}, this would sit inside the tools your reps use today.`,
};

function buildPrompt(account, contact, angle, signal) {
  return [
    "Write ONE opening line (max 30 words) for a cold email.",
    `Recipient: ${contact.name}, ${contact.title} at ${account.name} (${account.industry}, ~${account.employees} employees).`,
    `Angle: ${ANGLES[angle]}`,
    `Signal: ${signal.label} (evidence: ${signal.evidence}).`,
    "Rules: reference the signal specifically, no flattery, no questions, no em dashes, do not invent facts.",
    "Return only the line.",
  ].join("\n");
}

async function personalize(account, contact, angle, signals) {
  const signal = signalFor(angle, signals);
  const fromLlm = await llm.complete(buildPrompt(account, contact, angle, signal), { maxTokens: 120 });
  const line = fromLlm || TEMPLATES[angle](account, signal);
  return { line, source: fromLlm ? "llm" : "template", signal: signal.label };
}

// Same payload, two CRMs. Field names match what an admin would create.
function toCrmFields(row, msg) {
  return {
    salesforce: {
      Fit_Score__c: Number(row.score.toFixed(3)),
      Account_Tier__c: row.tier,
      Signal_Summary__c: row.signals.map((s) => s.label).join("; "),
      Message_Angle__c: row.angle,
      Personalization_Line__c: msg.line,
    },
    hubspot: {
      fit_score: Number(row.score.toFixed(3)),
      account_tier: row.tier,
      signal_summary: row.signals.map((s) => s.label).join("; "),
      message_angle: row.angle,
      personalization_line: msg.line,
    },
  };
}

module.exports = { personalize, toCrmFields, buildPrompt, signalFor };
