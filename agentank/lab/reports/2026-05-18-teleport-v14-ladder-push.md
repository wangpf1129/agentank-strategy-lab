# Teleport v14 Ladder Push

Date: 2026-05-18

Tank: 山大王 / teleport-main / teleport skill

Status: v14 candidate passed the private training gate. It has not been published yet in this report.

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

## Publish Plan

v14 is publishable from the training gate perspective.

Recommended rollout:

1. Publish `agentank/teleport-main-v14-candidate.js` to 山大王.
2. Immediately fetch a post-publish tank snapshot and confirm the published code version increments from 11.
3. Run only two to four real challenges first.
4. Prefer maps where the recent loss pattern is now directly covered:
   - `classic`
   - `random`
   - `arena`
5. Stop real challenges on the first score drop or repeated crash loss, then inspect replays before continuing.

## Current Risk

The strategy now balances lane caution and star pickup better than v11 in training, but public ladder opponents are not available through the private simulation endpoint. Real challenge validation is still required before aggressive ladder pushing.
