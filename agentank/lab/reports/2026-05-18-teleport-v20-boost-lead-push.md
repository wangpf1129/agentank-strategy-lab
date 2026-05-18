# Teleport v20 Boost Lead Push

Date: 2026-05-18

Tank: 山大王 / `teleport-main` / teleport skill

## Goal

Recover ladder score quickly after v19 fell back into platinum I, while avoiding repeat random losses.

## Starting Point

Latest refreshed state before the scoring attempts:

- Rank score: 1110
- Tier: platinum I +10
- Public rank: 482 / 1272
- Published code: v19, code version 14

## v20 Change

Patch: `agentank/teleport-main-v20-candidate.js`

The v19 crash loss to Bom happened while 山大王 led by only one star and stood in a boost tank's firing lane. v19 only activated lead protection at +2 stars. v20 lowers the protection threshold to +1 only against boost tempo threats, and only when the current tile already has a bullet or aim threat.

This keeps early star racing intact while stopping the specific "+1 lead, same-lane boost shot" failure class.

## Verification

Commands:

```bash
node --test agentank/lab/scripts/tests/*.test.mjs
node --check agentank/teleport-main-v20-candidate.js
node --check agentank/lab/scripts/publish-tank-code.mjs
```

Results:

- Unit/script tests: 39 / 39 passing
- Syntax checks: passing
- Training matrix: 18 / 18 wins
- Training run: `agentank/lab/data/simulations/2026-05-18T04-31-37-604Z/run.json`

Published:

- Code version: 15
- Code hash: `294bd1e18359f17e97a74a8127607cb203e067453fe7bca319912881c69ea27d`
- Published score snapshot: 1128, platinum I +28

## Public Challenge Ledger

| Match | Opponent | Map | Result | Score line | Rank score |
| --- | --- | --- | --- | --- | ---: |
| `mat_JLgH5i4LocpFIGaH1` | Bom / boost | random | win by stars | 4-2 | 1110 -> 1130 |
| `mat_JKDZ7PWxD5OJcaS51` | Bom / boost | random | loss by crash | 2-1 | 1130 -> 1108 |
| `mat_I0zrH1cPBaZLDsMPq` | Bom / boost | random | win by crash | 3-1 | 1108 -> 1128 |
| `mat_GkZgETE34033b8zi2` | Void Stalker / shield | classic | win by stars | 4-3 | 1128 -> 1128 |
| `mat_5q9cx9cD1ZOLhDKiw` | Void Stalker / shield | classic | win by stars | 4-2 | 1128 -> 1128 |
| `mat_JeVZkE6SdKm93osUw` | Bom / boost | random | win by crash | 1-3 | 1128 -> 1146 |
| `mat_EBsChME9LXlFYeHcY` | Neo.X / boost | random | loss by stars | 3-4 | 1146 -> 1126 |

Final refreshed state:

- Rank score: 1126
- Tier: platinum I +26
- Public rank: 449 / 1272
- Record: 232 wins, 203 losses
- Published code: v20, code version 15

## Findings

- `GET /api/agent/opponents` can return high-score tanks that are challengeable but not score-effective. Void Stalker was beaten twice, but both matches had `matchQuality: 0`, so those are not useful for climbing.
- Bom is the current proven score-valid target. v20 won the first post-publish Bom test by crash for +18, but Bom's score fell to 1072, so repeat value is decreasing.
- Neo.X exposed the next failure class: boost star-race tempo. It took the first star at frame 9, while 山大王's first teleport star pickup was frame 20. The result was a 3-4 star loss, not a crash.

## Next Rule

Do not keep pushing random after a star-race loss. The next candidate should focus on faster opening routes when a boost tank can reach the first star before our safe teleport plan.

Recommended next targets:

- Avoid `No.0` until cloak handling is improved.
- Avoid repeating `Neo.X` until the opening tempo fix exists.
- Use Bom only for single-match checkpoints if its score remains close enough to count.
- Scout `carlot` separately; previous result was a runtime win, but freeze pressure made it close.
