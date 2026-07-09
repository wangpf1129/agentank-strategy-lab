#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function usage() {
  return [
    "Usage:",
    "  node lab/scripts/analyze-boost-tactics.mjs --events-dir <dir> --tank <name> [--out <dir>]",
    "",
    "Reads public AgentTank event replays and summarizes boost-window tactics.",
  ].join("\n");
}

function readOption(argv, name, defaultValue = undefined) {
  const index = argv.indexOf(name);
  if (index === -1) return defaultValue;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function increment(map, key, amount = 1) {
  const safeKey = key ?? "unknown";
  map[safeKey] = (map[safeKey] ?? 0) + amount;
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function pct(value, total) {
  if (!total) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function format(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function frameSet(events, predicate) {
  const out = new Set();
  for (const event of events) {
    if (predicate(event)) out.add(event.frame);
  }
  return out;
}

function framesBetween(events, start, end, predicate) {
  return events.filter((event) => (
    event.frame >= start && event.frame <= end && predicate(event)
  ));
}

function latestBefore(events, frame, predicate, maxGap = Infinity) {
  let best = null;
  for (const event of events) {
    if (event.frame > frame) break;
    if (!predicate(event)) continue;
    if (frame - event.frame > maxGap) continue;
    if (!best || event.frame >= best.frame) best = event;
  }
  return best;
}

function buildBoostWindows(events, tank) {
  const windows = [];
  let active = null;
  for (const event of events) {
    if (event.tank !== tank || event.skill !== "boost") continue;
    if (event.event === "skill_cast") {
      active = { start: event.frame, end: null };
    } else if (event.event === "skill_expired" && active) {
      active.end = event.frame;
      windows.push(active);
      active = null;
    }
  }
  if (active) {
    active.end = events[events.length - 1]?.frame ?? active.start;
    windows.push(active);
  }
  return windows;
}

function windowForFrame(windows, frame) {
  return windows.find((window) => frame >= window.start && frame <= window.end) ?? null;
}

function summarizeMatch(payload, tank) {
  const events = asArray(payload.events).slice().sort((a, b) => (a.frame ?? 0) - (b.frame ?? 0));
  const match = payload.match ?? {};
  const tankSummary = payload.summary?.tanks?.[tank] ?? {};
  const won = match.winnerTankName === tank;
  const resultReason = match.resultReason ?? payload.summary?.result?.reason ?? "unknown";
  const windows = buildBoostWindows(events, tank);
  const focusEvents = events.filter((event) => event.tank === tank);
  const turnFrames = frameSet(focusEvents, (event) => event.event === "turn");
  const moveCounts = {};
  for (const event of focusEvents) {
    if (event.event === "move") moveCounts[event.frame] = (moveCounts[event.frame] ?? 0) + 1;
  }

  const boostWindows = windows.map((window) => {
    const turns = framesBetween(focusEvents, window.start, window.end, (event) => event.event === "turn");
    const moves = framesBetween(focusEvents, window.start, window.end, (event) => event.event === "move");
    const fires = framesBetween(focusEvents, window.start, window.end, (event) => event.event === "fire");
    const freeTurnFrames = turns
      .map((event) => event.frame)
      .filter((frame) => (moveCounts[frame] ?? 0) > 0);
    const doubleMoveFrames = Object.entries(moveCounts)
      .map(([frame, count]) => ({ frame: Number(frame), count }))
      .filter((item) => item.frame >= window.start && item.frame <= window.end && item.count >= 2);
    return {
      start: window.start,
      end: window.end,
      turns: turns.length,
      moves: moves.length,
      fires: fires.length,
      freeTurnFrames,
      doubleMoveFrames,
    };
  });

  const fires = focusEvents.filter((event) => event.event === "fire");
  const hitsByBullet = new Map(
    focusEvents.filter((event) => event.event === "shot_hit").map((event) => [event.bullet, event]),
  );
  const wallsByBullet = new Map(
    focusEvents.filter((event) => event.event === "shot_wall").map((event) => [event.bullet, event]),
  );
  const boostTurnShots = [];
  for (const fire of fires) {
    const lastTurn = latestBefore(focusEvents, fire.frame, (event) => event.event === "turn", 2);
    const turnWindow = lastTurn ? windowForFrame(windows, lastTurn.frame) : null;
    const fireWindow = windowForFrame(windows, fire.frame);
    if (!lastTurn || (!turnWindow && !fireWindow)) continue;
    const hit = hitsByBullet.get(fire.bullet);
    const wall = wallsByBullet.get(fire.bullet);
    boostTurnShots.push({
      frame: fire.frame,
      turnFrame: lastTurn.frame,
      gap: fire.frame - lastTurn.frame,
      direction: fire.direction,
      outcome: hit ? "hit" : wall ? "wall" : "live",
      boostedAtTurn: !!turnWindow,
      boostedAtFire: !!fireWindow,
    });
  }

  const starCollections = focusEvents.filter((event) => event.event === "star_collected");
  const starsAfterBoostTurn = starCollections.filter((star) => (
    !!latestBefore(focusEvents, star.frame, (event) => (
      event.event === "turn" && !!windowForFrame(windows, event.frame)
    ), 8)
  )).map((event) => event.frame);

  const opponentSkill = events.find((event) => (
    event.tank && event.tank !== tank && event.event === "skill_cast"
  ))?.skill ?? "unknown";
  const crash = events.find((event) => event.event === "crashed" && event.tank === tank) ?? null;

  return {
    matchId: match.urlId,
    createdAt: match.createdAt ?? null,
    won,
    resultReason,
    opponentSkill,
    framesTotal: payload.summary?.framesTotal ?? null,
    stars: tankSummary.stars ?? starCollections.length,
    shotsFired: tankSummary.shotsFired ?? fires.length,
    shotsHit: tankSummary.shotsHit ?? focusEvents.filter((event) => event.event === "shot_hit").length,
    shotsWall: tankSummary.shotsWall ?? focusEvents.filter((event) => event.event === "shot_wall").length,
    turns: tankSummary.turns ?? focusEvents.filter((event) => event.event === "turn").length,
    moves: tankSummary.moves ?? focusEvents.filter((event) => event.event === "move").length,
    boostWindows,
    boostCasts: boostWindows.length,
    boostTurns: boostWindows.reduce((sum, window) => sum + window.turns, 0),
    boostFreeTurns: boostWindows.reduce((sum, window) => sum + window.freeTurnFrames.length, 0),
    boostDoubleMoveFrames: boostWindows.reduce((sum, window) => sum + window.doubleMoveFrames.length, 0),
    boostTurnShots,
    boostTurnShotHits: boostTurnShots.filter((shot) => shot.outcome === "hit").length,
    boostTurnShotWalls: boostTurnShots.filter((shot) => shot.outcome === "wall").length,
    starsAfterBoostTurn,
    crash,
  };
}

function aggregate(matches) {
  const out = {
    total: matches.length,
    wins: 0,
    losses: 0,
    resultReasons: {},
    opponentSkills: {},
    boostCasts: 0,
    boostTurns: 0,
    boostFreeTurns: 0,
    boostDoubleMoveFrames: 0,
    boostTurnShots: 0,
    boostTurnShotHits: 0,
    boostTurnShotWalls: 0,
    starsAfterBoostTurn: 0,
    winsWithBoostTurnShots: 0,
    lossesWithBoostTurnShots: 0,
    turnsPerBoost: [],
    freeTurnsPerBoost: [],
  };
  for (const match of matches) {
    if (match.won) out.wins++;
    else out.losses++;
    increment(out.resultReasons, `${match.won ? "win" : "loss"}:${match.resultReason}`);
    increment(out.opponentSkills, match.opponentSkill);
    out.boostCasts += match.boostCasts;
    out.boostTurns += match.boostTurns;
    out.boostFreeTurns += match.boostFreeTurns;
    out.boostDoubleMoveFrames += match.boostDoubleMoveFrames;
    out.boostTurnShots += match.boostTurnShots.length;
    out.boostTurnShotHits += match.boostTurnShotHits;
    out.boostTurnShotWalls += match.boostTurnShotWalls;
    out.starsAfterBoostTurn += match.starsAfterBoostTurn.length;
    if (match.boostTurnShots.length) {
      if (match.won) out.winsWithBoostTurnShots++;
      else out.lossesWithBoostTurnShots++;
    }
    for (const window of match.boostWindows) {
      out.turnsPerBoost.push(window.turns);
      out.freeTurnsPerBoost.push(window.freeTurnFrames.length);
    }
  }
  out.avgTurnsPerBoost = average(out.turnsPerBoost);
  out.avgFreeTurnsPerBoost = average(out.freeTurnsPerBoost);
  return out;
}

function renderMarkdown({ tank, eventDir, matches, aggregate }) {
  const lines = [
    "# Boost Tactic Analysis",
    "",
    `- Tank: ${tank}`,
    `- Event dir: ${eventDir}`,
    `- Matches: ${aggregate.total}`,
    `- Record: ${aggregate.wins}W/${aggregate.losses}L (${pct(aggregate.wins, aggregate.total)})`,
    `- Boost casts: ${aggregate.boostCasts}`,
    `- Turns during boost: ${aggregate.boostTurns}`,
    `- Free-turn frames while boosted: ${aggregate.boostFreeTurns}`,
    `- Double-move frames while boosted: ${aggregate.boostDoubleMoveFrames}`,
    `- Avg turns per boost: ${format(aggregate.avgTurnsPerBoost)}`,
    `- Avg free-turn frames per boost: ${format(aggregate.avgFreeTurnsPerBoost)}`,
    `- Shots after boost-turn setup: ${aggregate.boostTurnShots} (${aggregate.boostTurnShotHits} hit / ${aggregate.boostTurnShotWalls} wall)`,
    `- Stars collected within 8 frames after a boost turn: ${aggregate.starsAfterBoostTurn}`,
    "",
    "## Buckets",
    "",
    "| Bucket | Count |",
    "| --- | ---: |",
  ];
  Object.entries(aggregate.resultReasons)
    .sort((left, right) => right[1] - left[1])
    .forEach(([bucket, count]) => lines.push(`| ${bucket} | ${count} |`));

  lines.push("", "## Opponent Skills", "", "| Skill | Count |", "| --- | ---: |");
  Object.entries(aggregate.opponentSkills)
    .sort((left, right) => right[1] - left[1])
    .forEach(([skill, count]) => lines.push(`| ${skill} | ${count} |`));

  lines.push("", "## Boost-Turn Shot Examples", "", "| Match | Result | Opponent | Frame | Gap | Outcome | Stars | Shots |", "| --- | --- | --- | ---: | ---: | --- | ---: | ---: |");
  matches
    .filter((match) => match.boostTurnShots.length)
    .sort((left, right) => {
      const leftHit = left.boostTurnShotHits > 0 ? 0 : 1;
      const rightHit = right.boostTurnShotHits > 0 ? 0 : 1;
      return leftHit - rightHit || Number(left.won) - Number(right.won);
    })
    .slice(0, 18)
    .forEach((match) => {
      const shot = match.boostTurnShots.find((item) => item.outcome === "hit") ?? match.boostTurnShots[0];
      lines.push(`| ${match.matchId} | ${match.won ? "W" : "L"}:${match.resultReason} | ${match.opponentSkill} | ${shot.frame} | ${shot.gap} | ${shot.outcome} | ${match.stars} | ${match.shotsFired} |`);
    });

  lines.push("", "## Match Summary", "", "| Match | Result | Opponent | Boost | Boost turns | Free turns | Turn shots | Hits | Walls | Stars after boost-turn | Crash frame |", "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  matches.forEach((match) => {
    lines.push(`| ${match.matchId} | ${match.won ? "W" : "L"}:${match.resultReason} | ${match.opponentSkill} | ${match.boostCasts} | ${match.boostTurns} | ${match.boostFreeTurns} | ${match.boostTurnShots.length} | ${match.boostTurnShotHits} | ${match.boostTurnShotWalls} | ${match.starsAfterBoostTurn.length} | ${match.crash?.frame ?? ""} |`);
  });

  return `${lines.join("\n")}\n`;
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const eventDir = readOption(argv, "--events-dir");
const tank = readOption(argv, "--tank");
const outDir = readOption(argv, "--out", eventDir);
if (!eventDir || !tank) {
  console.error(usage());
  process.exit(1);
}

const filenames = (await readdir(eventDir)).filter((name) => name.endsWith(".json")).sort();
const matches = [];
for (const filename of filenames) {
  const fullPath = path.join(eventDir, filename);
  const payload = JSON.parse(await readFile(fullPath, "utf8"));
  matches.push(summarizeMatch(payload, tank));
}
const summary = aggregate(matches);
const output = {
  generatedAt: new Date().toISOString(),
  tank,
  eventDir,
  aggregate: summary,
  matches,
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "boost-tactic-analysis.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
await writeFile(path.join(outDir, "boost-tactic-analysis.md"), renderMarkdown({
  tank,
  eventDir,
  matches,
  aggregate: summary,
}), "utf8");

console.log(path.join(outDir, "boost-tactic-analysis.md"));
