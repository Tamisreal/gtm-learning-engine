---
name: account-research
description: "Answers 'tell me about this account' from Slack in one reply: CRM record, signals, open roles, intent, call history, whitespace."
stage: Sales ops
---

# Account research

Answers 'tell me about this account' from Slack in one reply: CRM record, signals, open roles, intent, call history, whitespace.

## When to use

A rep is about to call, email, or walk into a meeting and needs context in under a minute, without opening five tabs.

## Judgment

- Pull facts from systems first (CRM, call recorder, site scan). The LLM summarizes those facts and is told not to add any.
- Lead with why now (signals), not with firmographics. Size and industry are already in the CRM; the rep needs what changed.
- Surface call history and whitespace if it exists. The best opener is often something the buyer already said.
- If the account is not found, say so. Never guess at a fuzzy match.

## What good looks like

One Slack message a rep can act on: who to talk to, what changed, what was said last time, one suggested first move.

See [example.md](example.md) for real output.

## In production

Slack bot built in n8n: Slack trigger, Salesforce lookups, Gong call data, Claude summary, reply in thread.

## Code

- [engine/slack/commands.js](../../engine/slack/commands.js)
- [n8n.json](n8n.json): importable n8n workflow

```
node engine/slack/server.js research Granite Payments
```
