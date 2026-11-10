// Brand and accuracy gate on every piece of generated copy. Deterministic, fail-closed:
// nothing reaches the publish queue unless it passes. Cheap to run on every draft,
// and it catches the things an LLM gets wrong most often.
const BANNED = ["unlock", "delve", "game-changing", "revolutionary", "supercharge", "skyrocket", "leverage", "utilize", "seamless", "cutting-edge", "in today's fast-paced"];
const MAX_CHARS = { linkedin: 1300, x: 280, carousel_slide: 180, email: 900 };

function check(text, { format = "linkedin", facts = [] } = {}) {
  const violations = [];
  let fixed = text.replace(/\s*[—–]\s*/g, ", "); // em/en dashes -> comma, auto-fixable

  for (const w of BANNED) if (new RegExp(`\\b${w}`, "i").test(fixed)) violations.push({ rule: "banned_word", detail: w });

  // Every number in the copy must appear in the facts the draft was given. Stops invented stats.
  const allowed = new Set(facts.join(" ").match(/\d[\d,.]*%?/g) || []);
  for (const n of fixed.match(/\d[\d,.]*%?/g) || []) {
    if (!allowed.has(n)) violations.push({ rule: "unsupported_number", detail: n });
  }

  if (fixed.length > (MAX_CHARS[format] || 1300)) violations.push({ rule: "too_long", detail: `${fixed.length} > ${MAX_CHARS[format]}` });
  if (/!{2,}/.test(fixed)) violations.push({ rule: "tone", detail: "multiple exclamation marks" });
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(fixed)) violations.push({ rule: "tone", detail: "emoji" });

  return { pass: violations.length === 0, violations, fixed };
}

module.exports = { check, BANNED };
