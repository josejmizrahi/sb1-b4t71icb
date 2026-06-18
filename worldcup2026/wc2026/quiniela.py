"""Quiniela points optimizer.

Given the model's match predictions and the pool's SCORING table, pick the
entries that MAXIMIZE EXPECTED POINTS -- which is NOT the same as the most likely
scoreline. Also surfaces a contrarian/underdog layer and a booster
recommendation, because a 24-person pool is won by expected value + smart
differentiation, not by raw 1X2 accuracy.

Scoring (from the pool screenshot):
    Resultado (ganador/empate)         +3
    Goles exactos equipo local         +2
    Goles exactos equipo visitante     +2
    Diferencia de goles                +3
    Primer jugador en anotar           +5
    Primer equipo en anotar            +2
    Marcador underdog (<=10% grupo)    +3   (high-variance, differentiation)
    Campeon del mundo                 +10   (separate, season-long)
    Booster x2 (1 por jornada)         x2   (multiplies a matchday)
"""
from __future__ import annotations

import numpy as np

from .model import score_matrix

SCORING = {
    "resultado": 3,
    "goles_local": 2,
    "goles_visita": 2,
    "diferencia": 3,
    "primer_equipo": 2,
    "primer_jugador": 5,
    "underdog": 3,
    "campeon": 10,
}

MAXG = 8


def _sign(x: int) -> int:
    return (x > 0) - (x < 0)


def optimize_scoreline(M: np.ndarray, scoring=SCORING, restrict_outcome=None,
                       prefer: tuple[float, float] | None = None,
                       tol: float = 0.5):
    """Pick (h,a) maximizing expected score-related points under the joint pmf M.
    If ``restrict_outcome`` ('H'/'D'/'A') is given, only scorelines of that
    outcome are considered (the deliberate underdog play).

    ``prefer`` (lam_home, lam_away): among scorelines whose expected points are
    within ``tol`` of the maximum, pick the one CLOSEST to the expected goals.
    This leans clear favorites toward the likely goleada (e.g. 0-4 instead of the
    flat-EV 0-3) while leaving even games at 1-1 (where 1-1 alone is near-optimal).
    Returns (best_h, best_a, expected_points, breakdown_probs)."""
    n = M.shape[0]
    p_home_goals = M.sum(axis=1)
    p_away_goals = M.sum(axis=0)
    p_outcome = {"H": 0.0, "D": 0.0, "A": 0.0}
    p_diff: dict[int, float] = {}
    for h in range(n):
        for a in range(n):
            p = M[h, a]
            p_outcome["H" if h > a else "D" if h == a else "A"] += p
            p_diff[h - a] = p_diff.get(h - a, 0.0) + p

    cells = []
    for h in range(n):
        for a in range(n):
            o = "H" if h > a else "D" if h == a else "A"
            if restrict_outcome and o != restrict_outcome:
                continue
            ep = (scoring["resultado"] * p_outcome[o]
                  + scoring["goles_local"] * p_home_goals[h]
                  + scoring["goles_visita"] * p_away_goals[a]
                  + scoring["diferencia"] * p_diff.get(h - a, 0.0))
            cells.append((h, a, ep))
    if not cells:
        return None
    max_ep = max(c[2] for c in cells)
    if prefer is not None:
        lh, la = prefer
        cands = [c for c in cells if c[2] >= max_ep - tol]
        h, a, ep = min(cands, key=lambda c: (c[0] - lh) ** 2 + (c[1] - la) ** 2)
    else:
        h, a, ep = max(cells, key=lambda c: c[2])
    return (h, a, ep, {
        "p_resultado": p_outcome["H" if h > a else "D" if h == a else "A"],
        "p_goles_local": float(p_home_goals[h]),
        "p_goles_visita": float(p_away_goals[a]),
        "p_diferencia": p_diff.get(h - a, 0.0),
    })


