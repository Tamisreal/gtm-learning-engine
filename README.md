# GTM Learning Engine

A full-funnel GTM system, marketing and sales, where every outcome feeds back into who gets targeted and what they hear next. Outbound angles, content hooks, and experiments all write to one learning state.

Most outbound stacks are a set of disconnected tools: a list builder, a sequencer, a call recorder, a CRM. Each one makes a decision, and none of them learns from the others. This repo is the connective layer: signals in, decisions out, outcomes back in.

```
            ┌──────────────────────── LEARNING LOOP ─────────────────────────┐
            │  meetings / misses update Beta(α,β) per signal and per angle   │
            ▼                                                                │
  SIGNALS ──► SCORE + TIER ──► CHOOSE ANGLE ──► PERSONALIZE ──► CRM FIELDS ──► SEND
  html scan   learned weights   Thompson         LLM or          Salesforce /     │
  hiring      noisy-OR          sampling         template        HubSpot          │
  intent                                                                          ▼
                                     PRE-CALL BRIEF ◄──── Tier A ◄──── MEETING ◄──┘
                                                                         │
                          EXPANSION TASKS ◄── WHITESPACE ◄── CALL ANALYSIS (Gong)
```

## Run it

Node 18+. No dependencies. No credentials needed.

```bash
node src/simulate.js --save   # 10 learning cycles x 30 runs vs a static playbook
node src/run.js               # one full pass: TOFU -> MOFU -> BOFU, writes out/
node src/slack/server.js research Harbor Health            # Slack research bot, from the CLI
node src/slack/server.js bounce avery.silva@harborhealth.example  # "this email isn't working"
node src/marketing/run.js                                   # research -> hook -> draft -> guardrails -> publish -> learn
node src/marketing/monitor.js                               # competitor posts in last 24h -> drafts to approval queue
node src/marketing/searchDemand.js                          # Search Console export -> long-tail buying-intent page briefs
node src/experiments/abTest.js                              # controlled 4-angle test: 400 min, 95% confidence, one extension
node src/proof/snapshot.js "data centers" ACC-001         # proof screenshot for an email (needs optional playwright)
node src/enrichment/waterfall.js                            # enrichment cost at 1 / 1k / 10k / 50k records
```

Run `node src/slack/server.js` with `SLACK_SIGNING_SECRET` set and it becomes the endpoint for a `/gtm` slash command (verified signatures, 3-second ack, answer posted to `response_url`).

Outputs:
- `out/report.md`: tiered accounts with opening lines, pre-call briefs, call analysis, current learned weights
- `out/pages/<account>.html`: one landing page per prospect, matched to the email's angle
- `out/crm_salesforce.json`, `out/crm_hubspot.json`: the exact field payloads that would be upserted

Set `ANTHROPIC_API_KEY` (see `.env.example`) and the messaging, brief questions, and call summaries are written by Claude instead of templates. Scores, tiers, and routing never come from the LLM.

## Modules

This is a clean-room rebuild. Every line here was written fresh against synthetic data.

