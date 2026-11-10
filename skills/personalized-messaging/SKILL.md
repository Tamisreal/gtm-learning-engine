---
name: personalized-messaging
description: "Turns signals into a chosen message angle and an opening line, then writes both to CRM fields so SDR sequences use them as merge fields."
stage: TOFU
---

# Personalized messaging

Turns signals into a chosen message angle and an opening line, then writes both to CRM fields so SDR sequences use them as merge fields.

## When to use

After scoring. Tier A and B accounts get a personalized line; Tier C goes to nurture.

## Judgment

- The angle follows the strongest signal: competitor on site, hiring, intent, or stack fit. Which angle actually wins is learned, not assumed.
- One specific line beats a personalized paragraph. Reference the signal, no flattery, no invented facts.
- Write it to fields (Personalization_Line__c, Message_Angle__c) so it flows into whatever sequencer the team uses. Do not make reps copy and paste.
- Log the angle on every send, or the outcome cannot be traced back to it.

## What good looks like

Every outbound account has a line an SDR would actually send, and the angle is recorded for learning.

See [example.md](example.md) for real output.

## In production

Signal-based lines generated with Claude Code and synced to Salesforce fields used in Gong sequences.

## Code

- [engine/messaging/personalize.js](../../engine/messaging/personalize.js)
- [engine/scoring/score.js](../../engine/scoring/score.js)

```
node engine/run.js
```
