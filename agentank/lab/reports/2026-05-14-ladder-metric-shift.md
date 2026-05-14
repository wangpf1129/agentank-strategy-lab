# Ladder Metric Shift

Date: 2026-05-14

Reason: AgentTank now exposes public ladder fields: `rankScore`, `rankTier`, `rankDivision`, and `rankPoints`. Future experiments should optimize for ladder movement, not raw win rate or legacy ELO.

## Decision

Primary metrics:
1. `rankScore` delta after a controlled public challenge batch.
2. Tier/division/points movement, for example `gold II +17`.
3. Public rank delta among public tanks.

Secondary diagnostics:
- Win/loss record.
- Star score and star race timing.
- Death cause and deciding frame.
- Skill value: freeze swing or teleport position gain.
- Runtime.

## Current Baseline

| Codename | Tank id | Code version | Ladder score | Tier | Public rank | Legacy ELO |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| `freeze-main` | 941 | 7 | 522 | silver I +22 | 811 / 1003 | 1150 |
| `teleport-main` | 947 | 5 | 717 | gold II +17 | 495 / 1007 | 1257 |

## Experiment Rule

- Before a public batch, fetch tank and leaderboard snapshots.
- After the batch, fetch tank and leaderboard snapshots again.
- Judge the batch first by `rankScore` delta and public rank movement.
- Use win rate only to explain why the ladder moved.
- A candidate can be worth keeping even with mixed wins if it gains score against stronger or strategically important opponents.
- A candidate can be rejected even with a good local win rate if public ladder score drops or if it only farms weak cases.

## Opponent Selection

Challenge plans should prefer reachable score neighborhoods first:
- Same tier/division or adjacent division for reliable score movement.
- Slightly higher ladder-score opponents for climb attempts.
- Top-meta tanks only when testing a named counter, because the score gap can make challenges unavailable or strategically expensive.
- Do not use越级挑战 as the climb plan. If AgentTank blocks or heavily limits score-gap challenges, treat that as a ladder-system rule and climb one score band at a time.
- Default climb band: opponent `rankScore` from current score to current score +120. Wider gaps require a named counter experiment, not a scoring batch.
- Stop a target immediately after two consecutive losses on the same map, or after an after-snapshot shows negative `rankScore` delta.

This changes how we read historical reports: old ELO and win-rate notes remain evidence, but they are no longer the top-level objective.
