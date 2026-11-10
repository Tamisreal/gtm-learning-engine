// Generates data/accounts.json: 50 synthetic accounts with raw HTML, open jobs,
// intent topics, and contacts. No real companies or people.
// Usage: node src/seed.js
const fs = require("fs");
const path = require("path");
const { mulberry32, pick } = require("./rng");

const rand = mulberry32(42);
const PREFIX = ["North", "Blue", "Iron", "Clear", "Summit", "Harbor", "Bright", "Granite", "Atlas", "Cedar", "Pioneer", "Vector"];
const SUFFIX = ["Logistics", "Health", "Analytics", "Software", "Payments", "Labs", "Systems", "Cloud", "Robotics", "Security"];
const INDUSTRY = ["B2B SaaS", "Fintech", "Healthtech", "Logistics", "Cybersecurity"];
const FIRST = ["Jordan", "Riley", "Casey", "Morgan", "Avery", "Quinn", "Taylor", "Reese", "Drew", "Parker"];
const LAST = ["Lee", "Patel", "Garcia", "Kim", "Okafor", "Novak", "Silva", "Chen", "Rossi", "Brooks"];
const TITLES = ["VP Sales", "Head of Revenue Operations", "Director of Marketing", "CRO", "Sales Development Manager"];
const JOBS = ["Revenue Operations Manager", "SDR", "BDR Team Lead", "Demand Gen Manager", "Software Engineer", "Account Executive", "Marketing Ops Specialist", "Customer Success Manager"];
const INTENT = ["sales engagement platform", "pipeline generation", "CRM migration", "data enrichment", "conversation intelligence"];
const SNIPPETS = {
  competitor: ['<script src="https://cdn.legacycrm.com/lcrm-embed.js"></script>', '<form class="bm-form" action="https://blastmail.io/f/123">', '<div id="pf-widget" data-src="pipeforge"></div>'],
  stack: ['<script src="//js.hs-scripts.com/1234.js"></script>', '<script src="https://j.6sc.co/6si.min.js"></script>', '<link rel="preconnect" href="https://login.salesforce.com">', '<script src="https://app.gong.io/js/x.js"></script>'],
};

const accounts = [];
const used = new Set();
while (accounts.length < 50) {
  const name = `${pick(rand, PREFIX)} ${pick(rand, SUFFIX)}`;
  if (used.has(name)) continue;
  used.add(name);
  const domain = name.toLowerCase().replace(/\s+/g, "") + ".example";
  const parts = [`<html><head><title>${name}</title>`];
  if (rand() < 0.3) parts.push(pick(rand, SNIPPETS.competitor));
  for (const s of SNIPPETS.stack) if (rand() < 0.3) parts.push(s);
  parts.push(`</head><body><h1>${name}</h1></body></html>`);

  const jobs = JOBS.filter(() => rand() < 0.2);
  const intent = rand() < 0.35 ? { topic: pick(rand, INTENT), score: Math.round(60 + rand() * 40) } : null;
  const contacts = [0, 1].map(() => {
    const first = pick(rand, FIRST);
    const last = pick(rand, LAST);
    return { name: `${first} ${last}`, title: pick(rand, TITLES), email: `${first}.${last}@${domain}`.toLowerCase() };
  });

  accounts.push({
    id: `ACC-${String(accounts.length + 1).padStart(3, "0")}`,
    name,
    domain,
    industry: pick(rand, INDUSTRY),
    employees: Math.round(50 + rand() * 1950),
    html: parts.join("\n"),
    openJobs: jobs,
    intent, // shape mirrors a 6sense intent export: topic + score
    contacts,
  });
}

fs.writeFileSync(path.join(__dirname, "..", "data", "accounts.json"), JSON.stringify(accounts, null, 2));
console.log(`Wrote ${accounts.length} synthetic accounts to data/accounts.json`);
