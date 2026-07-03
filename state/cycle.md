# Current Cycle

## One Hypothesis

Dark Edge keeps overload geometry, star tempo, and gunline rules unchanged. This only raises strategic grass that controls star or pressure lanes ahead of ordinary pathing.

## Last Command Results

- Dark Edge v83 merge publish:
  - Scope: merged the hard-wall offset fire guard and strategic grass-control priority into `active/dark-edge.js`.
  - Pre-publish review: strategy pipeline remains explicit; L0 hazards, L1 gunline frame economy, L2 near-star pickup, overload offset geometry, and active-overload offset firing stay ahead of strategic grass. Ordinary fire still requires `fireAtIfSafe(target)`.
  - Gate finding and fix: the first explicit Dark Edge simulation exposed a wall-blocked nearby-star grass hold on classic. `nearStarLine` is now only a score bonus; strategic grass requires real star-line LOS, direct pressure, or overload offset pressure. Added regression `dark-edge does not hold grass on a wall-blocked nearby star line`.
  - Gates: `npm run check` passed; focused Dark Edge tests passed 38/38; `npm run test:lab` passed; default `npm run simulate` passed 9/9 for shield-main; explicit server simulation for `dark-edge=active/dark-edge.js` was 6/9; `npm run challenge:dry` passed with start score 2542.
  - Publish: Dark Edge codeVersion 83, codeHash `bffea2b9d3f775d5ed15b99492c69f34be0026fa20d380a7ee9c295ad1adb5e5`. Live snapshot confirms rankScore 2562, record 6800-5933-0. No real challenge was executed.
  - Risk to watch: remaining explicit simulation losses were timeout/star-tempo training-bot losses, not the patched wall-blocked grass hold. Do not patch from those simulations alone; use real-review bounded evolution after real matches.
- Dark Edge strategic grass-control local candidate:
  - Rationale: high-rank tanks often treat grass as a main strategic position, but Dark Edge only used grass mostly as lead-control. This candidate promotes only grass that controls a star line, enemy pressure lane, or overload offset lane.
  - Patch: added `tryStrategicGrassControl()` in L4 before lead/star interception modules and included it in low-value far-star control. The module scores grass by control value, route length, and turn cost; dead grass is rejected.
  - Protected: L0 hazards, L1 gunline frame economy, L2 safe near-star pickup, active overload geometry, and hard-wall offset fire guard are unchanged.
  - Verification so far: `node --check active/dark-edge.js` passed; focused Dark Edge tests passed 37/37. No publish or real challenge was executed.
- Dark Edge hard-wall offset star-lane local candidate:
  - Reviewed `mat_F4LTxrXsjRDDFz48U`: Dark Edge won by bullet crash, but fired 23 bullets with 0 registered hits and lost stars 0-2. Frames 24-42 repeatedly fired from `[5,3]` to the right while the first blocker was hard wall `x` at `[7,3]`; the star was behind that wall at `[13,3]`, and the enemy collected it.
  - Patch: added `currentShotReaches()` / `fireAtIfSafe(target)` so ordinary fire requires a real unobstructed direct line. Modules that rely on `overloadAttackLaneSafe()` now only fire through covered offset lanes when active overload is actually present.
  - Protected: covered positive-offset overload attacks still fire while overloaded; wrong-side offset, vertical overload, gunline frame economy, safe near-star priority, and destructible blocker behavior are unchanged.
  - Verification: `node --check active/dark-edge.js` passed; focused Dark Edge tests passed 35/35; `npm run check` passed; `npm run test:lab` passed; `challenge:dry` passed after explicitly loading `.env`, with start score 2579. No publish or real challenge was executed.
- Dark Edge v82 publish and bounded live observation:
  - Pre-publish code quality / strategy-conflict review passed: the candidate changes only L6 contested star-line hold and delegates one-tile `m` blockers to the existing `fireDirt()` safety gate; L0/L1 hazard and gunline logic, overload geometry, and hard-wall `x` behavior are unchanged.
  - Gates: `npm run check` passed; focused Dark Edge tests passed 33/33; `npm run test:lab` passed; server simulation for `dark-edge=active/dark-edge.js` was 8/9; `npm run challenge:dry` passed with start score 2558.
  - Publish: Dark Edge codeVersion 82, codeHash `95dbb2bf930c52560567fea238be112d48b12def27e5ed1dc58fd0c277308ffa`.
  - Real observation: `npm run challenge:run` executed 1/3 because stop-on-loss triggered. `mat_8d1LZiNEVvG5HENRW` lost to `白色恶魔` by stars, 3-4, score 2558 -> 2538. Raw replay review found `mBlockFrameCount=0`, so this was not a destructible star-line blocker recurrence; it is a separate star-tempo/teleport-pressure loss.
- Dark Edge destructible star-line blocker local candidate:
  - Reviewed `mat_01ErnlAykdsJV5Lon`: Dark Edge reached `[14,4]` facing the star at `[16,4]`, with destructible `m` at `[15,4]`, then held the fake star line from frame 22 through runtime without firing, casting overload, or collecting stars.
  - Patch: `tryContestedStarLineHold()` now routes that exact `m` blocker through `fireDirt()` instead of returning a hold action, so L6 no longer starves the break-dirt behavior.
  - Protected: overload geometry, hard-wall `x` handling, gunline frame economy, and safe star pickup are unchanged.
  - Verification: `node --check active/dark-edge.js` passed; focused Dark Edge tests passed 33/33; `npm run check` passed; `npm run test:lab` passed.
  - Simulation: server simulation passed 8/9 at `/tmp/agentank-runs/simulations/2026-07-03T06-31-21-228Z`. The single loss was `dark-edge` vs `nova-scout` on arena by bullet crash with `hard-current-bullet-eta`; it did not involve destructible star-line blockers, so it remains a separate hazard-first risk and was not patched in this cycle.
- Dark Edge v81 hard-wall star-line publish:
  - Pre-publish code quality / strategy-conflict review passed: the new guard only blocks `x` hard-wall face/hold during star interception, keeps `m` dirt on the existing break-dirt path, and does not bypass the explicit strategy pipeline.
  - Gates: `npm run check` passed; focused Dark Edge tests passed 32/32; `npm run test:lab` passed; server simulation for `dark-edge=active/dark-edge.js` passed 9/9; `npm run challenge:dry` passed with start score 2506.
  - Publish: Dark Edge codeVersion 81, codeHash `1755b96290f6481df2a7dc89eb4bd7ebb786fefcbe98b90588af5572fa5a219e`. Live snapshot confirms rankScore 2506, record 6784-5920-0. No real challenge was executed.
- Dark Edge hard-wall star-line local candidate:
  - Reviewed `mat_8tXhka8w7xqBQcOsC`, `mat_3AJTyX0d4018RosfP`, and `mat_KLXMNDLETooDtzO5o`.
  - Preserve: `mat_3AJTyX0d4018RosfP` used overload at frame 27 and converted the offset lane into a bullet-crash win; overload pressure behavior should stay protected.
  - Fix: `mat_KLXMNDLETooDtzO5o` repeatedly turned at `[6,12]` while the star at `[3,12]` was blocked by `x` wall `[5,12]`, losing 0-4 by stars. `mat_8tXhka8w7xqBQcOsC` showed the same wall-blocked star-line loop in a winning 2-0 star game.
  - Patch: added hard-wall detection before `tryStarInterception()` faces a current star-line point, so `x` walls stop the hold/face behavior while `m` dirt still falls through to break-dirt logic.
  - Verification: `node --check active/dark-edge.js` passed; focused Dark Edge tests passed 32/32; `npm run check` passed; `npm run test:lab` passed; server simulation for `dark-edge=active/dark-edge.js` passed 9/9.
- Dark Edge v80 structural publish:
  - Replaced the implicit tail `tryXxx()` chain with `buildStrategyPipeline()` and `runStrategyPipeline()`, preserving execution order while making L0-L8 priority explicit.
  - Added a regression that locks the exact strategy-pipeline order, so future module insertions must update the priority table intentionally.
  - Updated `docs/dark-edge-strategy-architecture.md` to make the priority table the source of truth for future real-review bounded evolution.
  - Verification: `npm run check` passed; focused Dark Edge tests passed 31/31; `npm run test:lab` passed; server simulation for `dark-edge=active/dark-edge.js` passed 9/9; `npm run challenge:dry` passed with start score 2437.
  - Publish: Dark Edge codeVersion 80, codeHash `2ea82dec37215ac2cd6fa33bdfd05d3acbf7efba2051bc9dbb444936747df548`. Live snapshot confirms rankScore 2437. No real challenge was executed.
- Dark Edge gunline frame-economy local candidate:
  - Added a same-row/same-column guard before value actions: if the current facing leaves the enemy gunline, go forward immediately; if no one-frame exit exists and the tank is already aimed at the enemy, fire instead of casting overload or turning in place.
  - Preserved post-overload reset behavior by preventing the new aimed-duel fire from overriding the existing "leave the gunline after overload" protection.
  - Updated the old reply-capable direct-lane contract: no overload in that lane, but fire is allowed only when already aimed; otherwise take the one-frame off-line exit.
  - Verification: `node --check active/dark-edge.js` passed; focused Dark Edge tests passed 25/25; `npm run check` passed; `npm run test:lab` passed.
- Dark Edge v61 real stop-on-loss batch: 3 wins and 1 loss, rankScore 1649 -> peak 1708 -> 1686. Run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-42-57-671Z.json`.
- Loss `mat_I0Fh04KkfA84ohakf`: at frame 49/50, Dark Edge stayed in a close-contact vertical kill lane after strict `safeCell(..., true)` rejected the immediate exit because the funnel had low escape count. This was a movement-control failure, not an overload trajectory failure.
- Dark Edge v62 patch: added `tryCloseContactEscape()` so adjacent one-turn kill lanes prefer an immediate relaxed-but-still-safe exit; added regression `dark-edge takes the immediate close-contact exit instead of turning inside a one-turn kill lane`.
- Verification for v62: focused `node --test lab/scripts/tests/dark-edge-strategy.test.mjs` passed 19/19, `npm run check` passed, `npm run test:lab` passed, `node --check scripts/challenge-dry-run.mjs` passed, `node --check scripts/challenge-execute.mjs` passed, and `npm run challenge:dry` passed against Dark Edge with start score 1686.
- Publish: Dark Edge v62 published to AgentTank main, codeHash `f93bc7fc6f6034c63bb3b9a9d34fbefbea27956b56f71b559bc42c0f687bcbd6`.
- Training script correction: `scripts/challenge-dry-run.mjs` and `scripts/challenge-execute.mjs` now target `dark-edge` instead of stale `shield-main`.
- Syntax: `npm run check` passed after shield-main and random fallback updates.
- Tests: `npm run test:lab` passed after adding shield-main regressions.
- Simulation: `npm run simulate` passed, 9/9 wins against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`.
- Publish: `shield-main` published to main as code version 2.
- Real challenge: `npm run challenge:run` ran 3 bounded random placement matches; result 3 wins, 0 losses, rank score 0 -> 58.
- Update-log read: 2026-06 updates make shield, poison, bullet vision, and bombs strategically important; teleport grass/star plans should be downgraded.
- Shield v2 candidate: added active bullet defense, clear-shot pressure, safe adjacent-star priority, shielded star breaks, star-lane fire, and close bomb traps.
- Signal caveat: all three real wins were 0-frame opponent crashes, so they prove the publish/climb loop works but do not yet prove the strategy against functional opponents.
- User match review:
  - `mat_An9v9gYvHpQLZObcV`: frame 16, enemy fired from grass-adjacent horizontal lane; shield was not used.
  - `mat_DKY0DkQ3x0vEpMh9F`: shield cast at frame 38, expired at frame 42, then tank kept chasing along a grass firing lane and died to a second shot at frame 52.
  - `mat_349PetwHyva3Lz7Mn`: frame 62, point-blank reciprocal duel; tank fired before shielding, mutual crash lost on stars.
- Shield v3 candidate: added recent hidden grass shooter prediction, stricter patrol safety after shield expiration, and shield-first priority for close aimed duels.
- Verification for v3: `npm run check` passed, `npm run test:lab` passed, `npm run simulate` passed 9/9.
- Publish: `shield-main` published to main as code version 3.
- User match review after v3:
  - `mat_DB3B5rY4KGw0fqnNY`: not only a bullet issue; our tank planted a bomb at frame 17, then walked back into the pending blast cross after shield expired.
  - `mat_5cKQFwRLFDt5A9bcn`: final frames degenerated into alternating turns near a reachable star; destructible dirt handling was also missing from the route plan.
  - `mat_HEEqRhMzUwRGiOhd3`: runtime loss with 232ms vs 2ms showed repeated per-frame scans need caching.
