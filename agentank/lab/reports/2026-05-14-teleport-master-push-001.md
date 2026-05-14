# Teleport Master Push 001

Date: 2026-05-14

Purpose: start a dedicated 山大王 climb toward master using stepwise ladder-score batches.

## Baseline

Before this push:
- `rankScore`: 765
- Tier: gold II +65
- Public rank: 467 / 1011
- Legacy ELO: 1271

After this push:
- `rankScore`: 772
- Tier: gold II +72
- Public rank: 347 / 1013
- Legacy ELO: 1271

Net: `+7 rankScore`. This is not enough for sustained climbing, but it exposed the next safe and unsafe target-map pairs.

## Batch Results

| Batch | Opponent | Maps | Result | Score delta | Decision |
| --- | --- | --- | --- | ---: | --- |
| 001 | `1004` 🍺 | classic, random, arena | 3-0 | +28 | Good target, but not all maps are safe |
| 002 | `1004` 🍺 | classic, random | 1-1 | -2 | Stop classic; keep random only with caution |
| 003 | `995` 暗王 | classic, random, arena | 2-1 | -19 | Stop random; classic/arena still candidates |

## Match Evidence

Wins:
- `mat_DVdQWllth47AQ8VHM`: win vs `1004` on classic by crash.
- `mat_EdCnwEJhnEj8kvy0B`: win vs `1004` on random by crash.
- `mat_5j1x99z2EYZ3EMSuC`: win vs `1004` on arena by star.
- `mat_1lVu5XFZtB6CKg1xU`: win vs `1004` on random by star.
- `mat_911Otoq3CZl67m4Xs`: win vs `995` on classic by star.
- `mat_G81pt2VvrNB78qQsq`: win vs `995` on arena by star.

Losses:
- `mat_AGeNIZBJRr60yoMHM`: loss vs `1004` on classic by bullet crash.
- `mat_9atkKrzp1mXHmywxH`: loss vs `995` on random by bullet crash.

## Crash Notes

`mat_AGeNIZBJRr60yoMHM`:
- At frame 37, enemy fires left from `[15,2]`.
- At frame 38, 山大王 fires right from `[11,2]`, but the enemy bullet reaches `[11,2]` first.
- Root cause: reciprocal same-line fire when enemy shot already wins the timing race.

`mat_9atkKrzp1mXHmywxH`:
- At frame 45, 山大王 teleports from `[7,10]` to `[17,8]` and collects a star.
- Frames 48-54 keep 山大王 near the enemy's future horizontal lane.
- At frame 54, enemy bullet reaches `[17,10]` and crashes 山大王.
- Root cause: post-teleport star pickup did not force immediate lane exit.

## API Finding

Candidate simulation cannot directly target public tank ids. The attempt against `253,756,1004,995` returned `400 Bad Request training bot not found`. Public-target candidate evaluation must therefore use:
- training-bot simulations for broad regression,
- public real challenges only after publishing or with the current published code,
- replay review for target-specific code hypotheses.

## Next Decision

Stop public challenges for this turn. The next implementation work should create `teleport-main-v8-candidate.js` with:
1. post-teleport lane exit,
2. same-line duel avoidance,
3. random-map crash review against `mat_4bA9LlQ9aFvGa590l` and `mat_9atkKrzp1mXHmywxH`.

Only after that should the climb continue with 2-match batches:
- `1004`: random, arena.
- `995`: classic, arena.
