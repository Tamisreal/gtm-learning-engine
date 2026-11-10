---
name: competitor-monitor
description: "Watches competitor accounts, flags posts from the last 24 hours that are outperforming that account's own average, and drafts a response for human approval."
stage: Marketing
---

# Competitor monitor

Watches competitor accounts, flags posts from the last 24 hours that are outperforming that account's own average, and drafts a response for human approval.

## When to use

Daily.

## Judgment

- Traction is relative to the account's own average, not a fixed number. 500 likes is a lot for one account and nothing for another.
- Respond to the topic, not the competitor. The draft takes the other side using only our own facts.
- Nothing publishes on its own. Drafts go to an approval queue.

## What good looks like

A short daily queue of timely drafts, each one a click from approved.

See [example.md](example.md) for real output.

## In production

A profile monitor that classified new posts by format and auto-drafted carousels for approval before posting.

## Code

- [engine/marketing/monitor.js](../../engine/marketing/monitor.js)

```
node engine/marketing/monitor.js
```
