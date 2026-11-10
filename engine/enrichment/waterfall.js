// Waterfall enrichment: try providers cheapest-first, stop at the first verified result.
// Same pattern as a Clay waterfall table, written as code so the order, cost, and
// stop rule are explicit and testable.
//
// Mock providers are deterministic (hash of the input), so the demo is reproducible.
// A live version swaps each `lookup` for a real API call; the waterfall does not change.

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Hit rates and costs are illustrative, not quotes from any vendor.
const PROVIDERS = [
  { name: "cache", costUsd: 0, hitRate: 0.15 },
  { name: "provider_a", costUsd: 0.01, hitRate: 0.45 },
  { name: "provider_b", costUsd: 0.03, hitRate: 0.35 },
  { name: "provider_c", costUsd: 0.08, hitRate: 0.5 },
];

function mockLookup(provider, person) {
  const roll = (hash(provider.name + person.name + person.domain) % 1000) / 1000;
  if (roll >= provider.hitRate) return null;
  const [first, last] = person.name.toLowerCase().split(" ");
  const patterns = [`${first}.${last}`, `${first[0]}${last}`, `${first}`];
  return `${patterns[hash(person.domain) % patterns.length]}@${person.domain}`;
}

// Email validation step. Live: an SMTP/catch-all verifier. Mock: deterministic.
function verifyEmail(email) {
  const score = hash(email) % 100;
  return { email, status: score < 75 ? "valid" : score < 90 ? "catch_all" : "invalid" };
}

// exclude: emails already known to be bad (e.g. the one that just bounced).
async function enrich(person, { providers = PROVIDERS, acceptCatchAll = false, exclude = [] } = {}) {
  const trail = [];
  let spent = 0;
  for (const p of providers) {
    spent += p.costUsd;
    const email = mockLookup(p, person);
    if (!email || exclude.includes(email)) {
      trail.push({ provider: p.name, result: "miss" });
      continue;
    }
    const v = verifyEmail(email);
    trail.push({ provider: p.name, result: v.status, email });
    if (v.status === "valid" || (acceptCatchAll && v.status === "catch_all")) {
      return { email, status: v.status, provider: p.name, costUsd: Number(spent.toFixed(3)), trail };
    }
  }
  return { email: null, status: "not_found", provider: null, costUsd: Number(spent.toFixed(3)), trail };
}

// Cost model at volume, before anyone runs a 50k-record job.
function estimateCost(n, providers = PROVIDERS) {
  let reach = 1;
  let perRecord = 0;
  for (const p of providers) {
    perRecord += reach * p.costUsd;
    reach *= 1 - p.hitRate * 0.75; // ~75% of hits verify valid
  }
  return { records: n, estUsd: Number((n * perRecord).toFixed(2)), estFoundRate: Number((1 - reach).toFixed(2)) };
}

module.exports = { enrich, verifyEmail, estimateCost, PROVIDERS };

if (require.main === module) {
  for (const n of [1, 1000, 10000, 50000]) console.log(estimateCost(n));
}