def match_picks(pred: dict, scoring=SCORING) -> dict:
    """Full point-maximizing pick for one match + expected-points breakdown."""
    M = score_matrix(pred["lam_home"], pred["lam_away"], pred.get("rho", 0.0), MAXG)
    # Lean toward the likely goleada ONLY when there is a clear favorite (big
    # lambda gap); for even matches use the pure expected-points pick so we don't
    # force every game to 2-1.
    lam_gap = abs(pred["lam_home"] - pred["lam_away"])
    prefer = (pred["lam_home"], pred["lam_away"]) if lam_gap >= 0.8 else None
    h, a, ep_score, br = optimize_scoreline(M, scoring, prefer=prefer)

    # first team to score: pick the more likely; EV = points * its probability
    fg = pred.get("first_goal", {})
    p_h_first = fg.get("p_home_first", 0.5)
    p_a_first = fg.get("p_away_first", 0.5)
    p_no_goal = fg.get("p_no_goal", 0.0)
    if p_h_first >= p_a_first:
        first_team, p_first_team = pred["home_team"], p_h_first
    else:
        first_team, p_first_team = pred["away_team"], p_a_first
    ep_first_team = scoring["primer_equipo"] * p_first_team * (1 - p_no_goal)

    # first scorer: top player by absolute P(scores first) = cond.prob * P(>=1 goal)
    scorers = fg.get("likely_scorers", [])
    first_scorer, p_first_scorer = None, 0.0
    if scorers:
        top = scorers[0]
        first_scorer = top["player"]
        p_first_scorer = top["prob"] * (1 - p_no_goal)
    ep_first_scorer = scoring["primer_jugador"] * p_first_scorer

    # contrarian / underdog: the non-favorite outcome and how strong the model
    # rates it (differentiation opportunity; the bonus needs <=10% of the group).
    probs = {"H": pred["prob_home"], "D": pred["prob_draw"], "A": pred["prob_away"]}
    fav = max(probs, key=probs.get)
    underdog_outcome = "A" if fav == "H" else "H"   # the opposite side win
    p_underdog = probs[underdog_outcome]

    total_ep = ep_score + ep_first_team + ep_first_scorer

    # deliberate UNDERDOG play: best scoreline restricted to the upset outcome,
    # plus the +3 underdog bonus weighted by how often the upset actually happens
    # (assumes you'd be in the <=10% that picked it). This is the climber's bet.
    ep_dog = total_ep
    dog_score = (h, a)
    ud = optimize_scoreline(M, scoring, restrict_outcome=underdog_outcome)
    if ud is not None:
        dog_score = (ud[0], ud[1])
        ep_dog = (ud[2] + ep_first_team + ep_first_scorer
                  + scoring["underdog"] * p_underdog)

    return {
        "home_team": pred["home_team"], "away_team": pred["away_team"],
        "utc_date": pred.get("utc_date", ""),
        "pick_score": (h, a),
        "ep_score": ep_score, "score_breakdown": br,
        "first_team": first_team, "p_first_team": p_first_team,
        "ep_first_team": ep_first_team,
        "first_scorer": first_scorer, "p_first_scorer": p_first_scorer,
        "ep_first_scorer": ep_first_scorer,
        "expected_points": total_ep,
        "favorite": fav, "underdog_outcome": underdog_outcome,
        "p_underdog": p_underdog,
        "underdog_pick_score": dog_score, "ep_underdog": ep_dog,
        "probs": probs,
    }


def _points_for_pick(pick, actual, scoring, picked_underdog, underdog_sign):
    """Quiniela score-category points for a (h,a) pick vs an actual (h,a)."""
    ph, pa = pick
    ah, aa = actual
    pts = 0
    if (ph > pa) - (ph < pa) == (ah > aa) - (ah < aa):
        pts += scoring["resultado"]
    if ph == ah:
        pts += scoring["goles_local"]
    if pa == aa:
        pts += scoring["goles_visita"]
    if ph - pa == ah - aa:
        pts += scoring["diferencia"]
    if picked_underdog and (ah > aa) - (ah < aa) == underdog_sign:
        pts += scoring["underdog"]
    return pts


