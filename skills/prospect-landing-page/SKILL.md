---
name: prospect-landing-page
description: "Every positive reply gets a landing page built for that prospect, answering what they asked, linked in the rep's follow-up."
stage: Marketing
---

# Prospect landing page

Every positive reply gets a landing page built for that prospect. The rep's follow-up links to a page about their company, their situation, and the question they asked, instead of a generic deck.

## When to use

A prospect replies positively to outbound. "Send me something I can share with my VP" is the moment a page beats an attachment.

## Judgment

- Build on the reply, not on the send. A page for every cold email is wasted work; a page for someone who raised their hand gets read and forwarded.
- Answer their question first. If they asked how switching works, the page leads with switching.
- Match the email's angle and show what you noticed (the signals). It proves the outreach was not a mail merge.
- One call to action, tagged with account and angle so the booking traces back to the message that earned it.

## What good looks like

The prospect opens the follow-up, sees their company name, their own question answered, and one way to book time, and forwards it to their boss.

See [example.md](example.md) for real output.

## In production

A custom page built in Lovable for every positive reply, from the same account data as the email.

## Code

- [engine/pages/landingPage.js](../../engine/pages/landingPage.js)
- [data/replies.json](../../data/replies.json): synthetic positive replies that trigger the pages

```
node engine/run.js    # writes out/pages/<account>.html for each positive reply
```
