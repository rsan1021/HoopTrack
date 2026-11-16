# Architecture

This document describes observed behavior in the supplied source, not a guarantee of production readiness. Entry points: [`frontend/src/App.jsx`](../frontend/src/App.jsx), [`frontend/src/api.js`](../frontend/src/api.js), [`backend/app/main.py`](../backend/app/main.py), [`backend/app/routes.py`](../backend/app/routes.py), and [`backend/app/schema.sql`](../backend/app/schema.sql).

## Request and state flow

```text
Browser: React state / localStorage / service worker
    | same-origin /api/* (default)
    v
Vite dev proxy OR Nginx production proxy -- strip /api --> FastAPI :8000
                                                               |
                                                         sqlite3 --> hoops.db
```

The Vite server's proxy target defaults to `http://backend:8000` and can be set with `VITE_API_PROXY_TARGET`; Nginx uses the Compose service name `backend`. `VITE_API_BASE_URL` controls the browser client base URL and defaults to `/api`. No application CORS middleware is configured. The production Nginx server handles SPA fallback and redirects exact `/api` to `/api/` before proxying. Both frontend and backend ports are published in Compose; the proxy is not a security boundary.

`App.jsx` owns reference data, selection, view and pending state; component files render Tracker controls, Manage, Boxscore, Career and offline status. It fetches players, games and stat types together on mount, fetches game entries when selection changes, and fetches boxscore/career on selection changes. Archive filters games from Tracker selection, but Boxscore receives all games. Archive is an ordinary flag: backend stat creation and career aggregation do not reject or exclude archived games. No client router or backend team/roster model is present.

Backend handlers are synchronous and use Python's `sqlite3` directly (SQLAlchemy is declared but not used in these modules). Every handler opens/closes a connection, enables foreign keys, and explicitly commits writes. Pydantic models validate inputs. Startup executes `schema.sql` then the idempotent `is_archived` column migration. `/health` returns a static status and does not check the database.

## Data model and rules

- `players`: auto-increment ID, name, optional jersey number, timestamp; API trims names, requires length 1–100 and jersey 0–99 when supplied.
- `games`: ID, opponent, date string, `is_archived` (integer flag) and timestamp. Opponent is trimmed, length 1–100; date is validated using Python `date.fromisoformat` with `YYYY-MM-DD` documented by the API.
- `stat_types`: unique code, label and points value. Seed codes: `FG_MADE_2`, `FG_MISS_2`, `FG_MADE_3`, `FG_MISS_3`, `FT_MADE`, `FT_MISS`, `REBOUND`, `ASSIST`, `STEAL`, `BLOCK`, `TURNOVER`, `FOUL`.
- `stat_entries`: ID, game/player/stat-type foreign keys and timestamp; one row per logged event, no quantity, client idempotency key, game clock or explicit participation record. Foreign keys do not cascade.

Timestamps are SQLite `datetime('now')` text for persisted records. Names and jerseys are not unique. The database does not enforce most API validation on direct writes. A player/game with entries cannot be deleted through the API (409); delete entries first. The legacy latest-entry API deletion orders by descending entry ID for the entire game; the UI instead deletes the selected saved entry by ID. Archive retains entries and can be reversed. Seed uses `INSERT OR IGNORE` by unique code; it does not update an existing label/points value.

Boxscore and career group events by stat code. Two- and three-point attempts are made plus missed; field goals combine both; free-throw attempts are made plus missed. Points are hardcoded as `2*FG_MADE_2 + 3*FG_MADE_3 + FT_MADE`, rather than summing the stored `points_value`. Shooting fractions are rounded to three decimals (zero when attempts are zero). Career games played counts distinct games with at least one event for that player, including archived games; per-game averages are rounded to one decimal and are zero with no games. A player who played but had no event is not counted. A valid game/player pair with no entries returns an all-zero boxscore.

## HTTP API

Direct backend paths are below; prefix `/api` when using the frontend proxy. FastAPI generates `/docs` and `/openapi.json` directly on the backend. Request and response fields are authoritative in [`models.py`](../backend/app/models.py); all write bodies use JSON.

