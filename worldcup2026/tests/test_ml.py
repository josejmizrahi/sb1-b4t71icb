"""Tests for the advanced ML engine (gradient-boosted Poisson lambdas)."""
import numpy as np
import pytest

from wc2026 import fixtures
from wc2026.features import build_training_matrix, feature_names, matchup_rows
from wc2026.ml_model import MLGoalModel
from wc2026.model import predict_match
from wc2026.validation import compare_engines


@pytest.fixture(scope="module")
def xg_data():
    rankings = fixtures.fifa_ranking_snapshot()
    matches = fixtures.synthetic_world_cup(with_xg=True, seed=7)
    return matches, rankings


def test_feature_matrix_doubles_sample(xg_data):
    matches, rankings = xg_data
    tm = build_training_matrix(matches, rankings)
    n_finished = sum(1 for m in matches if m.is_finished)
    assert tm.X.shape[0] == 2 * n_finished      # two team-rows per match
    assert tm.X.shape[1] == len(feature_names(has_xg=True))
    assert tm.has_xg is True


def test_reduced_mode_feature_set_is_small():
    # no xG -> only rank + venue features
    assert feature_names(has_xg=False) == [
        "is_home", "own_strength", "opp_strength", "strength_diff"]


def test_ml_fits_and_predicts_lambdas(xg_data):
    matches, rankings = xg_data
    model = MLGoalModel()
    fit = model.fit(matches, rankings)
    assert fit.n_rows == 2 * fit.n_matches
    assert abs(fit.rho) <= 0.18 + 1e-6
    lam_h, lam_a, rho = model.predict_lambdas("Argentina", "Saudi Arabia")
    assert lam_h > 0 and lam_a > 0
    assert len(fit.importances) == len(feature_names(True))


def test_ml_probabilities_sum_to_one(xg_data):
    matches, rankings = xg_data
    model = MLGoalModel()
    model.fit(matches, rankings)
    pred = predict_match(model, "Brazil", "Qatar", n_sims=15000, seed=1)
    assert pred.prob_home + pred.prob_draw + pred.prob_away == pytest.approx(1.0, abs=1e-9)
    assert sum(pred.total_goals_dist.values()) == pytest.approx(1.0, abs=1e-9)


def test_ml_stronger_team_scores_more(xg_data):
    matches, rankings = xg_data
    model = MLGoalModel()
    model.fit(matches, rankings)
    lam_strong, lam_weak, _ = model.predict_lambdas("Argentina", "Saudi Arabia")
    assert lam_strong > lam_weak


def test_overrides_shift_lambdas(xg_data):
    matches, rankings = xg_data
    model = MLGoalModel()
    model.fit(matches, rankings)
    base = model.predict_lambdas("Argentina", "Brazil")
    weakened = model.predict_lambdas("Argentina", "Brazil",
                                     overrides={"own_xg_attack": -1.0})
    # weakening Argentina's attack should not increase its lambda
    assert weakened[0] <= base[0] + 1e-6


def test_compare_engines_runs_and_picks(xg_data):
    matches, rankings = xg_data
    from wc2026.selection import select_covariates

    sel = select_covariates(matches, rankings)
    cmp = compare_engines(matches, rankings, sel.selected, n_sims=3000, n_boot=200)
    assert cmp.winner in ("dc", "ml", "tie")
    assert cmp.decision_metric == "loo_log_loss"
    # both reports are well-formed
    for v in (cmp.dc, cmp.ml):
        assert 0 <= v.accuracy <= 1
        assert v.log_loss > 0
