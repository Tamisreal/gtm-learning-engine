---
name: proof-screenshot
description: "Runs a prospect's topic through the internal product, screenshots the result with Playwright, and puts it in the email: 'data centers came up 2,576 times this session.'"
stage: TOFU
---

# Proof screenshot

Runs a prospect's topic through the internal product, screenshots the result with Playwright, and puts it in the email: 'data centers came up 2,576 times this session.'

## When to use

A prospect cares about a topic they cannot measure themselves, and the product can.

## Judgment

- Pick the topic from the prospect's world (their intent topic, their industry's live issue), not the product's feature list.
- Lead with one number and where it is concentrated. The screenshot is the proof, the sentence is the hook.
- The email stops being a claim about the product and becomes a sample of it.

## What good looks like

An email with a real count, a breakdown, and a screenshot the prospect could not have produced themselves.

See [example.md](example.md) for real output.

## In production

Playwright automation, run through Claude Code, that screenshotted the internal product for a prospect's topic and embedded it in the email.

## Code

- [engine/proof/snapshot.js](../../engine/proof/snapshot.js)

```
node engine/proof/snapshot.js "data centers" ACC-001
```
