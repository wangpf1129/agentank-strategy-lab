export const AGENTANK_BASE_URL = "https://agentank.ai";

export function parseMatchId(input) {
  const text = String(input ?? "").trim();
  const match = text.match(/mat_[A-Za-z0-9]+/);
  if (!match) {
    throw new Error(`No AgentTank match id found in: ${text}`);
  }
  return match[0];
}

export function buildMatchUrl(input) {
  const matchId = parseMatchId(input);
  return `${AGENTANK_BASE_URL}/api/matches/${matchId}/agent.json`;
}

export function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/:/g, "-").replace(".", "-");
}

export function authHeaders(key = "") {
  const value = String(key).trim();
  return value ? { Authorization: `Bearer ${value}` } : {};
}
