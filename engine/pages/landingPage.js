// A positive reply gets a landing page built for that prospect: the email's angle, the
// signals we noticed, and the question they asked in their reply. The rep sends the link
// in the follow-up, so the next touch is about their situation, not a generic deck.
//
// In production these pages were built in Lovable. Here they are generated from a
// template so the repo runs offline; the inputs (signals, angle, contact, reply) are the same.
const fs = require("fs");
const path = require("path");

const HEADLINES = {
  competitor_displacement: (a, s) => `${a.name}: what changes when you move off ${s.detail}`,
  hiring_signal: (a, s) => `Give ${a.name}'s new ${s.detail} a working pipeline on day one`,
  intent_surge: (a, s) => `${a.name} is evaluating ${s.detail}. Here is what to compare.`,
  stack_fit: (a, s) => `Built to run inside ${[].concat(s.detail).join(" + ")}, the tools ${a.name} already uses`,
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function render(row, signal, reply) {
  const a = row.account;
  const contact = a.contacts[0];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.name)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:48px auto;padding:0 16px;color:#1a1a1a;background:#fff}
  h1{font-size:2rem;line-height:1.2} .tag{display:inline-block;background:#eef2ff;color:#3730a3;padding:4px 10px;border-radius:999px;margin:4px 4px 0 0;font-size:.85rem}
  a.cta{display:inline-block;margin-top:24px;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none}
</style></head>
<body>
  <p>Prepared for ${esc(contact.name)}, ${esc(contact.title)}</p>
  <h1>${esc(HEADLINES[row.angle](a, signal))}</h1>
${reply ? `  <p><b>You asked:</b> &ldquo;${esc(reply.text)}&rdquo;</p>
` : ""}  <p>What we noticed about ${esc(a.name)}:</p>
  <div>${row.signals.map((s) => `<span class="tag">${esc(s.label)}</span>`).join("")}</div>
  <a class="cta" href="#book?account=${esc(a.id)}&angle=${esc(row.angle)}">Book 20 minutes</a>
</body></html>`;
}

function writePages(rows, signalFor, outDir, replies = []) {
  const dir = path.join(outDir, "pages");
  fs.mkdirSync(dir, { recursive: true });
  for (const row of rows) fs.writeFileSync(path.join(dir, `${row.account.id}.html`), render(row, signalFor(row.angle, row.signals), replies.find((r) => r.accountId === row.account.id)));
  return dir;
}

module.exports = { writePages, render };
