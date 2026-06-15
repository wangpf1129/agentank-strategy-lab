# Teleport Main v25/v26 Gold I Push

Date: 2026-06-15

## Final live state

- Tank: `teleport-main` / `山大王`
- Tank id: `947`
- Published code: `teleport-main-v26-candidate.js`
- AgentTank `codeVersion`: `44`
- `codeHash`: `1bb08b68b7bb0a61911ba1ed6cb34bc624aedf48d129b8878cf19038fd678631`
- Final confirmed score: `877`
- Tier: `gold I +77`
- Best live peak this cycle: `906`

## Code changes

### v25

- Added safer movement command semantics: `moveDir()` now returns `true` only when a move or turn is actually queued.
- Added `fireSafe()` so direct attack pressure does not fire while an enemy bullet is crossing the current tile.
- Published as AgentTank `codeVersion 43`.

### v26

- Added lead-preservation star teleport filter.
- When already leading by at least 2 stars, the bot avoids far star teleports if the enemy can step into a lane where one dirt mound or less blocks a shot to the pickup tile.
- This was based on loss `mat_FGspOSF7hE39BrLGT` against `1006`, where the bot led `6-0`, teleported toward a far star, then got hit after the opponent opened the pickup lane.
- Published as AgentTank `codeVersion 44`.

## Verification

- `node --check teleport-main-v25-candidate.js`
- `node --check teleport-main-v26-candidate.js`
- `node --test lab/scripts/tests/*.test.mjs`
  - Result: `58/58` passing.
- v25 private simulation:
  - Run dir: `agentank/lab/data/simulations/2026-06-15T08-39-11-139Z`
  - Result: `18-0`
- v26 private simulation:
  - Run dir: `agentank/lab/data/simulations/2026-06-15T08-46-26-817Z`
  - Result: `18-0`

## Live runs

### v25 run

Run log: `lab/data/challenge-runs/2026-06-15T08-41-54-283Z.json`

- Start: `750`
- Peak: `807`
- End: `777`
- Results: `5-1`
- Gate: `1992` was skipped as `too_far`.
- Wins:
  - `2915`: `+6` to `756`
  - `2318`: `+10` to `766`
  - `1863`: `+12` to `778`
  - `2650`: `+11` to `789`
  - `3952`: `+18` to `807`
- Loss:
  - `1006`: `-30` to `777`, crash loss. Used as v26 target pattern.

### v26 / post-v26 score movement

Confirmed snapshot after v26 publish showed `852 / gold I +52`.

Run log: `lab/data/challenge-runs/2026-06-15T08-48-48-248Z.json`

- Start: `852`
- Peak: `906`
- End: `877`
- Results: `3-1`
- Wins:
  - `2582`: `+18` to `870`
  - `1009`: `+18` to `888`
  - `4442`: `+18` to `906`
- Loss:
  - `1705`: `-29` to `877`, star loss `3-2`.

## Runner change

Added `--climb-policy` to `lab/scripts/grind-adaptive-real.mjs`.

At `700+` score it defaults to:

- `maxWinsPerOpponent: 1`
- `drawdownStop: 25`
- `stopOnLoss: true`

Below `700`, it uses:

- `maxWinsPerOpponent: 2`
- `drawdownStop: 35`
- `stopOnLoss: true`

Explicit `--max-wins-per-opponent` and `--drawdown-stop` still override policy defaults.

## Opponent notes

- Avoid `1006` until the v26 pattern has more live evidence.
- Avoid `1705` until the star-race loss is reviewed; it beat us `3-2` by stars with no crash.
- `2582`, `1009`, and `4442` were positive in the latest high-score run, but do not repeat blindly above `900`; use one-win rotation.
- Continue using `--climb-policy` for any gold I push.
