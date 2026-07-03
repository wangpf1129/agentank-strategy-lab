# Current Tank State

Tank: dark-edge
Active source: active/dark-edge.js
Baseline source: active/dark-edge.js
Candidate source: active/dark-edge.js
Strategy architecture: docs/dark-edge-strategy-architecture.md

## Current Objective

Iterate Dark Edge with the method from `docs/agentank-evolution-method.md` and the space contract in `state/training-space.json`, using real challenge batches as the final evaluation signal.

## Current Hypothesis

Dark Edge keeps overload geometry, star-tempo arbitration, and gunline frame economy unchanged. This iteration adds strategic grass control ahead of ordinary star pathing while preserving safe near-star pickup and the hard-wall offset fire guard.

## Protected Behaviors

- Keep safe immediate star pickup when no hard danger exists.
- Do not cast overload in a reply-capable direct lane; take a one-frame off-line exit when available, otherwise fire only when already aimed.
- Do not step into a long enemy bullet lane while chasing star line.
- Preserve covered positive-offset overload attacks.
- Ordinary fire must not consume a hard-wall-blocked offset star lane; active overload may still use the covered offset lane.
- Do not cast overload for the wrong-side offset lane.
- Use vertical overload only on the real positive offset lane.
- Active overload should not fire at wrong-side offset targets.
- Leave the gunline after overload instead of firing or holding.
- Do not fire into an active enemy shield.
- Do not chase a low-value far star while already leading on its line.
- Do not idle in grass unless it controls a star line or pressure lane.
- Do not treat wall-blocked nearby star lines as strategic grass control.
- Strategic grass control may outrank ordinary star pathing only when the grass controls a star line or pressure lane.
- In close-contact one-turn kill lanes, take a real exit instead of turning or firing inside the lane.
- Do not spend overload setup frames when a safe near star can be collected first.
- When a star race is clearly lost, stop blind chasing and convert to star-line pressure or interception.
- Same-row or same-column gunline decisions should be resolved by frame cost before overload, star chasing, or turning in place.
- Do not hold or face a star line that is blocked by an indestructible wall; wall-blocked star interception must route around or produce pressure elsewhere.
- Do not hold a contested star line through a destructible blocker; break the blocker when it is the direct star exit.

## Verification

Before publishing, review code quality and strategy conflicts, then run syntax checks, focused Dark Edge tests, lab tests, and challenge dry-run. Simulations are only safety checks; real challenge batches are the final evaluation signal.
