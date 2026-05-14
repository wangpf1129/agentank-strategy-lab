# Knowledge Card: League Training

## Concept

League training keeps multiple agents or strategies in the evaluation pool. The main strategy must win broadly, while specialized opponents expose weaknesses.

## Original Use

AlphaStar used main agents and exploiter agents. DeepMind's public writeup states that playing only to win is insufficient; exploiters help expose flaws in the main agent.

## AgentTank Landing

Build a small practical league:
- Main agents: `freeze-main`, `teleport-main`.
- Historical agents: previous candidate versions.
- Public meta agents: overload, boost, shield, teleport, cloak tanks.
- Exploiters: purpose-built tests for one weakness.

## Verifiable Experiment

Run each candidate through a league matrix:
- Training bots across maps.
- Top leaderboard tanks.
- Skill buckets: overload, boost, shield, teleport, cloak.
- At least one known bad replay pattern.

## Code Direction

- Extend batch reporting by opponent skill and result reason.
- Store league snapshots in `reports/`.
- Add a pass/fail gate before publish.

## Success Metric

- Candidate improves ladder-score expectation against the target bucket without dropping below baseline diagnostics on the rest of the league.

## Failure Risk

- Too many league opponents can slow iteration. Keep the first league small and update it as leaderboard meta changes.
