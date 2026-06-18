"""Unit tests for the engine: probabilities sum to 1, shrinkage works, and the
simulated scoreline is coherent with lambda."""
import numpy as np
import pytest

from wc2026.model import (
    DixonColesModel, _shrunk_mean, dc_tau, predict_match, score_matrix,
    simulate_match,
)


def test_score_matrix_sums_to_one():
    M = score_matrix(1.4, 1.1, rho=-0.05, max_goals=12)
    assert M.sum() == pytest.approx(1.0, abs=1e-9)
    assert (M >= 0).all()


def test_1x2_probabilities_sum_to_one(fitted_model):
    pred = predict_match(fitted_model, "Argentina", "Qatar", n_sims=20000, seed=1)
    total = pred.prob_home + pred.prob_draw + pred.prob_away
    assert total == pytest.approx(1.0, abs=1e-9)
    # goal-total distribution also sums to 1
    assert sum(pred.total_goals_dist.values()) == pytest.approx(1.0, abs=1e-9)
    # over + under ~ 1 (2.5 line never lands exactly)
    assert pred.over_2_5 + pred.under_2_5 == pytest.approx(1.0, abs=1e-9)


def test_score_probs_normalized_subset(fitted_model):
    pred = predict_match(fitted_model, "Brazil", "Ghana", n_sims=20000, seed=2)
    # the reported top scorelines are a subset, so their mass is <= 1
    assert 0 < sum(pred.score_probs.values()) <= 1.0 + 1e-9


def test_simulated_mean_matches_lambda():
    """Monte Carlo means must track the input lambdas (engine coherence)."""
    lam_h, lam_a = 1.8, 0.9
    hg, ag = simulate_match(lam_h, lam_a, rho=-0.03, n_sims=80000, seed=7)
    # DC correction only perturbs low scores slightly; means stay close to lambda
    assert hg.mean() == pytest.approx(lam_h, abs=0.08)
    assert ag.mean() == pytest.approx(lam_a, abs=0.08)
    # stronger side scores more on average
    assert hg.mean() > ag.mean()


def test_stronger_team_has_higher_win_prob(fitted_model):
    strong = predict_match(fitted_model, "Argentina", "Saudi Arabia",
                           n_sims=20000, seed=3)
    assert strong.prob_home > strong.prob_away


def test_shrinkage_pulls_small_samples_to_prior():
    prior = 1.2
    # one observation far from the prior should be pulled strongly toward it
    one = _shrunk_mean([3.0], prior, k=5.0)
    assert prior < one < 3.0
    assert abs(one - prior) < abs(3.0 - prior)
    # many observations should dominate the prior
    many = _shrunk_mean([3.0] * 50, prior, k=5.0)
    assert many > one
    # empty sample returns the prior exactly
    assert _shrunk_mean([], prior) == prior


def test_dc_tau_corrects_only_low_scores():
    assert dc_tau(3, 2, 1.0, 1.0, 0.1) == 1.0
    assert dc_tau(0, 0, 1.0, 1.0, 0.1) != 1.0
    assert dc_tau(1, 1, 1.0, 1.0, 0.1) == pytest.approx(0.9)


def test_fit_recovers_positive_rank_effect(matches, rankings):
    """The synthetic DGP has stronger teams scoring more; the fitted rank
    coefficient must come out positive."""
    model = DixonColesModel(["rank_strength"])
    fit = model.fit(matches, rankings)
    assert fit.converged
    assert fit.params["beta_rank_strength"] > 0
    # rho stays inside its bound
    assert abs(fit.params["rho"]) <= 0.18 + 1e-6


def test_fit_requires_minimum_matches(rankings):
    model = DixonColesModel(["rank_strength"])
    with pytest.raises(ValueError):
        model.fit([], rankings)


def test_apply_elo_updates_bounded_and_directional():
    from wc2026.model import apply_elo_updates
    from wc2026.types import Match
    base = {"strongteam": 1800.0, "weakteam": 1500.0}
    # strong draws weak -> strong should DROP, weak should RISE, bounded
    m = Match("1", "2026-06-20T12:00", "WC", "strongteam", "weakteam",
              "FINISHED", 1, 1)
    upd = apply_elo_updates(base, [m], k=55)
    assert upd["strongteam"] < base["strongteam"]      # underperformed
    assert upd["weakteam"] > base["weakteam"]           # overperformed
    assert abs(upd["strongteam"] - base["strongteam"]) < 40   # bounded
    # ordering preserved (strong still > weak after one match)
    assert upd["strongteam"] > upd["weakteam"]
    # a win by the favourite nudges it up, not down
    m2 = Match("2", "2026-06-20T15:00", "WC", "strongteam", "weakteam",
               "FINISHED", 2, 0)
    upd2 = apply_elo_updates(base, [m2], k=55)
    assert upd2["strongteam"] > base["strongteam"]
