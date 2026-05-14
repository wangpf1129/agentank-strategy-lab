import assert from "node:assert/strict";
import test from "node:test";

import {
  compareLadderMetrics,
  extractLadderMetrics,
  formatLadderMetrics,
} from "../lib/ladder-metrics.mjs";

test("extracts ladder metrics from a tank snapshot", () => {
  const metrics = extractLadderMetrics({
    tank: {
      elo: 1257,
      rankDivision: 2,
      rankPoints: 17,
      rankScore: 717,
      rankTier: "gold",
    },
    standing: {
      rank: 495,
      totalPublic: 1007,
    },
  });

  assert.deepEqual(metrics, {
    elo: 1257,
    rank: 495,
    rankDivision: 2,
    rankPoints: 17,
    rankScore: 717,
    rankTier: "gold",
    totalPublic: 1007,
  });
});

test("extracts ladder metrics from a leaderboard row", () => {
  const metrics = extractLadderMetrics({
    elo: 1399,
    rank: 21,
    rankDivision: 1,
    rankPoints: 66,
    rankScore: 866,
    rankTier: "gold",
  });

  assert.equal(metrics.rankScore, 866);
  assert.equal(metrics.rankTier, "gold");
  assert.equal(metrics.rankDivision, 1);
  assert.equal(metrics.rankPoints, 66);
  assert.equal(metrics.rank, 21);
});

test("formats ladder tier, score, and rank as the primary summary", () => {
  const label = formatLadderMetrics({
    rank: 495,
    rankDivision: 2,
    rankPoints: 17,
    rankScore: 717,
    rankTier: "gold",
    totalPublic: 1007,
  });

  assert.equal(label, "gold II +17, score 717, rank 495/1007");
});

test("compares ladder snapshots by score first and public rank second", () => {
  const comparison = compareLadderMetrics(
    { rank: 509, rankScore: 622, rankTier: "silver", rankDivision: 1, rankPoints: 22 },
    { rank: 495, rankScore: 717, rankTier: "gold", rankDivision: 2, rankPoints: 17 },
  );

  assert.deepEqual(comparison, {
    divisionChanged: true,
    rankDelta: -14,
    rankImproved: true,
    rankPointsDelta: -5,
    rankScoreDelta: 95,
    scoreImproved: true,
    tierChanged: true,
  });
});