- Shield v4 candidate: added bullet-first hazard handling before shooting/star chasing, own-bomb blast memory and escape, direct star-lane movement, dirt breaking, lower stuck threshold, and frame caches for bullets/hidden shooter/projectile danger.
- Verification for v4: `npm run check` passed, focused `node --test lab/scripts/tests/shield-main-strategy.test.mjs` passed 11/11, and `npm run test:lab` passed.
- Blocked verification for v4: `npm run simulate` and `npm run challenge:dry` did not run because `AGENTANK_SHIELD_KEY` is not present in the current shell environment; both stopped before making server calls.
- Training-space baseline: added `state/training-space.json` and `scripts/space-check.mjs` to anchor changes to the `agentank-evolution-lab` method: real replay review, hard constraints, brave baseline, target-pool discipline, and rollback.
- Danmaku speech layer: added limited Bilibili-style `speak` lines for shield, fire, dodge, star pickup, dirt breaking, bomb trap, bomb escape, and unstick. This is visual-only and has a regression proving it does not consume the tactical action.
- User match review after v4 candidate but before publish:
  - `mat_LNZCS1AMDcR3Uk4bG`: won by star but spent the endgame looping between `[15,4]` and `[15,5]`; this is consistent with the already-unpublished v4 movement-cleanliness/star-tempo fixes.
  - `mat_Ktt1NxkPs1U6xFRHZ`: good sample; clear shot pressure worked and should be preserved.
  - `mat_4OPhk3sLg9l5ecgdK`: opponent chased aggressively; final close same-column exchange became mutual crash and lost by runtime.
  - `mat_99VadhE2gYgIeaQx1`: similar close pressure pattern; shield absorbed the first window but the tank still had no clean reset after shield expired.
- Shield v5 candidate: preserve clear same-line turn-then-fire, but if the enemy is already close and aimed at us while shield is unavailable, dodge instead of taking an unshielded mutual trade. Speak/danmaku still has not appeared online because v4/v5 have not been published in this shell.
- Evolution-method coverage: added replay behavior scoring so every analyzed match now produces preserve, fix, hard-constraint, and brave-baseline buckets. This turns the reference method into a checkable local gate instead of a prose-only guideline.
- Review scripts: `npm run review:match -- <match-json>` and `npm run review:batch -- <match-dir> challenger` now summarize the exact behaviors to protect or repair before the next patch.
- User match review while online still runs v4:
  - `mat_2reLWsQ0BaiG6ZC4V`: 42-frame intense random-map loss by star. Opponent collected the first star at frame 13, then destroyed dirt at `[10,11]` on frame 38 and opened a vertical firing lane. Frame 41 became mutual crash, but we lost because the opponent led 1-0 on stars.
- Shield v5 adjustment: preserve v4's winning tempo, but treat a single destructible dirt tile between the tanks as a near-future hard firing lane. Dodge before the opponent opens it instead of waiting for the lane to become fully clear.
- Current ladder snapshot before publish: shield-main reached platinum III, rankScore 912, public rank 713/3859, record 53-11-0, codeVersion 3.
- Recent raw replay sample: 5 wins and 1 loss; preserve signals were skill tempo, clear kill pressure, and star tempo. The only new hard failures were breakable-cover shot and close aimed duel.
- First v5 server simulation after breakable-cover patch: 7/9, with losses caused by expiring shield still allowing value actions inside projectile lanes.
- Shield v5 final patch: clear fire remains a brave baseline, but an expiring shield no longer authorizes entering projectile lanes or taking shielded star-path moves.
- Verification for final v5: `npm run check` passed, focused shield-main test passed 16/16, `npm run test:lab` passed, and server simulation passed 9/9.
- Publish: adjusted shield-main published to AgentTank main as server codeVersion 4, codeHash `818e3006d1e0cc2786b338da1d78b113303680d0037841f355aa0661c69c3f7d`.
- User match review after online codeVersion 4:
  - `mat_BEQ7chb1QtXJkgUax`: visible upward bullet lane; tank kept turning instead of committing to a side-step and died without firing.
  - `mat_7apZeCs8ZED2MNsRx`: opponent stun/reversed control caused repeated turns in place; forward movement would have left the aimed line.
  - `mat_KgGLVvhBB4K1UfgYW`: short reciprocal lane fight; after firing, tank moved back into the enemy bullet path.
  - `mat_GkQz5Ls0mFDIs9Uo6`: close mutual crash after shield expiration; opponent led on stars, so trading was losing.
  - `mat_FmQ8TjqmUr4DMjQ9r`: runtime tiebreak loss after equal stars; keep runtime pressure in mind but do not remove the current winning pressure behaviors yet.
- Winning replay review after online codeVersion 4: 6/6 wins, with preserve signals for skill tempo, clear kill pressure, star tempo, brave clear fire, and brave safe star pickup. Do not make the tank globally timid.
- Shield v5 post-review patch: commit recent panic dodge intent for two frames, move forward while stunned/reversed if the forward tile is safe, and limit close mutual-trade avoidance to enemies already aimed at the current lane. This preserves same-line turn-then-fire when the opponent still needs to turn.
- Verification for post-review v5: focused `node --test lab/scripts/tests/shield-main-strategy.test.mjs` passed 19/19, `npm run check` passed, `npm run test:lab` passed, and server simulation passed 9/9.
- Publish: adjusted shield-main published to AgentTank main as server codeVersion 5, codeHash `8c41451899b4214ab755658fbcd44b41c49bc2afec46a26b547e71707b6ce89e`.
- Current ladder snapshot after publish: shield-main remains platinum III, rankScore 974, record 63-18-0, codeVersion 5.
- User match review after online codeVersion 5, now in master tier:
  - `mat_JwWrVtDJ07sA7cumV`: close and valuable sample against 汉堡小车. The tank did counterfire once after shielding, but other shielded lane windows were spent drifting away; final loss was a close same-row crash.
  - `mat_H5ETZRlWiNQFhzppr`: opponent chased and fired repeatedly. At frames 16-18, shield absorbed close vertical shots but the tank walked into the star instead of firing back while aimed.
  - `mat_FOnzlz4nAW3D9Qlp4`: late top-edge movement still became unclear under pressure; there was also a missed close turn-fire window around frame 51.
  - `mat_I1BPaC3vYrpJzjPHB`: same he2.0 matchup; pressure was better than earlier versions, but endgame still showed repeated turns under a distant lane shot.
  - `mat_4ZL8NYBao8z0P4dDD`: won by stars, but shielded blocks at frames 36-39 and 77 could have been converted into lane pressure.
  - `mat_BtNEwmeSbMgIJr7qe`: won 5-0 on stars against a mostly stationary opponent. Star tempo is good, but nearby stationary/guarding targets should not always be ignored.
  - `mat_55ZclKB8lqH2iQLk9`: good win; opponent followed and waited for a mistake, while star tempo stayed clean. Preserve this behavior.
  - `mat_FkUCWyVZLh1FWut9P`: runtime loss against a teleport tank guarding the first star at `[10,7]` from `[10,8]`; tank orbited `[9,5]`/`[9,6]` instead of shielding through or changing the approach.
- Batch signal: 8 reviewed matches, 3 wins and 5 losses. The common regression was not missing bullet hard constraints; it was passivity against strong or guarding opponents (`risk-passive-fire`, `fix-no-pressure-loss`, `fix-no-value-created`).
- Shield v6 patch: added fresh-shield counter-pressure for close same-line windows, and guarded nearby star breaks that spend shield when an enemy camps the star. This is intentionally bounded so normal safe star pickup and clear line fire remain protected.
- Verification for v6: focused `node --test lab/scripts/tests/shield-main-strategy.test.mjs` passed 22/22, `npm run check` passed, `npm run test:lab` passed, and server simulation passed 9/9.
- Publish: adjusted shield-main published to AgentTank main as server codeVersion 6, codeHash `d91a7a2eeb6453f6226df5ee7921f42cb01c589238c577dec0bb117a61cef143`.
- Current ladder snapshot after publish: shield-main is master III, rankScore 1516, rankPoints 16, elo 1826, record 104-29-0, codeVersion 6.
- Real challenge observation on codeVersion 6:
  - First 10-match run: 8 wins, 2 losses, rankScore 1569 -> 1702, delta +133. Log: `/tmp/agentank-runs/review-20260701-v7/challenge-runs/2026-07-01T09-31-57-354Z.json`.
  - Second 10-match run: 5 wins, 5 losses, rankScore 1723 -> 1725, delta +2. Log: `/tmp/agentank-runs/review-20260701-v7/challenge-runs/2026-07-01T09-35-57-989Z.json`.
  - Combined signal: the first batch proved the v6 shield/star-pressure baseline can climb quickly, while the second batch showed a plateau against stronger 1700+ opponents. The common repair bucket is pressure/no-value creation, not a need to patch every individual loss.
- Method correction from `agentank-evolution-lab`: preserve winning behavior, keep hard bullet/overload constraints, maintain a brave baseline for safe star pickups and clear fire, and add position-scored star-line pressure instead of match-id-specific branches.
- Shield v7 patch: when a contested star is close and direct star movement is unsafe, hold or face the star line unless a hard danger forces escape. This prevents generic pathing from conceding the key star row/column while preserving safe pickup, shield counter-pressure, and guarded-star breaks.
- Verification for v7: focused `node --test lab/scripts/tests/shield-main-strategy.test.mjs` passed 24/24, `npm run check` passed, `npm run test:lab` passed, and server simulation passed 8/9.
- Publish: adjusted shield-main published to AgentTank main as server codeVersion 7, codeHash `1bfc3a23e55c81bfeab3e163dc2de9a71a4bfaec68f51f12ccd71a926f1c5a4a`.
- Current ladder snapshot after publish: shield-main is master I, rankScore 1767, rankPoints 67, elo 2017, record 125-38-0, codeVersion 7.
- User-provided v7 match `mat_4vv7IwazB1fFjxTI8`: 0-frame runtime loss with no skill, no star, and no fire pressure. Treat it as runtime/no-action evidence, not a normal movement replay.
- Real challenge observation on codeVersion 7:
  - 10 settled matches: 5 wins, 5 losses, rankScore 1762 -> 1745, delta -17. Log: `/tmp/agentank-runs/review-20260701-v7/challenge-runs/2026-07-01T09-44-50-088Z.json`.
  - One extra random challenge attempt failed before settling with `battle_failed`; the script retried and still produced 10 settled matches.
  - Batch behavior report: win rate 50%, average behavior score 41/100, 5 `fix-no-pressure-loss`, 5 `fix-no-value-created`, and 5 `risk-passive-fire`.
  - Current ladder snapshot after the run: shield-main is master I, rankScore 1745, rankPoints 45, elo 2000, record 134-47-0, codeVersion 7.
  - Decision: do not continue blind climbing on v7. Next patch should first address runtime/no-action safety and pressure creation without removing the winning star-tempo baseline.
- User-provided follow-up raw replay review on codeVersion 7:
  - `mat_3U8RbjhBmXMLMUMiO`: lost by stars 2-4 against boost. Opponent repeatedly used boost to win star tempo; our tank collected some stars but still followed too much instead of cutting off the next star lane.
  - `mat_93MzfdVEvEcAMMTkd`: lost by stars 2-4 against teleport. Opponent teleported at frames 16, 57, and 98; shield cannot race teleport directly, so the repair should be star-point interception or camping rather than chasing.
  - `mat_21TjadQ0tcl9NQ3bf`: lost by bullet crash at frame 35 after collecting the first star. This matches the user observation that obstacle-blocked dodges need shield-first handling.
- Second v7 real challenge observation:
  - 10 settled matches: 6 wins, 4 losses, rankScore 1739 -> 1772, delta +33. Log: `/tmp/agentank-runs/review-20260701-v7/challenge-runs/2026-07-01T09-52-53-302Z.json`.
  - Batch behavior report on saved summaries: win rate 60%, average behavior score 42.8/100, 4 `fix-no-pressure-loss`, 4 `fix-no-value-created`, and 4 `risk-passive-fire`.
  - Raw loss review: 2 bullet deaths, 1 breakable-cover lane breach, 1 teleport star-tempo loss. `mat_AQB4mlPnYfMIXvlPG` was a 1-5 star loss to teleport; `mat_C4T9E3OkuFREGkKMF` showed current-bullet and breakable-cover hard breaches; `mat_4wfpS3J9r9iKw9baa` showed current-bullet ETA breach.
  - Current ladder snapshot after the run: shield-main is master I, rankScore 1772, rankPoints 72, elo 2025, record 144-55-0, codeVersion 7.
  - Decision: v7 is not dead, but it is volatile. The next code change should be bounded to anti-teleport star interception/camping and shield-first blocked-lane bullet defense; do not remove the star-tempo and shield-counter baseline.
- Champion-band v7 real challenge observation:
  - 10 settled matches: 7 wins, 3 losses, rankScore 1812 -> 1887, delta +75. Log: `/tmp/agentank-runs/review-20260701-v7/challenge-runs/2026-07-01T09-57-14-944Z.json`.
  - Batch behavior report on saved summaries: win rate 70%, average behavior score 44.6/100, 3 `fix-no-pressure-loss`, 3 `fix-no-value-created`, and 3 `risk-passive-fire`.
  - Raw loss review: `mat_8B63EEdK82C6N1qz2` and `mat_GhdQ1wGNDNOJ9oWgp` were bullet crashes with `hard-current-bullet-eta` plus post-shield reset signals; `mat_LHHCSqu1jFW7BXzye` was a 1-4 star loss against repeated boost casts at frames 2, 29, 56, 84, and 115.
  - Current ladder snapshot after the run: shield-main is champion I, rankScore 1887, rankPoints 87, elo 2122, record 153-58-0, codeVersion 7.
  - Decision: keep v7 active for now because it can climb in champion band. Any v8 change should be small and tested: post-shield/current-bullet safety and anti-boost/teleport star interception. Do not rewrite the general star tempo.