| Stage | Module | What it does | Production version I ran |
|---|---|---|---|
| TOFU | `signals/detect.js` | Scans raw site HTML for competitor and stack fingerprints, open jobs for buying-motion roles, intent data (6sense-shaped) for active research | Scraper across a full Salesforce territory that detected competitor embed code in page source and wrote matches back to accounts |
| TOFU | `scoring/score.js` | Noisy-OR fit score using **learned** per-signal meeting rates, relative A/B/C tiers | Territory scoring and tiering for prioritizing a book of accounts |
| TOFU | `enrichment/waterfall.js` | Providers tried cheapest-first, stop at first verified email, cost tracked per record, volume cost model before any bulk run | Waterfall enrichment for contact discovery and email verification |
| TOFU | `messaging/personalize.js` | Picks a message angle, writes the first line, maps it to Salesforce and HubSpot fields so SDRs get it as a merge field | Signal-based personalized messaging synced to CRM fields for SDR sequences |
| TOFU | `pages/landingPage.js` | Per-prospect landing page built from the same signals and angle as the email | Custom landing pages for every prospect, built in Lovable |
| TOFU | `proof/snapshot.js` | Takes a topic the prospect cares about, counts hits in an internal dataset they cannot search themselves, screenshots the results with Playwright, and embeds the image in the email ("data centers: 2,576 mentions across 23 regions") | Playwright automation that screenshotted our internal product for a prospect's topic, such as how many times data centers were mentioned in bills, and put the screenshot in the email |
| MOFU | `research/precallBrief.js` | Two-minute brief per Tier A account: verified signals with evidence, opening angle, discovery questions | Pre-call research automation |
| BOFU | `calls/analyzeTranscript.js` | Gong-style transcript to competitors mentioned, typed objections with quotes, next step, talk ratio, and **whitespace** (other teams and use cases) that becomes expansion tasks | Claude Code analysis of call transcripts to find whitespace for account management |
| Ops | `slack/commands.js` `bounce` | Rep reports a bad email in Slack. Background check: still at the company? email still valid? If they left, pull them from sequences and suggest a replacement. If they stayed, re-run the waterfall and fix the CRM | Slack bot that ran a back-end employment and email check when a rep flagged a bad email |
| Ops | `slack/commands.js` `research` | "Tell me about this account" in Slack: CRM record, signals, open roles, intent, call notes and whitespace in one reply, LLM summary limited to those facts | Account research bot reps queried from Slack |
| Loop | `experiments/abTest.js` | Controlled test of four angles on one segment: random split, nothing judged before 400 delivered, winner only at z >= 1.96, one extension for close calls, bounce check before blaming copy. Declared results feed the learning state | A live message experimentation engine I built: four angles per segment, the same decision rules |
| Loop | `learning/feedback.js` | Bayesian update per signal and angle, credit assignment across co-occurring signals, Thompson sampling for angle choice | Reply and bounce tracking fed back into targeting and copy |
| Adapters | `adapters/crm.js` | One `upsert(object, id, fields)` interface; mocks write JSON. Live versions swap in jsforce, the HubSpot client, or the Gong API | |

## Marketing

| Module | What it does | Production version I ran |
|---|---|---|
| `marketing/research.js` | Pulls the last 30 days of posts across Reddit, Hacker News, X, YouTube and LinkedIn, groups by topic, ranks by breadth x volume x recency. A spike on one site ranks low; a topic rising on five becomes a content brief | Multi-source research skill run in Claude Code across 10+ sources |
| `marketing/generate.js` | Brief to on-voice copy. Hook style (contrarian, data, how-to, story) is chosen by Thompson sampling on click outcomes. Carousel output is a JSON spec rendered separately | Copywriting workflow with a written voice spec, carousels rendered from JSON to PNG |
| `marketing/guardrails.js` | Fail-closed gate: banned hype words, em dashes auto-fixed, every number must appear in the supplied facts, length per platform, no emoji. One LLM retry with the violations listed, then a template that passes | Voice spec plus scripts that stripped em dashes and banned phrasing before anything posted |
| `marketing/publish.js` | Multi-platform scheduler adapter, one UTM-tagged link per post so clicks trace back to topic and hook. Refuses anything that failed guardrails | Blotato publishing across platforms with CTA tracking |
| `marketing/monitor.js` | Scans competitor accounts, classifies last-24h posts by media type, drafts a response when a post beats that account's own average by 1.5x, queues it for human approval | Profile monitor that classified new posts and auto-drafted carousels for approval before posting |
| `marketing/searchDemand.js` | Search Console export to long-tail, buying-intent queries already getting impressions at positions 5 to 30, ranked by click upside, each turned into a ~415-word page brief | Search Console API scripts plus a short bottom-of-funnel page strategy |

## Production stack this mirrors

**Sales system:** Salesforce as the system of record, Gong for calls, Google Workspace (Sheets, Apps Script, Gmail) as the glue, Qualified for inbound, Lovable for prospect pages, n8n for orchestration and the Slack bots, Claude Code to build and run the automations (including Playwright screenshots).

