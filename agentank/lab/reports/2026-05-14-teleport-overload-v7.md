# Teleport Overload v7: 2026-05-14

This experiment follows the freeze-main #001 overload patch and applies the minimum safe part to teleport-main.

## Goal

Improve 山大王 / teleport-main against overload openers without weakening its core identity:

- immediate star theft
- map tempo through teleport
- aggressive positioning when the opponent cannot punish it

## Root Cause From Prior Replay

In `mat_2zCDN4TlESV7uHgiR`, #001 cast overload on frame 1, turned into a left-facing adjacent lane, and killed teleport-main after it teleported onto `[8,13]`.

The previous teleport v5 logic only considered:

- visible bullets
- current enemy line
- short quick aim
- overload mostly when visible as active status

It did not treat positive overload cooldown as evidence that the enemy had armed overload.

## Candidate History

`teleport-main-v6-candidate.js` added both overload prediction and a broad pickup-trap filter. It was not published because training comparison was weaker than current v5.

`teleport-main-v7-candidate.js` was reset from current v5 and only kept the overload-specific fix:

1. Treat overload as armed when enemy overload cooldown is positive.
2. Bound pre-cast overload prediction to 8 cells and one turn.
3. Expand confirmed armed overload prediction to 12 cells and two turns.
4. Do not change normal star-teleport pickup behavior against non-overload opponents.

## Verification Before Publish

Local checks:

```bash
node --test agentank/lab/scripts/tests/*.test.mjs
node --check agentank/teleport-main-v7-candidate.js
```

Training simulation:

- `agentank/lab/data/simulations/2026-05-14T10-19-06-359Z`
- Result: teleport-main v7 12 / 12

## Published Version

| Tank | Published code version | Code hash |
| --- | ---: | --- |
| 山大王 / teleport-main | 5 | `a584a5a60a2a1047b7caacb70a25a14032172200d24709beb451f4d48e762315` |

## Public Validation

#001 and 🛡 could not be challenged by teleport-main after publish:

- #001 (`363`): `opponent rank score is too far from this tank`
- 🛡 (`70`): `opponent rank score is too far from this tank`

Current reachable overload validation used nearby leaderboard opponents:

- `72` ENIGMA / overload / ELO 1219
- `756` Tank 85206 / overload / ELO 1231

Validation run:

- `agentank/lab/data/challenge-runs/2026-05-14T10-23-44-853Z.json`

| Opponent | Map | Result | Match |
| --- | --- | --- | --- |
| ENIGMA | random | Win by crash, score 1-0 | `mat_5R69qlvFxI20hDbkY` |
| ENIGMA | arena | Win by crash, score 2-0 | `mat_8EnaIQGNAQt2hS2vB` |
| Tank 85206 | random | Win, score 1-0 | `mat_AZpSDknMmSLGKxJgR` |
| Tank 85206 | arena | Loss by crash, score 1-1 | `mat_JRot03H09zgFOkhuR` |

Summary:

- Nearby overload validation: 3 / 4
- Published snapshot after validation: ELO 1257, rank 495 / 1007

## Interpretation

This was a safe teleport-main publish:

- It restored training stability to 12 / 12.
- It improved ELO in the immediate post-publish sample.
- It did not solve arena overload completely.

The remaining loss `mat_JRot03H09zgFOkhuR` should seed the next experiment. The pattern is arena-specific: teleport-main collects early, then remains reachable by a direct overload lane. The next patch should focus on post-teleport escape planning on arena, not broad star avoidance.
