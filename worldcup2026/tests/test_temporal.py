"""Tests for the inhomogeneous-Poisson first-goal model."""
import numpy as np
import pytest

from wc2026.temporal import (
    BREAKS, intensity_shape, predict_first_goal, MATCH_MINUTES,
)


def test_intensity_dips_after_breaks():
    """Rate must drop right AFTER each hydration break vs just before."""
    for b in BREAKS:
        before = intensity_shape(np.array([b - 0.5]))[0]
        after = intensity_shape(np.array([b + 0.5]))[0]
        assert after < before, f"no dip after break at {b}"


def test_first_goal_density_is_proper():
    fg = predict_first_goal(1.5, 1.2)
    dens = np.array(fg.minute_density)
    dt = 1.0
    mass = dens.sum() * dt
    # density mass + P(no goal) ~ 1 (small slack for the 1-min discretization)
    assert mass + fg.p_no_goal == pytest.approx(1.0, abs=2e-2)
    assert 0 < fg.expected_minute < MATCH_MINUTES


def test_more_goals_means_earlier_first_goal():
    high = predict_first_goal(2.5, 2.0)
    low = predict_first_goal(0.6, 0.5)
    assert high.expected_minute < low.expected_minute
    assert high.p_no_goal < low.p_no_goal


def test_scorer_threat_favours_stronger_attack():
    fg = predict_first_goal(2.0, 0.5, home_team="A", away_team="B")
    assert fg.p_home_first > fg.p_away_first


def test_lineup_threat_weights_players():
    threat = {"A": {"Star": 0.7, "Sub": 0.3}}
    fg = predict_first_goal(2.0, 0.5, home_xi_threat=threat["A"],
                            away_xi_threat={"X": 1.0},
                            home_team="A", away_team="B")
    players = {s["player"]: s["prob"] for s in fg.likely_scorers}
    assert players["Star"] > players["Sub"]
