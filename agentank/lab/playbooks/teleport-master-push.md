# Teleport-Main Master Push

Goal: push `teleport-main` / 山大王 from gold to master through controlled ladder-score batches.

Current baseline after the latest scoring batch:
- Tank id: `947`
- Published code version: `5`
- Ladder: gold II +72
- `rankScore`: 772
- Public rank: 347 / 1013
- Master evidence from current leaderboard snapshots: master starts around `rankScore` 1534-1539.

## Operating Rules

- Public scoring batches are 2-5 matches only.
- Every batch needs a before and after tank snapshot.
- Continue a target only when the after-snapshot has positive `rankScore` movement.
- Stop any target/map pair after one crash loss unless the match review shows a one-off execution accident.
- Do not run random-map scoring batches against freeze or overload targets until post-teleport escape is patched.
- Do not publish a candidate that improves one crash pattern but weakens training-bot baseline.

## Score Roadmap

| Stage | Score band | Objective | Candidate pool |
| --- | ---: | --- | --- |
| Gold II to Gold I | 772 -> 800 | recover gold I safely | `1004` random/arena only, `995` classic/arena only |
| Gold I consolidation | 800 -> 900 | find repeatable gold I targets | `549`, `510`, `1001`, `1061`, `957`, `1009` |
| Platinum entry | 900 -> 1050 | test against platinum II | `441` only after gold I is stable |
| Platinum I | 1050 -> 1250 | climb by adjacent platinum targets | use fresh leaderboard banding |
| Diamond | 1250 -> 1500 | require code hardening first | overload/freeze crash fixes required |
| Master entry | 1500+ | only controlled high-confidence batches | no random-map unreviewed opponents |

## Known Safe Lanes

- `253` biubiu on classic: 5-0 in the previous batch. This target has been passed and should not be farmed unless score drops back into range.
- `1004` on random: 2-0 in latest evidence.
- `1004` on arena: 1-0 in latest evidence.
- `995` on classic: 1-0 in latest evidence.
- `995` on arena: 1-0 in latest evidence.

## Blocked Lanes

- `1004` on classic: crash loss in `mat_AGeNIZBJRr60yoMHM`.
- `995` on random: crash loss in `mat_9atkKrzp1mXHmywxH`.
- `756` on random: mixed 1-1 with crash loss in `mat_4bA9LlQ9aFvGa590l`.

## Required Code Hardening

1. Post-teleport escape rule:
   - If teleport lands on or near a star and enemy can create a horizontal or vertical firing lane within 2 turns, move off the lane immediately.
   - Do not turn in place while a bullet is approaching the current row or column.

2. Same-line duel rule:
   - Do not fire if the enemy already has a bullet moving toward our current tile and our shot will not land first.
   - Prefer side-step or teleport anchor over reciprocal fire.

3. Random-map score gate:
   - A candidate must beat the two known random crash replays in behavior review before random public scoring resumes.

## Next Public Batch

Only after the next code or route review:

```bash
AGENTANK_TELEPORT_KEY=<key> node agentank/lab/scripts/run-real-challenges.mjs \
  --tank teleport-main \
  --opponents 1004 \
  --maps random,arena \
  --repeat 1 \
  --limit 2 \
  --sleep-ms 2500 \
  --execute
```

If that batch is positive, fetch a snapshot and move to:

```bash
AGENTANK_TELEPORT_KEY=<key> node agentank/lab/scripts/run-real-challenges.mjs \
  --tank teleport-main \
  --opponents 995 \
  --maps classic,arena \
  --repeat 1 \
  --limit 2 \
  --sleep-ms 2500 \
  --execute
```

## Stop Conditions

- Batch `rankScore` delta is negative.
- Same opponent-map pair produces a crash loss.
- Public API returns server errors or score snapshots cannot be fetched.
- The target falls below our score by more than 30 points.
