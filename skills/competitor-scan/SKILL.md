---
name: competitor-scan
description: "Scans every account's website source for competitor embeds and tech stack, plus open jobs and intent, and writes named signals with evidence to the CRM."
stage: TOFU
---

# Competitor scan

Scans every account's website source for competitor embeds and tech stack, plus open jobs and intent, and writes named signals with evidence to the CRM.

## When to use

Building or refreshing a territory. Run it across every account, not a sample.

## Judgment

- Read the page source, not the visible page. Competitor tools show up as script tags, form actions and widget IDs.
- Check the subpages where tools actually live (action center, contact, demo), not just the homepage.
- Exclude your own product's fingerprints and any acquired brands, or you will flag your own customers.
- Every signal keeps its evidence string so a rep can verify it in ten seconds. A signal without evidence does not get used.
- Deterministic string matching. This job needs no LLM.

## What good looks like

Each account has a list of named signals, each with the exact evidence that triggered it.

See [example.md](example.md) for real output.

## In production

Scraper over a full Salesforce territory, built with Claude Code, matches written back to account fields.

## Code

- [engine/signals/detect.js](../../engine/signals/detect.js)
- [engine/config.js](../../engine/config.js)

```
node engine/run.js
```
