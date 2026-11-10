// BOFU + account management: call transcript -> structured fields + whitespace.
// Rules catch the things that must never be missed (competitor names, objection types).
// The LLM, when enabled, adds a summary and whitespace read on top. It does not replace the rules.
const { COMPETITORS } = require("../config");
const llm = require("../llm");

const OBJECTIONS = {
  price: /budget|too expensive|price|cost/i,
  timing: /next quarter|not a priority|after (the )?(renewal|freeze)|timing/i,
  integration: /integrat|sync|api|salesforce|hubspot/i,
  security: /security review|soc ?2|infosec|legal review/i,
  authority: /need to (check|run it by)|my (boss|vp|cfo)/i,
};

// Phrases where a customer reveals a team, use case, or problem you do not serve yet.
const WHITESPACE = /(our|the) (\w+ ){0,2}team (also|is|has been)|we also (need|struggle|use)|another (team|division|region)|separately,? we/i;

const NEXT_STEP = /(send|schedule|book|loop in|set up|share) [^.?!]{3,80}/i;

function parse(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const turns = lines.map((l) => {
    const m = l.match(/^([^:]+):\s*(.*)$/);
    return m ? { speaker: m[1], text: m[2] } : { speaker: "?", text: l };
  });
  return turns;
}

function analyzeRules(text, sellerName) {
  const turns = parse(text);
  const buyer = turns.filter((t) => t.speaker !== sellerName);
  const lower = text.toLowerCase();

  const competitors = COMPETITORS.filter((c) => c.keywords.some((k) => lower.includes(k)) || lower.includes(c.name.toLowerCase())).map((c) => c.name);
  const objections = Object.entries(OBJECTIONS)
    .map(([type, re]) => ({ type, quote: (buyer.find((t) => re.test(t.text)) || {}).text }))
    .filter((o) => o.quote);
  const whitespace = buyer.filter((t) => WHITESPACE.test(t.text)).map((t) => t.text);
  const nextStepTurn = [...turns].reverse().find((t) => NEXT_STEP.test(t.text));
  const talkRatio = turns.filter((t) => t.speaker === sellerName).reduce((n, t) => n + t.text.length, 0) / Math.max(1, text.length);

  return {
    competitors,
    objections,
    whitespace,
    nextStep: nextStepTurn ? nextStepTurn.text : null,
    sellerTalkRatio: Number(talkRatio.toFixed(2)),
  };
}

async function analyzeTranscript(text, sellerName) {
  const rules = analyzeRules(text, sellerName);
  const summary = await llm.complete(
    "Summarize this sales call in 3 bullets: buyer's core problem, deal risk, and any expansion opportunity " +
      "(other teams or use cases mentioned). No em dashes. Only use what is in the transcript.\n\n" + text,
    { maxTokens: 300 }
  );
  return { ...rules, summary };
}

// What gets written back to the opportunity / deal record.
function toCrmFields(r) {
  return {
    Competitors_Mentioned__c: r.competitors.join("; "),
    Objections__c: r.objections.map((o) => o.type).join("; "),
    Whitespace_Notes__c: r.whitespace.join(" | "),
    Next_Step__c: r.nextStep,
    Seller_Talk_Ratio__c: r.sellerTalkRatio,
  };
}

module.exports = { analyzeTranscript, analyzeRules, toCrmFields };
