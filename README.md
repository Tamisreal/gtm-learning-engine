# GTM Learning Engine

Nine GTM automations I've built across sales and marketing, rebuilt so you can read them, see their output, and run them. The outbound program learns: every ICP and seniority gets several messages, losers get swapped out, and the winner gets all the volume.

**Start with the table below.** Each row links to a skill folder containing a plain-English description of the judgment involved, a real example of the output, and links to the code.

## What's here

### Sales

| When this happens | The system does this | See it |
|---|---|---|
| A rep types `/gtm research Acme` in Slack | Pulls the CRM record, signals, open roles, call history and whitespace into one reply | [account-research](skills/account-research/) · [example](skills/account-research/example.md) · [n8n](skills/account-research/n8n.json) |
| A rep says "this email isn't working" in Slack | Checks in the background whether the person left and whether the email is valid, then fixes the CRM or suggests who replaced them | [bounce-check](skills/bounce-check/) · [example](skills/bounce-check/example.md) · [n8n](skills/bounce-check/n8n.json) |
| A territory needs prioritizing | **Competitor HTML scan:** fetches every account's website and subpages, reads the raw source for competitor embeds and stack fingerprints, and records the exact code snippet and URL as evidence | [competitor-scan](skills/competitor-scan/) · [example](skills/competitor-scan/example.md) |
| An SDR is about to send a sequence | Picks the angle, writes the opening line, puts both in CRM fields the sequencer reads | [personalized-messaging](skills/personalized-messaging/) · [example](skills/personalized-messaging/example.md) |
| A prospect cares about a topic they can't measure | Runs it through the product, screenshots the result, puts it in the email: "data centers came up 2,576 times" | [proof-screenshot](skills/proof-screenshot/) · [example](skills/proof-screenshot/example.md) |
| An AE has a first call in 10 minutes | A one-screen brief: verified signals, opening angle, discovery questions tied to each signal | [precall-brief](skills/precall-brief/) · [example](skills/precall-brief/example.md) |
| A call ends | Competitors, objections with quotes, next step and talk ratio go to the opportunity; whitespace becomes an expansion task | [call-analysis](skills/call-analysis/) · [example](skills/call-analysis/example.md) |

### Marketing

| When this happens | The system does this | See it |
|---|---|---|
| A prospect replies positively | Builds a landing page for that prospect: their company, the signals we noticed, and an answer to the question in their reply. The rep links it in the follow-up | [prospect-landing-page](skills/prospect-landing-page/) · [example](skills/prospect-landing-page/example.md) |

### How it learns

| When this happens | The system does this | See it |
|---|---|---|
| Replies come back on outbound | Each ICP and seniority runs its own message library: losing messages are swapped out at 95% confidence, and the segment goes all in on the proven winner. 56% more positive replies than a static split in simulation | [message-experiment](skills/message-experiment/) · [example](skills/message-experiment/example.md) |

## How it fits together

```
 SALES                                    MARKETING              OPS (Slack)
 signals -> score -> angle -> line        positive reply         /gtm research
   -> proof screenshot -> send              -> landing page      /gtm bounce
        |                                   -> follow-up
     replies --------------------------------+
        |                                    -> brief -> call -> analysis
 MESSAGE EXPERIMENT (per ICP x seniority)
 swap out losers, go all in on the winner
```

## In production

This is a clean-room rebuild: every line was written fresh against synthetic data. The production versions ran on Salesforce as the system of record, Gong for calls, Google Workspace as the glue, Qualified for inbound, Lovable for prospect pages, n8n for orchestration and the Slack bots, and Claude Code to build and run the automations (including Playwright).

Here each system is a mock behind the same interface, so the whole thing runs with no credentials. HubSpot and 6sense adapters are included because they are common in the stacks this would plug into.

## Design decisions

**Deterministic first, LLM last.** String matching finds a competitor's script tag better than a model does, and costs nothing. The LLM writes language (opening lines, summaries) and always has a template fallback. Scores, tiers, routing and CRM writes never come from the LLM.

**Segment, then test.** Messages are tested per ICP and seniority, because a blended winner can lose in every segment that matters.

**Fixed rules for swapping and scaling.** Nothing is judged before 400 delivered. A message is retired, and a winner is scaled, only at 95% confidence. Bounces are checked before copy is blamed.
## Run it

Node 18+, no dependencies, no credentials.

```bash
node engine/run.js                     # full sales pass, writes out/
node engine/signals/scanSites.js       # competitor HTML scan (add --live domains.txt for real sites)
node engine/experiments/rotation.js    # message rotation vs static split (add --trials 50)
node engine/slack/server.js research Granite Payments
node engine/buildExamples.js           # regenerate every skills/*/example.md
```

Each skill's `SKILL.md` lists its own command. Optional: `ANTHROPIC_API_KEY` makes Claude write the copy instead of templates. `npm i playwright` adds real screenshots. `SLACK_SIGNING_SECRET` turns `engine/slack/server.js` into a live slash-command endpoint.

## Known limits

- **Synthetic reply rates.** The 56% lift comes from invented rates. It shows the rules work when messages really differ, not what a real program will see.
- **Outcome definition.** The rotation optimizes positive replies. In production it should be checked against qualified meetings, or it learns to win replies that go nowhere.
- **Mocks.** CRM, call recorder, enrichment and verification are mocked behind adapters. The n8n workflows use placeholder URLs for the verifier and data providers.

## Layout

```
skills/<name>/     SKILL.md (judgment), example.md (real output), n8n.json where it ran in n8n
engine/            the code each skill calls
data/              50 synthetic accounts, 3 call transcripts, 3 positive replies (all synthetic)
```
