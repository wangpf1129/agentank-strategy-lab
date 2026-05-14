# Stepwise Ladder Batch 001

Date: 2026-05-14

Purpose: test the new ladder-score-first climb method after noticing that large score-gap challenges are restricted. This batch confirms that the climb path should be one score band at a time, not direct attacks on top-rank tanks.

## Starting Snapshot

| Codename | Tank | Version | Ladder score | Tier | Public rank | Legacy ELO |
| --- | --- | ---: | ---: | --- | ---: | ---: |
| `freeze-main` | 坦克队长 | 7 | 540 | silver I +40 | 816 / 1010 | 1162 |
| `teleport-main` | 山大王 | 5 | 713 | gold II +13 | 495 / 1010 | 1257 |

## Runs

| Tank | Opponent | Opponent score | Maps | Result | Ladder read |
| --- | --- | ---: | --- | --- | --- |
| `freeze-main` | `876` Yakir | 648 | random, arena | 1-3 | Bad target for current freeze build |
| `freeze-main` | `1021` long2ice | 764 | public-map-6 | 0-2 | Too high or map-specific bad matchup |
| `teleport-main` | `253` biubiu | 757 | classic | 5-0 | Strong step target until our score passes it |
| `teleport-main` | `756` Tank 85206 | 765 | random | 1-1 | Viable but needs crash review before repeat |

## Score Movement

| Codename | Before | After | Delta | Rank movement |
| --- | ---: | ---: | ---: | ---: |
| `freeze-main` | 540 | 515 | -25 | 816 to 821 |
| `teleport-main` | 713 | 765 | +52 | 495 to 461 |

`teleport-main` is the current climb vehicle. `freeze-main` should pause public score batches until arena and public-map-6 losses are fixed or avoided.

## Match Evidence

`freeze-main`:
- `mat_AXkPELRkuABBuWV50`: win vs Yakir on random by star.
- `mat_31bbC0zKyEq86M4r0`: loss vs Yakir on arena by crash.
- `mat_BIs7ZcFlVXs76yzox`: loss vs Yakir on random by star.
- `mat_HAr9vYjj4RZ1RkErg`: loss vs Yakir on arena by crash.
- `mat_0WF3lX41xoYBnUjeZ`: loss vs long2ice on public-map-6 by crash.
- `mat_2Y56JTPKvUWJGGlCD`: loss vs long2ice on public-map-6 by crash.

`teleport-main`:
- `mat_0tjHFBNfq85IhJi2N`: win vs biubiu on classic by star.
- `mat_0pvXjqOinLYIgk8kg`: win vs biubiu on classic by star.
- `mat_53aqbbLk1qX8tHVEQ`: win vs biubiu on classic by star.
- `mat_5Y9bzc7xPVhGZFIi9`: win vs biubiu on classic by star.
- `mat_KtFFijHR2dr4XVqg9`: win vs biubiu on classic by crash.
- `mat_DLyratIqo588To9YU`: win vs Tank 85206 on random by star.
- `mat_4bA9LlQ9aFvGa590l`: loss vs Tank 85206 on random by crash.

## Updated Climb Rule

1. Use a score band, not top-rank ambition: same score to +120 `rankScore`.
2. Use 3-5 match batches only.
3. Fetch before and after snapshots every batch.
4. Continue a target only while `rankScore` delta stays positive.
5. When our score passes the target, move to the next band.
6. Top tanks like 🛡 and #001 stay in counter-research, not score farming.

## Next Queue

`teleport-main` at 765:
- First review `mat_4bA9LlQ9aFvGa590l` before repeating Tank 85206.
- Next score-band candidates from the current leaderboard snapshot: `1004` 🍺 overload at 800, `995` 暗王 freeze at 801, `549` xi overload at 813, `510` TapTap IEM No.1 teleport at 819.
- Preferred first test: one dry plan, then a 3-match cap against the lowest reachable target only.

`freeze-main` at 515:
- Do not repeat Yakir arena or long2ice public-map-6.
- Next score-band candidates: `160` 灰烬之灵 cloak at 522, `1041` 海森堡 poison at 579, `338` keke boost at 586, `72` ENIGMA overload at 591.
- Freeze should restart with random/classic only, 3-match cap, and no public-map-6 until crash causes are patched.
