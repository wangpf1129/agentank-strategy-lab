# Teleport v15 Diamond I Probe

Date: 2026-05-18

Tank: 山大王 / teleport-main / teleport skill

Mode: score-first probe toward diamond I. No code changes.

## Starting Point

After reaching diamond:

- Rank score: 1200
- Tier: diamond III +0
- Public rank: 428 / 1270
- Published code version: 13
- Code hash: `1e41853cba0e43ed8ce8ca9b6637bb8cf5e580d0075fc0cf6e8ff3067c8d98b6`

Working target:

- Diamond II is likely around 1300.
- Diamond I is likely around 1400.

## Probe Results

| Match | Opponent | Map | Result | Score | Rank score after |
| --- | --- | --- | --- | --- | ---: |
| `mat_A9NoHqDI04N8kr9ky` | Void Stalker | random | loss by stars | 2-5 | 1188 |
| `mat_H56wpPnfhLK6efGEt` | 王大帅 | random | loss by bullet crash | 3-1 | 1166 |

## Outcome

- Probe record: 0 wins, 2 losses.
- Rank score: 1200 -> 1166, -34.
- Tier: diamond III +0 -> platinum I +66.
- Public rank: 428 -> 448.

## Read

This probe says the current random matchmaking pool above 1200 is no longer the same farming environment as late platinum.

Two signals matter:

- `Void Stalker` beat 山大王 by pure star tempo, 5-2.
- `王大帅` killed 山大王 while 山大王 was ahead 3-1 on stars.

This is not a reason to rewrite immediately, but it is enough to stop blind random pushing toward diamond I.

## Next Push Rule

Do not attempt diamond I through unlimited random-opponent challenges with v15.

Safer path:

- First recover to diamond with one-match checkpoints.
- Then switch from random-opponent pushing to target-selected pushing if AgentTank allows eligible opponents.
- Use the diamond-tier losses as evidence for the next candidate only after the score is stable again.
- If the next candidate is needed, prioritize anti-crash discipline while preserving v15's star tempo.
