# teleport-main v28 Fei-Fei grass ambush

## Public sample

- Source tank: Fei-Fei, `tnk_FVb6gJUUXP98hBppn`
- Public page snapshot: Champion, Teleport, v13, 207-55-0, 79% win rate, 3002 rank score.
- Recent public replays inspected:
  - `mat_7UWZGHxMx5y6HSzxz`: first teleport `[11,7]`, grass, 97% grass occupancy, star win.
  - `mat_GM4ney8Py4vIdsO7F`: first teleport `[6,7]`, grass, waited then shot predicted route, crash win.
  - `mat_9sWNMB82ma787CBoe`: first teleport `[13,9]`, grass, waited then shot predicted route, crash win.
  - `mat_2UfxWh1bqWgKnE2Om`: first teleport `[12,10]`, grass, waited then shot predicted route, crash win.
  - `mat_9NyvSU3kYhPHnFl4Z`: close-star `Mine` mode, non-grass star race, loss to overload/shot pressure.

## Strategy read

Fei-Fei is not only hiding in grass. The repeatable pattern is:

1. If the star is not an immediate pickup, first-frame teleport to a grass cell that controls the enemy's likely route to the star.
2. Turn into the predicted intercept lane, wait, then fire when the enemy enters the lane.
3. If the star is close and safe, switch to direct pickup instead of forcing grass.
4. Keep a future-lane safety filter. The v27 crash at `mat_42ydU725wJrAkVnVA` came from teleporting to `[17,7]`, then enemy moved to `[17,12]` and shot up the lane.

## v28 implementation

- Added `grassAssassinationTargets`, `bestGrassAssassination`, `tryGrassAssassinationFire`, and `tryGrassAssassinationSetup`.
- v28 now attempts a teleport grass route ambush before quiet star rushing.
- Opening grass traps can be far from the star when they control the enemy's predicted route.
- Added `enemyRouteLaneTrapAt` and applied it to star teleport and pressure fallback selection to avoid repeating the `[17,7]` lane crash.

## Verification

- `node --check teleport-main-v28-candidate.js`
- `node --test lab/scripts/tests/teleport-v28-strategy.test.mjs`
- `node --test lab/scripts/tests/*.test.mjs` -> 66/66 pass.
- Fei-Fei opening replay comparison:
  - `mat_7UWZGHxMx5y6HSzxz`: v28 matched `[11,7]`.
  - `mat_GM4ney8Py4vIdsO7F`: v28 matched `[6,7]`.
  - `mat_9sWNMB82ma787CBoe`: v28 matched `[13,9]`.
  - `mat_2UfxWh1bqWgKnE2Om`: v28 picked nearby grass `[12,9]`.
- Private simulations:
  - Full training set v28: 15-3, same as v26 baseline in the comparison run.
  - Random-only v28 repeat set: 9-0.
- Published as codeVersion 47, codeHash `11df175755d1daba99e30abe44c62ef74ee1656530e736694e821f27bac9eb93`.
- First live validation: `mat_5BPQ8xdmRAmLocP9d` vs `1644` Gus on random, win by crash, +19 rank score, 796 -> 815.

## Live push notes

- v47 live push:
  - `mat_5BPQ8xdmRAmLocP9d` vs `1644` Gus: win by crash, +19, 796 -> 815.
  - `mat_3Q4SLMvsfKP8HJx78` vs `1963` Six Seven Tung: win by crash, +13, 815 -> 828.
  - `mat_H08pzTrsKA0DYKOUV` vs `3231` 铁木真真: loss by crash, -28, 828 -> 800.
  - `mat_KQHvNKHc1xFLpKpe3` vs `2158` Shawn236520: win by crash, +13, 800 -> 813.
  - `mat_GymaoMV2BGL8YCfSR` vs `345` Mutt: win by star, +11, 813 -> 824.
  - `mat_3FWwDxhGZ4F8piY6d` vs `1268` kenyyz-v4: loss by crash, -30, 824 -> 794.

