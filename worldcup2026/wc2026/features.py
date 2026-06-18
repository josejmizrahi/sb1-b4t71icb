"""Feature engineering shared by the ML engine.

We build ONE row per team-per-match (each match yields two rows: the home team's
and the away team's perspective). This doubles the effective sample -- which
matters a lot with ~24-48 matches -- and lets a single regressor learn "goals a
team scores" as a function of its own strength, the opponent's, and venue.

All team values come from :func:`wc2026.model.build_team_values`, which already
applies shrinkage to tiny samples. xG-derived features are only emitted when the
provider supplies xG (otherwise the ML engine runs on rank + venue only).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .model import TeamValues, build_team_values
from .types import FifaRank, Match


def feature_names(has_xg: bool) -> list[str]:
    base = ["is_home", "own_strength", "opp_strength", "strength_diff"]
    if has_xg:
        base += [
            "own_xg_attack", "opp_xg_defense", "xg_matchup",
            "own_possession", "own_shots_on_target", "own_pass_accuracy",
            "own_xg_defense", "opp_xg_attack",
        ]
    return base


def _row(tv: TeamValues, team: str, opp: str, is_home: bool,
         has_xg: bool) -> list[float]:
    own_s = tv.rank_strength.get(team, 0.0)
    opp_s = tv.rank_strength.get(opp, 0.0)
    feats = [1.0 if is_home else 0.0, own_s, opp_s, own_s - opp_s]
    if has_xg:
        own_att = tv.xg_attack.get(team, 0.0)
        opp_def = tv.xg_defense.get(opp, 0.0)
        feats += [
            own_att, opp_def, own_att - opp_def,
            tv.possession.get(team, 50.0),
            tv.shots_on_target.get(team, 4.0),
            tv.pass_accuracy.get(team, 80.0),
            tv.xg_defense.get(team, 0.0),
            tv.xg_attack.get(opp, 0.0),
        ]
    return feats


@dataclass
class TrainingMatrix:
    X: np.ndarray
    y: np.ndarray          # goals scored by the perspective team
    names: list[str]
    has_xg: bool
    team_values: TeamValues


def build_training_matrix(matches: list[Match],
                          rankings: list[FifaRank]) -> TrainingMatrix:
    tv = build_team_values(matches, rankings)
    has_xg = tv.has_xg
    names = feature_names(has_xg)
    X, y = [], []
    for m in matches:
        if not m.is_finished:
            continue
        X.append(_row(tv, m.home_team, m.away_team, True, has_xg))
        y.append(m.home_goals)
        X.append(_row(tv, m.away_team, m.home_team, False, has_xg))
        y.append(m.away_goals)
    return TrainingMatrix(np.asarray(X, float), np.asarray(y, float),
                          names, has_xg, tv)


def matchup_rows(tv: TeamValues, home: str, away: str,
                 has_xg: bool, overrides: dict | None = None):
    """Return (home_row, away_row) feature vectors for a fixture."""
    hr = _row(tv, home, away, True, has_xg)
    ar = _row(tv, away, home, False, has_xg)
    if overrides:
        names = feature_names(has_xg)
        for k, delta in overrides.items():
            if k in names:
                idx = names.index(k)
                hr[idx] += delta
                ar[idx] -= delta
    return np.asarray(hr, float), np.asarray(ar, float)
