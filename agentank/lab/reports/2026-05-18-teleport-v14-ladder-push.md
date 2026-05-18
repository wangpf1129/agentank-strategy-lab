# Teleport v14 Ladder Push

Date: 2026-05-18

Tank: 山大王 / teleport-main / teleport skill

Status: v14 passed the private training gate, was published to AgentTank as code version 12, and has early public ladder validation.

## Live Environment

The first live check in this session showed:

- Rank score: 991
- Tier: platinum III +91
- Public rank: 569 / 1272
- Published code version: 11
- Recent 20 matches: 13 wins, 7 losses

The persisted follow-up snapshot later in the same session showed:

- Rank score: 1050
- Tier: platinum II +50
- Public rank: 529 / 1270
- Published code version: 11
- Files: `agentank/lab/data/fleet/teleport-main/tank.json`, `agentank/lab/data/fleet/teleport-main/matches.json`

After publishing v14 and running early public validation, the latest saved snapshot showed:

- Rank score: 1072
- Tier: platinum II +72
- Public rank: 515 / 1270
- Published code version: 12
- Published code hash: `ef771904cb8c03ff590eb2131046321cab7441c67378c27d90518e218ca2f1b7`
- Record: 219 wins, 195 losses

## Loss Pattern

Recent losing replays concentrated around one tactical pattern:

- Same-row bullet traps after star pursuit.
- Classic center lane `y=7`.
- Random edge or center rows, especially `y=1` and `y=7`.
- Several losses had 山大王 ahead on stars but still died by stepping or staying in a predictable firing lane.

Secondary pattern:

- Over-conservative lane avoidance can cause 0-0 or tied-star `runTime` losses when 山大王 refuses to take an adjacent star.

## Candidate History

`teleport-main-v11-current.js`

- Persisted from the current live AgentTank code version 11.
- Used as the baseline for this session.

`teleport-main-v12-candidate.js`

- Added `oneStepAimAt` to predict enemy move-or-turn firing setups.
- Added `fatalStepAt` to block non-strict star paths from stepping into immediate bullet, quick aim, long lane aim, one-step aim, moving aim, or overload danger.
- Result: safer, but too conservative in at least one arena star pickup.

`teleport-main-v13-candidate.js`

- Allowed far star pickup when the target tile is the star and the enemy is more than 8 cells away.
- Fixed the v12 arena stall, but moved the runTime issue to a random-map star case.

`teleport-main-v14-candidate.js`

- Factored `farStarPickupAt`.
- Added `tryAdjacentStarPickup` before normal path planning.
- This allows adjacent star pickup when the star tile is not fatal, while preserving strict checks for close aim, visible bullets, one-step aim, moving lane setups, and overload.

## Verification

Local verification:

```bash
node --check agentank/teleport-main-v14-candidate.js
node --test agentank/lab/scripts/tests/*.test.mjs
```

Result:

- Candidate syntax check passed.
- 35 / 35 lab script tests passed.

Private training comparisons:

| Candidate | Run | Result | Losses |
| --- | --- | ---: | --- |
| v11 current baseline | `agentank/lab/data/simulations/2026-05-18T02-42-41-040Z` | 16 / 18 | crimson-bastion arena runTime; crimson-bastion random runTime |
| v12 candidate | `agentank/lab/data/simulations/2026-05-18T02-28-50-214Z` | 17 / 18 | azure-hunter arena runTime |
| v13 candidate | `agentank/lab/data/simulations/2026-05-18T02-48-25-016Z` | 17 / 18 | azure-hunter random runTime |
| v14 short regression | `agentank/lab/data/simulations/2026-05-18T02-54-38-685Z` | 2 / 2 | none |
| v14 full gate | `agentank/lab/data/simulations/2026-05-18T02-57-24-312Z` | 18 / 18 | none |

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

## Operational Notes

- `agentank/lab/data/simulations/2026-05-18T02-27-20-072Z` was a sandbox-network failed first attempt and has no simulation result.
- `agentank/lab/data/simulations/2026-05-18T02-45-24-015Z` confirmed that `/api/agent/tank/simulate` only accepts training bots; public leaderboard opponents must be tested through real challenges after publishing.
- The post-publish eligible-opponents endpoint returned an empty opponent list for 山大王, so `run-real-challenges.mjs` now supports `--random-opponent` for controlled small-batch public sampling when targeted challenges are unavailable.

## Public Validation

v14 was published as AgentTank code version 12 with code hash `ef771904cb8c03ff590eb2131046321cab7441c67378c27d90518e218ca2f1b7`.

Small-batch public validation so far:

| Match | Opponent | Map | Result | Score | Note |
| --- | --- | --- | --- | --- | --- |
| `mat_6EFssEaD7XuGdf733` | 蜗牛的大坦克 | random | win by stars | 4-1 | 山大王 collected stars at frames 1, 18, 39, and 119. |
| `mat_33YdaaVLLG42ceArj` | ading | random | loss by stars | 1-3 | 山大王 avoided a dangerous same-column race line and lost the final star by one tempo beat. |
| `mat_04hUrFa1C2L6Kqw0r` | Neo.X | random | win by stars | 4-2 | This appeared in the latest match feed after v14 publication; replay was not part of the controlled two-match run. |

Observed ladder movement in this session:

- Pre-publish follow-up snapshot: rank score 1050, platinum II +50, public rank 529 / 1270.
- Latest post-validation snapshot: rank score 1072, platinum II +72, public rank 515 / 1270.
- Net movement: +22 rank score and +14 public-rank positions.

## Current Risk

The strategy now balances lane caution and star pickup better than v11 in training, and the first public sample is net-positive on rank score. The `ading` loss shows the next improvement target: when 山大王 is racing a star but strict lane safety forces a slower route, it needs a contest action such as earlier interception, firing, or a more aggressive route only when the score swing justifies the risk.
