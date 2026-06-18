"""Tests for variable selection and honest validation."""
import pytest

from wc2026.selection import select_covariates
from wc2026.validation import leave_one_out, actual_outcome
from wc2026 import fixtures


def test_selection_respects_cap(matches, rankings):
    sel = select_covariates(matches, rankings)
    n = sel.n_matches
    assert sel.cap == max(1, n // 10)
    assert 1 <= len(sel.selected) <= sel.cap


def test_reduced_mode_drops_xg_covariates(matches, rankings):
    """No xG in the data -> xG-dependent covariates must not be candidates."""
    sel = select_covariates(matches, rankings)
    for c in ("xg_attack", "possession", "shots_on_target", "pass_accuracy"):
        assert c not in sel.candidates
    assert "rank_strength" in sel.candidates


def test_full_mode_can_demonstrate_redundancy(rankings):
    """With xG present, possession/passing should be available as candidates
    and the engine still capped (redundant ones go to descriptive layer)."""
    xg_matches = fixtures.synthetic_world_cup(with_xg=True, seed=11)
    sel = select_covariates(xg_matches, rankings)
    assert "xg_attack" in sel.candidates
    assert "possession" in sel.candidates
    assert len(sel.selected) <= sel.cap


def test_validation_reports_all_fields(matches, rankings):
    sel = select_covariates(matches, rankings)
    v = leave_one_out(matches, rankings, sel.selected, n_sims=4000, n_boot=200)
    assert 0 <= v.accuracy <= 1
    assert v.acc_ci95[0] <= v.accuracy <= v.acc_ci95[1] + 1e-9
    assert 0 <= v.binomial_p_vs_chance <= 1
    assert set(v.baselines) == {"random", "higher_fifa_rank", "home_team"}
    assert v.log_loss > 0 and v.brier > 0


def test_simulate_matchday_vs_real(matches, rankings):
    from wc2026.validation import simulate_matchday

    rows = simulate_matchday(matches, rankings, ["rank_strength", "goal_attack"],
                             n_sims=3000)
    n_finished = sum(1 for m in matches if m.is_finished)
    assert len(rows) == n_finished
    for r in rows:
        assert r["actual_outcome"] in ("H", "D", "A")
        assert r["pred_outcome"] in ("H", "D", "A")
        assert 0.0 <= r["p_actual"] <= 1.0
        assert len(r["pred_score"]) == 2


def test_incremental_variable_analysis(matches, rankings):
    from wc2026.validation import incremental_variable_analysis

    inc = incremental_variable_analysis(
        matches, rankings, base=["rank_strength"],
        candidates=["goal_attack"], n_sims=2500, n_boot=100)
    assert inc.base_log_loss > 0
    assert "goal_attack" in inc.variables
    v = inc.variables["goal_attack"]
    # d_log_loss is base - candidate consistency: log_loss == base + d
    assert v["log_loss"] == pytest.approx(inc.base_log_loss + v["d_log_loss"], abs=1e-9)
    assert isinstance(v["helps"], bool)


def test_actual_outcome():
    from wc2026.types import Match

    h = Match("1", "", "WC", "A", "B", "FINISHED", 2, 0)
    d = Match("2", "", "WC", "A", "B", "FINISHED", 1, 1)
    a = Match("3", "", "WC", "A", "B", "FINISHED", 0, 3)
    assert actual_outcome(h) == "H"
    assert actual_outcome(d) == "D"
    assert actual_outcome(a) == "A"
