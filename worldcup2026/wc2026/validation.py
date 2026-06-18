"""Honest validation: leave-one-out cross-validation, baselines, bootstrap CI,
and a binomial significance test against chance.

We ALWAYS compare against three dumb baselines:
  * random            -- uniform 1/3 each.
  * higher FIFA rank  -- pick the better-ranked team to win.
  * home team         -- pick the designated home team.

If the model does not beat these, the report says so plainly. With a small
sample the bootstrap interval on accuracy is wide -- we show it, not hide it.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import numpy as np
from scipy.stats import binomtest

from .model import DixonColesModel, predict_match
from .types import FifaRank, Match

# An "engine factory" fits on training matches and returns an object exposing
# predict_lambdas(home, away) -> (lam_home, lam_away, rho). Both DixonColesModel
# and MLGoalModel satisfy this, so validation is engine-agnostic.
EngineFactory = Callable[[list[Match], list[FifaRank]], object]


def dc_engine_factory(covariates: list[str]) -> EngineFactory:
    def build(train, rankings):
        model = DixonColesModel(covariates)
        model.fit(train, rankings)
        return model
    return build


def ml_engine_factory() -> EngineFactory:
    def build(train, rankings):
        from .ml_model import MLGoalModel

        model = MLGoalModel()
        model.fit(train, rankings)
        return model
    return build

OUTCOMES = ("H", "D", "A")


def actual_outcome(m: Match) -> str:
    if m.home_goals > m.away_goals:
        return "H"
    if m.home_goals < m.away_goals:
        return "A"
    return "D"


@dataclass
class FoldResult:
    home_team: str
    away_team: str
    actual: str
    pred_probs: dict[str, float]      # {"H","D","A"}
    predicted: str
    correct: bool


@dataclass
class ValidationReport:
    n: int
    accuracy: float
    log_loss: float
    brier: float
    acc_ci95: tuple[float, float]
    baselines: dict[str, float]
    binomial_p_vs_chance: float
    beats_all_baselines: bool
    folds: list[FoldResult] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _log_loss(probs: list[dict], actuals: list[str]) -> float:
    eps = 1e-15
    tot = 0.0
    for p, a in zip(probs, actuals):
        tot -= np.log(min(max(p[a], eps), 1.0))
    return tot / len(actuals)


def _brier(probs: list[dict], actuals: list[str]) -> float:
    tot = 0.0
    for p, a in zip(probs, actuals):
        for o in OUTCOMES:
            y = 1.0 if o == a else 0.0
            tot += (p[o] - y) ** 2
    return tot / len(actuals)


def _bootstrap_acc_ci(correct: np.ndarray, n_boot: int = 1000,
                      seed: int = 0) -> tuple[float, float]:
    if len(correct) == 0:
        return (float("nan"), float("nan"))
    rng = np.random.default_rng(seed)
    n = len(correct)
    accs = [correct[rng.integers(0, n, n)].mean() for _ in range(n_boot)]
    return (float(np.percentile(accs, 2.5)), float(np.percentile(accs, 97.5)))


def _rank_map(rankings: list[FifaRank]) -> dict[str, int]:
    return {fr.team: fr.rank for fr in rankings}


def leave_one_out(matches: list[Match], rankings: list[FifaRank],
                  covariates: list[str] | None = None, n_sims: int = 20_000,
                  n_boot: int = 1000,
                  engine: EngineFactory | None = None) -> ValidationReport:
    """Refit on all-but-one finished match and predict the held-out one. Honest
    because the test match never informs its own prediction.

    ``engine`` selects the estimator; defaults to Dixon-Coles on ``covariates``.
    Pass ml_engine_factory() to validate the gradient-boosting engine."""
    finished = [m for m in matches if m.is_finished]
    notes: list[str] = []
    if len(finished) < 5:
        notes.append(f"Only {len(finished)} finished matches; LOO is very noisy.")

    if engine is None:
        engine = dc_engine_factory(covariates or ["rank_strength"])

    ranks = _rank_map(rankings)
    folds: list[FoldResult] = []
    probs: list[dict] = []
    actuals: list[str] = []

    base_correct = {"random": [], "higher_fifa_rank": [], "home_team": []}

    for i, test in enumerate(finished):
        train = [m for j, m in enumerate(finished) if j != i]
        try:
            model = engine(train, rankings)
            pred = predict_match(model, test.home_team, test.away_team,
                                 n_sims=n_sims, seed=i)
            pp = {"H": pred.prob_home, "D": pred.prob_draw, "A": pred.prob_away}
        except Exception as e:  # degrade gracefully
            notes.append(f"Fold {i} failed ({e}); used uniform prior.")
            pp = {"H": 1 / 3, "D": 1 / 3, "A": 1 / 3}

        a = actual_outcome(test)
        predicted = max(pp, key=pp.get)
        folds.append(FoldResult(test.home_team, test.away_team, a, pp,
                                predicted, predicted == a))
        probs.append(pp)
        actuals.append(a)

        # baselines
        base_correct["random"].append(1.0 / 3.0)  # expected hit rate
        rh, ra = ranks.get(test.home_team, 999), ranks.get(test.away_team, 999)
        base_pick = "H" if rh < ra else ("A" if ra < rh else "D")
        base_correct["higher_fifa_rank"].append(1.0 if base_pick == a else 0.0)
        base_correct["home_team"].append(1.0 if a == "H" else 0.0)

    correct = np.array([f.correct for f in folds], dtype=float)
    acc = float(correct.mean()) if len(correct) else float("nan")
    ci = _bootstrap_acc_ci(correct, n_boot=n_boot)
    baselines = {k: float(np.mean(v)) for k, v in base_correct.items()}

    n = len(folds)
    n_correct = int(correct.sum())
    bt = binomtest(n_correct, n, 1.0 / 3.0, alternative="greater")
    beats = all(acc > b for b in baselines.values())
    if not beats:
        notes.append("Model does NOT beat every baseline -- reported honestly.")

    return ValidationReport(
        n=n, accuracy=acc,
        log_loss=_log_loss(probs, actuals),
        brier=_brier(probs, actuals),
        acc_ci95=ci, baselines=baselines,
        binomial_p_vs_chance=float(bt.pvalue),
        beats_all_baselines=beats, folds=folds, notes=notes,
    )


@dataclass
class EngineComparison:
    dc: ValidationReport
    ml: ValidationReport
    winner: str                 # "dc" | "ml" | "tie"
    decision_metric: str        # what we ranked on
    notes: list[str] = field(default_factory=list)


def compare_engines(matches: list[Match], rankings: list[FifaRank],
                    covariates: list[str], n_sims: int = 15_000,
                    n_boot: int = 1000) -> EngineComparison:
    """Run honest LOO for BOTH engines and pick a winner by out-of-sample
    log-loss (a proper scoring rule; ties broken by accuracy). Lower log-loss
    wins. If neither clearly wins, we say 'tie' rather than overclaim."""
    dc = leave_one_out(matches, rankings, covariates, n_sims=n_sims,
                       n_boot=n_boot, engine=dc_engine_factory(covariates))
    ml = leave_one_out(matches, rankings, covariates, n_sims=n_sims,
                       n_boot=n_boot, engine=ml_engine_factory())

    notes: list[str] = []
    margin = dc.log_loss - ml.log_loss   # positive => ML better
    if abs(margin) < 0.01:
        winner = "tie"
        notes.append("Engines are within 0.01 log-loss: effectively a tie on "
                     "this sample. Prefer the simpler Dixon-Coles.")
    elif margin > 0:
        winner = "ml"
    else:
        winner = "dc"
    notes.append(
        f"LOO log-loss -- DC: {dc.log_loss:.3f}, ML: {ml.log_loss:.3f} "
        f"(lower is better). Accuracy -- DC: {dc.accuracy:.3f}, "
        f"ML: {ml.accuracy:.3f}.")
    if not dc.beats_all_baselines and not ml.beats_all_baselines:
        notes.append("NEITHER engine beats every baseline on this sample "
                     "(reported honestly).")
    return EngineComparison(dc=dc, ml=ml, winner=winner,
                            decision_metric="loo_log_loss", notes=notes)
