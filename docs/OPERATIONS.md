# Operations and developer handoff

This runbook is based on [`docker-compose.yml`](../docker-compose.yml), its [production overlay](../docker-compose.prod.yml), and the application source. Actual deployment, domain, TLS termination, backup schedule, recovery objectives and owner contacts are unknown and must be agreed before use. Commands assume the repository root unless otherwise stated.

## Configuration and deployment

| Setting | Default / behavior | Where |
| --- | --- | --- |
| `SQLITE_PATH` | `/data/hoops.db`; Compose sets that path and bind-mounts `./data:/data` | Backend process environment; parent directory created at startup |
| `VITE_API_PROXY_TARGET` | `http://backend:8000` | Vite dev/preview process; set to `http://localhost:8000` for local backend |
| `VITE_API_BASE_URL` | `/api` | Frontend Vite build/dev environment; browser uses it as API prefix |

For Compose development use `docker compose up -d --build`; frontend is on 5173 and backend on 8000. Source files are copied into images, not bind-mounted, so rebuild after source edits. Check `docker compose ps` and `docker compose logs --tail=100 backend frontend`. The static deployment uses:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Use host port 5174 for Nginx. On the available Compose version, merged configuration publishes both `5173:5173` inherited from the base and `5174:80`; Nginx listens on container port 80 only. Backend port 8000 remains published. `depends_on` means container start order, not backend readiness. Both services use `restart: unless-stopped`; there is no configured healthcheck. Container names are fixed (`hoops-frontend`, `hoops-backend`) and can conflict with another deployment. `docker compose down` stops/removes containers and network but does not delete `./data`.

**Security:** no login, authorization, TLS, or CORS policy exists in the application. Both published ports can be reachable on host interfaces depending on Docker and firewall configuration. Restrict network access to trusted users and protect both ports; an authenticated TLS gateway and appropriate network controls must be designed and validated for any broader deployment. Database errors may expose details. Do not assume the production-style overlay is production-hardened.

## Verification and smoke checks

These commands query without deliberately mutating data:

```sh
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/stat_types
curl -fsS http://localhost:5173/api/players  # dev frontend
curl -fsS http://localhost:5174/api/players  # prod overlay instead
```

`/health` is a static process response and does not prove SQLite is healthy. A `/stat_types` or `/players` response exercises the database and proxy path. Open frontend and verify existing players/games, boxscore and career; use a **separate disposable database** to test create, log, undo, archive, unarchive and deletion, and inspect resulting values before production. Verify service-worker installation and an offline/reconnect scenario on each supported browser and secure origin; offline limitations are detailed in [architecture](ARCHITECTURE.md#offline-and-pwa). On frontend changes, `cd frontend && npm ci && npm run build` checks buildability; no test or lint scripts are provided. The frontend has a `package-lock.json`, and its Dockerfile also uses `npm ci`.

At review, the frontend build, a backend `/health` smoke test using a temporary database, and `docker compose ... config` succeeded. The supplied database passed a read-only SQLite `PRAGMA integrity_check`. Docker daemon access was unavailable, so container builds and startup were not verified; browser behavior and end-to-end operation also remain unverified. These checks do not establish future integrity or deployment suitability.

## Database, backups and restore

The supplied `data/hoops.db` may contain valuable real records. Its provenance and contents were not audited. Git is initialized and the database is staged for the initial commit; `.gitignore` explicitly permits it while ignoring other local databases and SQLite journals. Before committing, review its contents and sharing permissions and take a consistent backup. Treat Git distribution of a binary snapshot separately from backup, retention, and access control.

Before maintenance, deployments, schema changes or snapshotting for Git, take a consistent SQLite backup. With `sqlite3` installed on the host, use the SQLite backup API via the CLI against the live source (not a plain copy of a changing database):

```sh
mkdir -p /secure/hooptrack-backups
sqlite3 'file:data/hoops.db?mode=ro' ".backup '/secure/hooptrack-backups/hoops-$(date -u +%Y%m%dT%H%M%SZ).db'"
# Replace the placeholder with the actual generated backup path:
sqlite3 'file:/secure/hooptrack-backups/BACKUP.db?mode=ro' 'PRAGMA integrity_check;'
```

Choose a restricted, durable destination with sufficient space; verify `integrity_check` returns `ok`, arrange encryption/off-host retention as appropriate, and regularly test restoration. SQLite `.backup` captures a consistent snapshot, but does not include unsynced browser localStorage queues; coordinate clients and record pending counts. No backup automation or retention policy is present. Backups can include sensitive data; do not publish them unintentionally.

To restore, schedule downtime and stop **all** processes writing to the database (including local Uvicorn and all Compose deployments). Preserve the current database and any SQLite `-wal`/`-shm`/journal sidecars as a separate incident backup; do not mix sidecars from the old database with the replacement. Verify the intended backup, then replace `data/hoops.db` with a copy of that backup, preserve suitable permissions, and restart the appropriate Compose stack. Check integrity, `stat_types`, representative records and UI; startup may apply the `is_archived` migration. Restore is destructive to changes made after the backup, and queued browser events may replay against restored IDs; reconcile or preserve queues before allowing clients back. Rehearse this process away from the live database first.

`backend/app/db.py` executes `schema.sql` on each startup and only explicitly migrates a missing `games.is_archived` column; the schema uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE` for stat types. This is not a general migration system and does not repair arbitrary legacy schemas or rewrite existing stat definitions. Back up before running a newer version. Downgrade compatibility is not established.

## Troubleshooting

- **Frontend cannot reach API:** check backend logs and `/health`, then query `/stat_types` directly and `/api/stat_types` through the frontend. Confirm the Vite target in local dev and Docker DNS `backend` in Compose. Browser `VITE_API_BASE_URL` overrides the proxy path and cross-origin use is not configured for CORS.
- **Database open/write errors:** inspect backend logs, `SQLITE_PATH`, bind mount, directory ownership/permissions and disk space. SQLite connections enable foreign keys; direct database edits can violate application assumptions. Avoid deleting/reinitializing the existing file as a first step.
- **Deletion returns 409:** remove associated stat entries intentionally first; this permanently changes boxscore and career statistics. Archive a game instead when data should be retained.
- **Queue stuck or records appear duplicated:** browser online status may not reflect API reachability; replay stops on first failure and may not retry until a subsequent online transition or remount. Inspect browser localStorage and server entries before retrying; a response lost after server commit can cause duplicates. Undo does not cancel queued items and may delete an unrelated saved event.
- **PWA appears stale or unavailable offline:** check browser service-worker console, secure-origin requirements and previously loaded assets. API responses are not cached; first offline load cannot fetch reference data. Clearing site storage also destroys pending entries; export/reconcile them first.
- **Port conflict or container name conflict:** inspect `docker compose ps`, other containers and host listeners. Use `docker compose ... config` to inspect the actual merged ports before changing deployment configuration.

## Open operational decisions

Identify maintainers and an incident contact; approve database publication and access; define deployment host/domain, trusted network and TLS/auth strategy; set backup frequency/retention and recovery objectives; establish schema migration and release/rollback procedures; and define supported devices, concurrency and acceptance tests. None can be inferred from the checked-in configuration.