- 20-match champion-band v7 observation:
  - 20 settled matches: 10 wins, 10 losses, rankScore 1887 -> 1892, delta +5, with an intra-run peak at 2012 before a long drawdown. Log: `/tmp/agentank-runs/review-20260701-v7/challenge-runs/2026-07-01T10-16-30-614Z.json`.
  - Combined recent v7 real batches: 5-5 (-17), 6-4 (+33), 7-3 (+75), and 10-10 (+5). Total: 28 wins, 22 losses, net +96. The version can climb, but high-score stability is weak.
  - Raw loss review for this batch: 6 `bullet_crash`, 3 `star_win`, 1 `runtime`; behavior buckets show 6 `fix-post-shield-reset`, 5 `fix-bullet-death`, 4 `fix-star-tempo-loss`, 5 `hard-current-bullet-eta`, and 1 `hard-close-aimed-duel`.
  - Win raw review for this batch: 9 `preserve-skill-tempo`, 9 `preserve-star-tempo-win`, 4 `preserve-clear-kill-pressure`, 9 `brave-safe-star`, and 4 `brave-clear-fire`. These are protected behaviors for the next patch.
  - Current ladder snapshot after the run: shield-main is champion I, rankScore 1892, rankPoints 92, elo 2138, record 163-68-0, codeVersion 7.
  - Decision: build v8 only as a bounded stabilization patch. Priority 1 is post-shield/current-bullet safety; priority 2 is anti-teleport/boost star interception. Do not reduce safe-star tempo, skill tempo, or clear kill pressure.
- Follow-up 10-match champion-band v7 observation:
  - 10 settled matches: 7 wins, 3 losses, rankScore 1892 -> 1971, delta +79. Log: `/tmp/agentank-runs/review-20260701-v7/challenge-runs/2026-07-01T10-22-18-172Z.json`.
  - The run hit two 429 cooldown responses while asking for random opponents; both were skipped and retried, then the script still completed 10 settled matches.
  - Raw loss review: 2 `star_win` losses and 1 `runtime` loss, with no bullet-crash losses in this batch. `mat_0Wu1c5qSo2WE4eAFl` lost 2-4 by stars, `mat_63ahJfIuYBk6C6Ecf` lost 1-5 by stars, and `mat_Fj79KiA0iu3Hl0iFu` lost runtime after a 3-3 star tie while the opponent fired 17 bullets.
  - Raw win review: 7 wins show 6 `preserve-skill-tempo`, 4 `preserve-star-tempo-win`, 3 `preserve-clear-kill-pressure`, 4 `brave-safe-star`, and 3 `brave-clear-fire`. The wins average 1.57 own stars, 1.86 own bullets, and 1.71 own skill casts per match; they include shield timing against freeze/boost/stun and several crash wins created by clear pressure.
  - Win/loss contrast: losses lasted a full 128 frames on average with 2.0 own stars vs 4.0 enemy stars and 2.0 own bullets vs 7.0 enemy bullets. Wins averaged 79.6 frames, showing faster value creation through star tempo, shield timing, and kill pressure. Do not optimize only from losses; v8 must preserve these win behaviors.
  - Current ladder snapshot after the run: shield-main is champion I, rankScore 1971, rankPoints 171, elo 2201, record 170-71-0, codeVersion 7.
  - Decision: v7 is still climbing well. The next v8 priority should shift toward star interception/tempo and runtime/scan stability, with post-shield bullet safety kept narrow because this batch had no bullet-crash losses.
- Final pre-v8 champion-band v7 observation:
  - 10 settled matches: 6 wins, 4 losses, rankScore 1971 -> 2015, delta +44. Log: `/tmp/agentank-runs/review-20260701-v7/challenge-runs/2026-07-01T10-27-14-738Z.json`.
  - Raw loss review: 3 `star_win` losses and 1 `bullet_crash`. Losses were dominated by star tempo, especially teleport opponents (`mat_FS3F5Ufff4r2prfpU` and `mat_ID32NyX9QrU2Yu5mE`), plus one breakable-cover/current-bullet breach.
  - Raw win review: 6 wins show 5 `preserve-skill-tempo`, 3 `preserve-clear-kill-pressure`, 2 `preserve-star-tempo-win`, 3 `brave-clear-fire`, and 2 `brave-safe-star`. Wins averaged 1.67 own stars and 2.5 own bullets; losses averaged 1.25 own stars and 1.75 own bullets while enemies averaged 2.75 stars.
  - Decision: publish a bounded v8 patch that preserves v7 wins while improving star interception, late value pressure, direct-line path runtime, and post-shield safety.
- Shield v8 patch:
  - Added direct-line `pathInfo` shortcut to reduce repeated BFS on straight star/target routes.
  - Added star interception against teleport/boost or faster star-rush threats; this tries to occupy star row/column or adjacent star points instead of chasing the enemy.
  - Added late value pressure after frame 92 so equal/behind games create firing lanes instead of drifting into runtime losses.
  - Added a narrow post-shield reset guard so recent/expiring shield frames re-check current bullet, aimed shot, and breakable-cover danger before value actions.
  - Protected v7 win behaviors: safe star pickup, shield timing, clear kill pressure, brave safe stars, and brave clear fire.
- Verification for v8: focused `node --test lab/scripts/tests/shield-main-strategy.test.mjs` passed 25/25, `npm run test:lab` passed, `npm run check` passed, and server simulation passed 8/9.
- Publish: adjusted shield-main published to AgentTank main as server codeVersion 8, codeHash `d14dd87e5432bdd52af08b4f3fda63a2579c96191bbdb15e47f068369ff7cc92`.
- Current ladder snapshot after publish: shield-main is champion I, rankScore 2015, rankPoints 215, elo 2240, record 176-75-0, codeVersion 8.
- User-provided v8 skill matchup review:
  - `mat_3FIowb55jIyIESNaD`: lost by bullet crash at frame 45 against a boost tank. The user observation is correct: boost can dodge or reset a same-line duel, so future logic should not treat boost matchups as normal static gun lines. The concrete failure also involved breakable-cover/open-lane danger after shield, so this should be fixed as boost-aware lane spacing plus post-shield safety, not as a global retreat rule.
  - `mat_GZ6Yf0cfCtHAWHUTy`: lost by bullet crash at frame 47 against a shield mirror after falling behind 0-3 on stars. The opponent appeared to chain shield tempo better. Future shield-mirror logic should track enemy shield active/cooldown, avoid wasting shots into active shield, and pressure immediately after enemy shield expires while still racing safe stars.
- First v8 champion-band observation:
  - 10 settled matches: 6 wins, 4 losses, rankScore 1995 -> 2022, peak 2065, delta +27. Log: `/tmp/agentank-runs/review-20260701-v8/challenge-runs/2026-07-01T10-44-53-621Z.json`.
  - Wins: `mat_Iw0I8y2F53733ScwB` +18, `mat_1kpSQalYuYD0mVWrw` +14, `mat_925vFnLfIYUKfL5mp` +19, `mat_IvB9UVqebkvLwxV3N` +19, `mat_5cwKoQmAHW13IFkhp` +19, `mat_5SLxyO8YNy2BVxZF6` +20. These preserve star tempo, shield timing, skill tempo, and clear kill pressure; the overload win (`mat_925vFnLfIYUKfL5mp`) is a useful protected sample.
  - Losses: `mat_GmYcVKsD3bNHlYfn3` -22 shield mirror by crash after enemy shield tempo, `mat_2JSklYEluYjHOvudj` -21 teleport by stars with no fire pressure, `mat_2HyZiWHvHcS7A4DGZ` -19 poison by stars 0-6, and `mat_JXvaJGs8NX62ZbCpo` -20 cloak by stars 2-3 while enemy fired more.
  - Win/loss contrast: wins averaged 1.67 own stars, 1.83 own bullets, and 1.0 own shield cast. Losses averaged 1.25 own stars vs 4.0 enemy stars, 3.25 own bullets vs 3.75 enemy bullets, and 1.75 own shields vs 3.25 enemy skills. This says v8 is still viable, but long games against skill tanks need matchup-aware star pressure instead of generic chasing.
  - Decision: do not rewrite v8 immediately after a positive 6-4 batch. Candidate v9 work should be narrow: boost-aware gun-line spacing, shield-mirror cooldown/expiry pressure, stronger teleport/star camping, and runtime trimming in long poison/cloak games. Keep protected behaviors from v8 wins intact.
- Second v8 champion-band observation:
  - 10 settled matches: 6 wins, 4 losses, rankScore 2043 -> 2060, peak 2064, delta +17. Log: `/tmp/agentank-runs/review-20260701-v8/challenge-runs/2026-07-01T10-54-44-041Z.json`; full raw replays: `/tmp/agentank-runs/review-20260701-v8/observed2-raw`.
  - Skill split: boost 2-0 (`mat_LTZkZFk6RuF8DwHfW`, `mat_9DvdFUvITG40aU0PR`), poison 2-1 (`mat_KEicmop1z07GxCY12`, `mat_7fDrVEMh9AJAS8TqA`, loss `mat_7paoGiQ5pFd3Dnv9a`), teleport 0-2 (`mat_FX9BUbpD67c35423Q`, `mat_EfeA8ia02HJLNppXa`), cloak 1-0 (`mat_3GM85VjIgfFEATPfQ`), freeze 1-0 (`mat_3SPVYgqtSB9FGXFdf`), same shield opponent 0-1 (`mat_5tX6voOi0qeKrguVw` against tankId 1139 / 新建文件夹).
  - Preserve signals: boost wins show star tempo plus shield timing without firing; poison/cloak wins show safe star pickup plus clear pressure. Do not weaken safe-star movement, shield timing, or clear fire while repairing losses.
  - Repair signals: teleport losses were full-length star losses, 1-4 and 3-4, with defender teleport casts around frames 1/42/83 or 1/42/97. The current interception is not enough; stronger star-point camping or lane denial is needed when teleport is repeatedly winning first contact.
  - Same-shield signal: `mat_5tX6voOi0qeKrguVw` was the same opponent/codeHash as the earlier shield mirror (`mat_GZ6Yf0cfCtHAWHUTy`), but this one ended at frame 16 before either shield was cast. Treat this as early lane/bullet ETA failure against a known shield tank, not as evidence for global shield-spam.
  - Poison loss: `mat_7paoGiQ5pFd3Dnv9a` had our tank leading 3-1 on stars but dying at frame 85 after shields at 13 and 61; this confirms post-shield danger reset still has a gap in long poison games.
  - Decision: keep v8 active because two champion batches are both 6-4 and net positive (+44 total from the observed starts). Candidate v9 should remain narrow: teleport anti-star camping, same-shield early bullet-lane safety, and post-shield reset. No general aggression or star-tempo rewrite.
- Third v8 champion-band observation:
  - 20 settled matches: 17 wins, 3 losses, rankScore 2021 -> 2290, peak 2290, delta +269. One random challenge returned `battle_failed` and was skipped before completing the 20 settled matches. Log: `/tmp/agentank-runs/review-20260701-v8/challenge-runs/2026-07-01T11-00-16-321Z.json`; full raw replays: `/tmp/agentank-runs/review-20260701-v8/observed3-raw`.
  - Skill split from observed enemy casts: boost 4-1, teleport 3-0, poison 2-0, shield 1-1, stun 2-0, cloak 1-0, freeze 1-0, overload 0-1, no enemy skill observed 3-0. This is enough evidence that v8 should remain active and should not be rewritten.
  - Preserve signals: 16 `preserve-skill-tempo`, 12 `preserve-clear-kill-pressure`, 5 `preserve-star-tempo-win`, 12 `brave-clear-fire`, and 5 `brave-safe-star`. These are the current climb engine.
  - Teleport changed from the prior 0-2 sample to 3-0 in this run, but all three wins were quick bullet kills after the enemy took early stars (`mat_70bzR5HCIyFElXY4R`, `mat_BUtKFljC4VHI6Itzo`, `mat_CfIXthxPQOIBSvQR5`). Treat this as “kill pressure works against some teleport tanks”, not proof that long teleport star races are solved.
  - Boost is mostly handled: 4-1 overall. The one boost loss (`mat_5zj8feSC6Ji56z9ds`) was a frame-62 bullet death after our shield at frame 39, so keep current anti-boost star tempo and only tighten post-shield/current-bullet safety.
  - Shield mirror remains the clearest matchup weakness: `mat_AvsihLtUXVd2Jnk9i` lost 1-5 by stars against `opponent_shield_B`, while `mat_47Hg1NtULKcB03e7p` beat another shield tank by bullet crash despite being down 0-2 on stars. This calls for shield-mirror star tempo/cooldown awareness, not a global fire-rate or shield-spam rewrite.
  - Overload risk: `mat_GGbinkXu1qG9TPz3v` ended at frame 17 after enemy overload at frame 9 and our shield at frame 13; post-shield current-bullet handling still needs a very narrow fix.
  - Current snapshot after this run: champion I, rankScore 2290, rankPoints 490, elo 2494, record 209-93-0, codeVersion 8.
  - Decision: do not publish v9 from fear. V8 is now strongly climb-positive in a 20-match champion sample. If patching, make a tiny v9 focused only on shield-mirror star tempo and post-shield bullet ETA, then require a 20-match A/B-style real sample before publishing.
