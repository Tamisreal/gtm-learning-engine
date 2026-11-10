---
name: precall-brief
description: "A two-minute brief before a first call: verified signals with evidence, the opening angle, and discovery questions tied to each signal."
stage: MOFU
---

# Precall brief

A two-minute brief before a first call: verified signals with evidence, the opening angle, and discovery questions tied to each signal.

## When to use

Every Tier A first meeting.

## Judgment

- Only verified facts go in the 'why now' section, each with its source.
- Every discovery question ties to a signal. Generic discovery questions are what the buyer has heard from every other vendor.
- Keep it to one screen. A brief nobody reads is worse than no brief.

## What good looks like

An AE reads it in the two minutes before the call and opens with something specific.

See [example.md](example.md) for real output.

## In production

Pre-call research automation built with Claude Code on Salesforce and Google Workspace data.

## Code

- [engine/research/precallBrief.js](../../engine/research/precallBrief.js)

```
node engine/run.js
```
