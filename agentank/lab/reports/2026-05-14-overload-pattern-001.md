# Overload Pattern #001: 2026-05-14

This experiment isolates #001's opener after the broader bullet-threat-field update still only reached 1 / 4 against #001.

Source mechanics checked against the AgentTank guide:

- `enemy.skill.type`
- `enemy.skill.remainingCooldownFrames`
- `enemy.skill.activeRemainingFrames`
- `enemy.status.overloaded`
- S3 map tiles: `"m"` dirt mounds are blocking and destructible.

Guide: https://agentank.ai/agent-guide

## Root Cause

#001 casts overload immediately, then turns into an offset firing lane.

The previous model only treated overload as dangerous when:

- `enemy.status.overloaded` was visible, or
- overload was immediately ready and already aligned.

That missed replays where #001 armed overload at frame 1, turned for several frames, and then fired a second offset bullet into a star or lane position.

Examples from the prior validation:

- `mat_J1WItVbx1Nw4u0cau`: freeze-main lost on `random`.
- `mat_2zCDN4TlESV7uHgiR`: teleport-main teleported onto `[8,13]`, then died to #001's offset overload bullet.
- `mat_344rXGUb0Sx6UkFnj`: freeze-main lost on `arena`.

## Changes

Published:

- `agentank/tank-captain-freeze-control-v7-candidate.js`

Not published:

- `agentank/teleport-main-v6-candidate.js`

Shared lab model:

- `agentank/lab/scripts/lib/tactical-threats.mjs`
- `agentank/lab/scripts/tests/tactical-threats.test.mjs`

Script support:

- `agentank/lab/scripts/simulate-candidates.mjs`

Behavior changes:

1. Overload is treated as armed when the enemy has overload and its cooldown is positive.
2. Pre-cast overload prediction is bounded to 8 cells and at most one turn.
3. Confirmed armed overload prediction expands to 12 cells and up to a 180-degree setup.
4. Teleport-main gained a candidate-only pickup-trap filter, but it was not published because training comparison was weaker than current v5.

## Test-First Coverage

New tests cover:

- active overload delayed adjacent-lane setup after turning
- bounded #001 opener distance without banning longer star lanes

Verification:

```bash
node --test agentank/lab/scripts/tests/*.test.mjs
node --check agentank/tank-captain-freeze-control-v7-candidate.js
node --check agentank/teleport-main-v6-candidate.js
node --check agentank/lab/scripts/simulate-candidates.mjs
```

Result:

- 25 / 25 tests passed
- all checked scripts passed syntax checks

## Training Simulation

Candidate runs:

| Run | freeze-main | teleport-main | Notes |
| --- | ---: | ---: | --- |
| `2026-05-14T09-42-14-438Z` | 12 / 12 | 10 / 12 | First broad version; simulate summary initially mislabeled non-`me` winners as draws before script fix. |
| `2026-05-14T09-47-03-321Z` | 10 / 12 | 11 / 12 | Pre-cast threat still too broad. |
| `2026-05-14T09-49-22-614Z` | 12 / 12 | 11 / 12 | One-turn pre-cast threat fixed freeze stability. |
| `2026-05-14T09-52-14-742Z` | 10 / 12 | 11 / 12 | Final candidate comparison run. |

Control run using current published local code:

| Run | freeze-main v6 | teleport-main v5 |
| --- | ---: | ---: |
| `2026-05-14T09-53-53-545Z` | 10 / 12 | 12 / 12 |

Interpretation:

- freeze-main v7 was not worse than current v6 on the direct control comparison.
- teleport-main v6 was worse than current v5 in the same comparison, so it was not published.

## Published Version

| Tank | Published code version | Code hash |
| --- | ---: | --- |
| 坦克队长 / freeze-main | 7 | `54aae5fc56a6402b8c21228bc58876ba85120944cfee6503d023a4345fd60ac5` |

## Targeted Real Validation

Validation run:

- `agentank/lab/data/challenge-runs/2026-05-14T09-56-43-524Z.json`

Opponent:

- `363` #001 / overload

Maps:

- `random`
- `arena`
- `classic`
- `public-map-6`

Result:

| Tank | Before on #001 subset | After v7 |
| --- | ---: | ---: |
| freeze-main | 1 / 4 | 3 / 4 |

Matches:

| Map | Result | Match |
| --- | --- | --- |
| random | Win by runtime, score 3-3 | `mat_ETFWqjiJB2xDe8BFr` |
| arena | Loss by bullet crash, frame 18 | `mat_4C1U9u4Y8Py9qRzno` |
| classic | Win by bullet crash, frame 25 | `mat_GVVU2LJeej067yOl2` |
| public-map-6 | Win by bullet crash, frame 123 | `mat_C2F6JeBPS3K3Nq6Ed` |

## Post-Validation Snapshot

| Tank | Code version | ELO | Rank |
| --- | ---: | ---: | --- |
| 坦克队长 | 7 | 1150 | 811 / 1003 |

## Interpretation

This was a successful targeted patch for freeze-main against #001: it converted the isolated #001 validation from 1 / 4 to 3 / 4.

It is not a full solution. The remaining arena loss still happens very early: #001 overloads at frame 1, freeze-main freezes at frame 2, then dies at frame 18. The next experiment should inspect arena opening positions and create a map-specific first-20-frame escape rule for #001-style overload opponents.

Teleport-main should stay on published v5 for now. Its v6 candidate needs a separate iteration around post-teleport star pickup escape, especially when the star tile is in a long same-row lane.
