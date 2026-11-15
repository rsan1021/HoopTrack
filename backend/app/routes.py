import sqlite3

from fastapi import APIRouter, HTTPException, Query

from .db import get_connection
from .models import (
    BoxScoreOut,
    CareerStatsOut,
    GameCreate,
    GameOut,
    GameUpdate,
    PlayerCreate,
    PlayerOut,
    PlayerUpdate,
    StatEntryCreate,
    StatEntryOut,
    StatTypeOut,
)

router = APIRouter()

STAT_ENTRY_SELECT = """
    SELECT
        se.id,
        se.game_id,
        se.player_id,
        p.name AS player_name,
        se.stat_type_id,
        st.code AS stat_code,
        st.label AS stat_label,
        st.points_value AS points_value,
        se.created_at
    FROM stat_entries se
    JOIN players p ON p.id = se.player_id
    JOIN stat_types st ON st.id = se.stat_type_id
"""


# --- Players -----------------------------------------------------------

@router.post("/players", response_model=PlayerOut, status_code=201)
def create_player(player: PlayerCreate):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO players (name, jersey_number) VALUES (?, ?)",
            (player.name, player.jersey_number),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, name, jersey_number, created_at FROM players WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone()
        return dict(row)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.get("/players", response_model=list[PlayerOut])
def list_players():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, name, jersey_number, created_at FROM players ORDER BY id"
        ).fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.put("/players/{player_id}", response_model=PlayerOut)
def update_player(player_id: int, player: PlayerUpdate):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Player not found")

        conn.execute(
            "UPDATE players SET name = ?, jersey_number = ? WHERE id = ?",
            (player.name, player.jersey_number, player_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, name, jersey_number, created_at FROM players WHERE id = ?",
            (player_id,),
        ).fetchone()
        return dict(row)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.delete("/players/{player_id}", status_code=200)
def delete_player(player_id: int):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Player not found")

        entry_count = conn.execute(
            "SELECT COUNT(*) AS n FROM stat_entries WHERE player_id = ?",
            (player_id,),
        ).fetchone()["n"]
        if entry_count > 0:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cannot delete player with {entry_count} existing stat "
                    "entries. Delete the entries first."
                ),
            )

        conn.execute("DELETE FROM players WHERE id = ?", (player_id,))
        conn.commit()
        return {"deleted_id": player_id}
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


# --- Games ---------------------------------------------------------------

@router.post("/games", response_model=GameOut, status_code=201)
def create_game(game: GameCreate):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO games (opponent, game_date) VALUES (?, ?)",
            (game.opponent, game.game_date),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, opponent, game_date, is_archived, created_at "
            "FROM games WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone()
        return dict(row)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.get("/games", response_model=list[GameOut])
def list_games():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, opponent, game_date, is_archived, created_at "
            "FROM games ORDER BY id"
        ).fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.put("/games/{game_id}", response_model=GameOut)
def update_game(game_id: int, game: GameUpdate):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM games WHERE id = ?", (game_id,)
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Game not found")

        conn.execute(
            "UPDATE games SET opponent = ?, game_date = ? WHERE id = ?",
            (game.opponent, game.game_date, game_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, opponent, game_date, is_archived, created_at "
            "FROM games WHERE id = ?",
            (game_id,),
        ).fetchone()
        return dict(row)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.delete("/games/{game_id}", status_code=200)
def delete_game(game_id: int):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM games WHERE id = ?", (game_id,)
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Game not found")

        entry_count = conn.execute(
            "SELECT COUNT(*) AS n FROM stat_entries WHERE game_id = ?",
            (game_id,),
        ).fetchone()["n"]
        if entry_count > 0:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cannot delete game with {entry_count} existing stat "
                    "entries. Delete the entries first."
                ),
            )

        conn.execute("DELETE FROM games WHERE id = ?", (game_id,))
        conn.commit()
        return {"deleted_id": game_id}
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.post("/games/{game_id}/archive", response_model=GameOut)
def archive_game(game_id: int):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM games WHERE id = ?", (game_id,)
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Game not found")

        conn.execute("UPDATE games SET is_archived = 1 WHERE id = ?", (game_id,))
        conn.commit()
        row = conn.execute(
            "SELECT id, opponent, game_date, is_archived, created_at "
            "FROM games WHERE id = ?",
            (game_id,),
        ).fetchone()
        return dict(row)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.post("/games/{game_id}/unarchive", response_model=GameOut)
