---
name: search-demand
description: "Finds long-tail, buying-intent queries the site already gets impressions for but does not win, and turns each into a short page brief."
stage: Marketing
---

# Search demand

Finds long-tail, buying-intent queries the site already gets impressions for but does not win, and turns each into a short page brief.

## When to use

Monthly, from a Search Console export.

## Judgment

- Start from queries Google already shows you for. Ranking page 2 for a query is cheaper to fix than ranking from nothing.
- Filter for buying intent: pricing, vs, alternatives, for [segment], how to, template.
- Rank by click upside, not volume.
- Short pages (about 400 words) that answer exactly the query beat long pages that answer everything.

## What good looks like

A ranked list of pages to write, each with the evidence and the expected upside.

See [example.md](example.md) for real output.

## In production

Search Console API scripts plus a short bottom-of-funnel page strategy.

## Code

- [engine/marketing/searchDemand.js](../../engine/marketing/searchDemand.js)

```
node engine/marketing/searchDemand.js
```
