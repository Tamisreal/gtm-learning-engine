---
name: learning-loop
description: "Every meeting or miss updates how much the engine trusts each signal and angle, and next week's targeting and messaging use the new weights."
stage: Learning
---

# Learning loop

Every meeting or miss updates how much the engine trusts each signal and angle, and next week's targeting and messaging use the new weights.

## When to use

Always on. This is what makes the rest of the repo a system instead of a set of tools.

## Judgment

- Start every signal at the same weak prior. Let outcomes decide which ones matter.
- Credit assignment: a meeting on an account with four signals was not caused by all four. Split the credit, or weak signals look strong by riding along.
- Route most volume to what is winning, but keep testing the rest in proportion to how unsure you still are (Thompson sampling).
- Optimize for qualified pipeline in production, not just meetings, or the loop learns to book bad meetings.

## What good looks like

The engine beats a static playbook within a few cycles, and its beliefs are inspectable.

See [example.md](example.md) for real output.

## In production

Reply and bounce tracking fed back into targeting and copy.

## Code

- [engine/learning/feedback.js](../../engine/learning/feedback.js)
- [engine/learning/state.js](../../engine/learning/state.js)
- [engine/simulate.js](../../engine/simulate.js)

```
node engine/simulate.js
```
