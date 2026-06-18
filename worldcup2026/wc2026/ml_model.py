"""Advanced ML engine: regularized gradient-boosted Poisson regression.

Per the user's explicit choice, this is offered as a PRIMARY engine. Honesty
caveat kept front and centre: with ~24-48 matches a boosted model can overfit;
that is why we (a) regularize hard, (b) train on team-perspective rows to double
the sample, (c) ALWAYS report leave-one-out metrics next to Dixon-Coles and the
baselines, and (d) report permutation importance, not in-sample gains.

The model predicts each team's expected goals (lambda). Those lambdas feed the
SAME Dixon-Coles low-score correction + Monte Carlo machinery as the parametric
engine, so all downstream outputs (scorelines, goal distribution, 1X2, O/U,
BTTS, first-goal timing) are produced identically -- only the lambda estimator
changes.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import minimize_scalar
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance

from .features import build_training_matrix, matchup_rows
from .model import dc_tau, _poisson_logpmf
from .types import FifaRank, Match


@dataclass
class MLFitResult:
    importances: list[dict]      # [{feature, importance, std}]
    rho: float
    n_matches: int
    n_rows: int
    has_xg: bool
    features: list[str]
    cv_note: str = ""
    notes: list[str] = field(default_factory=list)


def _fit_global_rho(lams_home, lams_away, finished: list[Match]) -> float:
    """One-parameter MLE for the Dixon-Coles rho given fixed lambdas."""
    def nll(rho):
        ll = 0.0
        for lh, la, m in zip(lams_home, lams_away, finished):
            tau = dc_tau(m.home_goals, m.away_goals, lh, la, rho)
            if tau <= 0:
                return 1e9
            ll += np.log(tau) + _poisson_logpmf(m.home_goals, lh) \
                + _poisson_logpmf(m.away_goals, la)
        return -ll
    res = minimize_scalar(nll, bounds=(-0.18, 0.18), method="bounded")
    return float(res.x)


class MLGoalModel:
    """Gradient-boosted Poisson lambda estimator with the DixonColes interface
    (``predict_lambdas`` -> used by model.predict_match)."""

    def __init__(self, random_state: int = 0):
        self.random_state = random_state
        self.reg: HistGradientBoostingRegressor | None = None
        self.team_values = None
        self.has_xg = False
        self.rho = 0.0
        self.fit_result: MLFitResult | None = None

    def _make_regressor(self, n_rows: int) -> HistGradientBoostingRegressor:
        # Heavy regularization tuned for a small sample: shallow trees, strong
        # leaf size, L2 penalty, low learning rate, early stopping.
        return HistGradientBoostingRegressor(
            loss="poisson",
            learning_rate=0.05,
            max_depth=3,
            max_leaf_nodes=8,
            min_samples_leaf=max(5, n_rows // 8),
            l2_regularization=1.0,
            max_iter=400,
            early_stopping=True,
            validation_fraction=0.2 if n_rows >= 20 else None,
            n_iter_no_change=20,
            random_state=self.random_state,
        )

    def fit(self, matches: list[Match], rankings: list[FifaRank]) -> MLFitResult:
        tm = build_training_matrix(matches, rankings)
        if len(tm.y) < 6:
            raise ValueError(
                f"Need >=3 finished matches (>=6 team-rows); got {len(tm.y)}.")
        self.team_values = tm.team_values
        self.has_xg = tm.has_xg

        self.reg = self._make_regressor(len(tm.y))
        self.reg.fit(tm.X, tm.y)

        # global rho from the fitted lambdas
        finished = [m for m in matches if m.is_finished]
        lam_pred = self.reg.predict(tm.X)
        lams_home = lam_pred[0::2]   # even rows are home perspective
        lams_away = lam_pred[1::2]
        self.rho = _fit_global_rho(lams_home, lams_away, finished)

        # permutation importance (out-of-the-bag-ish: on the training rows, but
        # importance is relative and we caveat it; cheap and informative)
        importances: list[dict] = []
        try:
            pi = permutation_importance(
                self.reg, tm.X, tm.y, n_repeats=20,
                random_state=self.random_state, scoring="neg_mean_poisson_deviance")
            order = np.argsort(-pi.importances_mean)
            for i in order:
                importances.append({
                    "feature": tm.names[i],
                    "importance": float(pi.importances_mean[i]),
                    "std": float(pi.importances_std[i]),
                })
        except Exception as e:  # pragma: no cover
            importances = [{"feature": n, "importance": float("nan"), "std": float("nan")}
                           for n in tm.names]

        notes = []
        if len(finished) < 30:
            notes.append(
                f"Only {len(finished)} matches: gradient boosting can overfit. "
                "Trust the leave-one-out comparison, not in-sample fit.")
        self.fit_result = MLFitResult(
            importances=importances, rho=self.rho, n_matches=len(finished),
            n_rows=len(tm.y), has_xg=tm.has_xg, features=tm.names, notes=notes,
        )
        return self.fit_result

    def predict_lambdas(self, home: str, away: str,
                        overrides: dict | None = None) -> tuple[float, float, float]:
        if self.reg is None or self.team_values is None:
            raise RuntimeError("MLGoalModel not fitted.")
        hr, ar = matchup_rows(self.team_values, home, away, self.has_xg, overrides)
        lam_h = float(self.reg.predict(hr.reshape(1, -1))[0])
        lam_a = float(self.reg.predict(ar.reshape(1, -1))[0])
        lam_h = min(max(lam_h, 1e-3), 12.0)
        lam_a = min(max(lam_a, 1e-3), 12.0)
        return lam_h, lam_a, self.rho