**Marketing system:** my own content and search work, published through Blotato with Search Console for search demand.

This repo replaces each with a mock behind the same interface so it runs anywhere. HubSpot and 6sense adapters are included because they are common in the stacks this would plug into.

## Design decisions

**Deterministic first, LLM last.** String matching finds a competitor's script tag better than a model does, and costs nothing. The LLM is used where language is the output (opening lines, summaries) and always has a template fallback, so the pipeline never stops because an API is down.

**Learned weights, not guessed weights.** Every signal starts with the same weak prior (about 10%). The system finds out which ones actually book meetings. In the simulation, the "obvious" signal (they run a CRM) is deliberately weak and the less obvious ones (competitor on site, hiring RevOps) are strong. The static playbook leads with the obvious one. The engine learns past it.

**Credit assignment.** A meeting on an account with four signals was not caused by all four. Credit is split by each signal's share of the predicted rate; a miss counts against every signal present. Without this, weak signals that co-occur with strong ones look strong.

**Two loops, two jobs.** Controlled experiments answer "which angle wins for this segment?" with a declared, statistically defensible verdict, and the result gets recorded. Thompson sampling handles the volume between experiments, routing toward what currently looks best without waiting for significance. Experiments set what the team believes. Sampling makes money while the next experiment runs.

**Explore vs exploit.** Angle choice uses Thompson sampling. Winning angles get most of the volume, but losing angles still get tested in proportion to the remaining uncertainty, so the system adapts when the market shifts.

**Tiers are relative.** A is the top 20% of the ranked list, not "score above 0.6", so tiers stay stable as the learned probabilities move.

## Simulation result (synthetic)

Expected meetings per 15 accounts worked, average of 30 independent runs:

```
Static playbook, never learns: 2.99
Cycle  1: 4.75   (+59%)
Cycle  5: 5.95   (+99%)
Cycle 10: 6.14   (+106%)
```

The market, accounts, and outcomes are synthetic. The number to take from this is the shape of the curve, not the lift.

## Known limits and next steps

- **Confounding at small volume.** `stack_fit` appears on most of the 50 seed accounts, so it is still overrated after 10 cycles. Past roughly 500 touches, swap the per-signal Betas for an online logistic regression with interaction terms.
- **Outcome definition.** The loop optimizes meetings. In production it should optimize for qualified pipeline (stage 2+), with meetings as a leading indicator, so it does not learn to book bad meetings.
- **Live adapters.** Salesforce, HubSpot, Gong, the enrichment providers, the email verifier, and the employment check are mocked behind the adapter interface. 6sense is represented as an intent topic and score on the account.
- **Seed data** is generated by `src/seed.js` with a fixed seed. No real companies or people.

## Layout

```
src/
  config.js                 competitors, stack fingerprints, hiring patterns, angles, priors
  signals/detect.js         TOFU signal detection
  scoring/score.js          learned noisy-OR score + tiers
  enrichment/waterfall.js   cheapest-first enrichment + cost model
  messaging/personalize.js  angle -> opening line -> CRM fields
  proof/snapshot.js         topic hit count -> screenshot -> email
  pages/landingPage.js      per-prospect landing page
  slack/commands.js         bounce check + account research bot
  slack/server.js           CLI or Slack slash-command endpoint
  research/precallBrief.js  MOFU brief
  calls/analyzeTranscript.js BOFU call analysis + whitespace
  learning/state.js         Beta state per signal and angle
  learning/feedback.js      credit assignment, Thompson sampling
  marketing/                research, generate, guardrails, publish, monitor, searchDemand, run
  experiments/abTest.js     controlled angle tests with fixed decision rules
  adapters/crm.js           Salesforce / HubSpot / Gong mocks
  pipeline.js run.js simulate.js seed.js llm.js rng.js
data/
  accounts.json             50 synthetic accounts
  transcripts/              3 synthetic calls
```
