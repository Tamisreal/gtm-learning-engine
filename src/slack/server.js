// Two ways to run the Slack bot:
//
//   node src/slack/server.js "research Harbor Health"     CLI, no Slack needed
//   SLACK_SIGNING_SECRET=... node src/slack/server.js     HTTP endpoint for a /gtm slash command
//
// Slash commands must answer within 3 seconds, so the server acks immediately and
// posts the real answer to Slack's response_url when the background check finishes.
const http = require("http");
const crypto = require("crypto");
const path = require("path");
const { handle } = require("./commands");
const { MockCrm } = require("../adapters/crm");

const crm = new MockCrm("salesforce_slack");
const OUT = path.join(__dirname, "..", "..", "out");

function verified(req, body) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  const ts = req.headers["x-slack-request-timestamp"];
  const sig = req.headers["x-slack-signature"] || "";
  if (!secret || !ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const mine = "v0=" + crypto.createHmac("sha256", secret).update(`v0:${ts}:${body}`).digest("hex");
  return sig.length === mine.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(mine));
}

if (process.argv[2]) {
  handle(process.argv.slice(2).join(" "), crm).then((reply) => {
    console.log(reply);
    if (Object.keys(crm.records).length) console.log(`\nCRM writes: ${crm.flush(OUT)}`);
  });
} else {
  http
    .createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        if (!verified(req, body)) return res.writeHead(401).end();
        const params = new URLSearchParams(body);
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ text: "Working on it..." }));
        const text = await handle(params.get("text") || "", crm);
        await fetch(params.get("response_url"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
        crm.flush(OUT);
      });
    })
    .listen(process.env.PORT || 3000, () => console.log(`Slack endpoint on :${process.env.PORT || 3000}`));
}
