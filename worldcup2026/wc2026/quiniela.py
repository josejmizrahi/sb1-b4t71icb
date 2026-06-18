"""Quiniela points optimizer.

Given the model's match predictions and the pool's SCORING table, pick the
entries that MAXIMIZE EXPECTED POINTS -- which is NOT the same as the most likely
scoreline. Also surfaces a contrarian/underdog layer and a booster
recommendation, because a 24-person pool is won by expected value + smart
differentiation, not by raw 1X2 accuracy.

Scoring (from the pool screenshot):
    Resultado (ganador/empate)         +3
    Goles exactos equipo local         +2
    Goles exactos equipo visitante     +2
    Diferencia de goles                +3
    Primer jugador en anotar           +5
    Primer equipo en anotar            +2
    Marcador underdog (<=10% grupo)    +3   (high-variance, differentiation)
    Campeon del mundo                 +10   (separate, season-long)
    Booster x2 (1 por jornada)         x2   (multiplies a matchday)
"""
from __future__ import annotations

import numpy as np

from .model import score_matrix

SCORING = {
    "resultado": 3,
    "goles_local": 2,
    "goles_visita": 2,
    "diferencia": 3,
    "primer_equipo": 2,
    "primer_jugador": 5,
    "underdog": 3,
    "campeon": 10,
}

MAXG = 8


def _sign(x: int) -> int:
    return (x > 0) - (x < 0)


def optimize_scoreline(M: np.ndarray, scoring=SCORING):
    """Pick (h,a) maximizing expected score-related points under the joint pmf M.
    Returns (best_h, best_a, expected_points, breakdown_probs)."""
    n = M.shape[0]
    # precompute marginals and outcome/diff distributions
    p_home_goals = M.sum(axis=1)          # P(home scores exactly h)
    p_away_goals = M.sum(axis=0)          # P(away scores exactly a)
    p_outcome = {"H": 0.0, "D": 0.0, "A": 0.0}
    p_diff: dict[int, float] = {}
    for h in range(n):
        for a in range(n):
            p = M[h, a]
            p_outcome["H" if h > a else "D" if h == a else "A"] += p
            p_diff[h - a] = p_diff.get(h - a, 0.0) + p

    best = None
    for h in range(n):
        for a in range(n):
            o = "H" if h > a else "D" if h == a else "A"
            ep = (scoring["resultado"] * p_outcome[o]
                  + scoring["goles_local"] * p_home_goals[h]
                  + scoring["goles_visita"] * p_away_goals[a]
                  + scoring["diferencia"] * p_diff.get(h - a, 0.0))
            if best is None or ep > best[2]:
                best = (h, a, ep, {
                    "p_resultado": p_outcome[o],
                    "p_goles_local": float(p_home_goals[h]),
                    "p_goles_visita": float(p_away_goals[a]),
                    "p_diferencia": p_diff.get(h - a, 0.0),
                })
    return best


def match_picks(pred: dict, scoring=SCORING) -> dict:
    """Full point-maximizing pick for one match + expected-points breakdown."""
    M = score_matrix(pred["lam_home"], pred["lam_away"], pred.get("rho", 0.0), MAXG)
    h, a, ep_score, br = optimize_scoreline(M, scoring)

    # first team to score: pick the more likely; EV = points * its probability
    fg = pred.get("first_goal", {})
    p_h_first = fg.get("p_home_first", 0.5)
    p_a_first = fg.get("p_away_first", 0.5)
    p_no_goal = fg.get("p_no_goal", 0.0)
    if p_h_first >= p_a_first:
        first_team, p_first_team = pred["home_team"], p_h_first
    else:
        first_team, p_first_team = pred["away_team"], p_a_first
    ep_first_team = scoring["primer_equipo"] * p_first_team * (1 - p_no_goal)

    # first scorer: top player by absolute P(scores first) = cond.prob * P(>=1 goal)
    scorers = fg.get("likely_scorers", [])
    first_scorer, p_first_scorer = None, 0.0
    if scorers:
        top = scorers[0]
        first_scorer = top["player"]
        p_first_scorer = top["prob"] * (1 - p_no_goal)
    ep_first_scorer = scoring["primer_jugador"] * p_first_scorer

    # contrarian / underdog: the non-favorite outcome and how strong the model
    # rates it (differentiation opportunity; the bonus needs <=10% of the group).
    probs = {"H": pred["prob_home"], "D": pred["prob_draw"], "A": pred["prob_away"]}
    fav = max(probs, key=probs.get)
    underdog_outcome = "A" if fav == "H" else "H"   # the opposite side win
    p_underdog = probs[underdog_outcome]

    total_ep = ep_score + ep_first_team + ep_first_scorer
    return {
        "home_team": pred["home_team"], "away_team": pred["away_team"],
        "utc_date": pred.get("utc_date", ""),
        "pick_score": (h, a),
        "ep_score": ep_score, "score_breakdown": br,
        "first_team": first_team, "p_first_team": p_first_team,
        "ep_first_team": ep_first_team,
        "first_scorer": first_scorer, "p_first_scorer": p_first_scorer,
        "ep_first_scorer": ep_first_scorer,
        "expected_points": total_ep,
        "favorite": fav, "underdog_outcome": underdog_outcome,
        "p_underdog": p_underdog,
        "probs": probs,
    }


def build_quiniela(predictions: list[dict], scoring=SCORING,
                   matchday_size: int | None = None) -> dict:
    """Build picks for the upcoming matches, sorted by date. Recommends where to
    spend the Booster x2 (highest expected-points match) and lists the best
    contrarian/underdog candidates for differentiation."""
    upcoming = sorted([p for p in predictions if p.get("utc_date")],
                      key=lambda p: p["utc_date"])
    if matchday_size:
        upcoming = upcoming[:matchday_size]
    picks = [match_picks(p, scoring) for p in upcoming]

    # Booster x2: the match where doubling gains the most (highest expected pts).
    booster = max(picks, key=lambda x: x["expected_points"]) if picks else None

    # Underdog candidates: clear favorite by the crowd but model gives the upset
    # a meaningful chance -> good differentiation if it hits (<=10% will pick it).
    underdogs = sorted(
        [p for p in picks if 0.25 <= p["p_underdog"] <= 0.45],
        key=lambda x: -x["p_underdog"])[:5]

    return {
        "picks": picks,
        "booster_match": None if not booster else {
            "home_team": booster["home_team"], "away_team": booster["away_team"],
            "expected_points": booster["expected_points"]},
        "underdog_candidates": [{
            "home_team": u["home_team"], "away_team": u["away_team"],
            "underdog_outcome": u["underdog_outcome"],
            "p_underdog": u["p_underdog"]} for u in underdogs],
        "total_expected_points": sum(p["expected_points"] for p in picks),
        "scoring": scoring,
    }