def recovery_strategies(predictions: list[dict], scoring=SCORING,
                        n_sims: int = 6000, target_gain: float = 0,
                        max_underdogs: int = 3, seed: int = 0) -> dict:
    """Compare jornada strategies by the DISTRIBUTION of points, not just the
    mean. When you are behind, the right play maximizes the chance of a big
    score (upside), not the average. For k = 0..max_underdogs we deliberately
    play the k highest-upside matches as underdogs (and put the Booster x2 on the
    best of them when k>0, else on the safest match) and Monte-Carlo the total.

    Reports mean, P90 (upside) and P(gain >= target) per strategy, and
    recommends the k that best beats the target (the gap you must close)."""
    import numpy as np

    rng = np.random.default_rng(seed)
    picks = [match_picks(p, scoring) for p in predictions]
    mats = [score_matrix(p["lam_home"], p["lam_away"], p.get("rho", 0.0), MAXG)
            for p in predictions]
    flats = [m.ravel() for m in mats]
    ncol = MAXG + 1
    # first team/scorer EV is (almost) independent of the result strategy:
    const = sum(p["ep_first_team"] + p["ep_first_scorer"] for p in picks)

    # rank matches by underdog upside (E[pts] of the upset pick)
    dog_order = sorted(range(len(picks)), key=lambda i: -picks[i]["ep_underdog"])
    safe_booster = max(range(len(picks)),
                       key=lambda i: picks[i]["expected_points"]) if picks else 0

    out = {}
    for k in range(0, max_underdogs + 1):
        dogs = set(dog_order[:k])
        booster = (dog_order[0] if k > 0 else safe_booster) if picks else None
        totals = np.empty(n_sims)
        for s in range(n_sims):
            tot = const
            for i, p in enumerate(picks):
                idx = rng.choice(flats[i].size, p=flats[i])
                ah, aa = divmod(idx, ncol)
                if i in dogs:
                    pick = p["underdog_pick_score"]
                    pts = _points_for_pick(pick, (ah, aa), scoring, True,
                                           1 if p["underdog_outcome"] == "H" else -1)
                else:
                    pts = _points_for_pick(p["pick_score"], (ah, aa), scoring,
                                           False, 0)
                if i == booster:
                    pts *= 2
                tot += pts
            totals[s] = tot
        out[k] = {
            "n_underdogs": k,
            "mean": float(np.mean(totals)),
            "p10": float(np.percentile(totals, 10)),
            "p90": float(np.percentile(totals, 90)),
            "p_target": float(np.mean(totals >= np.mean(totals) + target_gain))
            if target_gain else None,
            "booster_match": None if booster is None else
            f"{picks[booster]['home_team']} vs {picks[booster]['away_team']}",
            "underdog_matches": [f"{picks[i]['home_team']} vs {picks[i]['away_team']}"
                                 for i in dog_order[:k]],
        }
    # recommend: if a target gap is given, the k maximizing P(reach it); else the
    # k maximizing upside (P90) without tanking the mean too much.
    if target_gain:
        rec = max(out, key=lambda k: out[k]["p_target"])
    else:
        rec = max(out, key=lambda k: out[k]["p90"])
    return {"strategies": out, "recommended_k": rec, "target_gain": target_gain}


def build_quiniela(predictions: list[dict], scoring=SCORING,
                   matchday_size: int | None = None) -> dict:
    """Build picks for the upcoming matches, sorted by date. Recommends where to
    spend the Booster x2 (highest expected-points match) and lists the best
    contrarian/underdog candidates for differentiation."""
    upcoming = sorted([p for p in predictions if p.get("utc_date")],
                      key=lambda p: p["utc_date"])
    if matchday_size:
        upcoming = upcoming[:matchday_size]
    picks = [match_picks(p, scoring) for p in upcoming]

    # Booster x2 -- two recommendations for two risk appetites:
    #  SAFE: double the highest expected-points match (protects your position).
    #  CLIMBER: double the best deliberate-underdog play (lower mean, high upside
    #           -- the +EV move when you must leapfrog people from behind).
    booster_safe = max(picks, key=lambda x: x["expected_points"]) if picks else None
    dog_pool = [p for p in picks if p["p_underdog"] >= 0.22]
    booster_climber = (max(dog_pool, key=lambda x: x["ep_underdog"])
                       if dog_pool else None)

    # Underdog candidates: clear favorite by the crowd but model gives the upset
    # a meaningful chance -> good differentiation if it hits (<=10% will pick it).
    underdogs = sorted(
        [p for p in picks if 0.25 <= p["p_underdog"] <= 0.48],
        key=lambda x: -x["ep_underdog"])[:5]

    def _bm(b):
        if not b:
            return None
        return {"home_team": b["home_team"], "away_team": b["away_team"],
                "expected_points": b["expected_points"],
                "ep_underdog": b["ep_underdog"],
                "underdog_outcome": b["underdog_outcome"],
                "p_underdog": b["p_underdog"]}

    return {
        "picks": picks,
        "booster_match": _bm(booster_safe),            # back-compat (safe)
        "booster_safe": _bm(booster_safe),
        "booster_climber": _bm(booster_climber),
        "underdog_candidates": [{
            "home_team": u["home_team"], "away_team": u["away_team"],
            "underdog_outcome": u["underdog_outcome"],
            "underdog_pick_score": u["underdog_pick_score"],
            "p_underdog": u["p_underdog"],
            "ep_underdog": u["ep_underdog"]} for u in underdogs],
        "total_expected_points": sum(p["expected_points"] for p in picks),
        "scoring": scoring,
    }
