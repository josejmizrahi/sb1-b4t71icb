"""Offline synthetic data + FIFA ranking snapshot.

Two purposes:

1. ``fifa_ranking_snapshot()`` -- a small, REAL-ish ranking table. football-data.org
   does not publish the FIFA ranking, so until a CSV-ingest is wired this is the
   ranking source. Values are approximate (early-2026 ballpark) and marked TODO:
   replace with the official snapshot before trusting any output.

2. ``synthetic_world_cup()`` -- a deterministic, clearly-labelled SYNTHETIC set
   of finished + scheduled matches, generated from a rank-driven Poisson process
   so the full pipeline (ingest -> MLE -> backtest -> report) runs with NO API
   key. This is NOT real data; it exists to demonstrate the machinery offline.
"""
from __future__ import annotations

import math

import numpy as np

from .types import FifaRank, Goal, Match, MatchStats

# TODO: replace with the official FIFA ranking snapshot (date-stamped). These
# ranks are approximate placeholders used only so offline demos are coherent.
_RANK_TABLE: list[tuple[str, int]] = [
    ("Argentina", 1), ("France", 2), ("Spain", 3), ("England", 4),
    ("Brazil", 5), ("Portugal", 6), ("Netherlands", 7), ("Belgium", 8),
    ("Italy", 9), ("Germany", 10), ("Croatia", 11), ("Morocco", 12),
    ("Colombia", 13), ("Uruguay", 14), ("USA", 15), ("Mexico", 16),
    ("Switzerland", 17), ("Senegal", 18), ("Japan", 19), ("Denmark", 20),
    ("Ecuador", 23), ("South Korea", 24), ("Canada", 31), ("Australia", 25),
    ("Poland", 26), ("Nigeria", 28), ("Egypt", 33), ("Ghana", 40),
    ("Saudi Arabia", 56), ("Qatar", 58), ("Iran", 21), ("Serbia", 22),
]


def fifa_ranking_snapshot() -> list[FifaRank]:
    """Return the (placeholder) FIFA ranking. as_of marks it clearly."""
    return [
        FifaRank(team=t, rank=r, points=None, as_of="SYNTHETIC-2026")
        for t, r in _RANK_TABLE
    ]


def rank_strength(rank: int) -> float:
    """Map an ordinal FIFA rank to a continuous strength score.

    -log(rank) is monotone, compresses the long tail (the gap between #1 and #2
    matters more than #50 vs #51), and is centred later by the model. This is a
    *transform of an observable*, not a free parameter.
    """
    return -math.log(rank)


def synthetic_world_cup(with_xg: bool = False, seed: int = 2026) -> list[Match]:
    """Generate a deterministic synthetic tournament.

    Data-generating process (so the model has real signal to recover):
        log(lambda_home) = MU + HOME_ADV + BETA * (s_home - s_away)
        log(lambda_away) = MU            - BETA * (s_home - s_away)
    with s = rank_strength. Goals ~ Poisson(lambda). A subset is marked FINISHED
    (the "already played" matches the backtest uses); the rest are SCHEDULED.
    """
    rng = np.random.default_rng(seed)
    ranks = {fr.team: fr.rank for fr in fifa_ranking_snapshot()}
    teams = list(ranks.keys())

    MU, HOME_ADV, BETA = 0.05, 0.20, 0.55  # "true" DGP params (unknown to model)

    # Build a round-robin-ish schedule of plausible group matches.
    pairings: list[tuple[str, str]] = []
    rng.shuffle(teams)
    for i in range(0, len(teams) - 1, 2):
        pairings.append((teams[i], teams[i + 1]))
    # add a second wave of cross pairings for more played matches
    rotated = teams[1:] + teams[:1]
    for i in range(0, len(teams) - 1, 2):
        pairings.append((teams[i], rotated[i]))

    matches: list[Match] = []
    n_finished = 26  # ~1 var per 10 matches -> engine may use up to ~2-3 vars
    for idx, (home, away) in enumerate(pairings):
        s_diff = rank_strength(ranks[home]) - rank_strength(ranks[away])
        lam_h = math.exp(MU + HOME_ADV + BETA * s_diff)
        lam_a = math.exp(MU - BETA * s_diff)
        finished = idx < n_finished

        m = Match(
            provider_id=f"SYN-{idx:03d}",
            utc_date=f"2026-06-{11 + idx % 20:02d}T18:00:00Z",
            competition="WC",
            home_team=home,
            away_team=away,
            status="FINISHED" if finished else "SCHEDULED",
        )
        if finished:
            hg = int(rng.poisson(lam_h))
            ag = int(rng.poisson(lam_a))
            m.home_goals, m.away_goals = hg, ag
            m.goals = _synth_goals(rng, home, away, hg, ag, lam_h, lam_a)
            if with_xg:
                m.stats = _synth_stats(rng, lam_h, lam_a)
        matches.append(m)
    return matches


def _synth_goals(rng, home, away, hg, ag, lam_h, lam_a) -> list[Goal]:
    goals: list[Goal] = []
    for _ in range(hg):
        goals.append(Goal(minute=int(rng.integers(1, 95)), team=home))
    for _ in range(ag):
        goals.append(Goal(minute=int(rng.integers(1, 95)), team=away))
    goals.sort(key=lambda g: g.minute)
    return goals


def _synth_stats(rng, lam_h, lam_a) -> MatchStats:
    """xG roughly tracks lambda (with noise); possession/shots/passes correlate
    with xG so the variable-selection layer can *demonstrate* redundancy."""
    xg_h = max(0.1, lam_h + rng.normal(0, 0.3))
    xg_a = max(0.1, lam_a + rng.normal(0, 0.3))
    share = xg_h / (xg_h + xg_a)
    poss_h = float(np.clip(50 + (share - 0.5) * 60 + rng.normal(0, 4), 25, 75))
    return MatchStats(
        xg_for=round(xg_h, 2),
        xg_against=round(xg_a, 2),
        possession_home=round(poss_h, 1),
        possession_away=round(100 - poss_h, 1),
        shots_on_target_home=int(max(0, xg_h * 4 + rng.normal(0, 1))),
        shots_on_target_away=int(max(0, xg_a * 4 + rng.normal(0, 1))),
        passes_completed_home=int(400 + (poss_h - 50) * 8 + rng.normal(0, 30)),
        passes_completed_away=int(400 + (50 - poss_h) * 8 + rng.normal(0, 30)),
        pass_accuracy_home=round(float(np.clip(82 + (poss_h - 50) * 0.2, 70, 92)), 1),
        pass_accuracy_away=round(float(np.clip(82 + (50 - poss_h) * 0.2, 70, 92)), 1),
    )
