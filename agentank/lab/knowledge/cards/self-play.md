# Knowledge Card: Self-Play

## Concept

Self-play improves an agent by repeatedly testing it against itself or previous versions. AlphaGo Zero and OpenAI Five used this to discover strategies beyond hand-written human heuristics.

## Original Use

- AlphaGo Zero learned from games against itself, starting without human game data.
- OpenAI Five mixed current self-play with past versions to avoid strategy collapse.

## AgentTank Landing

- Keep candidate versions for both primary tanks.
- Test new candidates against old candidates before publishing.
- Compare not only win/loss but star tempo, crash causes, skill timing, and runtime.

## Verifiable Experiment

Create a version-pool test:
- `freeze-main` latest vs previous freeze candidates.
- `teleport-main` latest vs previous teleport candidates.
- Both tanks against training bots on every available map.

## Code Direction

- Add a script that runs candidate simulation batches when the API supports candidate code.
- Add report fields for version, opponent version, map, result reason, star score, and crash category.

## Success Metric

- New candidate improves ladder movement against reachable public opponents while keeping diagnostic win/loss, crash causes, and star tempo above the old baseline.

## Failure Risk

- Self-play can overfit to our own style and miss leaderboard meta. Always include public opponents and exploiters.
