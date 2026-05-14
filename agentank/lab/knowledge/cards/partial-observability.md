# Knowledge Card: Partial Observability

## Concept

Partial observability means the tank cannot see the full true state. In AgentTank, grass, cloak, and line-of-sight bullets create this problem.

## Original Use

OpenAI Five and MOBA systems operate with fog of war and incomplete state. Strong agents infer danger from visible traces, not only direct observation.

## AgentTank Landing

Track hidden enemy risk:
- Last seen position.
- Last seen direction.
- Last movement direction.
- Time since seen.
- Likely lanes and star paths.

Freeze tank:
- Avoid hidden lanes while leading.
- Freeze only when enemy is visible unless a star swing is urgent.

Teleport tank:
- Teleport can exploit hidden state, but landing must avoid likely enemy lanes.
- Star teleport should include an escape route, not only a capture route.

## Verifiable Experiment

On grass maps:
- Compare hidden-lane memory durations.
- Count star wins, crash losses, and runtime losses.

## Code Direction

- Improve replay classifier for deaths after enemy hidden state.
- Add map-specific memory thresholds.
- Store grass-map anchor and star hot spots.

## Success Metric

- Fewer deaths from unseen bullets or hidden straight lanes.
- No regression in star collection rate.

## Failure Risk

- Overestimating hidden danger can make the tank passive. Pair hidden-risk logic with star urgency rules.