| Method and path | Purpose / input |
| --- | --- |
| `GET /health` | Static `{"status":"ok"}` |
| `GET /players`, `POST /players` | List; create `{name, jersey_number?}` (201) |
| `PUT /players/{player_id}`, `DELETE /players/{player_id}` | Replace name/jersey; delete if no entries |
| `GET /games`, `POST /games` | List including archived; create `{opponent, game_date}` (201) |
| `PUT /games/{game_id}`, `DELETE /games/{game_id}` | Replace opponent/date; delete if no entries |
| `POST /games/{game_id}/archive`, `POST /games/{game_id}/unarchive` | Set archive flag |
| `GET /stat_types` | List seeded stat definitions |
| `POST /stat_entries` | Create `{game_id, player_id, stat_type_id}` (201) |
| `GET /games/{game_id}/stat_entries` | All game entries in ascending ID order |
| `DELETE /games/{game_id}/stat_entries/latest` | Delete latest game entry by ID |
| `DELETE /stat_entries/{entry_id}` | Delete a specific entry |
| `GET /boxscore/{game_id}?player_id={id}` | Player's game totals; player_id required, >= 1 |
| `GET /career/{player_id}` | Career totals and per-game averages |

Delete endpoints return `{"deleted_id": id}` on success; missing resources usually return 404, validation errors 422, and blocked player/game deletes 409. SQLite exceptions are returned as 500 with database error text, which may leak implementation details.

## Offline and PWA

[`public/sw.js`](../frontend/public/sw.js) precaches `/`, `/index.html`, manifest and two icons, uses network-first navigation with cached index fallback and cache-first with background refresh for other same-origin GETs. It excludes paths beginning `/api/` from interception (exact `/api` is not excluded). It deletes all other cache names on activation, not only HoopTrack caches. Service workers generally require HTTPS or localhost, and asset caching requires successful initial access; the manifest and cached shell do not mean all application data works offline.

[`offlineQueue.js`](../frontend/src/offlineQueue.js) stores pending stat submissions in localStorage under `hooptrack_pending_entries`, with local IDs and times. App optimistically displays a tap, and queues it after a network `TypeError` or when marked offline; other API failures roll back. On mount or `online` state changes, it attempts a snapshot of queued submissions in order and stops on the first submission error; removed items are skipped and new items wait for a later flush. Concurrent flush calls share one in-module flush, and undoing an item being submitted is blocked. Storage read/write errors propagate from the queue operations; a failed write after server submission can leave an item queued and cause a duplicate on retry.

The effect depends only on `online`, not queue changes; a network failure while the browser still reports online can leave a newly queued item unsent until a subsequent online transition or remount. There is no background sync, explicit retry UI, cross-tab coordination or server idempotency; separate tabs or a request committed before the response is lost may produce duplicate events. Online status is based on `navigator.onLine`, not API reachability.

Initial reference data, entries, boxscores and career data are fetched from the API, not saved for offline reload. Queued items are reconstructed in the selected game's visible entries when the game can be selected. Recent Entries displays up to 20 visible entries, newest first, for all players in that game; a confirmed undo deletes the selected saved entry by ID, or removes a queued item from local storage without deleting a server entry. Undo Last Entry targets the last visible entry using the same logic. Undo is blocked while an initial save or queued submission is in flight. A queued undo warns that a failed request may already have reached the server: it only cancels the local retry, so reconcile the game after reconnecting. A failed saved-entry undo may also be ambiguous; reconnect and reload before retrying.

## Security and unknowns

There is no observed authentication, authorization, rate limiting, transport security, auditing or multi-user isolation. Any reachable client can read and mutate data. SQLite writes may contend under concurrent use; intended load, multi-device behavior and conflict handling are not specified or tested here. The database's source, sensitivity, sharing permissions and deployment environment are unknown. Automated tests cover the frontend queue and backend stat-entry API, but not full browser behavior; no formal migration tool was found. The operations guide describes cautious deployment and recovery, not evidence that any particular environment has been validated.
