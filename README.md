# GTM Learning Engine

Nine GTM automations I've built across sales and marketing, rebuilt so you can read them, see their output, and run them. The outbound program learns: every ICP and seniority gets several messages, losers get swapped out, and the winner gets all the volume.

**Start with the table below.** Each row links to a skill folder containing a plain-English description of the judgment involved, a real example of the output, and links to the code. The business problem, target KPI and evidence status for each automation are in [Business Impact](#business-impact-why-i-built-these-nine-automations).

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

## Business Impact: Why I Built These Nine Automations

I built the GTM Learning Engine to solve problems I ran into over and over in sales and revenue operations: account research that ate the day, incomplete CRM data, poor contact coverage, buying signals scattered across five tools, personalization done by hand, things said on calls that never reached the CRM, and outbound programs that optimized for activity instead of revenue.

I did not treat each one as an isolated script. The nine workflows follow the revenue lifecycle: find and prioritize accounts, reach the right people, write relevant outreach, prepare the seller, capture what the buyer said, and feed results back into the next round of messaging. Each one targets a measurable outcome: seller productivity, pipeline generation, conversion efficiency, data quality, or revenue intelligence.

### Before and after

These figures illustrate the potential operational improvements associated with each workflow. They are not independently verified production results from this repository. Actual performance depends on implementation, data quality, workload, and adoption.

| Automation | Before | After | Improvement |
|---|---|---|---|
| Account Research | 30 minutes/account | 5 minutes/account | 83% less research time |
| Bounce Check | 5% bounce rate | 2% bounce rate | 60% reduction |
| Competitor Scan | 100 websites/day | 5,000 websites/day | 50× throughput |
| Personalized Messaging | 10 minutes/contact | 1 minute/contact | 90% less preparation |
| Proof Screenshot | 20 minutes/asset | 3 minutes/asset | 85% less production time |
| Precall Brief | 20 minutes/meeting | 3 minutes/meeting | 85% less preparation |
| Call Analysis | 15 minutes/call | 3 minutes/call | 80% less administration |
| Prospect Landing Page | 60 minutes/page | 5 minutes/page | 92% less production time |
| Message Experiment | 5% positive reply rate | 7.8% positive reply rate | 56% relative improvement |

**How to read the numbers in this README:**

| Type | What it means | Where it appears |
|---|---|---|
| Illustrative target | A planning figure for what the workflow should achieve. Not measured here. | The table above |
| Simulation | Reproducible output of code in this repo, on synthetic data | Message Experiment: `node engine/experiments/rotation.js --trials 50` |
| Repo calculation | Arithmetic the code does on illustrative inputs | Enrichment cost model: `node engine/enrichment/waterfall.js` |
| Historical | Results from my prior roles, not produced by this repo | [Related Historical Business Results](#related-historical-business-results) |

The Message Experiment row uses 5% and 7.8% to show what a 56% relative lift looks like on a typical positive-reply baseline. The simulation itself runs at lower synthetic rates: in the single default run, the static split earns 2,096 positive replies and the rotation earns 3,065 on the same 86,400 sends (about 2.4% vs 3.5%, +46%). The 56% is the mean lift across 50 seeds.

### Account Research

**Business problem:** Reps lose time before every call or email opening the CRM, the call recorder, job boards and the company website to answer "what is going on at this account?"

**What I built:** A Slack command (`/gtm research <account>`) that looks up the account, runs signal detection on its site, lists open roles and intent, and pulls rule-based notes from past calls (objections, next step, whitespace). The LLM writes a two-sentence "why now and first move" from those facts only. An exact-name miss returns "not found" instead of a guess.

**Before:** A rep opens five tabs and assembles context by hand, often skipping research on lower-priority accounts.

**After:** One Slack reply with the facts and a suggested first move. Illustrative target: 30 minutes to 5 minutes per account (83% less).

**Business impact:** Seller productivity. Research time moves to the accounts that deserve it, and call history stops being forgotten.

**Primary KPI:** Research time per account.

**Revenue connection:** At the illustrative rates, an hour of research covers 12 accounts instead of 2. More researched accounts per rep means more relevant first touches on the accounts most likely to convert.

**Evidence status:** Illustrative target. Not measured in this repo. A related historical result is listed [below](#account-and-territory-research).

### Bounce Check

**Business problem:** Stale contacts cause bounces, wasted sequence slots, damage to sending reputation, and a CRM that slowly fills with people who left.

**What I built:** A Slack command (`/gtm bounce <email>`) that checks employment first, then email validity. If the person left, it marks them as left, removes them from sequences and suggests a current contact on the account, or queues the account for sourcing. If they are still there and the email fails, it re-runs a cheapest-first enrichment waterfall, skips the address that bounced, and writes the new email, source and cost to the CRM.

**Before:** A rep researches each bounce on LinkedIn, or ignores it and the contact keeps bouncing.

**After:** The CRM is corrected and the rep gets a verdict in the thread. Illustrative target: bounce rate from 5% to 2% (60% reduction).

**Business impact:** Data quality and pipeline generation. Outreach capacity goes to people who can actually receive it.

**Primary KPI:** Bounce rate.

**Revenue connection:** Every bounced send is a slot that could have reached a buyer, and sustained bounce rates hurt inbox placement for the whole domain.

**Evidence status:** Illustrative target. In this repo the employment check, email verifier and data providers are deterministic mocks, and provider costs and hit rates are illustrative. Verification cannot guarantee delivery: catch-all domains accept mail they may later drop, verifiers disagree, and a valid address still lands in spam if domain health is poor. Replacement-contact suggestions come from contacts already on the account and need a rep's check before outreach.

### Competitor Scan

**Business problem:** Teams cannot see which accounts run a competing product, so competitive displacement campaigns go to the whole list instead of the accounts where they apply.

**What I built:** A scanner that fetches each account's homepage plus seven subpages where tools tend to live (contact, demo, pricing, action center and others), reads the raw HTML for competitor and stack fingerprints, and writes each match with the exact source snippet and URL to a CSV. It is deterministic string matching with a 10-second timeout, a 500KB page cap, a 0.5-second delay between requests, unreachable sites recorded instead of crashing, and `--resume` for long runs.

**Before:** A rep or analyst opens sites one by one and views page source.

**After:** A territory-wide list of named signals, each with evidence a rep can check in seconds. Illustrative target: 100 to 5,000 websites per day (50×). That is consistent with the code: at 8 requests per domain plus the politeness delay, one sequential process covers roughly 5,000 to 10,000 domains a day depending on response times (estimate, not measured).

**Business impact:** Pipeline generation. Creates a defined competitive-replacement segment instead of a guess.

**Primary KPI:** Verified competitor accounts identified.

**Revenue connection:** Displacement messaging sent only to accounts with evidence of a competitor is more relevant, and the evidence snippet gives the rep a specific opener.

**Evidence status:** Illustrative target. A related historical result is listed [below](#competitor-intelligence). A fingerprint on a website is evidence, not proof of a current contract. False positives: a blog post naming the competitor, a leftover script after the account churned, an agency template. False negatives: tools loaded at runtime through a tag manager (the scanner does not execute JavaScript), tools behind a login, pages outside the checked paths, sites that block bots. Treat matches as candidates until a rep or a call confirms them.

### Personalized Messaging

**Business problem:** Generic outreach underperforms, and writing a tailored line for every contact by hand does not scale.

**What I built:** For Tier A and B accounts, the engine picks a message angle from the account's signals (competitor on site, hiring, intent surge or stack fit). Among eligible angles it samples from what has booked meetings so far, so weaker angles still get tested. It then writes one opening line that references the signal, from Claude when an API key is set or a template otherwise, and writes the line, angle, tier and score to Salesforce or HubSpot fields that the sequencer reads as merge fields.

**Before:** An SDR reads the account and writes a first line for each contact, or sends the same line to everyone.

**After:** Every outbound account has a signal-based line in the CRM, and the angle is logged so outcomes trace back to it. Illustrative target: 10 minutes to 1 minute per contact (90% less).

**Business impact:** Seller productivity and conversion efficiency.

**Primary KPI:** Preparation time per personalized message.

**Revenue connection:** More contacts get relevant outreach at the same headcount. Faster production does not by itself raise conversion: a line built on a wrong signal is worse than a generic one, which is why the prompt forbids invented facts and every line carries the signal's evidence.

**Evidence status:** Illustrative target. Not measured in this repo.

### Proof Screenshot

**Business problem:** "Our product tracks the topics you care about" is a claim. Prospects ignore claims.

**What I built:** A script that takes a topic from the prospect's world (their intent topic, or one a rep passes in), counts its mentions across a dataset by region, renders a results view, screenshots it with Playwright, and drafts an email with the count, the top region and the image embedded. In this repo the dataset is a synthetic corpus of 3,000 documents and the results page is generic. Playwright is optional; without it the script writes the HTML view and the email draft.

**Before:** A rep runs the search in the product, takes a screenshot, crops it and writes the email by hand.

**After:** One command produces the screenshot and a draft email. Illustrative target: 20 minutes to 3 minutes per asset (85% less).

**Business impact:** Conversion efficiency. The email becomes a sample of the product instead of a description of it.

**Primary KPI:** Time required to create a usable proof asset.

**Revenue connection:** Could raise meeting rates by showing the prospect something they cannot produce themselves. Not measured.

**Evidence status:** Illustrative target. What the screenshot shows is how often a topic appears in the product's dataset and where. It does not show that the prospect has a problem, or what results they would get from buying.

### Precall Brief

**Business problem:** AEs walk into first calls underprepared, or spend too long preparing, and ask the same generic discovery questions every vendor asks.

**What I built:** For Tier A accounts, a one-screen brief: firmographics, the primary contact, "why now" signals each shown with its evidence, the opening angle, and discovery questions tied to each signal. Questions come from a fixed set mapped to signal types, or from Claude when enabled, told not to invent facts.

**Before:** An AE reads the CRM, the site and LinkedIn in the 20 minutes before the call.

**After:** A brief that can be read in two minutes. Illustrative target: 20 minutes to 3 minutes per meeting (85% less).

**Business impact:** Seller productivity and conversion efficiency.

**Primary KPI:** Meeting preparation time.

**Revenue connection:** Discovery that starts from something specific about the buyer is more likely to surface a real problem, which is what moves a first meeting to an opportunity.

**Evidence status:** Illustrative target. Not measured in this repo.

### Call Analysis

**Business problem:** Objections, competitors, next steps and expansion leads stay trapped in transcripts, and CRM notes are incomplete or missing.

**What I built:** A transcript analyzer. Rules (regex and keyword matching) extract competitor mentions, typed objections (price, timing, integration, security, authority) with the buyer's exact quote, the last stated next step, the seller's talk ratio, and whitespace: lines where the buyer mentions another team, region or problem. Those rule outputs are written to opportunity fields. When an API key is set, Claude adds a three-bullet summary on top; the summary is not written to CRM fields.

**Before:** The rep writes notes after the call, or does not.

**After:** The opportunity record reflects what was said, and whitespace becomes an expansion lead. Illustrative target: 15 minutes to 3 minutes of post-call admin (80% less).

**Business impact:** Revenue intelligence and data quality.

**Primary KPI:** Post-call administrative time.

**Revenue connection:** Better follow-up, more complete CRM data for forecasting, and expansion leads that would otherwise be forgotten.

**Evidence status:** Illustrative target. Not measured in this repo. Validation: rule matches are deterministic and auditable, but they miss paraphrase and can misfire: objections only read buyer turns, yet a buyer who says "we use Salesforce" still gets tagged with an integration objection. In production, AI-generated interpretations should go to the rep for confirmation before they change stage, forecast category, close date or anything a manager reports on. The quote is stored with each objection so that check takes seconds.

### Prospect Landing Page

**Business problem:** After a positive reply, the follow-up is usually a generic deck that does not answer what the prospect asked.

**What I built:** Each positive reply triggers a page for that prospect: their name and title, a headline matched to the angle of the email they replied to, their question quoted back, the signals we noticed, and one booking link tagged with account and angle. In this repo the page is generated from a template as a local HTML file; in production these were built in Lovable from the same inputs.

**Before:** A rep or marketer builds a custom page or one-pager by hand, or skips it.

**After:** A page exists for every positive reply, ready for the rep to review and link. Illustrative target: 60 minutes to 5 minutes per page (92% less).

**Business impact:** Conversion efficiency and seller productivity.

**Primary KPI:** Production time per personalized page.

**Revenue connection:** Could raise positive-reply-to-meeting conversion, and the tagged booking link traces each meeting back to the message that earned it.

**Evidence status:** Illustrative target. Not measured in this repo. The page content is generated and has not been reviewed. Headlines make statements (for example, what changes when moving off a competitor), so a rep or marketer should check every claim before the link goes to a buyer.

### Message Experiment

**Business problem:** Outbound teams pick messaging on instinct or blended reply rates, and a message that wins overall can lose in every segment that matters.

**What I built:** A weekly rotation per ICP and seniority. Three messages run live; nothing is judged before 400 delivered; a message beaten at 95% confidence is retired and replaced from the bench; a message bouncing over 4% is paused as a list problem instead of blamed for its copy; when the bench is empty and the leader beats every live message at 95%, the segment goes all in; if the winner's reply rate drops significantly, the segment reopens.

**Before:** Three messages per segment, split evenly, never changed.

**After:** Each segment converges on its own proven winner. Illustrative target: 5% to 7.8% positive replies (56% relative).

**Business impact:** Revenue intelligence and conversion efficiency.

**Primary KPI:** Positive reply rate by segment.

**Revenue connection:** More positive replies at the same send volume, if the winning messages also produce qualified meetings. Positive replies are a fast, early signal, but the long-term measures are qualified meetings, sales-accepted opportunities and pipeline. A program that only optimizes replies can learn to win polite answers that never become deals, so in production the winner should be checked against meetings and opportunities before it gets all the volume.

**Evidence status:** Simulation. The 56% is the mean lift over 50 seeds on synthetic reply rates (median 55%, 10th to 90th percentile 43% to 73%, worst run +33%; 212 of 228 segments that went all in picked the true best message). It shows the decision rules work when messages really differ. It is not a production result.

## Related Historical Business Results

These come from my work in prior sales, GTM systems and client roles. They informed what I built here. This repository is a clean-room reconstruction on synthetic data, so none of these results were produced by it, and none of that work's code or data is in it.

### Account and territory research

- Manual account and territory mapping took about 4 hours per rep per day.
- The AI-assisted workflow I built took about 30 minutes per rep per day.
- That is an 87.5% reduction, about 3.5 hours per rep per day returned to selling.

This was a workflow in a prior role, not a benchmark from this repository.

### Competitor intelligence

- More than 50,000 company websites analyzed over about three days.
- About 5,000 competitor-related accounts identified for prioritization.

The 5,000 were accounts where the scan detected competitor evidence. They were candidates for outreach, not independently verified competitor installations.

### Contact enrichment

- About 95% contact coverage in prior multi-source enrichment workflows.

Coverage means a contact record was found. It is not the same as 95% accuracy or 95% deliverability.

### Sales productivity

- More than 15 hours of manual work saved per rep per week across prior automation programs.

This is a separate reported outcome. It may overlap with the 3.5 hours per day from account mapping, so the two should not be added together.

### Pipeline contribution

- More than $20 million in pipeline generated or influenced across prior GTM programs.

This figure combines pipeline I generated and pipeline my programs influenced, across multiple roles and clients. It is not attributable to these nine automations as a whole or to any one of them.

## How the Nine Automations Work Together

**Seller productivity.** Account Research, Personalized Messaging, Precall Brief, Call Analysis, Proof Screenshot and Prospect Landing Page take over repetitive research, writing and admin so reps spend more time with buyers.

**Pipeline generation.** Competitor Scan, Account Research and Bounce Check improve who gets targeted and whether outreach reaches them.

**Conversion efficiency.** Personalized Messaging, Proof Screenshot, Prospect Landing Page and Precall Brief make each buyer interaction more specific to that buyer.

**Revenue intelligence.** Call Analysis and Message Experiment turn conversations and campaign results into better decisions next time.

What is connected in code: `node engine/run.js` runs signal detection, scoring and tiering, angle choice, personalized lines, CRM field writes, landing pages for positive replies, Tier A briefs and call analysis in one pass, and outcomes passed with `--outcomes` update the signal weights and angle choice. Account Research and Bounce Check reuse the same signal, call and enrichment modules from Slack. The competitor HTML scan, proof screenshot and message rotation run as separate commands. CRMs, the call recorder, enrichment and verification are mocks, so this is a working reference design, not an integrated production system.

## Why I Built This: Interview Explanation

*Answer to "Walk me through what you built and why."*

> I started in sales, and the thing I kept seeing was that reps weren't short on effort, they were short on time and context. Half a day went to research. Emails bounced and nobody fixed the record. What a buyer said on a call never made it into the CRM. And outbound was judged on activity, not on what turned into pipeline.
>
> So I picked the nine jobs that ate the most seller time or leaked the most revenue, in the order a deal moves: find the right accounts, reach the right people, write something relevant, prepare the rep, capture what the buyer said, and learn which messages work by segment.
>
> The main technical decision was deterministic first, LLM last. Competitor detection, scoring, routing and CRM writes are rules you can audit. The model only writes language, and every call has a template fallback.
>
> I built versions of these in prior roles. In one, account mapping went from about four hours a day to thirty minutes. This repo is a clean-room rebuild on synthetic data, so the 56% lift in the message experiment is a simulation, not a production result.
>
> At Foley I'd start by picking one workflow with a clear baseline, run it on your existing CRM and data with a control group, and measure it against qualified meetings and pipeline before scaling.

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
