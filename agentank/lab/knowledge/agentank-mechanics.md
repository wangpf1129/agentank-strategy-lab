# AgentTank Mechanics That Affect Ladder Score

Source: https://agentank.ai/agent-guide

This file records mechanics that can be converted into strategy or experiments for `freeze-main` and `teleport-main`.

## Runtime And Command Timing

- `onIdle(me, enemy, game)` is called only when the tank has no queued commands waiting.
- Commands are queued and normally execute one action per frame.
- `turn(); fire();` in one call means the turn happens first and fire happens later.
- `me.go(2)` queues two movement commands; it is not two-tile movement unless boost affects executed `go()`.

AgentTank implication:
- Avoid long command queues when tactical information changes quickly.
- Prefer short, re-evaluated decisions near bullets, stars, and enemy skill windows.
- Freeze and teleport logic must account for commands already queued by the enemy and by us.

Experiment:
- Compare one-step movement versus queued multi-step routes on grass and overload-heavy maps.

## Bullets And Fire Locks

- `me.fire()` only creates a bullet when no own bullet is active and `me.status.fireLocked` is false.
- Overload arms the next successful shot to create two bullets.
- A bullet clears when it hits a wall, dirt mound, tank, shield, or leaves the map.
- Teleport can create a short fire lock if landing close to the enemy.

AgentTank implication:
- Fire only when the shot has value or lane control.
- Avoid firing just before a critical movement decision if it traps the tank in a losing lane.
- Teleport tank needs a post-teleport plan that does not depend on immediate shooting when fire-locked.

Experiment:
- Classify losses after our own fire command to find "shot-then-die" patterns.

## Visibility

- `enemy.tank` may be null.
- Enemy can be hidden by cloak or grass.
- `enemy.bullet` is only visible when line of sight is clear.
- Dirt mounds can block visibility and bullets.

AgentTank implication:
- Grass maps need memory: last seen enemy position, direction, and likely lane.
- Treat hidden straight lanes as dangerous when the enemy was recently seen.
- Teleport can exploit visibility gaps, but landing into a remembered lane is risky.

Experiment:
- Measure crash losses where enemy was hidden within the last 10-35 frames.

## Skills

### Freeze

- Freezes the enemy for 2 frames.
- Queued enemy commands are not discarded; they resume after freeze.
- Cooldown: 34 frames.

AgentTank implication:
- Freeze is best when it changes a star race, avoids death, or creates a safe shot.
- Freeze is weak if used while the enemy already queued a harmless action.
- Freeze should not create false confidence against already-fired bullets.

### Teleport

- Target must be inside the map, not a wall or dirt mound, not the enemy tank tile, and not an enemy bullet tile.
- Teleport does not rotate the tank.
- Landing within Manhattan distance 4 of the enemy causes two frames of fire lock.
- Invalid targets fail but still consume cooldown.

AgentTank implication:
- Teleport must be validated before casting.
- Strong teleport use is position-first, not shot-first.
- Opening book and star hot spots matter more for teleport than for freeze.

### Overload

- Arms the next successful shot to fire two bullets.
- The armed state remains until a successful shot.
- Cooldown: 32 frames.

AgentTank implication:
- The offset bullet is often the real killer.
- When leading by stars, avoid direct lane trades with overload tanks.
- Treat adjacent lanes as dangerous during enemy overload windows.

## Map Elements

- `x`: wall.
- `m`: destructible dirt mound.
- `o`: grass.
- `.`: open ground.

AgentTank implication:
- Dirt mounds can be obstacles or tactical doors.
- Grass creates partial observability.
- Stable anchors should be map-specific, not only center-biased.
