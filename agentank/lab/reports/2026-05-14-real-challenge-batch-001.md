# Real Challenge Batch 001: 2026-05-14

This report records the first large real-battle sampling run for the two primary tanks.

Real battles affect public win/loss records and ELO. The run data is intentionally saved so future strategy changes can be judged against the exact match set.

## Runs

| Run log | Type | Matches | Notes |
| --- | --- | ---: | --- |
| `agentank/lab/data/challenge-runs/2026-05-14T08-48-31-555Z.json` | broad exposure | 80 | Used the old `opponentId` request field. AgentTank treated the opponent as non-targeted, so this is useful broad real-battle data, not leaderboard-target data. |
| `agentank/lab/data/challenge-runs/2026-05-14T08-59-36-202Z.json` | targeted sanity check | 2 | After fixing the field to `opponentTankId`, both matches correctly targeted tank id `70` / 🛡. |
| `agentank/lab/data/challenge-runs/2026-05-14T09-00-07-000Z.json` | targeted leaderboard batch | 80 | Confirmed `0` target mismatches. This is the main evaluation batch. |

The runner was fixed so future targeted challenges send:

```json
{
  "opponentTankId": 70,
  "mapId": "arena"
}
```

## Broad Exposure Batch

This batch is still useful because it exposed both tanks to many public opponents.

| Tank | Matches | Wins | Losses | Win rate |
| --- | ---: | ---: | ---: | ---: |
| freeze-main / 坦克队长 | 40 | 15 | 25 | 37.5% |
| teleport-main / 山大王 | 40 | 18 | 22 | 45.0% |
| Combined | 80 | 33 | 47 | 41.3% |

Outcome categories across all 80 broad matches:

| Category | Count |
| --- | ---: |
| bullet crash | 46 |
| star result | 31 |
| runtime | 3 |

## Targeted Leaderboard Batch

Target set:

- `70` 🛡 / overload
- `367` bi bi la bu / teleport
- `289` ObjectA / cloak
- `338` keke / boost
- `829` DDerek tank / boost
- `8` DKAGENT / shield
- `363` #001 / overload
- `876` Yakir / cloak
- `1021` long2ice / cloak
- `441` Doklead / teleport

Maps:

- `random`
- `classic`
- `arena`
- `public-map-6`

Each target-map pair was played once by each primary tank.

## Targeted Results

| Tank | Matches | Wins | Losses | Win rate | Loss classes |
| --- | ---: | ---: | ---: | ---: | --- |
| freeze-main / 坦克队长 | 40 | 11 | 29 | 27.5% | 21 bullet crash, 7 star, 1 runtime |
| teleport-main / 山大王 | 40 | 18 | 22 | 45.0% | 22 bullet crash |
| Combined | 80 | 29 | 51 | 36.3% | 43 bullet crash, 7 star, 1 runtime |

By opponent:

| Opponent | Skill | Wins | Losses | Win rate | Main signal |
| --- | --- | ---: | ---: | ---: | --- |
| `70` 🛡 | overload | 2 | 6 | 25.0% | overload bullet crashes |
| `367` bi bi la bu | teleport | 4 | 4 | 50.0% | freeze-main loses by stars |
| `289` ObjectA | cloak | 2 | 6 | 25.0% | early bullet crashes |
| `338` keke | boost | 6 | 2 | 75.0% | currently manageable |
| `829` DDerek tank | boost | 5 | 3 | 62.5% | regression mostly improved, arena still dangerous |
| `8` DKAGENT | shield | 0 | 8 | 0.0% | hard counter right now |
| `363` #001 | overload | 2 | 6 | 25.0% | overload remains general issue |
| `876` Yakir | cloak | 2 | 6 | 25.0% | cloak lane ambushes |
| `1021` long2ice | cloak | 3 | 5 | 37.5% | scout target; sample is still small |
| `441` Doklead | teleport | 3 | 5 | 37.5% | teleport mirror pressure |

By map:

| Map | Wins | Losses | Win rate | Main signal |
| --- | ---: | ---: | ---: | --- |
| `random` | 6 | 14 | 30.0% | most losses were bullet crashes |
| `classic` | 9 | 11 | 45.0% | best non-random map, still unstable |
| `arena` | 5 | 15 | 25.0% | worst map; short lanes punish both tanks |
| `public-map-6` | 9 | 11 | 45.0% | better than arena, star losses still matter |

## Failure Patterns

### 1. Overload offset bullets

Sample matches:

- `mat_CodBS8dL93GIJTkAD`: 山大王 vs 🛡 on `arena`
- `mat_DTwvG4AX4qnKbmE3Z`: 坦克队长 vs 🛡 on `arena`

The opponent fires two bullets in adjacent lanes. The current dodge logic still behaves as if the threat is a single bullet or same-lane shot. This is the most important next improvement because it affects both 🛡 and #001.

### 2. Shield opponent lane bait

Sample match:

- `mat_HNbG5vPPVOc1SGFGY`: 坦克队长 vs DKAGENT on `random`

DKAGENT shielded, moved into a vertical lane, then fired as the freeze tank kept moving in the same column. The match included a clear speech event from DKAGENT right before the shot, but the important signal is mechanical: shield tanks can stall, bait a line, then shoot after shield expires.

### 3. Cloak lane ambush

Sample match:

- `mat_Ad5mwLzcD3z18Y7rM`: 山大王 vs Yakir on `random`

Yakir cloaked early, moved into a line, and fired while hidden. The teleport tank walked straight into the known-likely column. Against cloak, we need memory of the last seen enemy position and danger corridors during cloak duration.

### 4. Star pressure is mostly a freeze-main issue

Teleport-main's targeted losses were all bullet crashes. Freeze-main still had 7 star losses and 1 runtime loss. That means teleport-main should prioritize survival after aggressive positioning, while freeze-main needs both survival and better star conversion against teleport opponents.

## Post-Batch Snapshot

After both broad and targeted real runs:

| Tank | Code version | ELO | Record | Rank |
| --- | ---: | ---: | --- | --- |
| 坦克队长 | 5 | 1166 | 49-81-0 | 796 / 957 |
| 山大王 | 3 | 1225 | 46-57-0 | 538 / 957 |

The targeted batch was intentionally difficult. The drop is useful evidence, but the next code changes should be validated before publishing more real matches.

## Next Experiments

1. `bullet-threat-field-v2`
   - Target both tanks.
   - Model the danger cells created by active bullets, immediate enemy fire, and overload adjacent-lane shots.
   - Stop turning in place when a bullet will arrive within the next 1-2 frames.

2. `cloak-memory-corridors`
   - Target both tanks, especially teleport-main.
   - Track last seen enemy position and direction.
   - Treat likely same-row or same-column corridors as dangerous while the enemy is cloaked or hidden in grass.

3. `shield-discipline`
   - Target DKAGENT first.
   - Avoid wasting shots or freeze windows into shield.
   - Prefer star control and lane denial until the shield has expired.

4. `freeze-star-conversion`
   - Target freeze-main only.
   - Improve star pursuit on `classic` and `public-map-6`.
   - Keep the new pre-aim dodge, but avoid becoming too passive after freezing.