- Fourth v8 champion-band observation:
  - 40 settled matches: 20 wins, 20 losses, rankScore 2308 -> 2309, peak 2371, delta +1. Log: `/tmp/agentank-runs/review-20260701-v8/challenge-runs/2026-07-01T11-05-49-419Z.json`; full raw replays: `/tmp/agentank-runs/review-20260701-v8/observed4-raw`.
  - Run shape: opened 2-4 and dipped to 2264, recovered to a 2371 peak by match 21, then oscillated back to 2309. This is a high-score plateau sample, not a collapse.
  - Skill split from observed enemy casts: teleport 8-11 across 19 games, cloak 2-3, shield 4-1, stun 2-1, overload 2-0, freeze 0-1, poison 1-0, no enemy skill observed 1-3. Boost did not appear in this 40-match sample.
  - Teleport is now the dominant bottleneck at 2300+: it accounted for 11 of 20 losses, including four full 128-frame star losses (`mat_Kne3YClvmBK0By69T` 1-5, `mat_4bmAuOavngH0Z1XmB` 1-5, `mat_3Om8ipibjTo3P44Ez` 2-4, `mat_BreyDta3r9RHXfDhN` 2-6) plus multiple short bullet deaths after early teleport pressure.
  - Loss buckets: 13 `hard-current-bullet-eta`, 11 `fix-post-shield-reset`, 8 `fix-no-pressure-loss`, and 21 `fix-star-tempo-loss`. This says the next improvement should be a combined teleport-star and post-shield danger patch, not a generic aggression increase.
  - Preserve buckets still matter: 15 `preserve-skill-tempo`, 11 `preserve-clear-kill-pressure`, 9 `preserve-star-tempo-win`, 11 `brave-clear-fire`, and 9 `brave-safe-star`. These are why v8 holds 2300 instead of falling.
  - Shield mirror result changed from the prior concern: 4-1 in this sample. Keep shield-mirror awareness in mind, but prioritize teleport-heavy pools first.
  - Current snapshot after this run: champion I, rankScore 2309, rankPoints 509, elo 2569, record 230-113-0, codeVersion 8.
  - Decision: v8 can hold around 2300 but appears plateaued in teleport-heavy matchmaking. A v9 is justified only if it is small and testable: anti-teleport star interception/camping, no-pressure early-lane fallback, and post-shield bullet ETA reset. Do not disturb clear fire, shield timing, or safe-star tempo.
- Shield v9 candidate:
  - Tightened teleport star-rush detection: teleport threats now count when cooldown is within 18 frames or the enemy can contest within a wider distance window.
  - Reweighted star interception under teleport pressure so adjacent star-line points and firing points are favored over blindly chasing a star the teleporter is likely to touch first.
  - Moved star interception earlier in the action order, after immediate star/guarded-star handling but before generic star-lane fire and distant direct-star movement.
  - Added a narrow early lane-pressure fallback for far-star/no-star openings against snowball skills, while explicitly preserving close non-line bomb traps.
  - Updated publish notes to identify this as a v9 candidate, not the already-published v8.
- Verification for v9 candidate:
  - Focused `node --test lab/scripts/tests/shield-main-strategy.test.mjs` passed 27/27, including new teleport interception and early lane-pressure regressions.
  - `npm run check` passed, including the training-space gate.
  - `npm run test:lab` passed.
  - Server simulation passed 8/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`. Log: `/tmp/agentank-runs/simulations/2026-07-01T11-15-37-356Z`.
  - Attempted non-publish simulation against recent real teleport-heavy ladder tank ids, but `/api/agent/tank/simulate` rejected the first live tank id with `training bot not found`. This API only supports training bots, so candidate-vs-live-ladder validation still requires either publish or real ladder observation.
  - Decision: candidate is safe enough for a small real observation batch, but do not publish blindly over v8. Validate on a 20-match real sample first, with special attention to teleport-heavy opponents and whether clear-fire/star-tempo preserve signals regress.
- Publish: shield-main v9 published to AgentTank main, codeHash `dc4358b90572d45b26e22727cf02b8eae178a8ff198226c5ba7081c7f89f9cb5`.
- Competitive evolution plan: added `docs/agentank-competitive-evolution-plan.md` to extend the `agentank-evolution-lab` baseline into our own system: strategic layers, matchup playbooks, case tags, evaluation metrics, upgrade gates, version policy, and future case-library tooling.
- Dark Edge poison candidate:
  - The provided Dark Edge key maps to tank id 20, skill `poison`, not the existing local `freeze-main` entry. Added `active/dark-edge.js` and a `dark-edge` challenge-plan config with `AGENTANK_DARK_EDGE_KEY`.
  - Strategy is poison-specific rather than shield copy: adjacent safe star first, bullet/aim danger before value actions, poison for close tempo and contested star windows, star-line interception against teleport/boost, and late pressure when tied or behind.
  - Verification: `npm run check` passed, `npm run test:lab` passed, focused dark-edge tests passed 5/5, and server simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`.
  - Dry-run target pool after publish: start score 1847, climb policy stop-on-loss/drawdown 25, next candidate `mangosteen` tank 1614, shield, rankScore 1604.
  - Publish: Dark Edge codeVersion 50, codeHash `d6b38d4c90997baae867afaadbb405990e3e3140bd86e231111e1c51206aad23`.
  - 20-match real observation on codeVersion 50: 9 wins, 11 losses, rankScore 1847 -> 1668, delta -179. Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T03-52-24-241Z.json`.
  - Result shape: 17 bullet-crash decisions and 3 star decisions. Loss buckets: 9 `fix-bullet-death`, 8 `fix-no-pressure-loss`, 7 `fix-post-shield-reset`, 5 `fix-star-tempo-loss`, with 9 `hard-current-bullet-eta`.
  - Preserve buckets still exist: 9 `preserve-skill-tempo`, 6 `preserve-clear-kill-pressure`, and 4 `preserve-star-tempo-win`; the candidate can create wins, but the hazard model is too weak for real ladder.
  - Decision: do not continue real challenges on Dark Edge v50. Next patch should be bounded to bullet/current-lane safety and poison-after-dodge pressure, not more raw aggression.
- Dark Edge v51 safety patch:
  - Replay review of the v50 20-match sample showed repeated turn-in-place or poison-in-place actions while an active bullet or already-aimed lane was crossing the current tile.
  - Added bullet ETA detection, committed dodge intent for the next dodge frames, and an urgent-current-lane action gate so poison/fire/adjacent-star turns do not consume a frame inside immediate bullet or aimed-lane danger.
  - The first version of the gate was too broad and dropped server simulation to 6/9 by idling under far future pressure; narrowed the hard gate to current bullet ETA, already-aimed current lane, close breakable lane, and close overload danger.
  - Verification: focused dark-edge tests passed 7/7, `npm run check` passed, `npm run test:lab` passed, server simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`.
  - Dry-run after the fix: Dark Edge score 1688, climb policy stop-on-loss/drawdown 25, next queue candidate `NOah` tank 2305, boost, rankScore 1636.
  - Publish: Dark Edge codeVersion 51, codeHash `5c81bf0a95c8930dfdbce76cadb44d6d9f86468584d1131132d8a10b38f7bf0b`.
  - 20-match real observation on codeVersion 51: 11 wins, 9 losses, rankScore 1688 -> 1724, delta +36. Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T04-12-21-121Z.json`.
  - Compared with v50's 9-11 / -179 run, v51 is climb-positive, but not stable. The sample still had 7 `hard-current-bullet-eta`, 8 `fix-no-pressure-loss`, 7 `fix-bullet-death`, 7 `fix-star-tempo-loss`, 6 `fix-post-shield-reset`, and 1 runtime loss.
  - Preserve signals improved enough to keep v51 active for now: 11 `preserve-skill-tempo`, 8 `preserve-clear-kill-pressure`, and 7 `preserve-star-tempo-win`.
  - Follow-up 20-match observation on codeVersion 51: 8 wins, 12 losses, rankScore 1724 -> 1641, delta -83. Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T04-15-57-149Z.json`.
  - The second batch regressed hard: 19/20 decisions were bullet-crash shaped, all 12 losses were bullet crashes, and every loss breached `hard-current-bullet-eta`. The run also showed 12 `fix-star-tempo-loss`, 8 `fix-no-pressure-loss`, 8 `fix-post-shield-reset`, and 5 `fix-no-value-created`.
  - Combined v51 live signal across 40 matches: 19 wins, 21 losses, net -47, with 19 `hard-current-bullet-eta`, 19 `fix-bullet-death`, 19 `fix-star-tempo-loss`, 16 `fix-no-pressure-loss`, and 14 `fix-post-shield-reset`.
  - Preserve signals still matter across 40 matches: 19 `preserve-skill-tempo`, 14 `preserve-clear-kill-pressure`, and 9 `preserve-star-tempo-win`. Do not remove poison tempo or clear pressure wholesale.
  - Decision: stop blind v51 ladder runs. Next Dark Edge patch must inspect the latest losing frames and fix remaining current-bullet/turn-loop behavior before any further 20-match push.
- User-provided shield v9 replay review:
  - `mat_B52y9rUYhTs4TEBRy`: shield mirror `klala` dodged two bombs cleanly, then punished our post-shield same-column reset at frame 93. The lesson is bomb-zone discipline plus post-shield aimed-lane reset, not broader aggression.
  - `mat_BlJ4HbT6JeV0TtpQG`: 2-0 star win against a teleport tank that camped grass/cover at `[11,7]`/`[11,8]`; preserve shielded star pickup and do not rewrite this into a cloak-specific rule.
  - `mat_EABViLmSTO56ownzZ`: confirmed self-bomb death. Bomb at `[3,12]` exploded on frame 36 and still covered our tile `[1,12]`.
  - `mat_HNgHdlXOqqv7tUgZX`: current bullet lane had four frames of warning, but the tank turned in place until impact. This remains a panic-dodge regression pattern.
  - `mat_LZCRC8UJjZgB9v4xz`: our shot opened `[14,4]`, then after shield expired we walked into the newly opened `[14,*]` lane and died to a down shot.
- Shield v9 10-match observation on 2026-07-02:
  - Ran 10 real random/target-pool challenges with `AGENTANK_SHIELD_KEY`, start score 2348, peak 2417, end score 2376, result 6 wins and 4 losses. Run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T04-15-22-725Z.json`; raw replay review dir: `/tmp/agentank-runs/review-20260702-v9-10/raw`.
  - Wins: poison crash wins against `两年半练习生` twice, crash wins against `Orinpl`, `AngelLost`, `HoGor`, and a 5-0 star win against overload `Allan`. Preserve signals: 6 `preserve-skill-tempo`, 4 `preserve-clear-kill-pressure`, 1 `preserve-star-tempo-win`.
  - Losses: `mat_0C9cnvT7wm59pemVg` lost 3-4 by stars to teleport, `mat_BOjiPCdB05YLmlXgE` lost 1-4 by stars to stun, `mat_AUV3P3yzbA1KqqZbw` and `mat_K43UnxeK619HmXPls` lost 3-3 by runtime to stun tanks.
  - Batch signal: no new `hard-current-bullet-eta` breaches. The dominant repair buckets were 5 `fix-star-tempo-loss` and 2 `fix-runtime-budget`; do not weaken bullet/shield safety or clear kill pressure.
- Shield v10 local candidate:
  - Adjusted non-line `pathInfo` neighbor ordering to prefer directions that reduce target distance and require fewer turns during the first BFS layers. This targets close star races like `mat_0C9cnvT7wm59pemVg`, where `[5,1] -> [8,2]` wasted frames alternating turns before moving.
  - Replaced several candidate scoring `pathDist` calls with cheap Manhattan distance so late-game dodge, bomb escape, and firing-lane scoring do not repeatedly BFS on every option. Final movement still uses real `pathInfo`.
  - Tightened non-line dirt breaking: when the dirt is not on a direct star line, fire only if the dirt tile is strictly closer to the current star. This avoids late frames like `mat_BOjiPCdB05YLmlXgE` frame 121, where the tank fired into `[8,1]` while the star was `[15,4]`.
  - Verification: `node --check active/shield-main.js` passed; focused shield tests passed 29/29 with two new regressions; `npm run check` passed; `npm run test:lab` passed; server simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion`.
- User-provided grass camper replay review on 2026-07-02:
  - Reviewed `mat_19BAvDQbAN9D1oFE4`, `mat_61SRKajsiLF7op8oU`, `mat_5mKbh0419aAAW0cHT`, `mat_Jzzl7aslJ5gINHtsK`, `mat_39oNEz0dnxDBGyZbb`, and `mat_58Upy0KvHhF6vXmWf` from `/tmp/agentank-runs/user-review-20260702-grass/raw-only`.
  - Batch result from challenger perspective: 1 win and 5 losses; all 5 losses were bullet crashes, with 5 `hard-current-bullet-eta` breaches.
  - The user diagnosis is correct. `Riftwalker` and `myth-tank002` teleported into grass on the opening and then mostly stopped moving; `Nightjar` walked into a grass tile and then repeatedly fired from it. We often led on stars, including 2-0 and 3-0 samples, but later walked into the row/column covered by the grass camper.
  - Preserve signal: the star tempo is real. `mat_Jzzl7aslJ5gINHtsK` won 3-0 by stars while the opponent fired 26 shots from grass, so the fix should not abandon safe star collection.
