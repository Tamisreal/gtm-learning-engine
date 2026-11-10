// Brief -> on-voice copy in several formats. Hook style is chosen by the learning loop,
// the same way outbound angles are. Every draft passes guardrails or does not ship:
// one LLM retry with the violations listed, then a template that is known to pass.
const llm = require("../llm");
const { check } = require("./guardrails");
const { betaSample } = require("../rng");

const HOOKS = {
  contrarian: "Open by disagreeing with the common take on this topic.",
  data: "Open with one of the provided numbers.",
  how_to: "Open with the first concrete step to fix the problem.",
  story: "Open with a one-line situation a buyer would recognize.",
};

const TEMPLATES = {
  contrarian: (b) => `Most teams are reading "${b.topic}" wrong. The problem is rarely the tool. It is the process the tool was dropped into.`,
  data: (b) => `${b.facts[0]} across ${b.facts[1]} this month on one topic: ${b.topic}. Here is what the people closest to it keep saying.`,
  how_to: (b) => `If "${b.topic}" is on your list this quarter, start with one thing: write down what a good outcome looks like before you buy anything.`,
  story: (b) => `A VP of Sales asked me last week why nothing changed after the new tool went live. The answer was in "${b.topic}".`,
};

function chooseHook(state, rand) {
  let best;
  let top = -1;
  for (const h of Object.keys(HOOKS)) {
    const { alpha, beta } = state.content[h];
    const d = betaSample(rand, alpha, beta);
    if (d > top) [best, top] = [h, d];
  }
  return best;
}

async function draft(brief, hook, format = "linkedin") {
  const base = [
    `Write a ${format} post (under 1000 characters) on: ${brief.topic}.`,
    `Hook: ${HOOKS[hook]}`,
    `Facts you may use, and no other numbers: ${brief.facts.join("; ")}.`,
    "Voice: plain, specific, B2B operators. No hype words, no em dashes, no emojis. End with one question.",
  ].join("\n");

  let text = await llm.complete(base, { maxTokens: 400 });
  let g = text && check(text, { format, facts: brief.facts });
  if (text && !g.pass) {
    text = await llm.complete(`${base}\n\nYour last draft failed these checks, fix them: ${JSON.stringify(g.violations)}`, { maxTokens: 400 });
    g = check(text, { format, facts: brief.facts });
  }
  if (!text || !g.pass) {
    text = TEMPLATES[hook](brief);
    g = check(text, { format, facts: brief.facts });
  }
  return { topic: brief.topic, hook, format, text: g.fixed, guardrails: g, source: llm.enabled() ? "llm" : "template" };
}

// Same idea as a carousel: one JSON spec, rendered to slides by a separate renderer.
function carouselSpec(brief, hook) {
  return {
    slides: [
      { type: "hook", text: TEMPLATES[hook](brief).split(". ")[0] + "." },
      ...brief.facts.map((f) => ({ type: "proof", text: f })),
      { type: "cta", text: "Comment SYSTEM and I will send the checklist." },
    ],
  };
}

module.exports = { draft, chooseHook, carouselSpec, HOOKS };
