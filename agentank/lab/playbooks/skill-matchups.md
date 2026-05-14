# Skill Matchup Playbook

This file maps opponent skills to practical experiments for `freeze-main` and `teleport-main`.

## Overload

Threat:
- The next shot creates two bullets.
- The offset bullet can be more dangerous than the obvious bullet.
- Wall-adjacent shots can make one bullet disappear while the second bullet remains lethal.

freeze-main plan:
- Treat adjacent parallel lane as dangerous during enemy overload windows.
- If leading by stars, disengage instead of trading shots.
- Use freeze to break a star race or escape a firing lane, not to start a vanity duel.

teleport-main plan:
- Teleport should reset lane geometry.
- Avoid landing in same row or column as an armed overload tank.
- Prefer landing behind cover or near a star with a perpendicular escape path.

Experiment:
- Build an overload-counter replay set.
- Count deaths within five frames of enemy overload bullet creation.

Success metric:
- Lower overload-related crash losses without increasing runtime or passive star losses.

## Boost

Threat:
- Enemy star race distance is effectively shorter.
- Close-range pressure arrives earlier than normal path distance suggests.

freeze-main plan:
- In star race scoring, discount enemy distance when boost is ready or active.
- Avoid close direct-line duels after enemy boost.

teleport-main plan:
- Use teleport for star tempo before boost closes the gap.
- Avoid teleport landings that boost can immediately punish.

Experiment:
- Reclassify boost losses by whether enemy boost was ready, active, or already spent.

Success metric:
- Better frame-50 star lead against boost tanks and fewer close-range deaths.

## Shield

Threat:
- Shots and freeze setups can be wasted into shield timing.
- Shield can convert our aggression into lost tempo.

freeze-main plan:
- Do not freeze shielded enemies unless it directly wins a star or prevents death.
- Prioritize map control while shield is active.

teleport-main plan:
- Teleport to star or position, not into shielded close combat.
- Force shield tank to turn and reposition.

Experiment:
- Count freeze casts while enemy is shielded.
- Compare outcomes when freeze is conserved.

Success metric:
- Fewer low-value freezes and no drop in star pressure.

## Teleport

Threat:
- Opponent can steal stars or appear in unexpected lanes.
- Straight-line chase can become a trap after teleport.

freeze-main plan:
- Treat teleport-ready enemy as having near-zero star race distance.
- Freeze after teleport if it creates a safe star swing or escape.

teleport-main plan:
- Against teleport mirrors, prefer safer anchor and second-star tempo over first-star greed.
- Avoid symmetric teleport races when the opponent has better angle.

Experiment:
- Track first star owner, teleport frame, and death within ten frames after teleport.

Success metric:
- More first-star wins without more post-teleport crash losses.

## Cloak And Grass

Threat:
- Enemy may disappear from `enemy.tank`.
- Bullets may be visible late or not at all if line of sight is blocked.

freeze-main plan:
- Use last-seen lane memory.
- Do not hold passive center forever if a visible star remains reachable.

teleport-main plan:
- Use teleport to bypass grass uncertainty only when landing has cover or escape.
- Avoid landing into last-seen lane.

Experiment:
- Map-specific hidden-memory duration sweep.

Success metric:
- Fewer hidden-lane deaths without runtime regression.

