# Current Tank State

Tank: shield-main
Active source: active/shield-main.js
Baseline source: active/shield-main.js
Candidate source: active/shield-main.js
Strategy architecture: docs/shield-main-strategy-architecture.md

## Isolation

This workspace is currently scoped to tank 4839 `500`. Dark Edge state is parked under `state/tanks/dark-edge/` and should only be touched through explicit Dark Edge scripts or a separate Dark Edge session.

## Current Objective

Iterate shield-main / tank 4839 `500` with the method from `docs/agentank-evolution-method.md` and the space contract in `state/training-space.json`, using real replay review and bounded validation before publishing or challenging.

## Current Hypothesis

Shield-main keeps L0/L1 safety unchanged. This candidate only restores boost star-tempo on valuable safe folded star routes while preserving anti-overshoot landing control.

## Protected Behaviors

- Keep safe immediate star pickup when no hard danger exists.
- Preserve safe adjacent star pickup before ordinary fire, grass, interception, or pressure movement.
- Do not cast boost while a current bullet lane is urgent.
- Boost may be used for valuable safe mid or long folded star routes, especially against mobile opponents or when not leading.
- Do not spend boost on short routes that would skip or overshoot the star.
- When boosted next to a star, hold or turn for a controlled pickup instead of double-stepping through it.
- Boost star-control must yield to an adjacent collectible star.
- Do not let boost star-control override urgent bullet danger.
- Hard danger still outranks stars, grass, pressure fire, bombs, and ordinary pathing.
- Same-row or same-column gunline decisions should be resolved by frame cost before star chasing or turning in place.
- Do not idle in grass unless it controls a star line or pressure lane.
- Strategic grass control may outrank ordinary star pathing only when the grass controls a star line or pressure lane.
- Patrol must not fire dirt unless it opens the current star route.
- Visual speech may add flavor, but it must not change action selection.

## Verification

Before publishing, review code quality and strategy conflicts, then run syntax checks, focused shield-main tests, lab tests, simulation with `AGENTANK_SHIELD_KEY`, and shield-main challenge dry-run. Real challenges require explicit confirmation.
