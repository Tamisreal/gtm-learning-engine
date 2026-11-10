---
name: call-analysis
description: "Reads call transcripts and writes competitors mentioned, typed objections with quotes, next step and talk ratio to the opportunity, then turns whitespace into expansion tasks."
stage: BOFU and expansion
---

# Call analysis

Reads call transcripts and writes competitors mentioned, typed objections with quotes, next step and talk ratio to the opportunity, then turns whitespace into expansion tasks.

## When to use

After every recorded call, and in bulk across a book of accounts when planning expansion.

## Judgment

- Rules catch what must never be missed: competitor names and objection types. The LLM adds a summary on top and replaces nothing.
- Quote the buyer. 'Pricing objection' is useless in a forecast call; the exact sentence is not.
- No next step on a call is itself a finding. Flag it to the manager.
- Whitespace (another team, another region, another problem the buyer mentions) is the most valuable thing in the transcript for account management. Make it a task with an owner.

## What good looks like

The opportunity record reflects what was said, and every expansion lead mentioned on a call becomes a task.

See [example.md](example.md) for real output.

## In production

Claude Code analysis of Gong call transcripts to find whitespace across accounts for account management.

## Code

- [engine/calls/analyzeTranscript.js](../../engine/calls/analyzeTranscript.js)

```
node engine/run.js
```
