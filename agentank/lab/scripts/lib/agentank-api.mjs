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

export function buildAgentApiUrl(path, params = {}) {
  const url = new URL(path, AGENTANK_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/:/g, "-").replace(".", "-");
}

export function authHeaders(key = "") {
  const value = String(key).trim();
  return value ? { Authorization: `Bearer ${value}` } : {};
}

function isSensitiveKey(key) {
  return /(key|token|secret|authorization|password)/i.test(key);
}

export function sanitizeForStorage(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeForStorage(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : sanitizeForStorage(nested),
    ]),
  );
}
