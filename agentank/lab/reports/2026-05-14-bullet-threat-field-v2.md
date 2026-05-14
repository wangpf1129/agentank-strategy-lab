# Bullet Threat Field v2: 2026-05-14

This experiment responds to the first targeted leaderboard batch, where both primary tanks lost too often by bullet crash.

## Root Cause

The prior logic treated danger mostly as:

- the single visible `enemy.bullet`
- direct same-row or same-column aim
- limited hidden-lane memory on freeze-main only

That was too narrow for the current leaderboard meta.

Observed failures:

- `mat_CodBS8dL93GIJTkAD`: 山大王 died to 🛡 overload adjacent-lane shot on `arena`.
- `mat_DTwvG4AX4qnKbmE3Z`: 坦克队长 died to 🛡 lane pressure on `arena`.
- `mat_HNbG5vPPVOc1SGFGY`: 坦克队长 froze DKAGENT, then stayed in the column where DKAGENT resumed and fired.
- `mat_Ad5mwLzcD3z18Y7rM`: 山大王 walked into a likely cloak corridor against Yakir.

## Changes

Local candidates:

- `agentank/tank-captain-freeze-control-v6-candidate.js`
- `agentank/teleport-main-v5-candidate.js`

Shared tactical model:

- `agentank/lab/scripts/lib/tactical-threats.mjs`
- `agentank/lab/scripts/tests/tactical-threats.test.mjs`

Behavior changes:

1. Active bullet horizon increased.
   - The scripts now treat bullets farther away as dangerous because bullets advance two tiles per frame.

2. Overload adjacent-lane prediction added.
   - Same-lane and one-tile offset lanes are considered dangerous when an overload opponent is armed or immediately threatening.

3. Freeze danger follow-through added.
   - When freeze-main freezes to escape a lane threat, it keeps a short panic window so it continues moving out instead of freezing and then remaining in the firing corridor.

4. Teleport landing tightened.
   - teleport-main no longer teleports into near-enemy star positions that are likely to become a same-row or same-column shot within one or two frames.

5. Cloak corridor memory added to teleport-main.
   - When the enemy disappears, last seen movement direction creates a temporary danger corridor.

## Test-First Coverage

New tests were added before implementation for:

- overload same-lane and adjacent-lane threat
- one-turn immediate fire threat
- hidden cloak corridor threat

Local verification:

```bash
node --test agentank/lab/scripts/tests/*.test.mjs
node --check agentank/tank-captain-freeze-control-v6-candidate.js
node --check agentank/teleport-main-v5-candidate.js
```

Result:

- 23 / 23 tests passed
- both candidate scripts passed syntax checks

## Training Simulation

First simulation pass:

- `agentank/lab/data/simulations/2026-05-14T09-19-59-825Z`
- freeze-main: 11 / 12
- teleport-main: 9 / 12

The first version was not published. It over-risked or over-avoided public-map-6 star teleports.

After tightening freeze follow-through and teleport landing rules:

- `agentank/lab/data/simulations/2026-05-14T09-25-59-937Z`
- freeze-main: 12 / 12
- teleport-main: 12 / 12

## Published Versions

| Tank | Published code version | Code hash |
| --- | ---: | --- |
| 坦克队长 / freeze-main | 6 | `0bcac240e26f17f2efa554be651c68f108164d442d833d107a3f5058c9acdc3e` |
| 山大王 / teleport-main | 4 | `693aef6e7f0af3079a6b9b526eec5b5e373ecee4cd17973a07fe44a25574c794` |

## Targeted Real Validation

Validation run:

- `agentank/lab/data/challenge-runs/2026-05-14T09-28-40-471Z.json`

Targeted opponents:

- `70` 🛡 / overload
- `8` DKAGENT / shield
- `363` #001 / overload
- `876` Yakir / cloak

Maps:

- `random`
- `arena`

This exact subset went from 1 / 16 before the change to 9 / 16 after the change.

| Scope | Before | After |
| --- | ---: | ---: |
| Combined | 1 / 16 | 9 / 16 |
| freeze-main | 0 / 8 | 4 / 8 |
| teleport-main | 1 / 8 | 5 / 8 |
| vs 🛡 | 0 / 4 | 3 / 4 |
| vs DKAGENT | 0 / 4 | 2 / 4 |
| vs #001 | 1 / 4 | 1 / 4 |
| vs Yakir | 0 / 4 | 3 / 4 |

Remaining losses after the change:

- teleport-main vs 🛡 on `arena`: `mat_6ngiY572TgtG3EI65`
- freeze-main vs DKAGENT on `random`: `mat_7l7v6WW8vohEk3lmC`
- freeze-main vs DKAGENT on `arena`: `mat_3wgKP5KW3S44QnbV7`
- freeze-main vs #001 on `random`: `mat_J1WItVbx1Nw4u0cau`
- teleport-main vs #001 on `random`: `mat_2zCDN4TlESV7uHgiR`
- freeze-main vs #001 on `arena`: `mat_344rXGUb0Sx6UkFnj`
- teleport-main vs Yakir on `arena`: `mat_JqT5gXufuUEHLSw9q`

## Post-Validation Snapshot

| Tank | Code version | ELO | Record | Rank |
| --- | ---: | ---: | --- | --- |
| 坦克队长 | 6 | 1166 | 54-85-0 | 795 / 979 |
| 山大王 | 4 | 1225 | 51-60-0 | 498 / 979 |

## Interpretation

The change is directionally strong. It did not solve every bullet crash, but it converted the hardest 16-match subset from nearly unwinnable to slightly positive.

The remaining major weakness is #001. Unlike 🛡, #001 still beat both tanks often after v2. The next experiment should isolate #001's replay pattern instead of broadening the danger field further.

## Next Experiment

`overload-pattern-001`

- Focus only on #001 losses.
- Inspect whether #001 uses a different overload timing, different lane offset, or bait pattern.
- Avoid adding more global caution unless the replay evidence shows it is needed.
