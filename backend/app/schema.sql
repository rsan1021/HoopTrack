-- HoopTrack SQLite schema

CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    jersey_number INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opponent TEXT NOT NULL,
    game_date TEXT NOT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stat_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    points_value INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stat_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games (id),
    player_id INTEGER NOT NULL REFERENCES players (id),
    stat_type_id INTEGER NOT NULL REFERENCES stat_types (id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed stat_types for basketball buttons (idempotent)
INSERT OR IGNORE INTO stat_types (code, label, points_value) VALUES
    ('FG_MADE_2', '2PT Made', 2),
    ('FG_MISS_2', '2PT Miss', 0),
    ('FG_MADE_3', '3PT Made', 3),
    ('FG_MISS_3', '3PT Miss', 0),
    ('FT_MADE', 'FT Made', 1),
    ('FT_MISS', 'FT Miss', 0),
    ('REBOUND', 'Rebound', 0),
    ('ASSIST', 'Assist', 0),
    ('STEAL', 'Steal', 0),
    ('BLOCK', 'Block', 0),
    ('TURNOVER', 'Turnover', 0),
    ('FOUL', 'Foul', 0);
