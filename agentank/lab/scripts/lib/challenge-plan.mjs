export const PRIMARY_TANKS = Object.freeze({
  "freeze-main": Object.freeze({
    codename: "freeze-main",
    tankId: 941,
    skill: "freeze",
    envName: "AGENTANK_FREEZE_KEY",
  }),
  "teleport-main": Object.freeze({
    codename: "teleport-main",
    tankId: 947,
    skill: "teleport",
    envName: "AGENTANK_TELEPORT_KEY",
  }),
});

export function parseList(value, name) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  const text = String(value ?? "").trim();
  if (!text) return [];
  const items = text.split(",").map((item) => item.trim()).filter(Boolean);
  if (!items.length) throw new Error(`Missing ${name}`);
  return items;
}

export function resolveTankConfigs(tanks = "all") {
  const names = parseList(tanks, "tanks");
  const selected = names.includes("all") || names.length === 0
    ? Object.keys(PRIMARY_TANKS)
    : names;

  return selected.map((codename) => {
    const tank = PRIMARY_TANKS[codename];
    if (!tank) {
      throw new Error(`Unknown tank codename: ${codename}`);
    }
    return { ...tank };
  });
}

function parsePositiveInteger(value, name, defaultValue) {
  const raw = value === undefined || value === null || value === "" ? defaultValue : value;
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseOpponentIds(value) {
  const ids = parseList(value, "opponents").map((item) => {
    const parsed = Number.parseInt(item, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== item) {
      throw new Error(`Invalid opponent id: ${item}`);
    }
    return parsed;
  });
  if (!ids.length) throw new Error("At least one opponent id is required");
  return ids;
}

export function buildChallengePlan({
  tanks = "all",
  opponents,
  maps = "random",
  repeat = 1,
  limit,
} = {}) {
  const tankConfigs = resolveTankConfigs(tanks);
  const opponentIds = parseOpponentIds(opponents);
  const mapIds = parseList(maps, "maps");
  if (!mapIds.length) throw new Error("At least one map id is required");

  const rounds = parsePositiveInteger(repeat, "repeat", 1);
  const maxItems = limit === undefined || limit === null || limit === ""
    ? Number.POSITIVE_INFINITY
    : parsePositiveInteger(limit, "limit", 1);

  const plan = [];
  for (const round of Array.from({ length: rounds }, (_, index) => index + 1)) {
    for (const opponentId of opponentIds) {
      for (const mapId of mapIds) {
        for (const tank of tankConfigs) {
          plan.push({
            tankCodename: tank.codename,
            tankId: tank.tankId,
            skill: tank.skill,
            envName: tank.envName,
            opponentId,
            mapId,
            round,
          });
          if (plan.length >= maxItems) return plan;
        }
      }
    }
  }
  return plan;
}

export function buildChallengeRequestBody(item) {
  return {
    opponentTankId: item.opponentId,
    mapId: item.mapId,
  };
}

export function extractMatchId(value) {
  if (typeof value === "string") {
    const match = value.match(/mat_[A-Za-z0-9]+/);
    return match?.[0] ?? null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const matchId = extractMatchId(item);
      if (matchId) return matchId;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;

  for (const key of ["matchId", "id", "url", "historyUrl"]) {
    const matchId = extractMatchId(value[key]);
    if (matchId) return matchId;
  }
  for (const nested of Object.values(value)) {
    const matchId = extractMatchId(nested);
    if (matchId) return matchId;
  }
  return null;
}
