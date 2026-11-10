# GTM Learning Engine

Thirteen GTM automations I've built across sales and marketing, rebuilt so you can read them, see their output, and run them. They share one feedback loop: every meeting, miss, and click changes who gets targeted and what they hear next.

**Start with the table below.** Each row links to a skill folder containing a plain-English description of the judgment involved, a real example of the output, and links to the code.

## What's here

### Sales

| When this happens | The system does this | See it |
|---|---|---|
| A rep types `/gtm research Acme` in Slack | Pulls the CRM record, signals, open roles, call history and whitespace into one reply | [account-research](skills/account-research/) · [example](skills/account-research/example.md) · [n8n](skills/account-research/n8n.json) |
| A rep says "this email isn't working" in Slack | Checks in the background whether the person left and whether the email is valid, then fixes the CRM or suggests who replaced them | [bounce-check](skills/bounce-check/) · [example](skills/bounce-check/example.md) · [n8n](skills/bounce-check/n8n.json) |
| A territory needs prioritizing | Scans every account's site source for competitor and stack fingerprints, plus hiring and intent, with evidence for each signal | [competitor-scan](skills/competitor-scan/) · [example](skills/competitor-scan/example.md) |
| An SDR is about to send a sequence | Picks the angle, writes the opening line, puts both in CRM fields the sequencer reads | [personalized-messaging](skills/personalized-messaging/) · [example](skills/personalized-messaging/example.md) |
| The prospect clicks the link | They land on a page about their own situation, matched to the email's angle | [prospect-landing-page](skills/prospect-landing-page/) · [example](skills/prospect-landing-page/example.md) |
| A prospect cares about a topic they can't measure | Runs it through the product, screenshots the result, puts it in the email: "data centers came up 2,576 times" | [proof-screenshot](skills/proof-screenshot/) · [example](skills/proof-screenshot/example.md) |
| An AE has a first call in 10 minutes | A one-screen brief: verified signals, opening angle, discovery questions tied to each signal | [precall-brief](skills/precall-brief/) · [example](skills/precall-brief/example.md) |
| A call ends | Competitors, objections with quotes, next step and talk ratio go to the opportunity; whitespace becomes an expansion task | [call-analysis](skills/call-analysis/) · [example](skills/call-analysis/example.md) |

### Marketing

| When this happens | The system does this | See it |
|---|---|---|
| It's time to plan content | Ranks what buyers are discussing across five sources, drafts posts, gates them, publishes with tracking, learns which hooks get clicks | [content-engine](skills/content-engine/) · [example](skills/content-engine/example.md) |
| A competitor's post takes off | Flags it within 24 hours and drafts a response for approval | [competitor-monitor](skills/competitor-monitor/) · [example](skills/competitor-monitor/example.md) |
| Search Console shows near-misses | Finds buying-intent queries you almost rank for and turns each into a short page brief | [search-demand](skills/search-demand/) · [example](skills/search-demand/example.md) |

### How it learns

| When this happens | The system does this | See it |
|---|---|---|
| The team needs to know which message works | A controlled test of four angles with fixed rules: 400 delivered minimum, 95% confidence, one extension | [message-experiment](skills/message-experiment/) · [example](skills/message-experiment/example.md) |
| Any outcome comes back | Updates how much it trusts each signal, angle and hook. Beats a static playbook by about 2x in simulation | [learning-loop](skills/learning-loop/) · [example](skills/learning-loop/example.md) |

## How it fits together

```
 MARKETING                         SALES                                   OPS (Slack)
 research -> draft -> guardrails   signals -> score -> angle -> line       /gtm research
   -> publish (tracked)              -> landing page + proof -> send       /gtm bounce
        |                                -> brief -> call -> analysis
        |                                        |
        +--------------- outcomes ---------------+
                            |
                      LEARNING LOOP
          what to target, which angle, which hook
```

## In production

This is a clean-room rebuild: every line was written fresh against synthetic data. The production versions ran on:

- **Sales:** Salesforce as the system of record, Gong for calls, Google Workspace as the glue, Qualified for inbound, Lovable for prospect pages, n8n for orchestration and the Slack bots, and Claude Code to build and run the automations (including Playwright).
- **Marketing:** my own content and search work, published through Blotato with Search Console data.

Here each system is a mock behind the same interface, so the whole thing runs with no credentials. HubSpot and 6sense adapters are included because they are common in the stacks this would plug into.

## Design decisions

**Deterministic first, LLM last.** String matching finds a competitor's script tag better than a model does, and costs nothing. The LLM writes language (opening lines, summaries) and always has a template fallback. Scores, tiers, routing and CRM writes never come from the LLM.

**Learned weights, not guessed weights.** Every signal starts at the same weak prior. In the simulation the obvious signal (they run a CRM) is deliberately weak; the static playbook leads with it and the engine learns past it.

**Credit assignment.** A meeting on an account with four signals was not caused by all four. Credit is split by each signal's share of the predicted rate, so weak signals cannot look strong by riding along with strong ones.

**Two loops, two jobs.** Experiments give a declared, defensible verdict per segment. Thompson sampling routes volume toward what currently looks best between experiments. Experiments set what the team believes; sampling earns while the next experiment runs.

**Guardrails fail closed.** Generated copy cannot publish with a banned word, an em dash, or a number that was not in the facts it was given.

## Run it

Node 18+, no dependencies, no credentials.

```bash
node engine/run.js                     # full sales pass, writes out/
node engine/simulate.js                # learning loop vs static playbook
node engine/marketing/run.js           # marketing loop
node engine/slack/server.js research Granite Payments
node engine/buildExamples.js           # regenerate every skills/*/example.md
```

Each skill's `SKILL.md` lists its own command. Optional: `ANTHROPIC_API_KEY` makes Claude write the copy instead of templates. `npm i playwright` adds real screenshots. `SLACK_SIGNING_SECRET` turns `engine/slack/server.js` into a live slash-command endpoint.

## Known limits

- **Confounding at small volume.** With 50 seed accounts, a signal present on most accounts stays overrated. Past roughly 500 touches, move to an online logistic regression with interaction terms.
- **Outcome definition.** The loop optimizes meetings. In production it should optimize qualified pipeline, or it learns to book bad meetings.
- **Mocks.** CRM, call recorder, enrichment, verification and publishing are mocked behind adapters. The n8n workflows use placeholder URLs for the verifier and data providers.

## Layout

```
skills/<name>/     SKILL.md (judgment), example.md (real output), n8n.json where it ran in n8n
engine/            the code each skill calls
data/              50 synthetic accounts, 3 synthetic call transcripts
```
