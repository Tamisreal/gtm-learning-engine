// Slack commands reps actually use. Each returns plain text that Slack renders.
//
//   bounce jordan.lee@harborhealth.example   "this email isn't working"
//   research Harbor Health                    "tell me about this account"
//
// The bounce check runs in the background, not by a person: is the contact still at the
// company, is the email still valid, and if not, re-run the waterfall and fix the CRM.
const fs = require("fs");
const path = require("path");
const { enrich, verifyEmail } = require("../enrichment/waterfall");
const { detectSignals } = require("../signals/detect");
const { analyzeRules } = require("../calls/analyzeTranscript");
const { MockGong } = require("../adapters/crm");
const llm = require("../llm");

const ROOT = path.join(__dirname, "..", "..");
const accounts = () => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "accounts.json"), "utf8"));
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Employment check. Live: a people-data API or LinkedIn-based provider. Mock: deterministic.
function stillEmployed(contact) {
  return hash(contact.name + contact.email) % 4 !== 0; // ~25% have left
}

async function bounce(email, crm) {
  const all = accounts();
  const account = all.find((a) => a.contacts.some((c) => c.email === email.toLowerCase()));
  if (!account) return `No contact found for ${email}.`;
  const contact = account.contacts.find((c) => c.email === email.toLowerCase());

  const lines = [`*Bounce check: ${contact.name}, ${contact.title} at ${account.name}*`];
  const v = verifyEmail(email);
  lines.push(`Email status: ${v.status}`);

  if (!stillEmployed(contact)) {
    lines.push("Employment: *no longer at company*. Marked as left, removed from active sequences.");
    const replacement = account.contacts.find((c) => c !== contact && stillEmployed(c));
    lines.push(
      replacement
        ? `Suggested replacement on account: ${replacement.name}, ${replacement.title}.`
        : "No active contacts left on this account. Queued for new-contact sourcing."
    );
    await crm.upsert("Contact", contact.email, { Status__c: "Left Company", Do_Not_Sequence__c: true });
    return lines.join("\n");
  }

  lines.push("Employment: still at company.");
  if (v.status === "valid") {
    lines.push("Email verifies. Likely a temporary bounce or spam filter; check sending domain health.");
    return lines.join("\n");
  }

  const found = await enrich({ name: contact.name, domain: account.domain }, { exclude: [email.toLowerCase()] });
  if (found.email) {
    lines.push(`New email via waterfall (${found.provider}, $${found.costUsd}): ${found.email}. CRM updated.`);
    await crm.upsert("Contact", contact.email, { Email: found.email, Email_Source__c: found.provider, Email_Status__c: found.status });
  } else {
    lines.push(`Waterfall found nothing ($${found.costUsd} spent). Flagged for manual research.`);
    await crm.upsert("Contact", contact.email, { Email_Status__c: "Needs Research" });
  }
  return lines.join("\n");
}

async function research(query) {
  const account = accounts().find((a) => a.name.toLowerCase() === query.toLowerCase().trim());
  if (!account) return `No account named "${query}".`;
  const signals = detectSignals(account);
  const calls = new MockGong(path.join(ROOT, "data", "transcripts")).listCalls().filter((c) => c.accountId === account.id);
  const callNotes = calls.map((c) => ({ id: c.callId, ...analyzeRules(c.transcript, c.seller) }));

  const facts = [
    `*${account.name}*  ${account.industry}, ~${account.employees} employees, ${account.domain}`,
    `Contacts: ${account.contacts.map((c) => `${c.name} (${c.title})`).join(", ")}`,
    `Signals: ${signals.map((s) => s.label).join("; ") || "none"}`,
    `Open roles: ${account.openJobs.join(", ") || "none"}`,
    account.intent ? `Intent: researching "${account.intent.topic}" (score ${account.intent.score})` : "Intent: no surge",
    ...callNotes.map((n) => `Call ${n.id}: objections ${n.objections.map((o) => o.type).join(", ") || "none"}; next step: ${n.nextStep || "none"}${n.whitespace.length ? `; whitespace: ${n.whitespace.join(" | ")}` : ""}`),
  ];

  // The LLM only summarizes facts already gathered. It is told not to add any.
  const take = await llm.complete(
    "You are a sales research assistant. Using ONLY the facts below, write 2 sentences: why this account is worth time now, and the best first move. No em dashes.\n\n" + facts.join("\n"),
    { maxTokens: 150 }
  );
  return [...facts, take ? `\n_Take:_ ${take}` : ""].join("\n").trim();
}

async function handle(text, crm) {
  const [cmd, ...rest] = text.trim().split(/\s+/);
  const arg = rest.join(" ");
  if (cmd === "bounce") return bounce(arg, crm);
  if (cmd === "research") return research(arg);
  return "Commands: `bounce <email>`, `research <account name>`";
}

module.exports = { handle, bounce, research };
