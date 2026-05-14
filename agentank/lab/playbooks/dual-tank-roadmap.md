# Dual Tank Roadmap

The project has two headline tanks. Both should become strong, but they should not become the same tank with different skills.

## freeze-main

Skill: freeze.

Public identity:
- Calm control tank.
- Wins by denying tempo.
- Makes the opponent look rushed or trapped.
- Beats flashy tanks by refusing bad fights.

Primary win paths:
- Star control with freeze as race breaker.
- Safe anchor play on known maps.
- Bullet discipline against overload.
- Survival-first behavior when already leading.

Near-term experiments:
1. Overload second-lane danger model.
2. Shield-aware freeze conservation.
3. Boost-aware spacing after enemy speed-up.
4. Grass hidden-lane memory tuning.

Do not optimize freeze-main for:
- Reckless kills.
- Long queued movement near bullets.
- Shooting just because line of sight exists.

## teleport-main

Skill: teleport.

Public identity:
- Flashy map tempo tank.
- Appears where the opponent did not prepare.
- Steals stars and breaks static camping.
- Creates memorable openings.

Primary win paths:
- Map-specific opening teleport.
- Star hot-spot control.
- Teleport to safe angle, not only shortest star distance.
- Force enemy to turn or move before it can shoot.

Near-term experiments:
1. Opening book by map.
2. Star theft with escape-route scoring.
3. Post-teleport fire-lock avoidance.
4. Teleport-vs-overload lane reset.

Do not optimize teleport-main for:
- Teleporting adjacent to enemies without escape.
- Teleporting into same row or column as an armed shooter.
- Assuming immediate fire is available after close teleport.

## Shared Fleet Strategy

- Use freeze-main as the reliable rank climber.
- Use teleport-main as the meta disruptor.
- Let both tanks share map knowledge and replay classifiers.
- Keep skill-specific candidate files separate.
- If one tank discovers a strong map anchor, test whether the other tank can use it differently.

## First Three Milestones

### Milestone 1: Evidence Pipeline

Status: started.

Target:
- Fetch recent matches.
- Classify result causes.
- Label matches by tank, opponent skill, and map.

### Milestone 2: Skill Matchup Counters

Target:
- freeze-main: overload and shield counters.
- teleport-main: star theft and fire-lock-safe landings.

### Milestone 3: Public Identity

Target:
- Tank behavior becomes recognizable in replays.
- freeze-main wins through control.
- teleport-main wins through surprise and star tempo.

