---
name: bounce-check
description: "When a rep says 'this email is not working' in Slack, checks in the background whether the person left and whether the email is valid, then fixes the CRM."
stage: Sales ops
---

# Bounce check

When a rep says 'this email is not working' in Slack, checks in the background whether the person left and whether the email is valid, then fixes the CRM.

## When to use

An email bounces or a rep suspects a contact is stale. Instead of a rep researching it by hand, the check runs on its own.

## Judgment

- Check employment before email. If the person left, a new email address is the wrong fix: pull them from sequences and find who replaced them.
- Only suggest a replacement who is still at the company. If nobody is left, queue the account for new-contact sourcing.
- If they are still there and the email verifies, the problem is probably deliverability, not the address. Say so.
- If the email is bad, re-run enrichment and skip the address that just bounced. Log which provider found the new one and what it cost.

## What good looks like

The CRM is corrected, the rep gets a clear verdict in the thread, and nobody spent ten minutes on LinkedIn.

See [example.md](example.md) for real output.

## In production

Slack bot built in n8n against Salesforce, with verification and employment checks run as HTTP steps.

## Code

- [engine/slack/commands.js](../../engine/slack/commands.js)
- [engine/enrichment/waterfall.js](../../engine/enrichment/waterfall.js)
- [n8n.json](n8n.json): importable n8n workflow

```
node engine/slack/server.js bounce taylor.silva@granitepayments.example
```
