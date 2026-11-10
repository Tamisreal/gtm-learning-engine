---
name: message-experiment
description: "A controlled test of four message angles on one segment, with fixed rules for when a winner can be declared."
stage: Learning
---

# Message experiment

A controlled test of four message angles on one segment, with fixed rules for when a winner can be declared.

## When to use

When the team needs a defensible answer to 'which message works for this segment?'

## Judgment

- Random split, so no angle gets the easier half of the list.
- No angle is judged before 400 delivered.
- A winner is declared only at 95% confidence. A close test gets one extension, then is recorded as inconclusive and both leaders stay in rotation.
- Check bounce rate before blaming copy. An angle bouncing above 4% has a list problem.

## What good looks like

A recorded verdict per segment that the team can trust, fed back into the learning state.

See [example.md](example.md) for real output.

## In production

A live message experimentation engine I built with the same decision rules.

## Code

- [engine/experiments/abTest.js](../../engine/experiments/abTest.js)

```
node engine/experiments/abTest.js 4
```