def unarchive_game(game_id: int):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM games WHERE id = ?", (game_id,)
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Game not found")

        conn.execute("UPDATE games SET is_archived = 0 WHERE id = ?", (game_id,))
        conn.commit()
        row = conn.execute(
            "SELECT id, opponent, game_date, is_archived, created_at "
            "FROM games WHERE id = ?",
            (game_id,),
        ).fetchone()
        return dict(row)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


# --- Stat Types ------------------------------------------------------------

@router.get("/stat_types", response_model=list[StatTypeOut])
def list_stat_types():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, code, label, points_value FROM stat_types ORDER BY id"
        ).fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


# --- Stat Entries ------------------------------------------------------------

@router.post("/stat_entries", response_model=StatEntryOut, status_code=201)
def create_stat_entry(entry: StatEntryCreate):
    conn = get_connection()
    try:
        game = conn.execute(
            "SELECT id FROM games WHERE id = ?", (entry.game_id,)
        ).fetchone()
        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")

        player = conn.execute(
            "SELECT id FROM players WHERE id = ?", (entry.player_id,)
        ).fetchone()
        if player is None:
            raise HTTPException(status_code=404, detail="Player not found")

        stat_type = conn.execute(
            "SELECT id FROM stat_types WHERE id = ?", (entry.stat_type_id,)
        ).fetchone()
        if stat_type is None:
            raise HTTPException(status_code=404, detail="Stat type not found")

        cur = conn.execute(
            "INSERT INTO stat_entries (game_id, player_id, stat_type_id) "
            "VALUES (?, ?, ?)",
            (entry.game_id, entry.player_id, entry.stat_type_id),
        )
        conn.commit()
        row = conn.execute(
            f"{STAT_ENTRY_SELECT} WHERE se.id = ?", (cur.lastrowid,)
        ).fetchone()
        return dict(row)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.get("/games/{game_id}/stat_entries", response_model=list[StatEntryOut])
def list_stat_entries_for_game(game_id: int):
    conn = get_connection()
    try:
        game = conn.execute(
            "SELECT id FROM games WHERE id = ?", (game_id,)
        ).fetchone()
        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")

        rows = conn.execute(
            f"{STAT_ENTRY_SELECT} WHERE se.game_id = ? ORDER BY se.id",
            (game_id,),
        ).fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.delete("/games/{game_id}/stat_entries/latest", status_code=200)
