// Adapter boundary. The engine only ever calls upsert(objectType, id, fields).
// Mock writes to out/ so the whole pipeline runs with no credentials.
// A live adapter implements the same two methods against jsforce (Salesforce),
// @hubspot/api-client (HubSpot), or the Gong API (transcripts in, not records out).
const fs = require("fs");
const path = require("path");

class MockCrm {
  constructor(name) {
    this.name = name;
    this.records = {};
  }
  async upsert(objectType, id, fields) {
    this.records[`${objectType}:${id}`] = { objectType, id, ...fields };
  }
  flush(dir) {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `crm_${this.name}.json`);
    fs.writeFileSync(file, JSON.stringify(Object.values(this.records), null, 2));
    return file;
  }
}

// Gong-shaped source: returns { callId, accountId, seller, transcript }.
class MockGong {
  constructor(dir) {
    this.dir = dir;
  }
  listCalls() {
    return fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith(".txt"))
      .map((f) => {
        const raw = fs.readFileSync(path.join(this.dir, f), "utf8");
        const [header, ...body] = raw.split("\n---\n");
        const meta = Object.fromEntries(header.split("\n").map((l) => l.split(": ").map((s) => s.trim())));
        return { callId: f.replace(".txt", ""), accountId: meta.account, seller: meta.seller, transcript: body.join("\n") };
      });
  }
}

module.exports = { MockCrm, MockGong };