- Shield grass-camper local candidate:
  - Remember suspected grass firing points for a longer bounded window instead of only treating the first few hidden frames as dangerous.
  - Treat remembered grass-camper rows/columns as live firing lanes when evaluating the current tile, next step, and star tile.
  - If a close star is in grass or covered by a suspected grass camper, spend shield before collecting it. If already ahead and the next useful movement would enter a suspected grass bait lane toward a far star, hold position instead of taking the bait.
  - Verification: focused shield tests passed 32/32 with three new grass-camper regressions; `npm run check` passed; `npm run test:lab` passed; server simulation was 8/9. The lone simulation loss was `azure-hunter` on random after shielded star pickup and post-shield bullet timing, not a grass-camper case, so it remains a separate publish risk rather than part of this grass patch.
- Shield v10 publish and live observation:
  - Publish: shield-main codeVersion 10, codeHash `28a7cb9fc2983f7f7694bf4349150c8a15a85d7b1598d42d4f65c8142ed90de0`.
  - Pre-publish gates: `npm run check` passed, focused shield tests passed 32/32, server simulation passed 9/9. Full `npm run test:lab` had unrelated Dark Edge failures, so shield-specific verification was used for this publish.
  - Real observation command used a 30-match cap, explicit grass-camper opponents `3643,4678,3838`, random fallback, and drawdown stop 70. Run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T04-50-56-852Z.json`; raw replay dir: `/tmp/agentank-runs/review-20260702-v10-13/raw`.
  - Run stopped after 13 matches on drawdown: 5 wins, 8 losses, rankScore 2368 -> 2332, peak 2406, end 2332.
  - Focus grass targets: lost to `Riftwalker` (`mat_KDWMk9QLpuz236RS3`) after collecting a star in the same column as the grass camper while shield was cooling down; beat `Nightjar` twice (`mat_HsY2zygy9ai8Val5g` by stars 2-0 while it fired 25 shots from grass, `mat_BTnulaXt5sr3Er5Ti` by crash); lost to `myth-tank002` (`mat_GQOoWA5HSmHJdJCOp`) by stars 1-4 after the opponent left the opening grass plan and won later star tempo.
  - Batch raw review: 5 `fix-star-tempo-loss`, 3 `fix-bullet-death`, 3 `fix-post-shield-reset`, 1 `fix-runtime-budget`, and 3 `hard-current-bullet-eta`; preserve signals still include shield skill tempo, safe-star wins, and one clear kill-pressure win.
  - Decision: v10 has a useful anti-Nightjar grass-camper behavior but is not stable enough for continued blind ladder runs. The next patch should be narrow: if a remembered grass camper covers a star and shield is not ready, do not enter that line just to collect while already leading; separately tighten post-shield bullet timing. Do not weaken the safe-star and Nightjar-winning hold behavior.
- Dark Edge v52-v56 poison iteration on 2026-07-02:
  - v52 fixed a bad assumption from v51: poisoned enemies are still treated as able to shoot, and close two-turn firing lanes are blocked for normal movement while adjacent safe stars remain allowed. Gates passed; publish codeVersion 52, codeHash `7b6585c5496b0dbe15da13d8934abbb9935851b6151539d0b1a242ff69830807`.
  - v52 live validation: first small batch went 3-1, rankScore 1641 -> 1683, then a follow-up first-match runtime loss dropped to 1662. Runtime review showed wall/near-star turn loops, not a new poison-timing win condition.
  - v53 candidate added the stable part only: relaxed dodge out of distant aiming lanes, blocked-star LOS check in interception, non-urgent stuck star-route continuation, and bounded late-pressure candidates instead of full-map scans. Gates passed and server simulation was 9/9. Publish codeVersion 53, codeHash `201626296229bf8ab27b89b9387c0facf2cf7d303182e484f7624aa1a3a02526`.
  - v53 live validation was climb-positive: 3 wins then 1 loss, rankScore 1662 -> 1701, net +39. Loss `mat_Jcg1NqUKNxMJB40nS` was a real `hard-current-bullet-eta` after freeze/late same-column pressure, but v53 was still the best live baseline.
  - v54/v55 tried to fix that hard case with point-blank panic poison, direct/short star-route priority, and long-current-lane value suppression. Although local gates and server simulation passed, live results regressed immediately: v54 lost first match to `carlos` 1701 -> 1674; v55 lost first match to `xgp_dev` 1674 -> 1653. These rules overfit the replay and should not be reintroduced as a bundle.
  - v56 rollback republished the v53 hash `201626296229bf8ab27b89b9387c0facf2cf7d303182e484f7624aa1a3a02526`, restoring the stable baseline after check/test/sim 9/9. Rollback validation went 1-1, rankScore 1653 -> 1658: beat `Ant` by stars, then lost to `Saber Tank` (`mat_I1qstqBOFYFBK8xFi`) by bullet crash while leading 1-0.
  - Current Dark Edge online state: codeVersion 56, rankScore 1658 after rollback validation. Do not keep blind ladder volume until the next patch is proven.
  - Next Dark Edge patch should be a single hypothesis: committed dodge must continue off a same-row/same-column firing lane after a star or stun/poison exchange. Reproduce `mat_I1qstqBOFYFBK8xFi` frame 36/37 and `mat_IIhGb68Yd0C1OZgeI` frame 85-90, but do not re-add panic poison or short-star priority globally.
- Dark Edge grass-ambush local candidate on 2026-07-02:
  - Re-fetched the six user-provided leaderboard grass replays to `/tmp/agentank-runs/user-review-20260702-grass-darkedge/raw-full`. From defender perspective, every grass tank reached grass by frame 1/3/7/16, then spent 16-118 frames in grass with 15-115 idle grass frames. The common winning shape was very low movement, repeated lane fire, and the challenger eventually entering a covered row/column; the one challenger win stayed on star tempo while `Nightjar` fired 26 shots from grass.
  - Local v57 hypothesis is poison-specific grass ambush, not shield-main copy: after adjacent safe star and hard danger checks, Dark Edge may move into nearby safe grass in the first opening window; inside grass it poisons only when the enemy is closing, contesting a reachable star, using boost/teleport pressure, or already on a line-of-sight trap, then fires or holds.
  - The first draft over-held against a passive `crimson-bastion` random simulation and lost by runtime with 0 stars / 0 shots. The fix was to require enemy closing, star contest, or a firing line before grass hold/ambush poison, so static far enemies do not trigger poison spam.
  - Verification: `npm run check` passed; focused Dark Edge tests passed 16/16 with three new grass regressions; `npm run test:lab` passed; server simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`. Log: `/tmp/agentank-runs/simulations-dark-edge-grass-regression/2026-07-02T06-19-36-521Z`.
  - Attempted non-publish simulation against real grass tank ids `3643,4678,3838`, but `/api/agent/tank/simulate` rejected `3643` with `training bot not found`. No publish and no real ladder challenge were run for this candidate.
- Dark Edge v57 publish, failed observation, and v58 rollback:
  - User approved publish plus a 40-match observation. Re-ran gates first: `npm run check` passed, focused Dark Edge tests passed 16/16, `npm run test:lab` passed. The immediate pre-publish server simulation was only 8/9, with a `nova-scout` random runtime loss showing 0 stars / 0 shots, so runtime/passivity was a known publish risk.
  - Dry-run before publish read Dark Edge at rankScore 1622. Queue seeded explicit grass ids `3643,4678,3838`, then same-band live targets and random fallback. `3643` and `4678` were already likely too far for real challenge range.
  - Publish: Dark Edge codeVersion 57, codeHash `8c0127e49ab619e49bd6c143ecad1ada69d036da45d00de2d20b4e402c75ad00`.
  - Real observation requested 40 matches but stopped after 10 settled on drawdown: 2 wins, 8 losses, rankScore 1622 -> 1516, peak 1622, drawdown 106. Run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T07-23-45-676Z.json`; raw replays: `/tmp/agentank-runs/review-20260702-dark-edge-v57-40/raw`.
  - Grass target result: `3643` and `4678` were rejected as `too_far`; `3838` (`myth-tank002`) was accepted and won against us (`mat_0CtjabF5OlF0BswcL`, -5). The rest of the run went 2-7 against same-band/random fallback.
  - Batch review: 20% win rate, 7 crash-category losses, 1 runtime loss, and 2 star wins. The dominant signal was not a new hard bullet breach; it was 8 `fix-no-pressure-loss`, 8 `fix-no-value-created`, and 8 `risk-passive-fire`. v57 made the tank too low-pressure and should not stay online.
  - Rollback: removed the grass-ambush candidate locally and restored the v56/v53 source behavior. Verification after rollback: `npm run check` passed, focused Dark Edge tests passed 13/13, `npm run test:lab` passed, server simulation was 7/9.
  - Publish rollback: Dark Edge codeVersion 58, codeHash `201626296229bf8ab27b89b9387c0facf2cf7d303182e484f7624aa1a3a02526`, matching the previous v56/v53 stable baseline hash. Current Dark Edge rankScore after the failed v57 run is 1516.
- Dark Edge v59 local grass-lane pressure candidate:
  - Hypothesis: reuse grass only as a pressure-preserving firing-lane tile, not as a passive opening camp. A grass tile is eligible only when it controls the current star row/column or a direct enemy lane, the star race is not urgent, and current danger checks are clean.
  - Implementation: added bounded grass-lane search, on-grass lane facing, and committed-window poison/fire pressure. The tank does not no-op in grass and ignores nearby grass that has no star/enemy lane value.
  - Verification: `npm run check` passed; focused Dark Edge tests passed 16/16 with three grass-lane regressions; `npm run test:lab` passed.
  - `npm run challenge:dry` remained blocked by missing `AGENTANK_SHIELD_KEY` because the package script is still fixed to `shield-main`; no real challenge was run.
  - Server simulation baseline set passed 8/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`. Log: `/tmp/agentank-runs/simulations-dark-edge-v59-grass-lane/2026-07-02T07-37-20-766Z`.
  - Expanded server simulation passed 16/18 across `classic`, `arena`, `public-map-6`, `public-map-15`, `public-map-16`, and `random`. Log: `/tmp/agentank-runs/simulations-dark-edge-v59-grass-lane-expanded/2026-07-02T07-39-06-793Z`.
  - Remaining risk: the two expanded losses were bullet crashes with `hard-current-bullet-eta` on public maps, and a smaller baseline loss was runtime/no-pressure. These failures are not clearly caused by the grass-lane branch, but they argue against immediate publish/40-match volume before a separate post-star/close-lane dodge patch.

## Decision

Dark Edge online is still the v56/v53 baseline hash as codeVersion 58. The v59 local candidate keeps grass as a pressure-preserving subcase and looks much healthier than v57 locally, but it is not published. Do not run blind ladder volume until the public-map close-lane bullet failures are handled or explicitly accepted as publish risk.

## Next Action

Next Dark Edge patch should target the expanded-simulation bullet crashes as a separate single hypothesis: after collecting a star or reaching an edge/corner lane, if the enemy can fire through the current tile this frame, move out of line instead of spending a turn. Preserve the v59 grass-lane candidate separately; do not combine it with another broad poison or star-priority rewrite.

## Shield Advantage Candidate

- User replay review on 2026-07-02:
  - `mat_1j5mNu92Nt5HMiCED`: after shielded star pickup, shield-main led 2-1 but stayed near the same-row gun line and died after shield expired.
  - `mat_7Hw9aIJbPDgKu8GbY`: shield-main led 5-1 but still chased a far star, stayed on a long vertical firing lane, and died to a delayed bullet.
  - `mat_FEHlaegl2ET82i848`: while behind 0-3, shield-main used shield to close distance but stayed in a same-column close lane after shield expiration.
- Hypothesis: shield-main should treat score lead as a tempo bank. When ahead, low-value dangerous stars should not spend shield, and nearby safe grass can be used as a control position before generic far-star chasing. Post-shield panic dodge should move off current bullet lanes when already facing the escape direction.
- Implementation:
  - Added score-margin-aware star value and shield-spend checks for risky star pickups.
  - Added bounded lead grass control before generic star interception/pathing.
  - Added current-bullet-lane detection so panic dodge can go straight off the lane instead of re-turning.
  - Added four shield regressions for lead grass control, low-value dangerous star shield suppression, post-shield same-lane guard, and current bullet-lane forward escape.
