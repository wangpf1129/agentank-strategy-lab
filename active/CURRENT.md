# Current Tank State

Tank: shield-main
Active source: active/shield-main.js
Baseline source: active/shield-main.js
Candidate source: active/shield-main.js
Strategy architecture: docs/shield-main-strategy-architecture.md

## Isolation

This workspace is currently scoped to tank 4839 `500`. Dark Edge state is parked under `state/tanks/dark-edge/` and should only be touched through explicit Dark Edge scripts or a separate Dark Edge session.

## Current Objective

Goal mode: train shield-main / tank 4839 `500` / boost toward a stable 2600-point phase. Follow the existing method in `docs/agentank-evolution-method.md`, `state/training-space.json`, and `state/cycle.md`: one clear axis per round, leaderboard boost replay reference, publish gates, bounded real challenges with stop-loss, and fast rollback when a candidate keeps drifting down.

## Current Hypothesis

Live shield-main is codeVersion 51 at 1252 after real stop-loss `mat_D7rGhn6agqCLyer30`. v51's recent-boost adjacent-star fix held in that replay; the next cycle should cluster boost-mirror far-star tempo losses before any new code patch.

## Protected Behaviors

- Keep safe immediate star pickup when no hard danger exists.
- Preserve safe adjacent star pickup before ordinary fire, grass, interception, or pressure movement.
- Do not cast boost while a current bullet lane is urgent.
- Do not cast boost while stun or reverse control can turn acceleration into wrong-way movement.
- Boost may be used for valuable safe mid or long folded star routes, especially against mobile opponents or when not leading.
- When direct star race is already lost, boost may be spent to reach a star-control or pressure position instead of continuing a blind star chase.
- Do not spend boost-control on stable closer or near-star routes that can already be won without acceleration.
- Do not spend boost on short routes that would skip or overshoot the star.
- Do not spend boost on wall-capped opening star routes whose first boosted segment ends at an edge wall before reaching the star.
- Do not spend opening boost on a long folded route when a non-mobile opponent has a direct comparable star race.
- Do not cast late boost for an unreachable final star that cannot be collected before the round ends.
- Do not hard-veto valuable folded star routes purely because of route shape; route traces may guide scoring and overshoot guards only.
- When boosted next to a star, hold or turn for a controlled pickup instead of double-stepping through it.
- After boost expires next to a star, collect it before replanning away unless a real bullet, bomb, overload, hidden shooter, hard block, or point-blank enemy pickup makes the tile unsafe.
- Do not reverse-walk into a stun-controlled star pin while stunned or reversed.
- Boost star-control must yield to an adjacent collectible star.
- Boost star-control may favor safe grass stations when they control the current star line, especially in contested star lanes.
- Do not let boost star-control override urgent bullet danger.
- Occupied boost star-control lines should convert into real pressure fire when the enemy gunline is clear.
- Boost confirmed clear shots should fire before far-star value drift while safe adjacent stars remain protected.
- Boost tempo lead should convert into early or mid/late pressure before ordinary far-star walking when no safe nearby star is available.
- Late reachable stars should be collected before wall-only star-line fire.
- Recent boost tempo must not keep holding an unsafe star line after it has gone stale without fire pressure.
- Boost-tempo pressure and non-panic fallback movement must not step into an enemy long lane that is already aimed.
- When leading by two or more stars, boost-tempo pressure must not step into a two-turn enemy long lane.
- Boost skill must treat close enemy firing lanes and overload offset lanes as hard danger before value movement.
- Active enemy overload frames exposed through remaining-frame state are hard offset danger before star or pressure actions.
- Hard danger still outranks stars, grass, pressure fire, bombs, and ordinary pathing.
- Same-row or same-column gunline decisions should be resolved by frame cost before star chasing or turning in place.
- Against stun or cloak skill traps, clear close pressure shots may outrank lane escape only when no current bullet or bomb hard danger exists and our shot frame is no slower than the enemy aim frame.
- Do not idle in grass unless it controls a star line or pressure lane.
- Lead grass control should fire from a safe pressure lane instead of holding empty tempo.
- Stale lead grass control should release to pressure or value pathing instead of holding empty tempo.
- Strategic grass control may outrank ordinary star pathing only when the grass controls a star line or pressure lane, and must stay bounded by safe adjacent star pickup.
- Patrol must not fire dirt unless it opens the current star route.
- Visual speech may add flavor, but it must not change action selection.

## Verification

Before publishing, review code quality and strategy conflicts, then run syntax checks, focused shield-main tests, lab tests, simulation with `AGENTANK_SHIELD_KEY`, and shield-main challenge dry-run. Real challenges require explicit confirmation.
