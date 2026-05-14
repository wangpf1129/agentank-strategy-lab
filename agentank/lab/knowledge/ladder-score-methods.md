# Ladder-Score Methods For AgentTank

The repository borrows from successful game AI systems only when the method can be turned into AgentTank experiments.

AgentTank's current public objective is ladder movement: `rankScore`, tier/division/points, and public rank. Win/loss, star tempo, kills, deaths, and runtime are still important, but they are diagnostics that explain why ladder score moved.

## 1. Value Function

Inspired by AlphaGo's policy/value split. In AgentTank, the value function is a hand-built scoring model for candidate actions and positions.

AgentTank scoring features:
- Star distance and star race advantage.
- Bullet danger now and within a short horizon.
- Enemy skill state and cooldown.
- Map anchor quality.
- Grass memory risk.
- Dirt mound route value.
- Runtime cost.

Use for:
- Choosing between chase star, hold anchor, dodge, fire, freeze, teleport.

## 2. Short-Horizon Search

Inspired by search plus evaluation in board-game AI, but constrained for AgentTank runtime.

AgentTank version:
- Evaluate only a small set of macro-actions.
- Search 2-5 steps where possible.
- Stop early if a move enters bullet danger or invalid teleport target.

Use for:
- Star races.
- Escape after firing.
- Teleport landing selection.

## 3. Self-Play And Version Pool

Inspired by AlphaGo Zero and OpenAI Five.

AgentTank version:
- Keep old candidate files.
- Test new candidates against older versions and training bots.
- Do not accept a candidate that gains one matchup but forgets core map control.

Use for:
- Preventing regressions after adding overload or teleport counters.

## 4. League Training

Inspired by AlphaStar.

AgentTank version:
- Main agents: `freeze-main`, `teleport-main`.
- Exploiters: test strategies or scripts designed to expose one weakness.
- League: training bots, old versions, top leaderboard tanks, and synthetic matchup buckets.

Use for:
- Building counters against overload, boost, shield, cloak, and teleport.

## 5. Exploit Mining

Inspired by OpenAI's documented Dota exploit handling.

AgentTank version:
- Treat every embarrassing loss as a named exploit.
- Add a replay classifier or experiment note.
- Fix only after the loss pattern is reproduced or supported by multiple matches.

Use for:
- Overload second bullet.
- Teleport star theft.
- Freeze wasted during enemy shield.
- Runtime losses from passive anchor holding.

## 6. Partial Observability Model

Inspired by MOBA fog of war and AgentTank grass/cloak mechanics.

AgentTank version:
- Track last seen enemy position and direction.
- Estimate dangerous hidden lanes.
- Different memory lengths by map type.

Use for:
- Grass maps.
- Cloak opponents.
- Teleport ambush prevention.
