"""Shared, provider-agnostic data structures.

These are the *normalized* shapes every DataProvider must return, so the rest
of the system never depends on a particular vendor's JSON.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional


@dataclass
class Goal:
    minute: int
    team: str               # team name that scored
    scorer: Optional[str] = None


@dataclass
class MatchStats:
    """Advanced per-match stats. All optional: a free provider leaves them None,
    which is exactly what triggers the reduced (FIFA-only) engine mode."""
    xg_for: Optional[float] = None        # expected goals for the home team
    xg_against: Optional[float] = None     # expected goals for the away team
    possession_home: Optional[float] = None
    possession_away: Optional[float] = None
    shots_on_target_home: Optional[int] = None
    shots_on_target_away: Optional[int] = None
    passes_completed_home: Optional[int] = None
    passes_completed_away: Optional[int] = None
    pass_accuracy_home: Optional[float] = None
    pass_accuracy_away: Optional[float] = None


@dataclass
class Match:
    provider_id: str
    utc_date: str                    # ISO-8601
    competition: str
    home_team: str
    away_team: str
    status: str                      # SCHEDULED / FINISHED / IN_PLAY ...
    home_goals: Optional[int] = None
    away_goals: Optional[int] = None
    stats: MatchStats = field(default_factory=MatchStats)
    goals: list[Goal] = field(default_factory=list)
    home_xi: list[str] = field(default_factory=list)   # official starting XI
    away_xi: list[str] = field(default_factory=list)
    lineup_posted_at: Optional[str] = None

    @property
    def is_finished(self) -> bool:
        return self.status == "FINISHED" and self.home_goals is not None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class FifaRank:
    team: str
    rank: int                       # 1 = best
    points: Optional[float] = None  # FIFA points if the provider exposes them
    as_of: Optional[str] = None
