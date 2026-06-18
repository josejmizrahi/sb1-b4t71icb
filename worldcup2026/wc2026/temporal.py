"""Temporal model of the FIRST goal: an inhomogeneous Poisson process.

The scoring intensity h(t) is NOT constant across the 90 minutes. We model two
empirical effects:

  * A gentle ramp: matches tend to open cautiously and the rate drifts up.
  * Cooling/hydration breaks (~min 30 and ~min 75): play stops, then restarts
    slowly, so the rate dips for a few minutes right AFTER each break.

The total area of h(t) over the match equals the expected number of goals
(lambda_home + lambda_away), so the temporal layer stays consistent with the
Dixon-Coles engine. From h(t) we derive:

  * the first-goal time density f(t) = h(t) * exp(-H(t)), H = integral of h,
  * the expected / median first-goal minute,
  * P(no goal) = exp(-H(90)),
  * the probable first scorer, weighted by each side's offensive threat
    (lambda share) and, within a side, by per-player threat from the XI.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

MATCH_MINUTES = 95          # include a little stoppage time
BREAKS = (30.0, 75.0)       # hydration / cooling break minutes
BREAK_DIP_DEPTH = 0.45      # rate drops to 55% right after a break
BREAK_DIP_WIDTH = 5.0       # minutes over which the dip recovers


def build_scorer_threats(matches) -> dict[str, dict[str, float]]:
    """Aggregate REAL goal scorers per team from already-played matches.

    Returns {team: {player: goals_scored}}. Used as the per-player threat for
    the first-goal scorer prediction, so the report shows actual names (e.g.
    who has scored in the tournament so far) instead of a generic placeholder.
    Teams/players with no goals yet simply don't appear -> honest fallback.
    """
    threats: dict[str, dict[str, float]] = {}
    for m in matches:
        if not getattr(m, "is_finished", False):
            continue
        for g in m.goals:
            scorer = (g.scorer or "").strip()
            # skip own-goals / unknown / numeric-id-only scorers
            if not scorer or scorer.lower() in {"og", "own goal"} or scorer.isdigit():
                continue
            threats.setdefault(g.team, {})
            threats[g.team][scorer] = threats[g.team].get(scorer, 0.0) + 1.0
    return threats


def intensity_shape(t: np.ndarray) -> np.ndarray:
    """Unit-mean-ish shape of the scoring rate over time (before scaling).

    Base gentle upward ramp, multiplied by a post-break suppression that decays
    back to 1 over BREAK_DIP_WIDTH minutes."""
    ramp = 0.75 + 0.5 * (t / MATCH_MINUTES)        # ~0.75 -> ~1.25
    shape = ramp.copy()
    for b in BREAKS:
        after = t >= b
        dip = 1.0 - BREAK_DIP_DEPTH * np.exp(-(t - b) / BREAK_DIP_WIDTH)
        shape = np.where(after, shape * dip, shape)
    return shape


@dataclass
class FirstGoalPrediction:
    expected_minute: float
    median_minute: float
    p_no_goal: float
    minute_density: list[float]            # f(t) on a 1-min grid (index ~ minute)
    p_home_first: float
    p_away_first: float
    likely_scorers: list[dict]             # [{player, team, prob}]
    notes: list[str] = field(default_factory=list)


def _scaled_intensity(lam_total: float, grid: np.ndarray) -> np.ndarray:
    shape = intensity_shape(grid)
    dt = grid[1] - grid[0]
    area = np.sum(shape) * dt
    return shape * (lam_total / area)     # so integral(h) == lam_total


def predict_first_goal(lam_home: float, lam_away: float,
                       home_xi_threat: dict[str, float] | None = None,
                       away_xi_threat: dict[str, float] | None = None,
                       home_team: str = "Home", away_team: str = "Away",
                       grid_step: float = 1.0) -> FirstGoalPrediction:
    lam_total = max(1e-6, lam_home + lam_away)
    grid = np.arange(0.0, MATCH_MINUTES + grid_step, grid_step)
    h = _scaled_intensity(lam_total, grid)
    dt = grid[1] - grid[0]

    H = np.cumsum(h) * dt                       # integral 0..t
    survival = np.exp(-H)                        # P(no goal yet)
    f = h * survival                            # first-goal density
    p_no_goal = float(np.exp(-H[-1]))

    mass = np.sum(f) * dt
    if mass > 1e-9:
        expected_minute = float(np.sum(grid * f) * dt / mass)
    else:
        expected_minute = float("nan")

    cdf = np.cumsum(f) * dt
    median_minute = float(grid[np.searchsorted(cdf, cdf[-1] / 2)]) if cdf[-1] > 0 else float("nan")

    p_home_first = float(lam_home / lam_total)
    p_away_first = float(lam_away / lam_total)

    scorers = _likely_scorers(
        p_home_first, p_away_first, home_xi_threat, away_xi_threat,
        home_team, away_team,
    )
    notes: list[str] = []
    if not home_xi_threat or not away_xi_threat:
        notes.append(
            "No official XI / per-player threat available; scorer probabilities "
            "fall back to team-level threat only. [TODO: feed lineup threat]"
        )
    return FirstGoalPrediction(
        expected_minute=expected_minute,
        median_minute=median_minute,
        p_no_goal=p_no_goal,
        minute_density=[float(v) for v in f],
        p_home_first=p_home_first,
        p_away_first=p_away_first,
        likely_scorers=scorers,
        notes=notes,
    )


def _likely_scorers(p_home, p_away, home_threat, away_threat,
                    home_team, away_team, top_k: int = 6) -> list[dict]:
    out: list[dict] = []

    def add_side(p_side, threat, team):
        if threat:
            tot = sum(threat.values()) or 1.0
            for player, w in threat.items():
                out.append({"player": player, "team": team,
                            "prob": p_side * (w / tot)})
        else:
            out.append({"player": f"(any {team} player)", "team": team,
                        "prob": p_side})

    add_side(p_home, home_threat, home_team)
    add_side(p_away, away_threat, away_team)
    out.sort(key=lambda d: -d["prob"])
    return out[:top_k]
