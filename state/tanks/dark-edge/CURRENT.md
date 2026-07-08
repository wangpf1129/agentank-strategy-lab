# Current Tank State

Tank: dark-edge
Active source: active/dark-edge.js
Baseline source: active/dark-edge.js
Candidate source: active/dark-edge.js
Strategy architecture: docs/dark-edge-strategy-architecture.md

## Current Objective

Iterate Dark Edge with the method from `docs/agentank-evolution-method.md` and the space contract in `state/training-space.json`, using real challenge batches as the final evaluation signal.

## Current Hypothesis

Live Dark Edge is codeVersion 91. This published candidate keeps overload geometry, grass scoring, wall handling, star tempo, and gunline frame economy unchanged while extending L0 hidden-shooter exits: visible bullets can expose fixed grass/cloak shooter lines, and reachable cloak/grass shooter lines can force a safe side exit before generic hidden-shooter speculation causes turn-in-place.

## Protected Behaviors

- Keep safe immediate star pickup when no hard danger exists.
- Do not cast overload in a reply-capable direct lane; take a one-frame off-line exit when available, otherwise fire only when already aimed.
- Do not step into a long enemy bullet lane while chasing star line.
- Treat active enemy overload offset lanes as hard danger even when the enemy cooldown is not ready.
- Treat inferred enemy overload offset bullets from visible primary shots as hard bullet danger.
- Treat reachable cloak shooter lanes from the enemy's last visible pre-cloak position as hard pressure.
- Treat rows or columns exposed by enemy bullets as temporary fixed-shooter pressure.
- If currently sitting on an exposed fixed shooter line, take a safe side exit before turning in place or chasing the star.
- If currently sitting on a reachable cloak or grass shooter line, take a safe side exit before turning in place.
- Do not collect adjacent or near stars that sit inside an enemy overload offset trap.
- In overload mirror games, when the star race is clearly lost, open overload or offset pressure before blind star interception.
- Preserve covered positive-offset overload attacks.
- Ordinary fire must not consume a hard-wall-blocked offset star lane; active overload may still use the covered offset lane.
- Do not cast overload for the wrong-side offset lane.
- Use vertical overload only on the real positive offset lane.
- Active overload should not fire at wrong-side offset targets.
- Leave the gunline after overload instead of firing or holding.
- Do not fire into an active enemy shield.
- Do not chase a low-value far star while already leading on its line.
- Do not idle in grass unless it controls a star line or pressure lane.
- Grass-control hold frames must submit a real action or fall through; `say`-only waiting is not a valid strategy action.
- Do not treat wall-blocked nearby star lines as strategic grass control.
- Strategic grass control may outrank ordinary star pathing only when the grass controls a star line or pressure lane.
- Bound grass control path scans to nearby pressure candidates so runtime budget does not consume long games.
- In close-contact one-turn kill lanes, take a real exit instead of turning or firing inside the lane.
- Do not spend overload setup frames when a safe near star can be collected first.
- When a star race is clearly lost, stop blind chasing and convert to star-line pressure or interception.
- Same-row or same-column gunline decisions should be resolved by frame cost before overload, star chasing, or turning in place.
- Do not hold or face a star line that is blocked by an indestructible wall; wall-blocked star interception must route around or produce pressure elsewhere.
- Do not hold a contested star line through a destructible blocker; break the blocker when it is the direct star exit.

## Verification

Before the next publish, review code quality and strategy conflicts, then run syntax checks, focused Dark Edge tests, lab tests, server simulation, and challenge dry-run. Simulations are only safety checks; real challenge batches are the final evaluation signal and require explicit confirmation. Current v91 gates passed focused Dark Edge tests, syntax/check, Dark Edge simulation, and Dark Edge dry-run; full `npm run test:lab` is blocked by an unrelated dirty shield-main regression and should be cleared before broad repo publish work.