- Verification:
  - Focused shield tests passed 36/36.
  - `npm run check` passed.
  - `npm run test:lab` passed.
  - Training simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`. Log: `/tmp/agentank-runs/simulations/2026-07-02T08-03-41-270Z`.
  - No publish and no real challenge were run.

## Decision

Shield advantage candidate is locally healthy and better aligned with the reviewed failures. It should still be published cautiously because the change deliberately reduces some risky shield-star spending while preserving safe adjacent star pickups and clear fire.

## Next Action

If publishing is approved, run `npm run challenge:dry`, publish shield-main, then start with a bounded small real observation instead of blind ladder volume. Watch especially for safe-star tempo regressions and whether the new lead grass control causes passivity.

## Strategy Portability Note: Shield -> Overload

- The shield advantage strategy is portable as a decision framework, not as a direct skill copy. Keep the hazard-first loop, score-margin awareness, grass/control-position selection, hidden grass shooter memory, star value checks, and post-skill lane reset.
- Do not copy shield-only behavior into overload. Shield can spend a skill to survive a dangerous star pickup; overload cannot make an unsafe tile safe. Any copied `shielded star break` behavior must become `overload pressure first, then collect only if the exit is safe`.
- Overload should use the same advantage/disadvantage awareness differently:
  - When ahead, hold nearby grass or star-line control and use overload to deny the enemy's approach instead of chasing low-value far stars.
  - When tied or behind, use overload to create a firing/offset-lane window, punish grass campers, or force the opponent off a star line.
  - After overload expires or the firing window is spent, re-check current bullet, aimed lane, hidden grass lane, own bomb, and enemy counter-skill before taking value actions.
- The first overload hypothesis should be narrow: "copy shield-main's strategic skeleton, but replace shield star-breaking with overload lane denial and pressure-preserving grass control." Do not combine this with a broad poison/old Dark Edge rewrite in the same cycle.
- Required overload regressions before publish: no overload cast while standing in a current bullet lane; overload only when it creates star-line, enemy-line, or grass-camper pressure; leading by 2+ chooses control over dangerous far-star chasing; post-overload does not stay on the same gun line; no passive grass camping with zero pressure.

## Shield v11 Publish and Real Observation

- Gates before publish:
  - Focused shield tests passed 36/36.
  - `npm run check` passed.
  - `npm run test:lab` passed.
  - Training simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`. Log: `/tmp/agentank-runs/simulations/2026-07-02T08-20-24-919Z`.
  - `npm run challenge:dry` passed. Dry-run read start score 2375 and random fallback target queue. Dry-run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T08-21-09-896Z.json`.
- Publish: shield-main codeVersion 11, codeHash `c25c539a0ce42f8cb5daaf614a4ec2320ca708f54a2a5c6d23917b90a64cfa57`.
- Real observation:
  - Command used a 20-match cap, random fallback, prior run history, max 1 win per opponent, and drawdown stop 70.
  - Run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T08-21-38-418Z.json`.
  - Summary replay dir: `/tmp/agentank-runs/review-20260702-shield-v11-20/raw`.
  - Full replay dir: `/tmp/agentank-runs/review-20260702-shield-v11-20/raw-full`.
  - The run stopped after 17 settled matches on drawdown: 7 wins, 10 losses, rankScore 2375 -> 2313, peak 2394, drawdown 81.
  - Match ids: wins `mat_L98trMrTtkqCEcl7N`, `mat_8AU1FwQVxMLHF30vs`, `mat_3P0CnzEERZ17XAlDW`, `mat_4zBAfsZpkq1GkDjYb`, `mat_2hk1WDkEr2Y38oj2m`, `mat_AiYafCZ67YWFUKVPo`, `mat_KlnciEpxr4WGxn64N`; losses `mat_Kxp0dDE8uRD6XTT5N`, `mat_Bh10RV7lmkz3b2rG5`, `mat_AQwoUkIge7LHRMGOp`, `mat_Lu2gxxoYMbcC2pV9D`, `mat_3NKXz2wSY6jDkim8p`, `mat_98wWTWm1VKjIM5S7V`, `mat_Jx1ziQYQHxQLHot3Q`, `mat_EKPFalch55NGnb8K2`, `mat_E4GBLLVZ8JrIGStwq`, `mat_LhS1H7dm5kA71liTv`.
- Full replay batch review from challenger perspective:
  - 17 total, 7 wins, 10 losses, win rate 41.2%, average behavior score 30.3/100.
  - Outcomes: 13 `bullet_crash`, 4 `star_win`.
  - Preserve: 7 `preserve-skill-tempo`, 5 `preserve-star-tempo-win`, 4 `preserve-clear-kill-pressure`.
  - Fix: 9 `fix-star-tempo-loss`, 8 `fix-bullet-death`, 8 `fix-post-shield-reset`, 5 `fix-no-pressure-loss`, 3 `fix-no-value-created`, 2 `fix-breakable-cover-lane`, 1 `fix-unshielded-mutual-trade`.
  - Hard constraints: 8 `hard-current-bullet-eta`, 2 `hard-breakable-cover-shot`, 1 `hard-close-aimed-duel`.
  - Brave baseline: 5 `brave-safe-star`, 4 `brave-clear-fire`, but also 5 `risk-passive-fire`.
- Representative failures:
  - `mat_Kxp0dDE8uRD6XTT5N`: led 2-1 after a shielded star pickup, shield expired on frame 54, then the tank kept turning in the same column and died to a down bullet at frame 59.
  - `mat_Bh10RV7lmkz3b2rG5`: bomb/escape sequence near `[16,2]` did not create enough separation; enemy opened/used the left lane and killed us at frame 59.
  - `mat_AQwoUkIge7LHRMGOp`: cloak opponent fired down the same column; our non-panic dodge stepped farther down the bullet column and died at frame 56.
  - `mat_E4GBLLVZ8JrIGStwq`: 128-frame star loss 0-1 with repeated late turns and no shots, confirming passivity/star-tempo risk.
  - `mat_LhS1H7dm5kA71liTv`: close poison duel became mutual bullet crash while down 0-1 on stars, so the trade was losing.

## Decision

Do not continue blind ladder volume on shield-main v11. The advantage-control idea still has protected win signals, but this publish is net-negative at the current band and reintroduced post-shield/current-bullet failures.

## Next Action

Next shield patch should be a single bounded hypothesis: after shield expires or a shielded star pickup finishes, if an active bullet or newly opened lane can hit the current row/column within the next few frames, commit to leaving that lane before any turn-in-place, bomb setup, star pathing, or late pressure. Preserve safe adjacent stars, clear kill pressure, and the lead grass-control behavior.

## Dark Edge Overload v59 Publish

- User changed Dark Edge from poison to overload and requested a shield-main awareness copy with overload-specific actions.
- Implementation:
  - Copied the shield-main hazard/score/control skeleton into `active/dark-edge.js`.
  - Replaced shield action semantics with overload line pressure, offset-lane pressure, star-clearance-before-pickup, and lead star-line/grass control.
  - Added gates so overload is not cast while sitting in a current bullet or aimed lane, post-overload does not stay on a gun line, far low-value stars are not chased while leading, and grass hold only happens when it controls a star line or enemy pressure lane.
- Gates before publish:
  - Focused Dark Edge tests passed 13/13.
  - `npm run check` passed.
  - `npm run test:lab` passed.
  - Training simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`. Log: `/tmp/agentank-runs/simulations-dark-edge-overload-action-layer-v2/2026-07-02T08-28-53-720Z`.
  - Dark Edge dry-run passed via `node lab/scripts/grind-adaptive-real.mjs --tank dark-edge ...`, start score 1508, next target `幽灵100`, no real challenge executed. Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T08-30-06-210Z.json`.
- Publish: Dark Edge codeVersion 59, codeHash `41974420ed3af6339f23101e6be8d74ce7f2772fcdd9461ba2896988ce05b825`.
- No real challenge was run after publish.

## Next Action

If live validation is approved, start with a small bounded Dark Edge observation run rather than blind ladder volume. Stop on first meaningful loss or drawdown, and review specifically for overload passivity, post-overload lane reset, and whether lead control still creates pressure.

## Dark Edge Overload v60 Trajectory Fix

- User-provided v59 replays:
  - `mat_Ab0DYkaG2JjI9QWg1`: lost 0-1 by crash after casting overload at frame 20 without producing fire pressure; then walked to `[1,7]` and died to a simple up shot from `[1,9]`.
  - `mat_Hzv1EEz1LHfLQmSg8`: won, but the frame 14 overload cast created no direct fire pressure before a bomb/trap finish.
  - `mat_CzgCSQH94R7KBXh0M`: won despite 17 shots with 16 wall crashes and 4 skill casts; early overload at `[7,2]` fired a vertical positive-offset lane while the enemy moved out of that lane.
  - `mat_BzKIyCaYi8U4jnFRv`: lost after repeated overload/pressure windows near the right edge; 8 shots all hit walls, including wrong or stale offset-lane assumptions.
- Diagnosis:
  - v59 treated overload offset as if both adjacent sides were valid. Real replay evidence shows the extra overload lane is fixed in map-positive offset: horizontal shots add `y+1`, vertical shots add `x+1`.
  - This wrong model caused "莫名其妙" skill casts for impossible reverse-side offset windows and follow-up fire into walls or empty lanes.
- Implementation:
  - Narrowed `overloadDirTo` / `overloadLineFrom` to same lane or real positive offset only.
  - Added `overloadOffsetSource` and applied the same fixed-offset model to enemy overload danger.
  - Added Dark Edge regressions for wrong-side offset no-cast, vertical positive offset still casting, and active overload not firing at wrong-side offset targets.
- Gates before publish:
  - Focused Dark Edge tests passed 16/16.
  - `npm run check` passed.
  - `npm run test:lab` passed.
  - Training simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`. Log: `/tmp/agentank-runs/simulations-dark-edge-overload-true-offset/2026-07-02T08-54-21-430Z`.
  - Dark Edge dry-run passed, start score 1547, random fallback target only, no real challenge executed. Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T08-55-10-340Z.json`.
- Publish: Dark Edge codeVersion 60, codeHash `055ba5408345a8cee7b907cb3940cd8218c846d21b00d87ca587f523e0ebab1c`.
- No real challenge was run after publish.

## Next Action

Run only a small bounded Dark Edge observation if approved. Watch whether v60 reduces impossible overload casts and wall shots; if losses remain, separate the next hypothesis into post-overload lane reset rather than changing the trajectory model again.

## Shield v11 User Follow-up Review

- User-provided replays reviewed from `/tmp/agentank-runs/user-review-20260702-shield-followup/raw-full`: `mat_3wUalEC1DAJEkR7ya`, `mat_Kz9hKG0L2y779vgfQ`, `mat_IRKhsncshOaDqHrWT`, `mat_BwXdU0dmYi5EwLPjq`, `mat_HpwA6rnUzWa8t47Id`, and `mat_GsLled6dg6hKEMG0f`.
- Batch review from challenger perspective:
  - 6 total, 1 win, 5 losses, win rate 16.7%, average behavior score 22.3/100.
  - Outcomes: 4 `bullet_crash`, 2 `star_win`.
  - Preserve: 1 `preserve-star-tempo-win`, 1 `preserve-skill-tempo`.
  - Fix: 4 `fix-bullet-death`, 4 `fix-post-shield-reset`, 3 `fix-star-tempo-loss`, 1 `fix-breakable-cover-lane`.
  - Hard constraints: 4 `hard-current-bullet-eta`, 1 `hard-breakable-cover-shot`.
- Replay notes:
  - `mat_3wUalEC1DAJEkR7ya`: the user diagnosis is correct. The enemy fired from `[3,5]` on frame 51 while shield-main was already far away on the same row. At `[16,5]`, the tile `[16,6]` was open, but frames 54-57 were spent turning in place until the bullet arrived. This is a committed-lane-escape failure, not an unavoidable shot.
  - `mat_Kz9hKG0L2y779vgfQ`: preserve as a good advantage-control win. Shield-main led 4-2 and used shield through a late vertical lane before exiting when shield expired. The finish was risky, but it mostly demonstrates the behavior we want to preserve, not a reason for a broad rewrite.
  - `mat_IRKhsncshOaDqHrWT`: while down 0-3 on stars, shield-main kept pathing toward stars without creating enough lane pressure. It finally collected at frame 96, then died at frame 99 after a close same-column reset. This is both star-tempo deficit and post-shield/current-lane failure.
  - `mat_BwXdU0dmYi5EwLPjq`: close same-row aim developed one turn before the shot. Shield-main reacted by turning, but did not leave the row before the defender fired at frame 62. The current defense catches already-aimed lanes better than one-turn close aim.
  - `mat_HpwA6rnUzWa8t47Id`: close 3-4 star loss against teleport. Shield-main was not dead, but when the last star spawned far at `[14,12]`, the teleporter could take it immediately. This is a ceiling case for shield chasing teleport: late tied/behind games need earlier central/star-line pressure, not last-second pursuit.
  - `mat_GsLled6dg6hKEMG0f`: shield-main led 1-0 but stayed aggressive after shield expired, fired into dirt at frame 52, then turned in place near the enemy and died at frame 56. This supports the user's "too urgent while ahead" read.

## Decision

Shield-main v11 is not just unlucky; the recent samples show the same pattern as the 17-match observation. The strategy is near a plateau in its current shape because it mixes score-aware control with a still-fragile lane-escape primitive. Do not add more high-level star/grass rules until the primitive movement failure is fixed.

## Next Action

