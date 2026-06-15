# Teleport Grass Ambush v20

Date: 2026-06-15

Tank: `947` / 山大王

Source: `teleport-main-v20-candidate.js`

Status: candidate only, not published.

## Hypothesis

Recent live losses are mostly `random` map crash losses, not pure star-race losses. A grass-aware hybrid should keep the `v35` stall-break pressure layer but add a map-conditional branch that:

- teleports or moves to dense grass cells beside a live star;
- uses the grass cell to guard the enemy route to the star;
- avoids forcing the branch on sparse open maps.

## Change

- Added grass-density and star-near-grass gating.
- Added `bestGrassAmbush(...)` to score star-adjacent grass cells by safety, star distance, escape options, and enemy route coverage.
- Added `tryGrassAmbushFire(...)` so the tank can fire or pre-aim from grass at the enemy or its predicted star route.
- Inserted the branch before the normal star teleport decision, after mirror contest and adjacent-star pickup.
- Added VM-based strategy tests for:
  - claiming a dense star-side grass ambush cell;
  - not forcing grass ambush on sparse open maps.

## Verification

- `node --check teleport-main-v20-candidate.js`
- `node --test lab/scripts/tests/*.test.mjs`
  - result: `40` passed, `0` failed

Final private simulation:

- run dir: `agentank/lab/data/simulations/2026-06-15T06-09-09-375Z`
- sample: `27` matches
- opponents: `nova-scout`, `azure-hunter`, `crimson-bastion`
- maps: `classic`, `arena`, `public-map-55`, `public-map-53`, `public-map-16`, `public-map-15`, `public-map-6`, `public-map-1`, `random`
- result: `24` wins / `3` losses

Baseline comparison with `teleport-main-v19-candidate.js` on the same map/opponent set:

- baseline run dir: `agentank/lab/data/simulations/2026-06-15T06-01-08-871Z`
- baseline result: `21` wins / `6` losses

## Findings

- `v20` swept every tested map except `public-map-55` / Teleport Puzzle.
- `public-map-53` / MOBA improved from a baseline runtime loss against `azure-hunter` to a star win.
- `public-map-15` / 土堆迷阵 improved from baseline runtime losses against `azure-hunter` and `crimson-bastion` to wins.
- `public-map-6` / 躲猫猫 improved against `crimson-bastion`.
- `public-map-55` remains a hole: all three final losses were runtime losses on that map.

## Recommendation

Keep `v20` as the next publish candidate only if accepting Teleport Puzzle risk. For a safer publish gate, patch `public-map-55` separately with a dedicated tiny-map route or mound-breaking rule before publishing.
