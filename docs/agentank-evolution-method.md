# AgenTank Evolution Method

Source reference: https://github.com/tylearymf/agentank-evolution-lab

Use this repo as a lean workbench, not a history dump.

## Core Lessons

- Do not learn only from losses. Winning matches show behaviors worth preserving.
- Do not fix every loss by becoming more defensive. That trains a passive tank.
- Score actions by both value and risk: star tempo, lane control, pressure fire, kill window, bullet danger, enemy skill window, and route safety.
- Treat fatal risks as hard constraints, not small score penalties.
- Simulation is only a safety check. Real ladder results are the final evaluation.
- Use live target pools. Do not optimize from stale local leaderboard data.
- Keep one rollback baseline. If a candidate gets worse, revert quickly.

## Current Local Rule

Active strategy work happens only in `active/teleport-main.js`.

Keep exactly one tactical hypothesis per cycle:

```text
observe real failure -> write or keep one regression -> patch one behavior -> run checks -> simulate if key exists -> dry-run targets -> ask before real challenge
```

## Protected Behaviors

- Safe star pickup should not be blocked by panic movement.
- Occupied star lanes should not be abandoned without real danger.
- Adjacent enemy firing lanes are hard danger.
- Active bullets are hard danger.
- Overload adjacent offset lanes are hard danger.
- Teleport should choose position first, not depend on immediate shooting after landing.

## Target Selection

- Prefer same-band or slightly higher rank-score opponents.
- Do not repeatedly fight known bad matchups during strategy development.
- Stop after a real validation loss.
- Stop after meaningful drawdown from the run peak.

## What To Delete From Context

- Raw replay dumps.
- Old candidate piles.
- Long reports that are not tied to the current match, opponent, or version.
- Broad strategy brainstorms that do not map to one patch.

## Current Bottleneck

Post-star close-quarter escape and adjacent lane denial remain the next useful strategy lane.
