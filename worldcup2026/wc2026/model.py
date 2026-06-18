"""Dixon-Coles bivariate Poisson model with covariate-driven team strength.

WHY covariate-driven (and not free attack/defence per team)
-----------------------------------------------------------
A classic Dixon-Coles fits an attack and a defence rating per team: ~2N free
parameters. A World Cup gives ~3 matches per team, so 2N ratings would be
estimated from almost nothing -> massive overfit. Instead we make each team's
log-scoring-rate a *linear function of observable covariates*:

    log(lambda_home) = mu + home_adv + sum_c beta_c * (v_c[home] - v_c[away])
    log(lambda_away) = mu            - sum_c beta_c * (v_c[home] - v_c[away])

where v_c[team] is an observable team value (FIFA-rank strength; shrunk xG form;
...). This keeps the engine to 3 structural params (mu, home_adv, rho) + one
beta per *selected* covariate, honouring the hard rule of <= 1 variable per ~10
training matches. The Dixon-Coles rho corrects the dependence in low scorelines.

Estimation is a single maximum-likelihood optimisation (no "run until it hits").
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Optional

import numpy as np
from scipy.optimize import minimize
from scipy.stats import norm

from .fixtures import rank_strength
from .types import FifaRank, Match

# ---------------------------------------------------------------------------
# Covariate registry: each covariate maps a team -> an observable value.
# Engine candidates are diffs (home_value - away_value).
# ---------------------------------------------------------------------------
SHRINKAGE_K = 5.0  # pseudo-matches of prior; with 1-2 real matches the prior dominates


def _finished_for_team(matches: list[Match], team: str):
    for m in matches:
        if not m.is_finished:
            continue
        if m.home_team == team:
            yield m, "home"
        elif m.away_team == team:
            yield m, "away"


def _shrunk_mean(values: list[float], prior: float, k: float = SHRINKAGE_K) -> float:
    """James-Stein-style shrinkage toward a prior. Critical with tiny samples:
    a team with 1 match does not get to claim its raw average."""
    n = len(values)
    if n == 0:
        return prior
    return (n * float(np.mean(values)) + k * prior) / (n + k)


def _load_elo() -> dict[str, float]:
    import json
    import os

    path = os.path.join(os.path.dirname(__file__), "data", "elo_ratings.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


@dataclass
class TeamValues:
    """All per-team observable values used as covariates, with shrinkage applied
    where the sample is tiny."""
    rank_strength: dict[str, float]
    elo_strength: dict[str, float]   # standardized World Football Elo (best prior)
    has_elo: bool
    opp_adj_attack: dict[str, float] # goals scored above expectation vs opponent
    goal_attack: dict[str, float]    # shrunk mean goals scored (works w/o xG)
    goal_defense: dict[str, float]   # shrunk mean goals conceded (lower=better)
    xg_attack: dict[str, float]      # shrunk mean xG for
    xg_defense: dict[str, float]     # shrunk mean xG against (lower = better)
    possession: dict[str, float]
    shots_on_target: dict[str, float]
    pass_accuracy: dict[str, float]
    has_xg: bool

    def diff(self, covariate: str, home: str, away: str) -> float:
        table = getattr(self, covariate)
        return table.get(home, 0.0) - table.get(away, 0.0)


def build_team_values(matches: list[Match], rankings: list[FifaRank]) -> TeamValues:
    rank_map = {fr.team: fr.rank for fr in rankings}
    teams = sorted({t for m in matches for t in (m.home_team, m.away_team)}
                   if matches else rank_map.keys())

    rs = {t: rank_strength(rank_map.get(t, 100)) for t in teams}
    # centre rank strength so mu stays interpretable
    if rs:
        mean_rs = float(np.mean(list(rs.values())))
        rs = {t: v - mean_rs for t, v in rs.items()}

    # World Football Elo: a continuous, recency-weighted strength measure that
    # already encodes ~12 months of form (qualifiers + friendlies) and predicts
    # better than the ordinal FIFA rank. Standardized per 100 Elo, centred.
    from .teamnames import normalize

    elo_map = _load_elo()
    elo_raw = {t: elo_map.get(normalize(t)) for t in teams}
    present = [v for v in elo_raw.values() if v is not None]
    # Use Elo if we have it for a reasonable number of real teams. (Don't gate on
    # the fraction of `teams`: the fixture list includes TBD knockout slots like
    # "1A"/"2B" that have no Elo and would dilute the ratio.)
    has_elo = len(present) >= 8
    mean_elo = float(np.mean(present)) if present else 1500.0
    es = {t: ((elo_raw[t] if elo_raw[t] is not None else mean_elo) - mean_elo) / 100.0
          for t in teams}

    has_xg = any(
        m.is_finished and m.stats.xg_for is not None for m in matches
    )

    # gather per-team observed stats from finished matches
    raw_gf: dict[str, list[float]] = {t: [] for t in teams}   # goals for
    raw_ga: dict[str, list[float]] = {t: [] for t in teams}   # goals against
    raw_att: dict[str, list[float]] = {t: [] for t in teams}
    raw_def: dict[str, list[float]] = {t: [] for t in teams}
    raw_poss: dict[str, list[float]] = {t: [] for t in teams}
    raw_sot: dict[str, list[float]] = {t: [] for t in teams}
    raw_pacc: dict[str, list[float]] = {t: [] for t in teams}

    gf_vs_opp: list[tuple[str, float, float]] = []   # (team, goals_for, opp_elo)
    for m in matches:
        if not m.is_finished:
            continue
        s = m.stats
        for team, side in ((m.home_team, "home"), (m.away_team, "away")):
            if team not in raw_att:
                continue
            # actual goals are observable even without xG -> real form signal
            gf = m.home_goals if side == "home" else m.away_goals
            ga = m.away_goals if side == "home" else m.home_goals
            opp = m.away_team if side == "home" else m.home_team
            raw_gf[team].append(float(gf))
            raw_ga[team].append(float(ga))
            gf_vs_opp.append((team, float(gf), es.get(opp, 0.0)))
            if has_xg and s.xg_for is not None:
                xf = s.xg_for if side == "home" else s.xg_against
                xa = s.xg_against if side == "home" else s.xg_for
                if xf is not None:
                    raw_att[team].append(xf)
                if xa is not None:
                    raw_def[team].append(xa)
                poss = s.possession_home if side == "home" else s.possession_away
                sot = s.shots_on_target_home if side == "home" else s.shots_on_target_away
                pacc = s.pass_accuracy_home if side == "home" else s.pass_accuracy_away
                if poss is not None:
                    raw_poss[team].append(poss)
                if sot is not None:
                    raw_sot[team].append(float(sot))
                if pacc is not None:
                    raw_pacc[team].append(pacc)

    def shrink_table(raw: dict[str, list[float]], fallback: float) -> dict[str, float]:
        allvals = [v for lst in raw.values() for v in lst]
        prior = float(np.mean(allvals)) if allvals else fallback
        return {t: _shrunk_mean(lst, prior) for t, lst in raw.items()}

    # opponent-adjusted attack: goals scored ABOVE what an average team would
    # score against that opponent (regress goals on opponent Elo, take residual).
    # So 5 goals vs a weak side counts less than 2 vs a strong one. Shrunk.
    opp_adj = {t: 0.0 for t in teams}
    if len(gf_vs_opp) >= 6:
        X = np.array([o for _, _, o in gf_vs_opp])
        Yg = np.array([gv for _, gv, _ in gf_vs_opp])
        if np.std(X) > 1e-6:
            slope, intercept = np.polyfit(X, Yg, 1)
        else:
            slope, intercept = 0.0, float(np.mean(Yg))
        resid: dict[str, list[float]] = {t: [] for t in teams}
        for t, gv, o in gf_vs_opp:
            resid[t].append(gv - (intercept + slope * o))
        opp_adj = {t: _shrunk_mean(lst, 0.0) for t, lst in resid.items()}

    return TeamValues(
        rank_strength=rs,
        elo_strength=es,
        has_elo=has_elo,
        opp_adj_attack=opp_adj,
        goal_attack=shrink_table(raw_gf, 1.2),
        goal_defense=shrink_table(raw_ga, 1.2),
        xg_attack=shrink_table(raw_att, 1.2),
        xg_defense=shrink_table(raw_def, 1.2),
        possession=shrink_table(raw_poss, 50.0),
        shots_on_target=shrink_table(raw_sot, 4.0),
        pass_accuracy=shrink_table(raw_pacc, 80.0),
        has_xg=has_xg,
    )


# Candidate covariates offered to the variable-selection layer. The engine only
# uses the subset that survives selection (and the <=1-per-10 cap).
CANDIDATE_COVARIATES = [
    "elo_strength",       # best strength prior (Elo: strength + recent form)
    "rank_strength",
    "opp_adj_attack",     # opponent-adjusted goal form (works w/o xG)
    "goal_attack",        # available even in reduced mode (no xG)
    "xg_attack",
    "possession",
    "shots_on_target",
    "pass_accuracy",
]


# ---------------------------------------------------------------------------
# Dixon-Coles likelihood
# ---------------------------------------------------------------------------
def dc_tau(x: int, y: int, lam: float, mu: float, rho: float) -> float:
    """Dixon-Coles low-score dependence correction."""
    if x == 0 and y == 0:
        return 1.0 - lam * mu * rho
    if x == 0 and y == 1:
        return 1.0 + lam * rho
    if x == 1 and y == 0:
        return 1.0 + mu * rho
    if x == 1 and y == 1:
        return 1.0 - rho
    return 1.0


def _poisson_logpmf(k: int, lam: float) -> float:
    return k * math.log(lam) - lam - math.lgamma(k + 1)


@dataclass
class FitResult:
    params: dict[str, float]
    std_errors: dict[str, float]
    p_values: dict[str, float]
    z_values: dict[str, float]
    loglik: float
    n_matches: int
    covariates: list[str]
    has_xg: bool
    converged: bool

    def wald_table(self) -> list[dict]:
        rows = []
        for name in self.params:
            rows.append({
                "parameter": name,
                "coef": self.params[name],
                "std_error": self.std_errors.get(name, float("nan")),
                "z": self.z_values.get(name, float("nan")),
                "p_value": self.p_values.get(name, float("nan")),
                "significant_5pct": self.p_values.get(name, 1.0) < 0.05,
            })
        return rows


class DixonColesModel:
    def __init__(self, covariates: list[str], rho_bound: float = 0.18,
                 neutral_venue: bool = True):
        # The World Cup is played at neutral venues (except host nations), so by
        # default we FIX home advantage at 0. Estimating it from a few matches
        # picks up spurious noise (non-significant) and inflates every
        # arbitrarily-designated "home" team. Set neutral_venue=False for a
        # normal home/away competition.
        self.covariates = list(covariates)
        self.rho_bound = rho_bound
        self.neutral_venue = neutral_venue
        self.team_values: Optional[TeamValues] = None
        self.fit_result: Optional[FitResult] = None

    # -- parameter packing ------------------------------------------------
    @property
    def _param_names(self) -> list[str]:
        return ["mu", "home_adv", "rho"] + [f"beta_{c}" for c in self.covariates]

    def _unpack(self, theta: np.ndarray):
        mu, home_adv, rho = theta[0], theta[1], theta[2]
        betas = {c: theta[3 + i] for i, c in enumerate(self.covariates)}
        return mu, home_adv, rho, betas

    def _lambdas(self, theta, tv: TeamValues, home: str, away: str,
                 overrides: dict | None = None):
        mu, home_adv, rho, betas = self._unpack(theta)
        s = 0.0
        for c in self.covariates:
            d = tv.diff(c, home, away)
            if overrides and c in overrides:
                d = overrides[c]
            s += betas[c] * d
        lam_h = math.exp(mu + home_adv + s)
        lam_a = math.exp(mu - s)
        return lam_h, lam_a, rho

    # -- likelihood -------------------------------------------------------
    def _neg_loglik(self, theta, tv, finished: list[Match]) -> float:
        mu, home_adv, rho, betas = self._unpack(theta)
        ll = 0.0
        for m in finished:
            lam_h, lam_a, _ = self._lambdas(theta, tv, m.home_team, m.away_team)
            lam_h = min(max(lam_h, 1e-6), 12.0)
            lam_a = min(max(lam_a, 1e-6), 12.0)
            x, y = m.home_goals, m.away_goals
            tau = dc_tau(x, y, lam_h, lam_a, rho)
            if tau <= 0:
                return 1e12  # invalid rho region
            ll += math.log(tau) + _poisson_logpmf(x, lam_h) + _poisson_logpmf(y, lam_a)
        # mild ridge on betas = shrinkage toward 0 (extra safety with tiny n)
        ll -= 0.5 * 0.1 * sum(b * b for b in betas.values())
        return -ll

    def fit(self, matches: list[Match], rankings: list[FifaRank]) -> FitResult:
        tv = build_team_values(matches, rankings)
        self.team_values = tv
        finished = [m for m in matches if m.is_finished]
        if len(finished) < 3:
            raise ValueError(
                f"Need >=3 finished matches to fit; got {len(finished)}."
            )

        x0 = np.zeros(3 + len(self.covariates))
        x0[0] = math.log(max(0.8, np.mean(
            [m.home_goals + m.away_goals for m in finished]) / 2))
        home_bounds = (0.0, 0.0) if self.neutral_venue else (-1.0, 1.0)
        bounds = [(-2, 2), home_bounds, (-self.rho_bound, self.rho_bound)]
        bounds += [(-3, 3)] * len(self.covariates)

        res = minimize(
            self._neg_loglik, x0, args=(tv, finished),
            method="L-BFGS-B", bounds=bounds,
            options={"maxiter": 500, "ftol": 1e-9},
        )
        theta = res.x
        se, z, p = self._wald(theta, tv, finished)
        names = self._param_names
        fr = FitResult(
            params={n: float(theta[i]) for i, n in enumerate(names)},
            std_errors={n: float(se[i]) for i, n in enumerate(names)},
            z_values={n: float(z[i]) for i, n in enumerate(names)},
            p_values={n: float(p[i]) for i, n in enumerate(names)},
            loglik=float(-res.fun),
            n_matches=len(finished),
            covariates=list(self.covariates),
            has_xg=tv.has_xg,
            converged=bool(res.success),
        )
        self.fit_result = fr
        return fr

    def _wald(self, theta, tv, finished):
        """Standard errors from the numerical Hessian of the NLL at the optimum
        (observed Fisher information). z = coef/se, two-sided Wald p-value."""
        n = len(theta)
        eps = 1e-4
        H = np.zeros((n, n))
        f0 = self._neg_loglik(theta, tv, finished)
        for i in range(n):
            for j in range(i, n):
                ti = theta.copy(); tj = theta.copy(); tij = theta.copy()
                ti[i] += eps
                tj[j] += eps
                tij[i] += eps; tij[j] += eps
                fij = self._neg_loglik(tij, tv, finished)
                fi = self._neg_loglik(ti, tv, finished)
                fj = self._neg_loglik(tj, tv, finished)
                H[i, j] = H[j, i] = (fij - fi - fj + f0) / (eps * eps)
        try:
            cov = np.linalg.inv(H)
            se = np.sqrt(np.clip(np.diag(cov), 0, None))
        except np.linalg.LinAlgError:
            se = np.full(n, float("nan"))
        with np.errstate(divide="ignore", invalid="ignore"):
            z = theta / se
            p = 2 * (1 - norm.cdf(np.abs(z)))
        return se, z, p

    # -- prediction -------------------------------------------------------
    def predict_lambdas(self, home: str, away: str,
                        overrides: dict | None = None) -> tuple[float, float, float]:
        if self.fit_result is None or self.team_values is None:
            raise RuntimeError("Model not fitted.")
        theta = np.array([self.fit_result.params[n] for n in self._param_names])
        return self._lambdas(theta, self.team_values, home, away, overrides)


# ---------------------------------------------------------------------------
# Score distribution + Monte Carlo
# ---------------------------------------------------------------------------
def score_matrix(lam_h: float, lam_a: float, rho: float, max_goals: int = 10) -> np.ndarray:
    """Dixon-Coles-corrected joint pmf over scorelines [0..max_goals]^2."""
    from scipy.stats import poisson

    ph = poisson.pmf(np.arange(max_goals + 1), lam_h)
    pa = poisson.pmf(np.arange(max_goals + 1), lam_a)
    M = np.outer(ph, pa)
    for x in range(2):
        for y in range(2):
            M[x, y] *= dc_tau(x, y, lam_h, lam_a, rho)
    M /= M.sum()
    return M


@dataclass
class MatchPrediction:
    home_team: str
    away_team: str
    lam_home: float
    lam_away: float
    rho: float
    prob_home: float
    prob_draw: float
    prob_away: float
    most_likely_score: tuple[int, int]      # from Monte Carlo (respects routs)
    score_probs: dict[str, float]            # top scorelines
    total_goals_dist: dict[str, float]       # {"0","1","2","3","4+"}
    over_2_5: float
    under_2_5: float
    btts: float
    n_sims: int


def simulate_match(lam_h: float, lam_a: float, rho: float,
                   n_sims: int = 50_000, seed: int | None = None,
                   max_goals: int = 10) -> tuple[np.ndarray, np.ndarray]:
    """Monte Carlo draw of (home_goals, away_goals) from the DC-corrected joint
    pmf. Sampling from the full joint (not the modal score) is what lets routs
    like 4-0 surface instead of everything collapsing to 1-0/2-0."""
    rng = np.random.default_rng(seed)
    M = score_matrix(lam_h, lam_a, rho, max_goals)
    flat = M.ravel()
    idx = rng.choice(flat.size, size=n_sims, p=flat)
    hg, ag = np.divmod(idx, M.shape[1])
    return hg, ag


def predict_match(model: DixonColesModel, home: str, away: str,
                  n_sims: int = 50_000, seed: int | None = None,
                  overrides: dict | None = None) -> MatchPrediction:
    lam_h, lam_a, rho = model.predict_lambdas(home, away, overrides)
    hg, ag = simulate_match(lam_h, lam_a, rho, n_sims, seed)

    home_w = float(np.mean(hg > ag))
    draw = float(np.mean(hg == ag))
    away_w = float(np.mean(hg < ag))

    # most frequent scoreline from the simulation
    scores, counts = np.unique(np.stack([hg, ag], axis=1), axis=0, return_counts=True)
    order = np.argsort(-counts)
    top = scores[order][:6]
    topc = counts[order][:6]
    most = (int(top[0][0]), int(top[0][1]))
    score_probs = {f"{int(s[0])}-{int(s[1])}": float(c / n_sims)
                   for s, c in zip(top, topc)}

    totals = hg + ag
    dist = {
        "0": float(np.mean(totals == 0)),
        "1": float(np.mean(totals == 1)),
        "2": float(np.mean(totals == 2)),
        "3": float(np.mean(totals == 3)),
        "4+": float(np.mean(totals >= 4)),
    }
    return MatchPrediction(
        home_team=home, away_team=away,
        lam_home=lam_h, lam_away=lam_a, rho=rho,
        prob_home=home_w, prob_draw=draw, prob_away=away_w,
        most_likely_score=most, score_probs=score_probs,
        total_goals_dist=dist,
        over_2_5=float(np.mean(totals > 2.5)),
        under_2_5=float(np.mean(totals < 2.5)),
        btts=float(np.mean((hg > 0) & (ag > 0))),
        n_sims=n_sims,
    )
