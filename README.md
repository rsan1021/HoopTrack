# HoopTrack

HoopTrack is a basketball stat tracker with a React/Vite frontend, a FastAPI backend and a SQLite database. Choose or create a player and game, tap individual stat events, undo the latest event, and view a player/game boxscore or career totals. Manage players and games, including archiving games. The UI selects one player at a time; the database supports many players and games. See [architecture](docs/ARCHITECTURE.md) and [operations](docs/OPERATIONS.md) for handoff details and limitations.

## Quick start: Docker Compose

Prerequisites: Docker Engine and the Compose plugin; available host ports 5173 and 8000. From the project root:

```sh
docker compose up --build
```

Open <http://localhost:5173>; API health is <http://localhost:8000/health> and interactive API docs are <http://localhost:8000/docs>. The frontend proxies `/api/*` to the backend. The backend bind-mounts `./data` at `/data` and uses `./data/hoops.db`; startup creates missing tables and seeds stat types, but an existing database is used as-is and may be migrated. Stop with Ctrl-C, then `docker compose down` if desired; `down` does not remove the bind-mounted database. Changes to source files are not mounted into these containers: rebuild to pick them up.

Production-style static frontend:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Open <http://localhost:5174>. Compose merges the base and overlay port lists, so the effective configuration also publishes host 5173 to container 5173, where production Nginx does not listen. The backend remains exposed on host 8000. This setup alone does not provide TLS or authentication; it is not a hardened Internet deployment. See [operations](docs/OPERATIONS.md) before deployment.

## Local development without containers

Use Python 3.12 and Node 20 (the Docker image versions). In one terminal, from the repository root:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
export SQLITE_PATH="$PWD/data/hoops.db"
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In another terminal:

```sh
cd frontend
npm ci
VITE_API_PROXY_TARGET=http://localhost:8000 npm run dev
```

Open <http://localhost:5173>. The explicit `SQLITE_PATH` avoids the backend default `/data/hoops.db`; use a separate writable path when you do not intend to modify the supplied database. To build and preview the frontend, run `npm run build` and then `VITE_API_PROXY_TARGET=http://localhost:8000 npm run preview` from `frontend`. Vite proxy defaults to `http://backend:8000` for Compose. Browser API URLs default to `/api`; `VITE_API_BASE_URL` can override them at build/dev-server startup, but a cross-origin backend requires CORS configuration not present in this application.

## Typical workflow

1. Create/select a player and an active game in Tracker.
2. Tap stat buttons to record individual events. Undo removes the latest saved entry for the selected game, not specifically the selected player.
3. Select a player and game in Boxscore, or a player in Career. Use Manage to edit, archive/unarchive, or delete records. Deletion of a player or game with stat entries is blocked.

Offline support is partial: stat submissions that fail with a network error can be queued in browser localStorage and retried, but reference data is fetched from the API and is not persisted for a fresh offline startup. Undo does not remove a queued entry and can delete a different server entry; duplicate submission is possible after an ambiguous failure. See the [offline limitations](docs/ARCHITECTURE.md#offline-and-pwa) before relying on it.

## Database and handoff

The supplied `data/hoops.db` is the operational SQLite file, not a disposable seed. Git has been initialized and the database is staged for the initial commit; `.gitignore` explicitly permits this file while ignoring other local databases and SQLite journals. Review its contents and privacy implications and take a consistent backup before committing. Its provenance has not been verified. Committing a database is not a backup strategy and can expose player data to everyone with repository access; coordinate access and retention with the owner.

## Validation and known gaps

The frontend build and a backend `/health` smoke test using a temporary database passed; Compose configuration validation also passed. Docker daemon access was unavailable, so container builds, startup and end-to-end verification were not performed. The supplied database passed a read-only SQLite integrity check at review time; its contents and suitability for sharing were not audited. The frontend lockfile is included and the Dockerfile uses `npm ci`; there are no test files or test/lint scripts in the supplied tree. There is no observed authentication, authorization, TLS termination, automated backup, or formal migration/versioning framework. See the linked documents for the API, operational checks, recovery and unresolved questions.

## Code map

- `frontend/src/App.jsx` and `frontend/src/components/`: UI state and views.
- `frontend/src/api.js`, `offlineQueue.js`, `public/sw.js`: API client, offline queue and app-shell caching.
- `backend/app/main.py`, `routes.py`, `models.py`: app, HTTP handlers and validation.
- `backend/app/db.py`, `schema.sql`: SQLite connection, initialization, seed and migration.
- `docker-compose*.yml`, `frontend/nginx.conf`: container topology and proxy.
- `scripts/generate_icons.py`: optional icon generation (requires Pillow, not listed in application dependencies).
