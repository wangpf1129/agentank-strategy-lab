# Teleport Live Grind v21/v22

Date: 2026-06-15

Tank: `947` / 山大王

## Summary

- Started live push from `rankScore 502` on `codeVersion 35`.
- Published `v20` grass ambush candidate as `codeVersion 36`; it reached `564`, then broad fallback losses collapsed the score.
- Rolled back to `v35` as `codeVersion 37`, recovered partially, then built `v21` to address a random-map runtime loss.
- Published `v21` as `codeVersion 38`; it recovered from `339` to a peak of `479`.
- Published `v22` as `codeVersion 39` after `12-0` training sanity, but live validation did not improve the crash-lane issue.
- Final live rollback is `v21` as `codeVersion 40`.

Final confirmed live state:

- `rankScore`: `370`
- tier: `silver III +70`
- wins/losses: `1213 / 1198`
- `codeVersion`: `40`
- `codeHash`: `17efdddb602e08f395f2b1f2b32b6102d2cfaa606264bf259085402817e24464`

## Code Changes

### `v20`

Source: `teleport-main-v20-candidate.js`

- Added star-side grass ambush selection and firing setup.
- Private simulation improved versus `v19` on broad public-map suite: `24-3` vs `21-6`.
- Live result was not stable after the first burst, so it was rolled back.

### `v21`

Source: `teleport-main-v21-candidate.js`

- Added a large-random-map quiet star rush guard.
- Goal: reduce high cumulative runtime when the opponent is not creating visible pressure.
- Verification:
  - `node --check teleport-main-v21-candidate.js`
  - `node --test lab/scripts/tests/*.test.mjs`
  - private random sanity: `6-0`
  - broad training sanity after narrowing: `11-1`; the remaining loss appeared seed/map variance on `public-map-6`.

### `v22`

Source: `teleport-main-v22-candidate.js`

- Added a next-step fire trap model for move-then-shoot lane deaths.
- Verification:
  - `node --check teleport-main-v22-candidate.js`
  - `node --test lab/scripts/tests/*.test.mjs`
  - private training sanity: `12-0`
- Live test still lost to `829`, so `v22` was not kept live.

## Runner Changes

- `lab/scripts/grind-adaptive-real.mjs`
  - added `--explicit-only`
  - added `--stop-on-loss`
- `lab/scripts/lib/adaptive-grind.mjs`
  - added explicit-only queue filtering.
- `lab/scripts/tests/adaptive-grind.test.mjs`
  - added regression coverage to prevent leaderboard fallback from being mixed into explicit target runs.

This matters because broad fallback was the main reason the first live push collapsed after reaching `564`.

## Live Target Results

Useful only in narrow score windows:

- `9` / `691`: still works as low-score recovery, but the gate closes quickly and losses are very expensive when our score is much higher.
- `2920`: worked at `390 -> 426`, then failed at `426` and later failed at `393`.
- `829`: worked strongly at `400 -> 479`, then failed repeatedly and is now blocked.

Blocked targets from this run:

- `2197`: crash loss.
- `1992`: first win, then repeated losses.
- `2920`: no longer safe after the short positive window.
- `829`: no longer safe after the short positive window.
- `896`: loss.
- `3391`: loss.
- Prior blocked same-band targets remain blocked: `3691`, `1351`, `1649`, `1290`, `4094`, `83`.

## Main Finding

The climb is not blocked by grass control alone. The dominant high-band failure is post-star lane exposure:

- 山大王 often gets one or more stars.
- Then it keeps moving into a row/column where the opponent can step or turn into a clean shot.
- The loss is usually a `crashed` result, not a star-race loss.

Representative losses:

- `mat_JeT9ewv7hq54g0vFQ` vs `829`: 山大王 had `3` stars, then died after DDerek boosted into a same-row shot.
- `mat_Ko23uhR1LBt3qIt5a` vs `3391`: mirror opponent converted the lane and killed 山大王 shortly after the star exchange.
- `mat_5YwFhCBMGWc748iZW` vs `9`: separate issue, a large random map caused high runtime; this is what `v21` tries to reduce.

## Recommendation

Do not continue broad live battles from the current code. The next useful work is a focused `v23`:

- replay-driven tests for `mat_JeT9ewv7hq54g0vFQ` and `mat_Ko23uhR1LBt3qIt5a`;
- after collecting a star or while leading, prefer lateral escape over direct star chase when enemy can step into same-lane fire;
- keep `v21`'s large-random runtime guard;
- validate against `829`, `3391`, and training bots before any further live batch.
