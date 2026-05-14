# Knowledge Card: Value Functions

## Concept

A value function estimates how good a state or action is. AlphaGo used value prediction for board positions; AgentTank can use a lightweight hand-written version.

## Original Use

AlphaGo combined a policy network for move selection with a value network for outcome prediction. AlphaGo Zero merged policy and value into one network trained by self-play.

## AgentTank Landing

Use an explicit score for candidate choices:
- Star race score.
- Survival score.
- Skill tempo score.
- Map control score.
- Attack opportunity score.
- Runtime cost.

Freeze tank weighting:
- Survival and star safety are high.
- Direct attack is lower unless freeze creates a safe kill.

Teleport tank weighting:
- Star race and positional surprise are high.
- Post-teleport danger penalty must be strict.

## Verifiable Experiment

Compare the current priority order with a scored action selector:
- Same maps.
- Same opponents.
- Count star lead by frame 50, death category, and runtime.

## Code Direction

- Extract candidate actions: dodge, star, anchor, fire, freeze, teleport.
- Score them with small integer weights.
- Keep the implementation simple enough for runtime limits.

## Success Metric

- Fewer indecisive turns.
- Better star lead without more crash losses.

## Failure Risk

- A complicated value function can hide bugs and cost runtime. Start with few features and add only when replays justify them.