Build at most one shield patch next: committed lane escape. When an active bullet or close one-turn aimed lane threatens the current row/column, pick a perpendicular open tile and keep that escape intent until the tank actually moves off the lane. This must override star-distance scoring, dirt fire, bomb setup, late pressure, and generic turn-in-place actions. Add focused regressions for `mat_3wUalEC1DAJEkR7ya`, `mat_BwXdU0dmYi5EwLPjq`, and `mat_GsLled6dg6hKEMG0f`; keep `mat_Kz9hKG0L2y779vgfQ` as a protected advantage-control sample.

## Shield v11 Latest-50 Champion-Band Strategy Scan

- User set this session to focus on `shield-main`, specifically finding a shield-native path instead of copying teleport grass-camping.
- Live data pulled on 2026-07-02:
  - Leaderboard snapshot: `/tmp/agentank-runs/shield-strategy-scan/leaderboard/2026-07-02T08-54-51-762Z.json`.
  - `shield-main` latest 50 match metadata: `/tmp/agentank-runs/shield-strategy-scan/latest-50-2026-07-02T08-56-14-580Z/matches-50.json`.
  - Full `view=raw` replay frames: `/tmp/agentank-runs/shield-strategy-scan/latest-50-2026-07-02T08-56-14-580Z/raw-view`.
  - My-perspective summary: `/tmp/agentank-runs/shield-strategy-scan/latest-50-2026-07-02T08-56-14-580Z/shield-my-perspective-summary.json`.
- The leaderboard endpoint returned a low-tier/new-entry mixed list, so do not treat that file as a champion top-50 source. The tank match feed is more useful here: opponents in the 50-match set ranged from 2198 to 2529 rankScore, median 2352.
- My-perspective result: 50 matches, 21 wins, 29 losses, net rank delta -136. `shield-main` was challenger in 34 and defender in 16.
- Outcomes: 37 `bullet_crash`, 10 `star_win`, 2 `runtime`, 1 generic `crash`.
- Replay-derived fixes from my perspective:
  - 22 `fix-bullet-death`.
  - 21 `fix-post-shield-reset`.
  - 21 `fix-star-tempo-loss`.
  - 9 `fix-no-pressure-loss`.
  - 5 `fix-no-value-created`.
  - 4 `fix-breakable-cover-lane`.
- Hard constraints: 22 `hard-current-bullet-eta`, 4 `hard-breakable-cover-shot`, 1 `hard-close-aimed-duel`.
- Preserve signals still exist and should not be erased: 16 `preserve-skill-tempo`, 11 `preserve-clear-kill-pressure`, 10 `preserve-star-tempo-win`.
- Observed enemy skill casts in this set: teleport 21, cloak 16, stun 13, shield 8, boost 6, overload 6, poison 4, freeze 3. This is cast evidence, not full opponent roster classification.
- Grass-camping check: only 2 of these 50 matches had enemy grass frames >=15. The grass-camper problem is real from user-selected high-rank samples, but the latest `shield-main` champion-band feed is still dominated by bullet-lane and post-shield reset failures. Do not pivot the next patch into a grass-only counter.
- Representative fresh samples:
  - `mat_JwbDaTEUycs7ZS2Yu` and `mat_6admBp5WP9mAQU3nJ`: both losses to the 2529-score overload tank, with no/low pressure and current-bullet failure.
  - `mat_2yvMuEBOi2fAE77ff` and `mat_E4GBLLVZ8JrIGStwq`: star losses to `🍊` where stun pressure and no-value/no-pressure behavior beat passive shield play.
  - `mat_BEvg11RPboB6AJnaM`: teleport opponent used grass for 29 frames; still classified as post-shield/current-bullet failure, not purely a star chase loss.
  - `mat_J0Yt6ha4ZMD2nYYeS`, `mat_Kz9hKG0L2y779vgfQ`, and `mat_AiYafCZ67YWFUKVPo`: preserve star-tempo/skill-tempo wins where shield converted danger or tempo into a score result.

## Decision

The next shield strategy should not copy the teleport meta. Shield's path is a score-and-control tank: use shield to convert dangerous star windows, survive fire pressure, and force opponents to leave their comfort zone. However, v11 cannot scale until the primitive "leave the current bullet lane" behavior is reliable. The latest 50-match data supports the same priority as the user-provided replays: fix lane escape first, then layer larger star/grass/control policy.

## Next Action

Keep the next patch to one hypothesis: committed lane escape. After that passes regressions and small live observation, add the larger shield-native policy as a separate patch: ahead means hold safe control tiles/grass-adjacent lanes and stop forcing low-value stars; behind means stop pure star chasing and create central/star-line pressure before the last star spawn; against teleport grass campers, contest score with shielded high-value stars and safe lane control rather than entering covered rows/columns.

## Shield v12 Candidate: Committed Lane Escape

- User approved fixing the shield tank after the latest-50 strategy scan.
- Implementation:
  - Added committed lane escape detection for long active bullet lanes, using `bulletLaneDirectionAt(..., 8)` so distant same-row/same-column bullets are handled before value actions.
  - Added near one-turn aimed-lane escape for distance <=2, so the tank moves straight off the row/column when already facing a safe escape tile.
  - Kept the old protected behavior where an immediately arriving visible bullet can still trigger shield first.
  - Kept clear-fire behavior for farther enemies that merely need one turn to aim, so the fix does not erase brave pressure.
  - Wired committed escape into hazard, post-shield reset, breakable-lane, and emergency-defense paths.
- Regressions added:
  - Far same-row bullet lane no longer allows immediate firing.
  - Close one-turn aimed lane goes straight when already facing off-lane.
- Verification:
  - Focused shield tests passed 38/38.
  - `npm run check` passed.
  - `npm run test:lab` passed.
  - `npm run simulate` passed 9/9. Log: `/tmp/agentank-runs/simulations/2026-07-02T09-08-36-953Z`.
  - `npm run challenge:dry` passed. Dry-run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-09-13-447Z.json`.
  - Published to main as shield-main codeVersion 12, codeHash `c59c8528efaa15223f57e7e0b8b92ee18ee46f64187162c07df39430f5701245`.
  - Post-publish snapshot: `/tmp/agentank-runs/snapshots-v12-publish/shield-main/tank.json`; rankScore 2260, public rank 139/3933, record 284-181-0.
  - No real challenge was run after publish.

## Next Action

Run only a small bounded real observation with stop-on-loss/drawdown. Watch whether `hard-current-bullet-eta` and post-shield reset losses drop without reducing clear-fire and shield-star win signals.

## Dark Edge Overload v61 Candidate: Gunline Movement Guard

- User-provided v60 replays:
  - `mat_0oshfGrqTVFGwnCm0`: loss after aggressive chase into top-edge same-row gunline; the tank pursued pressure but did not account for the opponent's simple line-trap plan.
  - `mat_DQJNdbaFZdD1Cmgmi`: won narrowly by mutual crash/star state, but it was still a shield-style direct duel. This is not a stable overload pattern.
  - `mat_0pjRnt2JUG80U8oXg`: after taking an early star, the tank cast overload and then stayed/stepped into a long enemy bullet column instead of leaving the lane.
  - `mat_HFPv1jkKbbdFmt4SX`: preserve. The win used cover/offset geometry correctly: current body lane was safe while the positive-offset overload lane hit the opponent.
  - `mat_2ICHeLtFeTkBSfz0N`: loss after walking the left/bottom edge into low-escape same-row pressure, then accepting a direct duel.
  - `mat_5TT24o6L6CvGDViVh`: loss from point-blank same-row pressure after passive turns; this supports moving before direct pressure becomes unavoidable.
- Diagnosis:
  - v60 fixed overload trajectory, but the action layer still overvalued direct firing lines copied from shield-main.
  - Dark Edge should prefer "body off the gunline, overload offset on the target line"; direct same-row/same-column duels are only acceptable when the opponent cannot realistically reply.
- Implementation:
  - Added long active-bullet lane projection and one-turn enemy gunline detection.
  - Added strict `safeCell` rejection for moving into those bad gunlines, plus a small low-escape penalty under close enemy pressure.
  - Added `tryGunlineReposition` before any attack action, so current bad gunlines are escaped before overload/fire decisions.
  - Added `overloadAttackLaneSafe*` gates so overload casts still allow covered positive-offset attacks but refuse casts from current bad gunlines or into active bullet columns.
- Regressions added:
  - Do not overload/fire in a reply-capable direct lane.
  - Do not step into a long enemy bullet lane while chasing star line.
  - Preserve covered positive-offset overload attack.
- Verification:
  - Focused Dark Edge tests passed 18/18.
  - `npm run check` passed.
  - `npm run test:lab` passed.
  - Directed Dark Edge simulation passed 9/9 against `nova-scout`, `azure-hunter`, and `crimson-bastion` on `classic`, `arena`, and `random`. Log: `/tmp/agentank-runs/simulations-dark-edge-gunline-v61/2026-07-02T09-21-22-679Z`.
  - Dark Edge dry-run passed, start score 1444, random fallback target only, no real challenge executed. Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-22-00-749Z.json`.
- Publish: Dark Edge codeVersion 61, codeHash `05de733ea3e078a32971e7b0e5fd904d7f7d25ab7db5575de5141e763251556d`.
- No real challenge was run.

## Next Action

Run only a small bounded live observation if approved. Watch specifically whether v61 stops direct-duel overloads while preserving `mat_HFPv1jkKbbdFmt4SX`-style cover/offset kills.

## Dark Edge v61 20-Match Live Observation

- Real run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-25-13-308Z.json`.
- Command shape: Dark Edge, random rank-eligible opponents, `limit=20`, `max-wins-per-opponent=1`, `drawdown-stop=50`, run history enabled.
- Result from this initiated run: 20 settled matches, 18 wins, 2 losses, 0 errors.
- Score reporting:
  - Run state moved from 1515 to 1728.
  - Run-end tank snapshot reported 1693.
  - A later live snapshot reported 1617, so treat the per-run match log as authoritative for these 20 matches and the live snapshot as volatile after additional/async settlement.
- Losses:
  - `mat_9XeakULfH5qC2u8g9`: led 2-0, then stayed around `[3,4]` for a long left/right turn loop while saying lead-line tags. Five shots all hit walls. Lost when the opponent finally fired from `[3,3]`. This is a lead-control idling/oscillation problem, not an overload trajectory problem.
  - `mat_FdpTIbHKbv33v9kgO`: lost 1-2 after pure star chase with no shots fired by Dark Edge. The single overload cast did not create pressure, and the late close position became a point-blank lane death. This is a behind-state pressure/exit problem.

## Next Action

Do not change overload geometry next. The next bounded patch should focus on high-level control quality: lead-control must either hold a real star/enemy lane, move to a better tile, or resume star/pressure pathing; behind-state should stop pure far-star pursuit and create offset/cover pressure earlier.

## Shield v12 User Direction Review

- User-provided v12 shield replays:
  - `mat_8pB5oh6w7zj2hXdi9`: loss after an unshielded same-row exchange from the map edge. We fired from `[7,1]`, the opponent fired from `[7,8]`, and the tank spent the remaining frames turning instead of leaving the bullet lane. This is not a star policy issue; it is a no-exit gunline commitment issue.
  - `mat_Bcz78mZn2ifAVskJK`: win, but the early contested-star path tried to "hold" around `[12,*]` while an indestructible `x` at `[12,6]` blocked actual star-line control toward `[12,8]`. The behavior should distinguish a real controllable star line from a wall-blocked row/column.
  - `mat_0y0PbAEAxYV0ZzCvL`: loss to overload. The fatal shot came from the overload second lane: opponent at `[13,10]` fired `up`; the main lane `[13,*]` hit a wall, while the positive-offset lane `[14,*]` hit us at `[14,7]`. This confirms overload second-lane danger must be treated as a hard constraint near obstacles.
  - `mat_83mopMTxEPLH6lNGR`: preserve sample. While ahead, the tank used shield/escape, held control, avoided panic chasing, and let the opponent walk into the finishing line.
  - `mat_F4C73fVTe4sC3q6aW`: loss after chasing to the top/right edge, then staying in a long lane against a cloak opponent's shot with no useful exit.
  - `mat_5sG43OBpZBPDZcwPn`: cloak loss. After the enemy cloaked, we moved into a short hidden firing lane and died two cells away. The tank needs a stricter no-shield hidden-lane rule near last-seen cloak positions.
- Direction:
  - Do not pivot Shield into a grass-only counter. These samples still point first at lane survival and geometry quality.
  - Next code patch should be one narrow hypothesis: no-shield/no-exit gunline guard. Refuse clear-fire, edge travel, or value movement when the opponent can answer on the same row/column and our escape needs more turns than the incoming bullet allows. This should cover the common shape in `mat_8pB5oh6w7zj2hXdi9`, `mat_F4C73fVTe4sC3q6aW`, and part of `mat_5sG43OBpZBPDZcwPn`.
  - Keep overload as the next separate hard-constraint patch: port the proven fixed positive-offset model from Dark Edge v60 to Shield and treat active overload cooldown/status as armed, especially when the main lane is blocked but the offset lane is open.
  - Keep wall-blocked star-line control as a later quality patch: star-line hold and contested-star pressure should require actual line of sight or a reachable control tile, not just matching row/column.
  - Preserve `mat_83mopMTxEPLH6lNGR` behavior: when already ahead, choose safe control/grass-adjacent waiting and make the opponent solve the position.

## Next Action

If the next shield change is approved, implement only the no-shield/no-exit gunline guard first, with regressions for edge direct-duel firing and cloak-adjacent hidden-lane movement. Do not combine it with overload trajectory or wall-blocked star-line scoring in the same patch.

## Shield v12 Real Observation: Stop After First Loss

- User requested a 10-match observation. Gates before the real run:
  - `npm run check` passed.
  - Focused shield tests passed 38/38.
  - `npm run test:lab` passed.
  - `npm run simulate` passed 9/9 after loading `.env`.
  - `npm run challenge:dry` passed with server-selected random fallback, start score 2239, stop-on-loss enabled.
- Real run:
  - Command used the same adaptive runner as `challenge:run`, but with `--limit 10` because the package wrapper is fixed at 3.
  - Run log: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-30-45-745Z.json`.
  - Result stopped after 1/10 because stop-on-loss is enabled.
  - Score: 2239 -> 2216, delta -23.
  - Record after snapshot: 287-186-0, codeVersion 12, codeHash `c59c8528efaa15223f57e7e0b8b92ee18ee46f64187162c07df39430f5701245`.
