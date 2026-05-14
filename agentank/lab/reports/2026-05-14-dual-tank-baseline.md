# Dual Tank Baseline: 2026-05-14

This report is the first baseline for the two primary tanks. It uses authenticated tank snapshots and recent public match summaries, but does not store tank keys.

## Fleet Status

| Codename | Tank | Id | Skill | Version | ELO | Record | Rank |
| --- | --- | ---: | --- | ---: | ---: | --- | --- |
| `freeze-main` | 坦克队长 | 941 | freeze | 4 | 1177 | 16-18-0 | 686 / 908 |
| `teleport-main` | 山大王 | 947 | teleport | 1 | 1242 | 8-6-0 | 87 / 908 |

Initial read:
- `teleport-main` has a better current rank and ELO, but only has 14 public matches. It is promising and underdeveloped.
- `freeze-main` has more development history, but its public record is slightly negative. It needs targeted stabilization.

## Recent Match Summary

### freeze-main

Recent sample: 20 matches.

| Result | Count |
| --- | ---: |
| Wins | 11 |
| Losses | 9 |
| Win rate | 55.0% |

By result reason:

| Reason | Count |
| --- | ---: |
| crashed | 19 |
| star | 1 |

By map:

| Map | Count |
| --- | ---: |
| arena | 13 |
| random | 6 |
| public-map-6 | 1 |

Loss set:

| Match | Opponent | Opponent clue | Map | Cause | Score | Frame |
| --- | --- | --- | --- | --- | --- | ---: |
| `mat_0CKAmePJuXK1xpwYX` | DDerek tank | boost cast at frame 12 | arena | bullet_crash | 2-0 | 22 |
| `mat_6uWJzCNzhR7EfzDw9` | DDerek tank | boost cast at frame 4 | arena | bullet_crash | 1-0 | 26 |
| `mat_GFvqRhouzu39qRBBz` | DDerek tank | boost cast at frame 10 | arena | bullet_crash | 0-0 | 16 |
| `mat_0ggZ45AKg5K5aEYDP` | DDerek tank | boost cast at frame 9 | arena | bullet_crash | 1-0 | 37 |
| `mat_FZqwxTdHa5oEkAfTR` | DDerek tank | boost cast at frame 5 | arena | bullet_crash | 0-0 | 22 |
| `mat_1PAvNLOXWxc8chLXT` | bi bi la bu | teleport at frame 1 | random | bullet_crash | 1-1 | 30 |
| `mat_4uRX8uDgWuUHStr0y` | DKAGENT | shield at frame 21 | random | bullet_crash | 1-2 | 51 |
| `mat_7WY6kB6ikwmBl2ush` | keke | boost at frame 16 | random | bullet_crash | 1-0 | 33 |
| `mat_2QGrceMOAcHKKtW8Z` | 🛡 | overload at frames 1 and 62 | random | bullet_crash | 3-1 | 63 |

Interpretation:
- The immediate freeze-main problem is not star collection. It is crash survival.
- Five losses came from `DDerek tank` on `arena`, with boost showing up early. This is the first focused experiment.
- The strong-opponent losses match the skill-matchup playbook: teleport first-star pressure, shield wasting freeze, boost close-range pressure, and overload second-lane bullets.

First freeze-main experiments:
1. `freeze-arena-boost-counter`: do not let boost tanks force direct early lane deaths on arena.
2. `freeze-overload-adjacent-lane`: model the second overload lane as lethal even when the obvious bullet is blocked.
3. `freeze-shield-discipline`: do not freeze shielded enemies unless it wins a star or prevents death.

### teleport-main

Recent sample: 14 matches.

| Result | Count |
| --- | ---: |
| Wins | 8 |
| Losses | 6 |
| Win rate | 57.1% |

By result reason:

| Reason | Count |
| --- | ---: |
| crashed | 7 |
| runTime | 4 |
| star | 3 |

By map:

| Map | Count |
| --- | ---: |
| random | 12 |
| classic | 2 |

Loss set:

| Match | Opponent | Opponent clue | Map | Cause | Score | Frame |
| --- | --- | --- | --- | --- | --- | ---: |
| `mat_CquBqsHsEOhA2Ak7m` | 小屁墩 | no skill cast detected | random | bullet_crash | 1-0 | 17 |
| `mat_LHy9OGtT7uX4Ehs0x` | Tz | no skill cast detected | random | runtime | 0-0 | 127 |
| `mat_KoQOw8J8kzUGxVSjP` | LuTankv2 | no skill cast detected | random | runtime | 0-0 | 127 |
| `mat_CLvWlFln08I3q5uhQ` | #001 | overload at frames 1 and 50 | random | bullet_crash | 1-1 | 63 |
| `mat_BNUYUyyGiHH2kIUyE` | Yakir | cloak at frame 29 | classic | bullet_crash | 0-1 | 40 |
| `mat_DxLwJ69B8XvG74u3m` | c | no skill cast detected | random | runtime | 0-0 | 127 |

Interpretation:
- teleport-main has stronger ranking potential than freeze-main right now.
- Half of the loss set is runtime with 0-0 scores. That means the tank is sometimes failing to convert teleport into star tempo.
- The crash losses are early enough that teleport landing safety and post-teleport escape scoring should be checked before adding aggressive tricks.

First teleport-main experiments:
1. `teleport-opening-book`: map-specific first star and first anchor selection.
2. `teleport-runtime-fix`: force visible-star pursuit or safe teleport when the game is stuck at 0-0.
3. `teleport-overload-reset`: avoid landing or moving into same row/column against armed overload tanks.

## Shared Next Step

Before changing tank code, create a small matchup matrix:

| Experiment | Tank | Primary evidence | Target |
| --- | --- | --- | --- |
| `freeze-arena-boost-counter` | freeze-main | 5 losses vs DDerek tank on arena | reduce early bullet crashes |
| `freeze-overload-adjacent-lane` | freeze-main | losses vs 🛡 and previous overload sample | reduce offset-bullet deaths |
| `teleport-runtime-fix` | teleport-main | 3 runtime losses at 0-0 | convert idle games into star contests |
| `teleport-opening-book` | teleport-main | skill identity and current v1 baseline | make teleport wins visible and repeatable |

The next implementation should start with replay-level classification for boost, overload, runtime, and teleport usage. That will let us measure whether a candidate improves the intended failure category instead of only checking broad win/loss.

