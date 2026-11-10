---
name: content-engine
description: "Research what the market is talking about this month, draft on-voice posts, gate them with guardrails, publish with tracking, and learn which hooks get clicks."
stage: Marketing
---

# Content engine

Research what the market is talking about this month, draft on-voice posts, gate them with guardrails, publish with tracking, and learn which hooks get clicks.

## When to use

Weekly content planning, or any time marketing needs topics grounded in what buyers are actually discussing.

## Judgment

- A topic hot on one site is noise. A topic rising across several sources is a brief.
- Hook style (contrarian, data, how-to, story) is learned from clicks, the same way outbound angles are.
- Guardrails fail closed: banned hype words, no em dashes, no numbers that were not in the supplied facts, length per platform. One LLM retry, then a template that passes.
- Every post carries a tracking link tagged with topic and hook, or the loop has nothing to learn from.

## What good looks like

Posts that sound like an operator, contain no invented numbers, and get better each cycle.

See [example.md](example.md) for real output.

## In production

My own content system: multi-source research in Claude Code, a written voice spec, carousels rendered from JSON, published through Blotato with CTA tracking.

## Code

- [engine/marketing/run.js](../../engine/marketing/run.js)
- [engine/marketing/research.js](../../engine/marketing/research.js)
- [engine/marketing/generate.js](../../engine/marketing/generate.js)
- [engine/marketing/guardrails.js](../../engine/marketing/guardrails.js)
- [engine/marketing/publish.js](../../engine/marketing/publish.js)

```
node engine/marketing/run.js
```
