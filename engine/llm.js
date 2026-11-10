// One door for every LLM call. If no key is set, callers use their deterministic fallback.
// The LLM writes language. It never decides scores, tiers, or routing.
async function complete(prompt, { maxTokens = 600 } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.map((c) => c.text || "").join("").trim();
}

const enabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

module.exports = { complete, enabled };