def delete_latest_stat_entry(game_id: int):
    conn = get_connection()
    try:
        game = conn.execute(
            "SELECT id FROM games WHERE id = ?", (game_id,)
        ).fetchone()
        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")

        row = conn.execute(
            "SELECT id FROM stat_entries WHERE game_id = ? "
            "ORDER BY id DESC LIMIT 1",
            (game_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(
                status_code=404, detail="No stat entries found for this game"
            )

        conn.execute("DELETE FROM stat_entries WHERE id = ?", (row["id"],))
        conn.commit()
        return {"deleted_id": row["id"]}
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


@router.delete("/stat_entries/{entry_id}", status_code=200)
def delete_stat_entry(entry_id: int):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM stat_entries WHERE id = ?", (entry_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Stat entry not found")

        conn.execute("DELETE FROM stat_entries WHERE id = ?", (entry_id,))
        conn.commit()
        return {"deleted_id": entry_id}
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


# --- Boxscore ------------------------------------------------------------

def _pct(made: int, att: int) -> float:
    return round(made / att, 3) if att else 0.0


@router.get("/boxscore/{game_id}", response_model=BoxScoreOut)
def get_boxscore(game_id: int, player_id: int = Query(..., ge=1)):
    conn = get_connection()
    try:
        game = conn.execute(
            "SELECT id FROM games WHERE id = ?", (game_id,)
        ).fetchone()
        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")

        player = conn.execute(
            "SELECT id, name FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        if player is None:
            raise HTTPException(status_code=404, detail="Player not found")

        rows = conn.execute(
            """
            SELECT st.code AS code, COUNT(*) AS n
            FROM stat_entries se
            JOIN stat_types st ON st.id = se.stat_type_id
            WHERE se.game_id = ? AND se.player_id = ?
            GROUP BY st.code
            """,
            (game_id, player_id),
        ).fetchall()
        counts = {row["code"]: row["n"] for row in rows}

        fg2m = counts.get("FG_MADE_2", 0)
        fg2miss = counts.get("FG_MISS_2", 0)
        fg3m = counts.get("FG_MADE_3", 0)
        fg3miss = counts.get("FG_MISS_3", 0)
        ftm = counts.get("FT_MADE", 0)
        ftmiss = counts.get("FT_MISS", 0)

        fg2a = fg2m + fg2miss
        fg3a = fg3m + fg3miss
        fta = ftm + ftmiss

        fgm = fg2m + fg3m
        fga = fg2a + fg3a

        points = fg2m * 2 + fg3m * 3 + ftm * 1

        return {
            "game_id": game_id,
            "player_id": player_id,
            "player_name": player["name"],
            "fgm": fgm,
            "fga": fga,
            "fg_pct": _pct(fgm, fga),
            "fg2m": fg2m,
            "fg2a": fg2a,
            "fg2_pct": _pct(fg2m, fg2a),
            "fg3m": fg3m,
            "fg3a": fg3a,
            "fg3_pct": _pct(fg3m, fg3a),
            "ftm": ftm,
            "fta": fta,
            "ft_pct": _pct(ftm, fta),
            "points": points,
            "rebounds": counts.get("REBOUND", 0),
            "assists": counts.get("ASSIST", 0),
            "steals": counts.get("STEAL", 0),
            "blocks": counts.get("BLOCK", 0),
            "turnovers": counts.get("TURNOVER", 0),
            "fouls": counts.get("FOUL", 0),
        }
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()


# --- Career Stats ------------------------------------------------------------

@router.get("/career/{player_id}", response_model=CareerStatsOut)
def get_career_stats(player_id: int):
    conn = get_connection()
    try:
        player = conn.execute(
            "SELECT id, name FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        if player is None:
            raise HTTPException(status_code=404, detail="Player not found")

        games_played = conn.execute(
            "SELECT COUNT(DISTINCT game_id) AS n FROM stat_entries WHERE player_id = ?",
            (player_id,),
        ).fetchone()["n"]

        rows = conn.execute(
            """
            SELECT st.code AS code, COUNT(*) AS n
            FROM stat_entries se
            JOIN stat_types st ON st.id = se.stat_type_id
            WHERE se.player_id = ?
            GROUP BY st.code
            """,
            (player_id,),
        ).fetchall()
        counts = {row["code"]: row["n"] for row in rows}

        fg2m = counts.get("FG_MADE_2", 0)
        fg2miss = counts.get("FG_MISS_2", 0)
        fg3m = counts.get("FG_MADE_3", 0)
        fg3miss = counts.get("FG_MISS_3", 0)
        ftm = counts.get("FT_MADE", 0)
        ftmiss = counts.get("FT_MISS", 0)

        fg2a = fg2m + fg2miss
        fg3a = fg3m + fg3miss
        fta = ftm + ftmiss

        fgm = fg2m + fg3m
        fga = fg2a + fg3a

        points = fg2m * 2 + fg3m * 3 + ftm * 1
        rebounds = counts.get("REBOUND", 0)
        assists = counts.get("ASSIST", 0)
        steals = counts.get("STEAL", 0)
        blocks = counts.get("BLOCK", 0)
        turnovers = counts.get("TURNOVER", 0)
        fouls = counts.get("FOUL", 0)

        def per_game(total: int) -> float:
            return round(total / games_played, 1) if games_played else 0.0

        return {
            "player_id": player_id,
            "player_name": player["name"],
            "games_played": games_played,
            "fgm": fgm,
            "fga": fga,
            "fg_pct": _pct(fgm, fga),
            "fg2m": fg2m,
            "fg2a": fg2a,
            "fg2_pct": _pct(fg2m, fg2a),
            "fg3m": fg3m,
            "fg3a": fg3a,
            "fg3_pct": _pct(fg3m, fg3a),
            "ftm": ftm,
            "fta": fta,
            "ft_pct": _pct(ftm, fta),
            "points": points,
            "rebounds": rebounds,
            "assists": assists,
            "steals": steals,
            "blocks": blocks,
            "turnovers": turnovers,
            "fouls": fouls,
            "ppg": per_game(points),
            "rpg": per_game(rebounds),
            "apg": per_game(assists),
            "spg": per_game(steals),
            "bpg": per_game(blocks),
            "topg": per_game(turnovers),
            "fpg": per_game(fouls),
        }
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()
