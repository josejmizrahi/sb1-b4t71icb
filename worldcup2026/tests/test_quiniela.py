"""Tests for the quiniela expected-points optimizer."""
import numpy as np
import pytest

from wc2026.model import score_matrix
from wc2026.quiniela import SCORING, optimize_scoreline, match_picks, build_quiniela


def test_optimize_scoreline_returns_valid_cell():
    M = score_matrix(1.6, 1.0, rho=-0.03, max_goals=8)
    h, a, ep, br = optimize_scoreline(M)
    assert 0 <= h <= 8 and 0 <= a <= 8
    assert ep > 0
    # expected points cannot exceed the max possible score-related points
    assert ep <= (SCORING["resultado"] + SCORING["goles_local"]
                  + SCORING["goles_visita"] + SCORING["diferencia"])


def test_strong_favorite_gets_home_win_pick():
    # heavy home favorite -> optimal pick is a home win (h > a)
    M = score_matrix(2.6, 0.5, rho=-0.02, max_goals=8)
    h, a, ep, br = optimize_scoreline(M)
    assert h > a


def test_match_picks_structure_and_ev():
    pred = {
        "home_team": "Spain", "away_team": "Qatar", "utc_date": "2026-06-20T18:00",
        "lam_home": 2.4, "lam_away": 0.5, "rho": -0.02,
        "prob_home": 0.8, "prob_draw": 0.13, "prob_away": 0.07,
        "first_goal": {"p_home_first": 0.82, "p_away_first": 0.18, "p_no_goal": 0.06,
                       "likely_scorers": [{"player": "Morata", "team": "Spain", "prob": 0.3}]},
    }
    p = match_picks(pred)
    assert p["first_team"] == "Spain"            # more likely to score first
    assert p["first_scorer"] == "Morata"
    assert p["pick_score"][0] >= p["pick_score"][1]   # Spain favored -> home win
    # expected points = sum of the components
    assert p["expected_points"] == pytest.approx(
        p["ep_score"] + p["ep_first_team"] + p["ep_first_scorer"], abs=1e-9)
    assert p["underdog_outcome"] == "A"          # the upset would be Qatar win


def test_build_quiniela_picks_booster_highest_ev():
    preds = [
        {"home_team": "A", "away_team": "B", "utc_date": "2026-06-20T12:00",
         "lam_home": 1.1, "lam_away": 1.1, "rho": 0.0,
         "prob_home": 0.4, "prob_draw": 0.3, "prob_away": 0.3, "first_goal": {}},
        {"home_team": "C", "away_team": "D", "utc_date": "2026-06-20T15:00",
         "lam_home": 2.6, "lam_away": 0.4, "rho": 0.0,
         "prob_home": 0.85, "prob_draw": 0.1, "prob_away": 0.05, "first_goal": {}},
    ]
    q = build_quiniela(preds)
    assert len(q["picks"]) == 2
    # the lopsided match (C vs D) should carry more expected points -> booster
    assert q["booster_match"]["home_team"] == "C"
    assert q["total_expected_points"] > 0
