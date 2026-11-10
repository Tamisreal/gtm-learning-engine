---
name: prospect-landing-page
description: "Builds one landing page per prospect from the same signals and angle as the email, so the link lands on a page about their situation."
stage: TOFU
---

# Prospect landing page

Builds one landing page per prospect from the same signals and angle as the email, so the link lands on a page about their situation.

## When to use

Tier A and B accounts in an active sequence.

## Judgment

- The page must match the email's angle. A competitor-displacement email that links to a generic homepage wastes the click.
- Show what you noticed (the signals) on the page. It proves the email was not a mail merge.
- One call to action, tagged with account and angle so the booking traces back.

## What good looks like

A prospect clicks and sees their company name, the thing you noticed, and one way to book time.

See [example.md](example.md) for real output.

## In production

Per-prospect pages built in Lovable from the same account data.

## Code

- [engine/pages/landingPage.js](../../engine/pages/landingPage.js)

```
node engine/run.js
```