## v48 overload hotfix

- Loss `mat_3FWwDxhGZ4F8piY6d` showed a bad overload matchup:
  - v47 opened with distant grass teleport `[14,7]`.
  - Opponent collected first star at `[12,12]`, activated overload at frame 11, then killed us with the horizontal overload lane at frame 12.
  - v26 would have teleported to `[12,10]`, a closer star position.
- Added regression test: `teleport-main v28 does not take a distant opening grass trap when overload can win the star first`.
- Implementation: opening grass assassination skips distant grass candidates when overload can reach the star no slower than our landing can.
- Verification:
  - `node --test lab/scripts/tests/*.test.mjs` -> 67/67 pass.
  - Random private sim after hotfix: 6-0.
- Published as codeVersion 48, codeHash `4347366e1702f32c5f8f5fb8c7f09a47d8123a87aed86332c8563d9f10aab454`.
- Current live score after publish: 794, Gold II 94 points.

## v48 quick stability check

- Guarded live push after v48:
  - `mat_A3ARuouSeNaLhJZ3D` vs `1277` 小石头1: loss by crash, -29, 794 -> 765.
- Replay read:
  - v48 won the first star after teleporting to `[11,6]`.
  - The game later degraded into close-range star racing. After collecting a star at `[5,11]`, the tank moved back into `[5,12]` while the opponent was adjacent at `[5,11]` facing down, then was immediately hit by the adjacent lane shot.
- Current live state: codeVersion 48, 765 score, Gold II 65 points.
- Conclusion: v48 is not stable enough for blind live climbing. The next candidate should prioritize post-star escape, adjacent enemy lane avoidance, and close-quarter route denial before another large push.

## v49 adjacent-lane guard

- Goal: keep the Fei-Fei style teleport grass ambush as the main strategy, but stop the long-game failure where a post-star route steps deeper into an adjacent enemy firing lane.
- Change:
  - `tryImmediateLaneEscape` now first counter-fires if the enemy is close, same-lane, and already in our barrel line.
  - If counter-fire is not available, it searches for a safe off-lane escape instead of blindly moving forward.
  - The original forward escape is still allowed only when the next tile is not in lane danger.
- Added regression test: `teleport-main v28 does not escape by stepping deeper into an adjacent firing lane`.
- Verification:
  - `node --check teleport-main-v28-candidate.js`
  - `node --test lab/scripts/tests/teleport-v28-strategy.test.mjs` -> 7/7 pass.
  - Per-file test sweep: all `lab/scripts/tests/*.test.mjs` pass, 68/68 total.
  - Private training sim, random only: `lab/data/simulations/2026-06-15T09-53-28-543Z`, 3-0.
  - Private training sim, classic/arena/random: `lab/data/simulations/2026-06-15T09-53-50-153Z`, 9-0.
- Published as codeVersion 49, codeHash `034f4e02a8e45e6c989cd3a782124481a3d86596d25369047e9d3b37ec43d686`.
- Current live state after publish: 765 score, Gold II 65 points.
- Guarded live validation:
  - `mat_EKg2R9wriIoBJ2z2n` vs `1277` 小石头1 on random: win by crash, +14, 765 -> 779.
  - Current live state after validation: 779 score, Gold II 79 points.

## Current queue read

After history filtering, the queue near this band is mostly unfavorable:

- `1444` poison, 669.
- `1277` stun, 634.
- `111` poison, 596.
- `2504` overload, 594.
- `770` boost, 577.
- `2119` freeze, 536.

After v49 validation at 779, the next dry-run queue still starts with `1444` poison, then lower-score `770` boost and `2119` freeze. Recommendation: do not continue blind from this queue. Avoid `3231`, `1268`, `1705`, `2582`, and `4442`; `1277` is no longer a hard avoid after the v49 validation win, but should not be farmed repeatedly. Prefer waiting for closer non-poison/non-overload targets or add more long-game pressure fixes before another large push.
