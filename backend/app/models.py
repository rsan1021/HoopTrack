from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PlayerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    jersey_number: Optional[int] = Field(None, ge=0, le=99)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class PlayerOut(BaseModel):
    id: int
    name: str
    jersey_number: Optional[int]
    created_at: str


class PlayerUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    jersey_number: Optional[int] = Field(None, ge=0, le=99)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class GameCreate(BaseModel):
    opponent: str = Field(..., min_length=1, max_length=100)
    game_date: str = Field(..., description="Date in YYYY-MM-DD format")

    @field_validator("opponent")
    @classmethod
    def opponent_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("opponent must not be blank")
        return v

    @field_validator("game_date")
    @classmethod
    def valid_date(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("game_date must be in YYYY-MM-DD format")
        return v


class GameUpdate(BaseModel):
    opponent: str = Field(..., min_length=1, max_length=100)
    game_date: str = Field(..., description="Date in YYYY-MM-DD format")

    @field_validator("opponent")
    @classmethod
    def opponent_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("opponent must not be blank")
        return v

    @field_validator("game_date")
    @classmethod
    def valid_date(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("game_date must be in YYYY-MM-DD format")
        return v


class GameOut(BaseModel):
    id: int
    opponent: str
    game_date: str
    is_archived: bool
    created_at: str


class StatTypeOut(BaseModel):
    id: int
    code: str
    label: str
    points_value: int


class StatEntryCreate(BaseModel):
    game_id: int = Field(..., ge=1)
    player_id: int = Field(..., ge=1)
    stat_type_id: int = Field(..., ge=1)


class StatEntryOut(BaseModel):
    id: int
    game_id: int
    player_id: int
    player_name: str
    stat_type_id: int
    stat_code: str
    stat_label: str
    points_value: int
    created_at: str


class BoxScoreOut(BaseModel):
    game_id: int
    player_id: Optional[int] = None
    player_name: Optional[str] = None

    fgm: int
    fga: int
    fg_pct: float

    fg2m: int
    fg2a: int
    fg2_pct: float

    fg3m: int
    fg3a: int
    fg3_pct: float

    ftm: int
    fta: int
    ft_pct: float

    points: int
    rebounds: int
    assists: int
    steals: int
    blocks: int
    turnovers: int
    fouls: int


class CareerStatsOut(BaseModel):
    player_id: int
    player_name: str
    games_played: int

    # Career totals
    fgm: int
    fga: int
    fg_pct: float

    fg2m: int
    fg2a: int
    fg2_pct: float

    fg3m: int
    fg3a: int
    fg3_pct: float

    ftm: int
    fta: int
    ft_pct: float

    points: int
    rebounds: int
    assists: int
    steals: int
    blocks: int
    turnovers: int
    fouls: int

    # Per-game averages
    ppg: float
    rpg: float
    apg: float
    spg: float
    bpg: float
    topg: float
    fpg: float
