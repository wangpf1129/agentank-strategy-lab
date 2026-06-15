# Teleport v23 Grass Live Sampling

Date: 2026-06-15

Tank: `947` / 山大王

## Summary

User direction: use large live battle volume to expose real issues, with grass ambush / star camping as the main strategy.

`v23` was published as `codeVersion 41`.

Earlier confirmed live state before the follow-up grind:

- `rankScore`: `717`
- tier: `gold II +17`
- wins/losses: `1286 / 1246`
- `codeVersion`: `41`
- `codeHash`: `fabf2872ac57c1ab1ffde0f415e4efbae3d720f38f2c6a83dd21eee354369b11`

Live push path:

- start after publish: `370`
- peak: `902`
- earlier final: `717`
- latest confirmed after follow-up grind: `602`

## v23 Change

Source: `teleport-main-v23-candidate.js`

- Kept `v21` large-random quiet star rush guard.
- Reintroduced grass ambush and star-side camping from `v20`.
- Did not include the unproven `v22` next-step lane guard.

Validation before publish:

- `node --test lab/scripts/tests/teleport-v23-strategy.test.mjs`
- `node --check teleport-main-v23-candidate.js`
- `node --test lab/scripts/tests/*.test.mjs`
- private simulation: `26-1`
  - run dir: `agentank/lab/data/simulations/2026-06-15T07-15-02-690Z`
  - only loss: `nova-scout` on `public-map-55`, `runTime`

## Live Sampling

Primary run logs:

- `lab/data/challenge-runs/2026-06-15T07-17-41-670Z.json`
- `lab/data/challenge-runs/2026-06-15T07-20-17-391Z.json`
- `lab/data/challenge-runs/2026-06-15T07-22-41-166Z.json`
- `lab/data/challenge-runs/2026-06-15T07-24-27-356Z.json`
- `lab/data/challenge-runs/2026-06-15T07-25-06-492Z.json`
- `lab/data/challenge-runs/2026-06-15T07-27-33-928Z.json`
- `lab/data/challenge-runs/2026-06-15T07-29-23-506Z.json`

Aggregate:

- matches: `121`
- wins/losses: `73 / 48`
- net score delta across sampled matches: `+347`

## Follow-up Grind

User direction: keep `v23` live and try to push with this version.

Additional run logs:

- `lab/data/challenge-runs/2026-06-15T07-40-37-770Z.json`
- `lab/data/challenge-runs/2026-06-15T07-42-42-553Z.json`
- `lab/data/challenge-runs/2026-06-15T07-43-03-306Z.json`
- `lab/data/challenge-runs/2026-06-15T07-43-21-706Z.json`
- `lab/data/challenge-runs/2026-06-15T07-43-50-477Z.json`

Follow-up result:

- started from: `717`
- latest confirmed score: `602`
- logged completed scored matches: `16`
- logged wins/losses: `6 / 10`
- logged net: `-134`
- live score delta: `-115`
- note: the interrupted run likely had one in-flight win after the log was written, because the next live run started at `673` while the interrupted run log ended at `654`
- skipped target: `1992` was rejected as `too_far` at `624`

Useful signal from this follow-up:

- `855`: `2-0`, `+36`
- `3989`: `2-0`, `+36`

New blocks from this follow-up:

- `1705`: `0-1`, `-20`
- `3038`: `1-1`, `-8`
- `145`: `1-1`, `-9`
- `1279`: `0-1`, `-25`
- `3395`: `0-1`, `-24`
- `3890`: `0-1`, `-23`
- `3864`: `0-1`, `-26`
- `3560`: add `0-1`, `-26` after its earlier `2-0`
- `2318`: add `0-1`, `-23` after its earlier `2-0`
- `2887`: logged `0-1`, `-22`; likely also had one unlogged win during the interrupted run

Interpretation: `v23` still produces real short windows, but the live controller must not reuse stale positives after the rank band shifts. The next controller change should enforce peak protection and rotate after two wins globally, not just within a single run.

## Earlier Strong Windows

Best net positive targets from the first `v23` climb. These are not permanent safe targets; the follow-up grind showed that some expired after the rank band shifted.

- `1992`: `8-0`, `+97`; later became `too_far` at `624`
- `2915` / TigerKingTank01: `7-1`, `+97`
- `3560` / Tank-D6E56B3D: `2-0`, `+40`; later lost `-26`
- `1006` / 无敌小橘子: `2-0`, `+38`
- `2318` / 海绵宝宝: `2-0`, `+38`; later lost `-23`
- `2900`: `2-0`, `+38`
- `1863`: `2-0`, `+36`
- `2650`: `2-0`, `+36`

Useful but volatile:

- `1180`: `4-1`, `+30`
- `1597`: `2-1`, `+25`
- `2884`: `2-1`, `+25`
- `3068`: `3-2`, `+14`

## Blocked / Negative

Avoid until code changes:

- `1430`: `0-2`, `-38`
- `2582`: `0-1`, `-27`
- `1009`: `0-1`, `-25`
- `1233`: `0-1`, `-24`
- `2029`: `0-1`, `-24`
- `2158`: `0-1`, `-24`
- `1561`: `0-1`, `-23`
- `1963`: `0-1`, `-23`

Previously blocked targets still remain unsafe:

- `829`, `2920`, `3691`, `1351`, `1290`, `4049`, `822`

## Main Finding

The large-sample approach was correct. The earlier conservative conclusion was too cautious.

The actual pattern is:

- `v23` can climb aggressively by discovering short target windows.
- Many windows are real but expire after 2-3 wins, especially once our score jumps above the opponent.
- Repeating a target after the first loss is usually bad.
- The main remaining failure is still crash-lane exposure on random maps.
- Runtime is much less frequent than before, but still appears against some freeze or puzzle-like maps.

## Next Optimization

`v24` should focus on preserving gains above `850`.

Use these loss replays first:

- `mat_BZRUD6Q3i0J7vdkDc` vs `1984`, `-30`, crash
- `mat_Koy5b6EtEVZ3Ngdok` vs `1180`, `-30`, crash
- `mat_ICdsIzFsby85Zzi6I` vs `3838`, `-29`, crash
- `mat_5jHglqxniWy0Q5Wif` vs `3068`, `-28`, crash
- `mat_7TtqGNYfFBi2vepAy` vs `2582`, `-27`, crash
- `mat_9tkHlzGiMZ5FOs9uJ` vs `1009`, `-25`, runtime

Practical v24 rules:

- after gaining a 2+ star lead, stop contesting same-row/same-column routes unless the next move exits the enemy firing lane;
- when the enemy is boost/stun/teleport and within one-turn lane setup range, prioritize lateral movement over moving closer to the star;
- add a run controller policy: exploit any target for at most 2 wins, then rotate; never keep a target after one loss.
