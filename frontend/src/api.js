// Relative by default so the app works from any device on the LAN: the
// browser calls the same host/port it loaded the page from, and the
// dev server (Vite proxy) / prod server (Nginx) forwards /api/* to the
// FastAPI backend. Override only if you need to point at a different
// API host entirely.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// --- Players ---------------------------------------------------------------
export const getPlayers = () => request("/players");
export const createPlayer = (payload) =>
  request("/players", { method: "POST", body: JSON.stringify(payload) });
export const updatePlayer = (playerId, payload) =>
  request(`/players/${playerId}`, { method: "PUT", body: JSON.stringify(payload) });
export const deletePlayer = (playerId) =>
  request(`/players/${playerId}`, { method: "DELETE" });

// --- Games -------------------------------------------------------------------
export const getGames = () => request("/games");
export const createGame = (payload) =>
  request("/games", { method: "POST", body: JSON.stringify(payload) });
export const updateGame = (gameId, payload) =>
  request(`/games/${gameId}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteGame = (gameId) =>
  request(`/games/${gameId}`, { method: "DELETE" });
export const archiveGame = (gameId) =>
  request(`/games/${gameId}/archive`, { method: "POST" });
export const unarchiveGame = (gameId) =>
  request(`/games/${gameId}/unarchive`, { method: "POST" });

// --- Stat Types ----------------------------------------------------------------
export const getStatTypes = () => request("/stat_types");

// --- Stat Entries ----------------------------------------------------------------
export const getStatEntries = (gameId) => request(`/games/${gameId}/stat_entries`);

export const createStatEntry = (payload) =>
  request("/stat_entries", { method: "POST", body: JSON.stringify(payload) });

export const deleteLatestStatEntry = (gameId) =>
  request(`/games/${gameId}/stat_entries/latest`, { method: "DELETE" });

export const deleteStatEntry = (entryId) =>
  request(`/stat_entries/${entryId}`, { method: "DELETE" });

// --- Boxscore ----------------------------------------------------------------
export const getBoxscore = (gameId, playerId) =>
  request(`/boxscore/${gameId}?player_id=${playerId}`);

// --- Career Stats --------------------------------------------------------------
export const getCareerStats = (playerId) => request(`/career/${playerId}`);

// --- Network error helper -------------------------------------------------------
// fetch() rejects with a TypeError for connectivity failures (offline, DNS,
// CORS-blocked, etc). HTTP-level errors (4xx/5xx) are turned into a plain
// Error above, so this lets callers tell the two apart.
export const isNetworkError = (err) => err instanceof TypeError;
