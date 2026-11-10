// One full pass of the engine:
//   TOFU  detect signals -> score -> tier -> choose angle -> personalize -> landing page -> write to CRM
//   MOFU  pre-call briefs for Tier A
//   BOFU  analyze call transcripts -> write to CRM -> raise expansion tasks
//   LOOP  ingest outcomes (if provided) -> update what the engine believes
//
// Usage: node engine/run.js [--outcomes data/outcomes.json]
const fs = require("fs");
const path = require("path");
const { mulberry32 } = require("./rng");
const state = require("./learning/state");
const { applyOutcomes } = require("./learning/feedback");
const { plan } = require("./pipeline");
const { personalize, toCrmFields, signalFor } = require("./messaging/personalize");
const { writePages } = require("./pages/landingPage");
const { buildBrief } = require("./research/precallBrief");
const transcript = require("./calls/analyzeTranscript");
const { MockCrm, MockGong } = require("./adapters/crm");
const llm = require("./llm");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "out");

async function main() {
  const accounts = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "accounts.json"), "utf8"));
  const s = state.load();

  const outcomesArg = process.argv.indexOf("--outcomes");
  if (outcomesArg > -1) {
    const outcomes = JSON.parse(fs.readFileSync(process.argv[outcomesArg + 1], "utf8"));
    applyOutcomes(s, outcomes, "ingested outcomes");
    console.log(`Learned from ${outcomes.length} outcomes.`);
  }

  const rows = plan(accounts, s, mulberry32(Date.now() % 2 ** 31));
  const sf = new MockCrm("salesforce");
  const hs = new MockCrm("hubspot");
  const report = [`# GTM Learning Engine run, ${new Date().toISOString().slice(0, 10)}`, "", `LLM: ${llm.enabled() ? "on" : "off (deterministic templates)"}`, ""];

  // TOFU
  report.push("## TOFU: targeting and messaging", "", "| Tier | Account | Fit | Signals | Angle | Opening line |", "|---|---|---|---|---|---|");
  for (const row of rows.filter((r) => r.tier !== "C" && r.angle)) {
    const contact = row.account.contacts[0];
    const msg = await personalize(row.account, contact, row.angle, row.signals);
    const fields = toCrmFields(row, msg);
    await sf.upsert("Account", row.account.id, fields.salesforce);
    await hs.upsert("company", row.account.id, fields.hubspot);
    report.push(`| ${row.tier} | ${row.account.name} | ${(row.score * 100).toFixed(1)}% | ${row.signals.map((x) => x.label).join("; ")} | ${row.angle} | ${msg.line} |`);
  }
  const outbound = rows.filter((r) => r.tier !== "C" && r.angle);
  report.push("", `Landing pages: ${outbound.length} written to ${path.relative(ROOT, writePages(outbound, signalFor, OUT))}/, one per prospect, matched to the email angle.`);
  const counts = { A: 0, B: 0, C: 0 };
  rows.forEach((r) => counts[r.tier]++);
  report.push("", `Tiers: A ${counts.A}, B ${counts.B}, C ${counts.C} (nurture, no outbound).`, "");

  // MOFU
  report.push("## MOFU: pre-call briefs (Tier A)", "");
  for (const row of rows.filter((r) => r.tier === "A").slice(0, 3)) report.push(await buildBrief(row));

  // BOFU
  report.push("## BOFU: call analysis", "");
  const gong = new MockGong(path.join(ROOT, "data", "transcripts"));
  for (const call of gong.listCalls()) {
    const r = await transcript.analyzeTranscript(call.transcript, call.seller);
    await sf.upsert("Opportunity", call.accountId, transcript.toCrmFields(r));
    report.push(
      `### ${call.callId} (${call.accountId})`,
      `- Competitors: ${r.competitors.join(", ") || "none"}`,
      `- Objections: ${r.objections.map((o) => `${o.type} ("${o.quote}")`).join("; ") || "none"}`,
      `- Next step: ${r.nextStep || "MISSING, flag to manager"}`,
      `- Seller talk ratio: ${r.sellerTalkRatio}`,
      ...r.whitespace.map((w) => `- **Expansion task created:** "${w}"`),
      ...(r.summary ? ["", r.summary] : []),
      ""
    );
    for (const [i, w] of r.whitespace.entries()) await sf.upsert("Task", `${call.accountId}-ws${i}`, { Subject: "Expansion: whitespace from call", Description: w });
  }

  // LOOP
  report.push("## What the engine currently believes", "", "| Signal | Meeting credit | Misses | Learned meeting rate |", "|---|---|---|---|");
  for (const [k, b] of Object.entries(s.signals)) report.push(`| ${k} | ${(b.alpha - 1).toFixed(1)} | ${b.beta - 9} | ${(state.mean(b) * 100).toFixed(1)}% |`);
  report.push("", "| Angle | Learned meeting rate |", "|---|---|");
  for (const [k, b] of Object.entries(s.angles)) report.push(`| ${k} | ${(state.mean(b) * 100).toFixed(1)}% |`);

  state.save(s);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "report.md"), report.join("\n"));
  console.log(`Wrote ${sf.flush(OUT)}, ${hs.flush(OUT)}, ${path.join(OUT, "report.md")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
