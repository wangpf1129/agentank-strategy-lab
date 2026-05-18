# Teleport v15 Star-Race Pressure

Date: 2026-05-18

Tank: 山大王 / teleport-main / teleport skill

Status: v15 was published to AgentTank as code version 13 and passed a one-match public smoke test.

## Why This Change

v14 fixed the repeated same-lane crash pattern while preserving adjacent star pickup tempo, but the public match `mat_33YdaaVLLG42ceArj` exposed a new tactical edge case:

- Star spawned at `[2, 1]`.
- 山大王 had a reachable route, but strict lane safety pushed it onto a slower path.
- The opponent `ading` reached the star first and won by stars, 3-1.

This was not a crash bug. It was a star-race pressure problem: sometimes the safe route loses the objective by one tempo beat.

## Code Change

Candidate: `agentank/teleport-main-v15-candidate.js`

Base: `agentank/teleport-main-v14-candidate.js`

Added `tryStarRacePressure(myDist, enemyDist)`:

- Runs only during urgent star contests.
- Requires both tanks to have finite star paths.
- Does not trigger when 山大王 is already within 3 cells of the star.
- Requires clear line of sight to the enemy.
- Avoids firing when immediate bullet, overload, or hidden-lane danger is active.
- Allows a contest shot or turn-to-shot only when the enemy can plausibly contest the star soon.

The intent is narrow: preserve v14's safety behavior, but avoid passively losing a star race when the enemy is already exposed in a shooting lane.

## Verification

Local checks:

```bash
node --check agentank/teleport-main-v15-candidate.js
node --check agentank/lab/scripts/run-real-challenges.mjs
node --test agentank/lab/scripts/tests/*.test.mjs
```

Result:

- v15 syntax check passed.
- Real-challenge script syntax check passed.
- 36 / 36 lab script tests passed.

Private training gate:

| Candidate | Run | Result | Losses |
| --- | --- | ---: | --- |
| v15 candidate | `agentank/lab/data/simulations/2026-05-18T03-13-55-511Z` | 18 / 18 | none |

Map set:

- `classic`
- `arena`
- `public-map-6`
- `public-map-15`
- `public-map-16`
- `random`

Training bots:

- `nova-scout`
- `azure-hunter`
- `crimson-bastion`

## Publish

Published as AgentTank code version 13.

- Code hash: `1e41853cba0e43ed8ce8ca9b6637bb8cf5e580d0075fc0cf6e8ff3067c8d98b6`
- Notes: `v15: add star-race pressure gate after v14 public sample exposed one-tempo star losses.`

## Public Smoke Test

One capped real challenge was run after publishing v15:

| Match | Opponent | Map | Result | Score | Note |
| --- | --- | --- | --- | --- | --- |
| `mat_6gVVuBhPc7zCINFoK` | 麻辣烫 | random | win by stars | 4-3 | 山大王 trailed 2-3, then converted stars at frames 95 and 114. |

Post-smoke snapshot:

- Rank score: 1090
- Tier: platinum II +90
- Public rank: 497 / 1270
- Record: 220 wins, 195 losses

Session movement from the v14 pre-publish follow-up snapshot:

- Rank score: 1050 -> 1090, +40
- Public rank: 529 -> 497, +32 positions

## Current Risk

v15 has only one public validation match. It should stay on a cautious rollout:

- Stop immediately on a crash loss.
- Stop after any score drop and inspect the replay before another challenge.
- Continue with small batches, not large random queues, until the star-race pressure gate has at least 5 public matches of evidence.
