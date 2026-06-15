# Teleport v24 Lane Escape Live Validation

Date: 2026-06-15

Tank: `947` / 山大王

## Summary

`v24` was built after `v23` follow-up grinding showed repeated bullet crash losses while trying to keep using the grass ambush / star-camping strategy.

Published live:

- `codeVersion`: `42`
- `codeHash`: `18d3e06a7a887ab68f6459f8e66e99a827bdb21c8d1324f603e4d4cc321c788e`
- final confirmed score: `600`
- final tier: `gold III +0`

## Code Change

Source: `teleport-main-v24-candidate.js`

- Kept `v23` strategy surface.
- Added an immediate firing-lane escape when the enemy is already facing our current tile.
- Blocked fallback `me.turn(...)` calls while an enemy bullet can cross the current tile.
- Kept the change narrow; no broad route or scoring rewrite.

## Validation

Local checks:

- `node --check teleport-main-v24-candidate.js`
- `node --test lab/scripts/tests/teleport-v24-strategy.test.mjs`
- `node --test lab/scripts/tests/*.test.mjs`

Private simulation:

- run dir: `agentank/lab/data/simulations/2026-06-15T08-01-46-890Z`
- result: `18-0`

## Runner Change

The live runner now supports:

- `--use-run-history`
- `--history-since <iso>`
- `--max-wins-per-opponent <n>`
- `--drawdown-stop <n>`

Purpose: prevent stale target reuse, rotate after one or two wins, and stop after peak drawdown instead of letting a batch bleed.

## Live Runs

Run logs:

- `lab/data/challenge-runs/2026-06-15T08-04-20-486Z.json`
- `lab/data/challenge-runs/2026-06-15T08-05-07-512Z.json`
- `lab/data/challenge-runs/2026-06-15T08-05-49-658Z.json`
- `lab/data/challenge-runs/2026-06-15T08-06-04-834Z.json`
- `lab/data/challenge-runs/2026-06-15T08-06-25-935Z.json`
- `lab/data/challenge-runs/2026-06-15T08-06-46-058Z.json`

Aggregate:

- start: `588`
- peak: `645`
- final: `600`
- matches: `12`
- wins/losses: `7 / 5`
- net: `+12`

## Target Results

Positive windows:

- `1002`: `2-0`, `+41`
- `2887`: `2-0`, `+39`
- `706`: `2-0`, `+36`

Mixed:

- `322`: `1-1`, `-8`

Block for now:

- `1268`: `0-1`, `-23`
- `2504`: `0-1`, `-24`
- `3424`: `0-1`, `-24`
- `1767`: `0-1`, `-25`

## Finding

`v24` is better than continuing raw `v23`: it recovered from the post-v23 low and showed real wins against earlier crash opponents. But it is not enough for broad blind grinding. The viable policy is now:

- exploit only proven windows;
- allow at most two wins per target;
- stop immediately after a repeated winner turns into a loss;
- avoid broad low-score fallback pools until the next strategy patch.

Next useful code work: analyze `1268`, `2504`, `3424`, and `1767` losses for the remaining early crash pattern.

## Follow-up Climb

User direction: continue live climbing with the current version.

Final confirmed state after the follow-up climb:

- `rankScore`: `750`
- tier: `gold II +50`
- wins/losses: `1343 / 1287`
- `codeVersion`: `42`

Follow-up run window:

- started from: `600`
- ended at: `750`
- peak: `750`
- matches: `46`
- wins/losses: `30 / 16`
- net: `+150`

Follow-up run logs:

- `lab/data/challenge-runs/2026-06-15T08-11-51-934Z.json`
- `lab/data/challenge-runs/2026-06-15T08-12-06-764Z.json`
- `lab/data/challenge-runs/2026-06-15T08-12-23-058Z.json`
- `lab/data/challenge-runs/2026-06-15T08-12-36-433Z.json`
- `lab/data/challenge-runs/2026-06-15T08-13-11-252Z.json`
- `lab/data/challenge-runs/2026-06-15T08-13-27-706Z.json`
- `lab/data/challenge-runs/2026-06-15T08-13-45-948Z.json`
- `lab/data/challenge-runs/2026-06-15T08-14-02-424Z.json`
- `lab/data/challenge-runs/2026-06-15T08-14-28-203Z.json`
- `lab/data/challenge-runs/2026-06-15T08-14-52-004Z.json`
- `lab/data/challenge-runs/2026-06-15T08-16-03-898Z.json`
- `lab/data/challenge-runs/2026-06-15T08-16-46-205Z.json`
- `lab/data/challenge-runs/2026-06-15T08-17-22-239Z.json`
- `lab/data/challenge-runs/2026-06-15T08-17-37-602Z.json`
- `lab/data/challenge-runs/2026-06-15T08-18-11-087Z.json`
- `lab/data/challenge-runs/2026-06-15T08-18-52-769Z.json`
- `lab/data/challenge-runs/2026-06-15T08-19-38-514Z.json`
- `lab/data/challenge-runs/2026-06-15T08-20-50-056Z.json`
- `lab/data/challenge-runs/2026-06-15T08-21-10-794Z.json`
- `lab/data/challenge-runs/2026-06-15T08-21-37-055Z.json`
- `lab/data/challenge-runs/2026-06-15T08-22-10-949Z.json`
- `lab/data/challenge-runs/2026-06-15T08-22-28-131Z.json`
- `lab/data/challenge-runs/2026-06-15T08-22-52-267Z.json`
- `lab/data/challenge-runs/2026-06-15T08-23-08-059Z.json`
- `lab/data/challenge-runs/2026-06-15T08-23-21-435Z.json`
- `lab/data/challenge-runs/2026-06-15T08-23-39-685Z.json`

Strong follow-up windows:

- `3952`: `2-0`, `+47`
- `1863`: `2-0`, `+42`
- `2318`: `2-0`, `+42`
- `2650`: `2-0`, `+38`
- `1006`: `2-0`, `+37`
- `4025`: `2-0`, `+37`
- `352`: `2-0`, `+36`
- `2915`: `2-0`, `+26`
- `1992`: `2-0`, `+14`

Useful but now capped:

- `2887`: `2-1`, `+16` in this follow-up, after earlier `2-0`; its fifth follow-up attempt lost.
- `822`: `2-1`, `+10`; third attempt lost.
- `1597`: `1-0`, `+10`
- `3358`: `1-0`, `+10`

Do not retry without code changes or fresh score-band evidence:

- `2494`: second attempt lost
- `3560`: second attempt lost
- `1180`: second attempt lost
- `2900`: second attempt lost
- `855`: second attempt lost
- `3989`: second attempt lost
- `3068`, `2685`, `1002`, `1396`, `706`, `3730`, `2884`, `37`

Practical live policy after this run: two wins is the hard cap for most targets. A third attempt was usually negative except for `2887`, which lasted longer but still expired.
