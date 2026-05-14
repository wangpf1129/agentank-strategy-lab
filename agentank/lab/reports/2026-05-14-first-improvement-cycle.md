# First Improvement Cycle: 2026-05-14

This cycle implemented the first two experiments from the dual-tank baseline:

- `freeze-arena-boost-counter`
- `teleport-runtime-fix`

Both tanks were updated. Real tank keys were used only through environment variables and were not written to the repository.

## Published Versions

| Tank | Local candidate | Published code version | Code hash |
| --- | --- | ---: | --- |
| freeze-main / 坦克队长 | `agentank/tank-captain-freeze-control-v5-candidate.js` | 5 | `cca64bb772f35a07b2f7775e81d6adf5f3d62c081ffa8ef66eac00ae360598e4` |
| teleport-main / 山大王 | `agentank/teleport-main-v4-candidate.js` | 3 | `3de45d64b85592fa102a80e0d1b5a3a04072f6ca9866218366554458fb5dc4f2` |

The teleport candidate is named v4 locally because v2, v3, and v4 were internal candidate iterations. AgentTank assigned it published code version 3.

## freeze-main Experiment

Hypothesis:

Arena losses against boost tanks are caused by staying in short same-row or same-column firing lanes before a bullet exists. The old dodge logic only reacted after the bullet was already present.

Change:

- Added pre-aim danger detection.
- If the enemy can directly or near-immediately aim at the current tile, the tank escapes the line.
- If freeze is ready and turning is needed, freeze is used to buy escape time instead of freezing and then firing in the same danger lane.

Verification:

| Test set | Result |
| --- | --- |
| Training bots on `classic`, `arena`, `public-map-6` | 9 / 9 wins |
| Training bots on `random` | 3 / 3 wins |
| Real challenge: DDerek tank on `arena` | win by star |

Real validation match:

- `mat_FY6bLjDhbAl57NA38`
- Opponent: DDerek tank
- Map: `arena`
- Result: 坦克队长 won by star
- Candidate hash: `cca64bb772f35a07b2f7775e81d6adf5f3d62c081ffa8ef66eac00ae360598e4`

Interpretation:

The targeted arena + boost failure pattern improved in the first real validation. More samples are still needed because one real match is not enough to prove the matchup is solved.

## teleport-main Experiment

Hypothesis:

The previous teleport tank was losing runtime games because it was essentially a default chase/fire script and did not use teleport to convert stars or break stuck routes.

v2 change:

- Added safe star teleport.
- Treated dirt mounds as blocked for pathfinding.
- Added mound clearing.
- Avoided close fire-locked teleport landings.
- Forced star pursuit when games begin to stall.

v2 verification:

| Test set | Result |
| --- | --- |
| Training bots on `classic`, `arena`, `public-map-6` | 9 / 9 wins |
| Training bots on `random` | 3 / 3 wins |
| Real challenge: Tz on `random` | loss by crash |

v2 real validation match:

- `mat_G71KC2zVS4HIHZ4zJ`
- Opponent: Tz
- Result: Tz won by crash
- Candidate hash: `a4b52131409aca8556c597b4bb401e3cbf7e52f20b235e8076df35a29df6122f`

Root cause:

The runtime issue was improved, but a new crash appeared: 山大王 stayed in a short firing line while the opponent had no active bullet and could fire next.

v3 attempt:

- Added pre-aim lane escape.

v3 result:

- Rejected. It over-dodged because it treated same-line positions as dangerous even when the enemy already had an active bullet and could not fire another shot.
- Training regression: 10 / 12 wins, with losses on `arena` and `public-map-6`.

v4 change:

- Kept v2 teleport tempo.
- Added pre-aim lane escape only when the enemy has no active bullet.

v4 verification:

| Test set | Result |
| --- | --- |
| Focused regression set | 6 / 6 wins |
| Remaining training combinations | 6 / 6 wins |
| Real challenge: Tz on `random` | win by crash |

Real validation match:

- `mat_0quPrIKthH6HQbtUw`
- Opponent: Tz
- Result: 山大王 won by crash
- Candidate hash: `3de45d64b85592fa102a80e0d1b5a3a04072f6ca9866218366554458fb5dc4f2`

Interpretation:

The first runtime fix worked enough to convert the Tz matchup from a prior runtime loss into a real win after adding restrained pre-aim escape. The next teleport risk is over-aggression after star teleports against stronger overload and cloak opponents.

## Current Snapshot After Cycle

| Tank | Code version | ELO | Record | Rank |
| --- | ---: | ---: | --- | --- |
| 坦克队长 | 5 | 1177 | 22-22-0 | 638 / 917 |
| 山大王 | 3 | 1244 | 9-9-0 | 308 / 917 |

These public records moved during the work window due to real challenges and outside/public match activity. Use code hashes, not only timestamps, when judging whether a match used a candidate.

## Next Experiments

1. `freeze-overload-adjacent-lane`
   - Target: 🛡 and other overload tanks.
   - Goal: reduce offset-bullet deaths while preserving star wins.

2. `teleport-overload-and-cloak-safety`
   - Target: #001 and Yakir-style opponents.
   - Goal: keep teleport star tempo but avoid post-teleport straight-line deaths.

3. `match-classifier-v2`
   - Add replay classifiers for:
     - enemy active bullet present or absent before same-line death
     - teleport cast followed by death within 10 frames
     - freeze cast followed by no star, no dodge, and no kill
