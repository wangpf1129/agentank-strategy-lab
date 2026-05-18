# Teleport v15 Diamond Push

Date: 2026-05-18

Tank: 山大王 / teleport-main / teleport skill

Mode: score-first push. No code changes.

## Starting Point

After the previous stopped ladder batch:

- Rank score: 1143
- Tier: platinum I +43
- Public rank: 448 / 1270
- Published code version: 13
- Code hash: `1e41853cba0e43ed8ce8ca9b6637bb8cf5e580d0075fc0cf6e8ff3067c8d98b6`

The working assumption was that the next major tier would be reached around 1200 rank score, requiring roughly four clean wins or equivalent defensive gains.

## Push Results

| Match | Side | Opponent | Map | Result | Score |
| --- | --- | --- | --- | --- | --- |
| `mat_ASPZ3pPAMMM5OtSVs` | challenger | carlot | random | win by runtime | 2-2 |
| `mat_93NL2JmcYeR1k777S` | defender | Tz | random | win by stars | 4-2 |

The defensive match landed immediately after the manual challenge and contributed to the same post-push snapshot.

## Outcome

- Rank score: 1143 -> 1200, +57.
- Tier: platinum I +43 -> diamond III +0.
- Public rank: 448 -> 428, +20 positions.
- Record after snapshot: 227 wins, 196 losses.

Goal achieved: 山大王 reached diamond.

## Decision

Stop here and protect the major-tier promotion.

The last known crash pattern before this push was still cloak pressure from `No.0`, so continuing random challenges immediately after hitting diamond would risk giving back the promotion before collecting enough diamond-tier evidence.

## Next Push Rule

For the next session:

- Start from diamond III +0.
- Continue one-match checkpoints.
- Prefer stopping after the first diamond-tier loss unless the replay is a clear low-risk star loss.
- If cloak crash appears again in diamond, collect the replay and build a focused cloak-counter candidate only after the push session is complete.
