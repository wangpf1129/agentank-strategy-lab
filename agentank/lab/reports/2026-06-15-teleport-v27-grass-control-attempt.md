# Teleport Main v27 Grass-Control Attempt

Date: 2026-06-15

## Observation

Recent live matches supported the user observation:

- `mat_E2WXV82LolZDkclUR` vs `4442`
  - Our shots: `3`
  - Our stars: `0`
  - Our moves / turns: `18 / 105`
  - Grass occupancy estimate from raw replay: `8%`
  - Result: loss by stars, `-19`
- `mat_BPbVuqTSVtW0BetON` vs `1705`
  - Our shots: `2`
  - Our stars: `2`
  - Grass occupancy estimate: `9%`
  - Result: loss by stars, `-29`

The live bot was still mostly star-racing and evasive turning. Grass was an incidental tile, not a primary anchor.

## v27 candidate

Local file: `teleport-main-v27-candidate.js`

Changes:

- Added a wider grass-control anchor that can choose grass up to about 7 path steps from the star when it controls the star lane or predicted enemy route.
- Moved grass-control priority ahead of quiet star rush only after `frame >= 30`, preserving early v26 openings.
- Expanded grass guard firing so a tank already in grass can fire from a wider guard band instead of requiring `dist <= 4` from the star.

Tests:

- Added `lab/scripts/tests/teleport-v27-strategy.test.mjs`
- Full suite passed: `61/61`

Private simulations:

- First aggressive v27 run: `16-2`, too weak.
- After delaying grass-control to `frame >= 30`: `18-0`
  - Run dir: `agentank/lab/data/simulations/2026-06-15T09-06-07-823Z`

## Live validation and rollback

Published v27 as:

- `codeVersion`: `45`
- `codeHash`: `cbc9004c164098b213f7935872037487becdd38b8f62bf8888ecbe5fe60330f3`

First live validation:

- Run log: `lab/data/challenge-runs/2026-06-15T09-08-01-211Z.json`
- Opponent: `2582`
- Match: `mat_42ydU725wJrAkVnVA`
- Result: loss by crash
- Score: `840 -> 815`

The replay showed an early random-map crash after teleporting to `[17,7]`; this was not the intended midgame grass behavior and is not safe to keep live.

Immediate rollback:

- Restored `teleport-main-v26-candidate.js`
- New live `codeVersion`: `46`
- `codeHash`: `1bb08b68b7bb0a61911ba1ed6cb34bc624aedf48d129b8878cf19038fd678631`
- Confirmed score after rollback response: `815 / gold I +15`

## Current decision

Do not use v27 for live climbing.

Keep v27 as a research branch only. The next useful version should not broadly prefer grass. It should target one narrow case:

- if no immediate safe star route exists,
- and the bot is already past opening tempo,
- and grass controls a star lane without creating a direct bullet lane,
- then anchor in grass and fire/hold.

Avoid live targets for now:

- `4442`: two recent losses while defending.
- `1705`: star-race loss.
- `2582`: v27 live crash loss; do not retry until the early random-map lane trap is patched.
