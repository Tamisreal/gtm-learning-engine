---
name: message-experiment
description: "Every ICP and seniority gets its own message library. Losing messages are swapped out for new ones, and the segment goes all in on the winner once it is proven."
stage: Learning
---

# Message experiment

This is where the outbound program teaches itself. Every segment (ICP x seniority) gets several messages written for it. When one is not working, it is swapped out for the next. When one clearly wins, the segment goes all in on it.

## When to use

Always on, for every outbound segment. A VP at a fintech and a manager at a SaaS company do not answer the same email, so each segment learns its own winner.

## How it works, each week, per segment

1. **Three messages live, split evenly.** The rest of that segment's library waits on the bench.
2. **Nothing is judged before 400 delivered.** Early reply rates mostly measure luck.
3. **Swap out what isn't working.** If the leading message beats another at 95% confidence, the loser is retired and the next bench message takes its slot.
4. **Check the list before blaming the copy.** A message bouncing over 4% is paused as a list problem, not retired.
5. **Go all in.** When the bench is empty and the leader beats every live message at 95%, 100% of that segment's volume goes to the winner.
6. **Watch the winner.** If its reply rate drops significantly below what it earned during the test, the segment reopens.

## Judgment

- Segment first, then test. A message that wins on blended numbers can lose in every segment that matters.
- Fixed rules, set before the test starts. Nobody gets to call a winner because they like the copy.
- A segment that never reaches 95% stays split and is reported as still testing. Calling it early is how teams go all in on noise.
- Measure positive replies here. In production, check that the winner also turns into qualified meetings, or the program learns to write emails that get polite no's.

## What good looks like

Against a static program (write three messages per segment, split evenly, never change them), on the same sends and the same synthetic reply rates:

- one 16-week run gets 46% more positive replies
- over 50 seeds the mean lift is 56%, with the worst run at +33%
- 212 of the 228 segments that went all in picked the true best message

Most of the lift comes from two moves: replacing losers with bench messages, and moving volume to the winner once it is proven. The reply rates are synthetic. The decision rules are the part that carries over.

See [example.md](example.md) for the week-by-week log.

## In production

Multiple messages per ICP and seniority, rotated on reply data: underperformers swapped out, winners scaled across the segment.

## Code

- [engine/experiments/rotation.js](../../engine/experiments/rotation.js): the weekly rotation, swap, all-in and drift rules
- [engine/experiments/abTest.js](../../engine/experiments/abTest.js): the significance test and thresholds it uses
- [engine/config.js](../../engine/config.js): ICPs, seniorities and the message library

```
node engine/experiments/rotation.js              # one run, week by week
node engine/experiments/rotation.js --trials 50  # spread across 50 seeds
```
