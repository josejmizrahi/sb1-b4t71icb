"""Evidence-based variable selection (not intuition).

Pipeline:
  1. Correlation of each candidate covariate (as a home-away diff) with the
     match goal difference -> Pearson r and p-value.
  2. LassoCV / ElasticNetCV on standardized covariates -> covariates whose
     coefficient is shrunk to exactly zero are dropped as redundant.
  3. HARD CAP: keep at most floor(n_matches / 10) covariates (>= 1). With 24
     matches that is 2; the rest are pushed to the descriptive layer.

Expected finding with a World Cup sample: FIFA rank (and xG when present)
survive; possession / passing collapse into xG and get dropped. We *verify*
this rather than assume it.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.stats import pearsonr
from sklearn.linear_model import ElasticNetCV, LassoCV
from sklearn.preprocessing import StandardScaler

from .model import CANDIDATE_COVARIATES, TeamValues, build_team_values
from .types import FifaRank, Match


@dataclass
class SelectionReport:
    candidates: list[str]
    selected: list[str]
    dropped: list[str]
    cap: int
    n_matches: int
    correlations: dict[str, dict]      # covariate -> {r, p, n}
    lasso_coefs: dict[str, float]
    method: str
    notes: list[str] = field(default_factory=list)


def _design(matches: list[Match], tv: TeamValues, covariates: list[str]):
    rows, y = [], []
    for m in matches:
        if not m.is_finished:
            continue
        rows.append([tv.diff(c, m.home_team, m.away_team) for c in covariates])
        y.append(m.home_goals - m.away_goals)
    return np.asarray(rows, dtype=float), np.asarray(y, dtype=float)


def select_covariates(matches: list[Match], rankings: list[FifaRank],
                      candidates: list[str] | None = None,
                      use_elasticnet: bool = True) -> SelectionReport:
    tv = build_team_values(matches, rankings)
    cands = list(candidates or CANDIDATE_COVARIATES)
    # drop xG-derived covariates that have no data (reduced mode)
    if not tv.has_xg:
        xg_dependent = {"xg_attack", "xg_defense", "possession",
                        "shots_on_target", "pass_accuracy"}
        cands = [c for c in cands if c not in xg_dependent]

    finished = [m for m in matches if m.is_finished]
    n = len(finished)
    notes: list[str] = []

    X, y = _design(matches, tv, cands)

    # 1. correlations
    correlations: dict[str, dict] = {}
    for j, c in enumerate(cands):
        col = X[:, j]
        if np.std(col) < 1e-12:
            correlations[c] = {"r": 0.0, "p": 1.0, "n": n}
            continue
        r, p = pearsonr(col, y)
        correlations[c] = {"r": float(r), "p": float(p), "n": n}

    # 2. Lasso / ElasticNet (standardized)
    lasso_coefs: dict[str, float] = {c: 0.0 for c in cands}
    method = "none"
    if len(cands) >= 2 and n >= 5:
        Xs = StandardScaler().fit_transform(X)
        folds = min(5, n)
        try:
            if use_elasticnet:
                est = ElasticNetCV(l1_ratio=[0.5, 0.7, 0.9, 1.0], cv=folds,
                                   max_iter=20000, random_state=0)
                method = "ElasticNetCV"
            else:
                est = LassoCV(cv=folds, max_iter=20000, random_state=0)
                method = "LassoCV"
            est.fit(Xs, y)
            lasso_coefs = {c: float(coef) for c, coef in zip(cands, est.coef_)}
        except Exception as e:  # pragma: no cover
            notes.append(f"Regularized selection failed ({e}); falling back to |r|.")
            method = "correlation-fallback"
    else:
        method = "correlation-fallback"
        notes.append(
            f"Too few candidates/matches for CV (cands={len(cands)}, n={n}); "
            "ranking by |correlation|."
        )

    # rank survivors
    if method.startswith("Elastic") or method.startswith("Lasso"):
        survivors = [c for c in cands if abs(lasso_coefs[c]) > 1e-8]
        rank_key = lambda c: abs(lasso_coefs[c])
    else:
        survivors = [c for c in cands if correlations[c]["p"] < 0.20]
        rank_key = lambda c: abs(correlations[c]["r"])
    if not survivors:  # never return an empty engine; keep the strongest signal
        survivors = sorted(cands, key=lambda c: abs(correlations[c]["r"]),
                           reverse=True)[:1]
        notes.append("No covariate cleared the threshold; kept strongest by |r|.")

    # 3. hard cap: <= 1 variable per ~10 matches (applies to FORM/stat vars).
    # rank_strength (FIFA) is a STRUCTURAL strength prior, always kept: it
    # encodes decades of results, so a single early-tournament match cannot make
    # the model forget that e.g. Spain >> Saudi Arabia. The cap limits the noisy
    # form covariates layered on top, not this prior.
    cap = max(1, n // 10)
    ranked = sorted(survivors, key=rank_key, reverse=True)
    PRIOR = "rank_strength"
    form_ranked = [c for c in ranked if c != PRIOR]
    selected = []
    if PRIOR in cands:
        selected.append(PRIOR)
    # add the strongest form covariates up to the cap (total engine vars)
    for c in form_ranked:
        if len(selected) >= cap:
            break
        selected.append(c)
    if not selected:                      # no rank available (degenerate)
        selected = ranked[:cap]
    dropped = [c for c in cands if c not in selected]
    if PRIOR in cands and PRIOR not in ranked:
        notes.append("rank_strength kept as structural strength prior (not "
                     "subject to the form-variable cap).")
    if len(form_ranked) > max(0, cap - 1):
        notes.append(
            f"Cap of {cap} (n={n}, rule <=1 var/10 matches) limits form vars; "
            f"extra surviving covariate(s) moved to the descriptive layer."
        )

    return SelectionReport(
        candidates=cands, selected=selected, dropped=dropped, cap=cap,
        n_matches=n, correlations=correlations, lasso_coefs=lasso_coefs,
        method=method, notes=notes,
    )