- Loss replay:
  - `mat_Kj8iAdw77PeA1QW94` against teleport tank Carrick, tankId 2329.
  - Raw replay stored at `/tmp/agentank-runs/challenge-runs/2026-07-02T09-30-45-745Z-raw/mat_Kj8iAdw77PeA1QW94.json`.
  - Result: star loss 2-4.
  - Enemy teleport casts at frames 1, 42, and 86.
  - Enemy collected the first four stars at frames 3, 28, 44, and 56; shield-main collected at frames 89 and 114.
  - This is not a current-bullet or no-exit gunline death. It is a teleport star-tempo loss where the match was effectively decided before the tank reached the first star.
  - Secondary risk: frame 124 still showed a breakable-cover lane signal around `[11,6]`, but it did not decide the match.

## Next Action

Do not continue blind 10-match volume on v12 after this stop-on-loss. The next patch choice should now be re-evaluated: the user-selected replay set supported a no-shield/no-exit gunline guard, but the first fresh real validation loss is anti-teleport star tempo. Keep both as separate hypotheses; choose one before patching, and do not combine them.

## Shield v12 Diagnostic Batch: 10 Matches Without Stop-On-Loss

- User correctly noted one match is not enough evidence, and approved a diagnostic batch.
- Run setup:
  - Focused shield tests passed 38/38.
  - Shield server simulation passed 9/9. Log: `/tmp/agentank-runs/simulations/2026-07-02T09-38-46-959Z`.
  - Dry-run passed with server-selected random fallback, start score 2216.
  - Real run disabled `--stop-on-loss` by avoiding `--climb-policy`, and used `--drawdown-stop 80` plus `--max-wins-per-opponent 1`.
- Real run:
  - Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-39-23-574Z.json`.
  - Raw replays: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-39-23-574Z-raw`.
  - Result: 10 settled matches, 7 wins, 3 losses.
  - Score: 2198 -> 2270, peak 2288, net +72 from run start.
  - Snapshot after run: record 294-191-0, codeVersion 12, rankScore 2270.
- Losses:
  - `mat_9P5e1woo6Ah3pAwkL`: teleport opponent Meteor Striker, star loss 1-4. Enemy teleported into/near stars and collected at frames 6, 26, 47, and 88. Shield-main collected only frame 64. This is repeated anti-teleport star-tempo failure.
  - `mat_6iX7qMpidM87FBMeN`: freeze opponent Redis, star loss 1-4. The first star was reached under shield, but the enemy froze and collected it; later stars were lost by path tempo, not by bullet death.
  - `mat_KnkCoXZ0lYGDB1BrE`: teleport opponent newbitank, runtime loss at 3-3. Shield-main recovered from 0-2 to 3-3, but late frame 126 star spawn favored the teleporter and our final action had no decisive value.
- Wins:
  - 7 wins, most by crash. Preserve signals still matter: shield timing, clear kill pressure, and star tempo wins appeared in the winning samples.
  - Several wins still had `fix-star-tempo-loss` in behavior scoring, meaning crash pressure is masking star-tempo weakness rather than proving it solved.

## Decision

The 10-match batch does not support changing strategy from a single loss, but it does show a repeated pattern: current v12 can climb, yet losses and weak wins are dominated by star-tempo/late-value creation, especially against teleport and fast star-control opponents. Bullet-lane hard deaths were not the dominant failure in this batch.

## Next Action

Do not patch immediately from this batch alone. The next shield candidate should choose one narrow hypothesis: anti-teleport/star-tempo value creation, not a mixed rewrite with no-shield gunline, overload trajectory, and wall-blocked star-line scoring. Preserve the v12 crash-pressure and shield-tempo wins while making early/late star interception more decisive.

## Shield Candidate: Teleport Star-Lane Trap

- Scope:
  - Shield-only patch.
  - Do not change Dark Edge active state, overload geometry, no-shield gunline policy, or wall-blocked star-line scoring.
- Hypothesis:
  - Against teleport tanks that can beat shield-main to the current star, chasing the star tile is often lower value than holding a longer same-row/same-column firing lane.
  - The failed teleport samples show the tank often arrived one lane off the real pickup path, then fired at the teleport landing instead of the star pickup lane.
- Change:
  - `tryStarInterception` now treats a clearly lost teleport star race as a trap setup.
  - It skips the exact star tile in that state, extends star-lane control candidates from 3 to 5 cells, and scores controllable star lanes higher.
  - If shield-main is already on a valid star lane while the teleport opponent is favored to collect, it fires down the pickup lane instead of stepping toward the star.
- Regression:
  - Added `shield-main fires down a lost teleport star lane instead of walking into the pickup`.
- Verification:
  - Focused shield tests passed 39/39.
  - `npm run check` passed. Note: the shared active state currently reports `dark-edge / real-review bounded evolution`.
  - `npm run test:lab` passed.
  - Shield server simulation passed 9/9 at `/tmp/agentank-runs/simulations/2026-07-02T09-54-52-862Z`.
  - Default `npm run challenge:dry` failed because the other session set active state to dark-edge and `AGENTANK_DARK_EDGE_KEY` is not present.
  - Explicit shield dry-run passed: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-55-34-160Z.json`, start score 2185, random fallback.

## Next Action

For further shield iteration, use explicit commands with `--tank shield-main` while another session owns dark-edge active state. Next validation should be a real shield-only diagnostic batch if approved; do not rely on package default challenge scripts until active state is back on shield-main or separate worktrees are used.

## Shield v12 Live Baseline: Explicit 10-Match Run Stopped By Drawdown

- User approved a real shield-only diagnostic batch after the local teleport star-lane trap candidate.
- Important correction:
  - The local candidate had not been published before this run.
  - The real challenges therefore tested the currently published live shield-main, codeVersion 12, codeHash `c59c8528efaa15223f57e7e0b8b92ee18ee46f64187162c07df39430f5701245`.
  - Treat this run as a v12 live baseline, not as validation of the local candidate.
- Run:
  - Command used explicit `--tank shield-main`, `--limit 10`, no stop-on-loss, and `--drawdown-stop 80`.
  - Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T09-57-37-573Z.json`.
  - Raw replays were later fetched to `/tmp/agentank-runs/challenge-runs/2026-07-02T09-57-37-573Z-raw`.
  - Started at 2185, stopped after 8 matches at 2103 because current score fell 82 below peak.
  - Result: 2 wins, 6 losses, win rate 25%.
- Matches:
  - `mat_1YlzXJAImIjGrgPKC`: loss, crash, -17, summary raw only.
  - `mat_1M8F7nMiEtF3mXvPL`: loss, star, -21.
  - `mat_Cg7gGxve84sGCSwMu`: win, crash, +18.
  - `mat_8SfoCu5tv2q5anMMu`: loss to cloak tank Tank_400, bullet crash at frame 67 after shield expired and enemy fired along `[1,11] -> [5,11]`.
  - `mat_DiSXb6qBj0FBi4KPn`: loss to cloak tank pika, bullet crash at frame 38 after we collected the star and stayed on the same row as a long hidden shot.
  - `mat_1SsCagyAgfQ3En8sz`: win, crash, +19.
  - `mat_5dqafp9zC7zH2shC1`: loss to teleport tank, bullet crash at frame 45 after shield-star contest; post-shield reset still left us in the vertical answer lane.
  - `mat_AXhfZp8GPfPCRoiL0`: loss to teleport tank, star loss 2-6. Opponent collected early stars at frames 3, 17, 33, 48, 61, and 112; shield-main recovered only frames 82 and 99.
- Batch analysis:
  - Outcome categories: 4 bullet_crash, 2 crash, 2 star_win.
  - Fix signals: `fix-star-tempo-loss` 4, `fix-no-pressure-loss` 4, `fix-bullet-death` 3, `fix-post-shield-reset` 2.
  - This live baseline again shows two problems, but they should remain separate patches: star-tempo against teleport and post-shield/hidden-lane bullet survival.

## Next Action

Do not run more real matches until the intended local candidate is published or explicitly discarded. If publishing the local candidate, run the standard gates again, publish shield-main only, then do a smaller 5-match smoke or another bounded 10-match diagnostic. If not publishing, the next local patch should probably address post-shield hidden/answer-lane survival before further ladder pushes.

## Shield v13 Publish And 5-Match Smoke

- Candidate correction before publish:
  - Full simulation initially exposed a candidate-side runtime loss on `shield-main vs crimson-bastion` random: shield-main camped `[14,6]` while star `[14,9]` was blocked by wall at `[14,7]`, repeatedly treating a fake same-column line as interception.
  - Narrowed the candidate: interception targets more than 1 cell away from the star must have real LOS to the star.
  - Added regression: `shield-main does not treat a wall-blocked column as a star-line intercept`.
- Gates before publish:
  - `npm run check` passed. Note: shared active training-space still reports dark-edge.
  - Focused shield tests passed 40/40.
  - `npm run test:lab` passed.
  - Full shield simulation passed 9/9 at `/tmp/agentank-runs/simulations/2026-07-02T10-07-04-894Z`.
  - Explicit shield dry-run passed at `/tmp/agentank-runs/challenge-runs/2026-07-02T10-07-05-758Z.json`, start score 2125.
- Publish:
  - `shield-main` published as version 13.
  - codeHash: `ea7b77ab9a64f3e4c936d8632b8c0916340c3f6d9ad0a7a040e4f83f32582912`.
  - Notes: `shield-main candidate: anti-teleport star-lane trap with real line-of-sight control`.
- Real smoke:
  - Log: `/tmp/agentank-runs/challenge-runs/2026-07-02T10-07-51-178Z.json`.
  - Raw replays: `/tmp/agentank-runs/challenge-runs/2026-07-02T10-07-51-178Z-raw`.
  - Result: 5 matches, 3 wins, 2 losses.
  - Score: 2125 -> 2143, net +18.
  - Matches:
    - `mat_7ohrWwqLgQF9redps`: loss to aowugong, runtime/passive; no star, no shots.
    - `mat_6lRq8yd2GEFGze7T5`: win over DOGE by stars; preserve star tempo and skill tempo.
    - `mat_IjzR9fn5sm52lBtws`: win over E-10000 by crash.
    - `mat_3AiRK7XhQavGV4sgd`: win over teleport tank 旋转跳跃 by crash.
    - `mat_BADazfosoxSC7im7F`: loss to teleport tank 巨猿啼魂 by stars, 0-4.
- Interpretation:
  - v13 smoke is better than the preceding v12 live baseline (3-2 / +18 vs 2-6 / -82 stopped by drawdown), but it is still a small sample.
  - No hard current-bullet breach appeared in this 5-match smoke.
  - Remaining active weaknesses are now: runtime/no-value pathing and teleport star-tempo 0-4 losses.

## Next Action

Stop further real volume for now. Next shield patch should be a narrow value-creation fallback: when no star progress and no firing pressure has occurred for a long window, leave passive intercept/route loops and force a safe star path or firing lane. Keep post-shield hidden-lane survival as a separate later patch unless the next replay batch again shows bullet deaths.

## Dark Edge Candidate: Star Tempo Frame Arbitration

- User diagnosis: current training should not patch one match at a time because opponent skill, map shape, score state, and target pool volatility create too many confounders. Recent Dark Edge losses also show a clustered tactical axis: strong-star races are slow, overload setup often costs the decisive frame, and some movement is low-value.
- Scope:
  - Dark Edge only.
  - Keep existing overload geometry and gunline hard constraints.
  - Do not add matchup-specific branches.
- Implementation:
  - Added a frame-level star tempo arbiter before generic attack/overload actions.
  - Safe adjacent or close star pickups now beat overload setup when they can be collected first.
  - Clearly lost star races convert to star-lane pressure/interception instead of blind chase.
  - Leading low-value far-star states prefer control modules instead of direct pathing.
- Training method update:
  - Single fresh losses still require immediate review, but code changes now require either a reproducible hard constraint or a clustered failure axis across real samples.
  - `state/training-space.json` now tracks `frame-arbitration` as a bounded axis with required regressions.
- Status:
  - Local candidate only. It has not been published and has not run real challenges.
