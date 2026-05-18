# Teleport v15 Ladder Push 001

Date: 2026-05-18

Tank: 山大王 / teleport-main / teleport skill

Mode: score-first ladder push. No code changes during the batch.

## Starting Point

After the v15 public smoke test:

- Rank score: 1090
- Tier: platinum II +90
- Public rank: 497 / 1270
- Published code version: 13
- Code hash: `1e41853cba0e43ed8ce8ca9b6637bb8cf5e580d0075fc0cf6e8ff3067c8d98b6`

## Batch Results

| Match | Opponent | Map | Result | Score | Rank score after |
| --- | --- | --- | --- | --- | ---: |
| `mat_4wR5zPYx3YwCCecVz` | #002 | random | win by stars | 4-2 | 1108 |
| `mat_50zX0zziNlMGKN02M` | hunter | random | win by stars | 6-0 | 1126 |
| `mat_LjCquYxnfA0DCC1yy` | Panadol | random | win by bullet crash | 2-0 | 1144 |
| `mat_DkBYaqQ2JqLLSDWhL` | DarkCat | random | win by stars | 7-0 | 1162 |
| `mat_FKBbj6gKsIY3ENNSQ` | No.0 | random | loss by bullet crash | 4-0 | 1143 |

## Outcome

- Batch record: 4 wins, 1 loss.
- Batch score movement: 1090 -> 1143, +53.
- High-water score: 1162.
- Tier movement: platinum II +90 -> platinum I +43.
- Public rank movement: 497 -> 447, +50 positions.

The batch achieved the immediate goal: climb first, then study the next tier's threats.

## Stop Reason

Stopped after `mat_FKBbj6gKsIY3ENNSQ`.

山大王 was ahead 4-0 on stars, then died to `No.0` after cloak pressure. This is exactly the kind of higher-tier pattern that should be collected before another strategy change. Do not keep random-challenging through repeated cloak crash losses.

## Next Push Rule

For the next ladder push:

- Keep v15 published.
- Continue score-first with one-match checkpoints.
- Stop on any crash loss.
- If the next few losses are mostly cloak or hidden-lane crashes, create a focused cloak-counter candidate after enough evidence, not before.
