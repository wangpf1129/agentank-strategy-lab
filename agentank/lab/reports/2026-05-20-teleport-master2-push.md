# Teleport Master II Push

Date: 2026-05-20

Tank: `947` / 山大王

## Current Status

- Started from refreshed snapshot: `master II +37`, `rankScore` 1637, public rank 610 / 1715, code version 16.
- Published v17 after replay review and private simulation.
- Published v18 after the Dalek arena crash exposed a close parallel pursuit trap.
- Final published state this turn: code version 18, `master II +48`, `rankScore` 1648.
- Champion / 王者 threshold is `rankScore` 1800, so remaining gap is 152 points.

## Evidence

Recent pre-change public matches showed 8 wins / 12 losses in the latest 20, with the loss cluster dominated by bullet crashes while 山大王 was already ahead on stars.

Private simulation baseline:

| Version | Suite | Result | Decision |
| --- | --- | ---: | --- |
| v16 current | 3 training bots x 6 maps | 17-1 | Strong baseline, but public crash evidence required hardening |
| v17 candidate | same suite | 18-0 | Published |
| v18 candidate initial | same suite | 17-1 | Not published; over-conservative close trap |
| v18 candidate restricted to star lead | same suite | 18-0 | Published |
| v19 enemy bullet memory | same suite | 17-1 | Not published; runtime regression |

Real challenge batch:

| Version | Opponent | Map | Result | Note |
| --- | ---: | --- | --- | --- |
| v17 | `1650` eec | classic | win, 6-2 stars | Safe lane confirmed once |
| v17 | `705` AlexWhite | random | win, 4-2 timeout | Safe lane confirmed once |
| v17 | `1030` Dalek | arena | loss by crash | Close parallel pursuit trap |
| v18 | `1030` Dalek | arena | loss, 3-4 stars | Crash fixed, star race still behind |
| v18 | `1650` eec | classic | loss by crash | Enemy bullet left visibility and remained dangerous |

Net ladder movement from the successful early batch: `+11 rankScore`.

## Decision

Do not continue blind public challenges from this state. v18 is better protected than v16/v17 against the observed Dalek crash, but public high-rank and repeated safe-lane attempts still expose unresolved hidden bullet and late-game star-race weaknesses.

Next implementation should solve enemy bullet memory without causing the v19 arena runtime regression, then retest against:

- `mat_2e1moBlx5kR8TNG0O` for hidden bullet re-entry.
- `mat_5ZoTXOchs9l5nYDUc` for Dalek star-race endgame.
- The 18-match training baseline, with `azure-hunter/arena` treated as the regression canary.
