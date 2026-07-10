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


def test_knockout_suppresses_booster():
    # In knockout rounds there is NO booster (pool rule). build_quiniela must
    # return None for both boosters and flag knockout=True.
    preds = [
        {"home_team": "Spain", "away_team": "Belgium", "utc_date": "2026-07-10T18:00",
         "is_knockout": True, "lam_home": 2.0, "lam_away": 0.8, "rho": -0.02,
         "prob_home": 0.65, "prob_draw": 0.24, "prob_away": 0.11, "first_goal": {}},
        {"home_team": "Norway", "away_team": "England", "utc_date": "2026-07-10T21:00",
         "is_knockout": True, "lam_home": 1.0, "lam_away": 1.6, "rho": -0.02,
         "prob_home": 0.28, "prob_draw": 0.26, "prob_away": 0.46, "first_goal": {}},
    ]
    q = build_quiniela(preds)
    assert q["knockout"] is True
    assert q["booster_safe"] is None and q["booster_climber"] is None
    assert q["booster_match"] is None
    assert len(q["picks"]) == 2


def test_group_stage_keeps_booster():
    # A group-stage matchday (is_knockout False/absent) still recommends a booster.
    preds = [
        {"home_team": "A", "away_team": "B", "utc_date": "2026-06-20T12:00",
         "is_knockout": False, "lam_home": 2.6, "lam_away": 0.4, "rho": 0.0,
         "prob_home": 0.85, "prob_draw": 0.1, "prob_away": 0.05, "first_goal": {}},
    ]
    q = build_quiniela(preds)
    assert q["knockout"] is False
    assert q["booster_safe"] is not None


def test_real_matchup_excludes_placeholders():
    from wc2026.pipeline import _is_real_team, _is_real_matchup
    from wc2026.types import Match
    assert _is_real_team("Spain") and _is_real_team("Belgium")
    for ph in ("W93", "L101", "1A", "2B", "TBD", "Winner Group A", "Runner-up C"):
        assert not _is_real_team(ph), ph
    real = Match(provider_id="x", utc_date="2026-07-10", competition="WC",
                 home_team="Spain", away_team="Belgium", status="SCHEDULED",
                 group="Quarter-final")
    ph = Match(provider_id="y", utc_date="2026-07-14", competition="WC",
               home_team="W97", away_team="W98", status="SCHEDULED",
               group="Semi-final")
    assert _is_real_matchup(real) and not _is_real_matchup(ph)


def test_points_for_pick_and_recovery():
    from wc2026.quiniela import _points_for_pick, recovery_strategies, SCORING
    # exact 2-1 hit: resultado(3)+local(2)+visita(2)+diferencia(3) = 10
    assert _points_for_pick((2, 1), (2, 1), SCORING, False, 0) == 10
    # pick 2-0, actual 1-0: resultado(3) + away-goals exact(2) = 5
    assert _points_for_pick((2, 0), (1, 0), SCORING, False, 0) == 5
    preds = [
        {"home_team": "A", "away_team": "B", "utc_date": "2026-06-20T12:00",
         "lam_home": 1.1, "lam_away": 1.1, "rho": 0.0,
         "prob_home": 0.36, "prob_draw": 0.3, "prob_away": 0.34, "first_goal": {}},
        {"home_team": "C", "away_team": "D", "utc_date": "2026-06-20T15:00",
         "lam_home": 2.4, "lam_away": 0.6, "rho": 0.0,
         "prob_home": 0.82, "prob_draw": 0.12, "prob_away": 0.06, "first_goal": {}},
    ]
    rec = recovery_strategies(preds, n_sims=1500, max_underdogs=2)
    assert set(rec["strategies"]) == {0, 1, 2}
    for s in rec["strategies"].values():
        assert s["p90"] >= s["mean"] >= s["p10"]
    assert rec["recommended_k"] in (0, 1, 2)
