"""Orchestration + scheduler.

run_once():
  1. pull matches + FIFA ranking from the configured provider,
  2. ingest into SQLite (detecting just-finished matches),
  3. select covariates by evidence (capped),
  4. fit the Dixon-Coles weights by a single MLE on the enlarged sample,
  5. re-validate (LOO-CV, baselines, bootstrap, binomial),
  6. log the run (weights + metrics) so confidence evolution is auditable,
  7. produce predictions (score dist, 1X2, O/U, BTTS, first goal) for the
     upcoming matches.

watch(): repeat run_once every POLL_INTERVAL_HOURS.

check_lineups(): detect newly-published official XIs and recompute just those
matches, adjusting offensive/defensive strength for absent key starters.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

from .config import Config, load_config
from .data_provider import make_provider, warn_if_reduced_mode
from .db import Database
from .model import DixonColesModel, predict_match
from .selection import SelectionReport, select_covariates
from .temporal import predict_first_goal
from .validation import (
    EngineComparison, ValidationReport, compare_engines, leave_one_out,
)
from .types import Match


def _load_committed_threats() -> dict[str, dict[str, float]]:
    """Load the committed per-team player-threat snapshot (data/player_threats.json).
    Lets the live page show real first-goal scorers without hammering the slow,
    rate-limited player API on every CI build."""
    import json
    import os

    path = os.path.join(os.path.dirname(__file__), "data", "player_threats.json")
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _is_real_team(name: str) -> bool:
    """A real, resolved team name -- not a knockout placeholder like '1A', '2B',
    'W97', 'L101', 'Winner Group A', 'Runner-up C', or 'TBD'."""
    if not name:
        return False
    n = name.strip()
    low = n.lower()
    if low in ("tbd", "tba"):
        return False
    # placeholders: start with a digit ('1A'), or W/L + number ('W97'/'L101'),
    # or contain winner/runner-up wording.
    if n[0].isdigit():
        return False
    if len(n) >= 2 and n[0] in ("W", "L") and n[1:].isdigit():
        return False
    if "winner" in low or "runner" in low or "loser" in low:
        return False
    return True


def _is_real_matchup(m: Match) -> bool:
    """True when BOTH teams are resolved -- so the fixture can be predicted.
    Works for group stage AND knockout rounds; excludes only fixtures whose
    teams are still placeholders (e.g. an unplayed semi-final 'W97 vs W98')."""
    return _is_real_team(m.home_team) and _is_real_team(m.away_team)


def _is_group_stage(m: Match) -> bool:
    """True for group-stage fixtures with real teams (not knockout placeholders
    like '1A'/'2B')."""
    g = str(m.group or "").lower()
    if g.startswith("group") or (len(g) == 1 and g.isalpha()):
        return True
    return _is_real_matchup(m) and g not in (
        "round of 32", "round of 16", "quarter-finals", "quarter-final",
        "semi-finals", "semi-final", "final", "third place",
        "match for third place")


def compute_standings(matches: list[Match]) -> list[dict]:
    """Group points/standings tallied directly from finished results (3-1-0).
    No API needed -- works for any provider that supplies group + scores."""
    table: dict[tuple, dict] = {}
    for m in matches:
        if not m.is_finished or not m.group:
            continue
        for team, gf, ga in ((m.home_team, m.home_goals, m.away_goals),
                             (m.away_team, m.away_goals, m.home_goals)):
            s = table.setdefault((m.group, team), {
                "group": m.group, "team": team, "played": 0, "won": 0,
                "drawn": 0, "lost": 0, "gf": 0, "ga": 0, "points": 0})
            s["played"] += 1
            s["gf"] += gf
            s["ga"] += ga
            if gf > ga:
                s["won"] += 1
                s["points"] += 3
            elif gf == ga:
                s["drawn"] += 1
                s["points"] += 1
            else:
                s["lost"] += 1
    out = []
    for s in table.values():
        s["gd"] = s["gf"] - s["ga"]
        out.append(s)
    return out


@dataclass
class PipelineResult:
    mode: str
    selection: SelectionReport
    fit: object                       # Dixon-Coles FitResult (interpretable)
    validation: ValidationReport      # PRIMARY engine's LOO report
    predictions: list[dict]
    newly_finished: list[str]
    run_id: int | None
    engine: str = "dc"                # which engine produced the predictions
    comparison: EngineComparison | None = None
    ml_fit: object | None = None
    standings: list = field(default_factory=list)
    descriptive: dict = field(default_factory=dict)
    variable_evidence: list = field(default_factory=list)
    quiniela: dict = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)


class Pipeline:
    def __init__(self, cfg: Config | None = None):
        self.cfg = cfg or load_config()
        self.provider = make_provider(self.cfg)
        self.reduced = warn_if_reduced_mode(self.provider)
        self.db = Database(self.cfg.sqlite_path)

    def close(self):
        self.db.close()

    # -- ingestion --------------------------------------------------------
    def ingest(self) -> list[Match]:
        rankings = self.provider.get_fifa_rankings()
        if not rankings:
            # provider couldn't supply ranks (football-data.org, openfootball,
            # balldontlie); fall back to any previously stored snapshot...
            rankings = self.db.load_rankings()
        if not rankings:
            # ...and as a last resort to the CSV-aware resolver (FIFA_RANKING_CSV
            # if set, else the bundled 48-team snapshot). [TODO: official CSV]
            from .fifa_ranking import get_rankings

            print("[ranking] sin ranking del proveedor ni en DB; uso resolver "
                  "(FIFA_RANKING_CSV o snapshot placeholder). [TODO oficial]")
            rankings = get_rankings()
        if rankings:
            self.db.save_rankings(rankings)
        matches = self.provider.get_matches()
        newly_finished = self.db.save_matches(matches)
        return newly_finished

    # -- full cycle -------------------------------------------------------
    def run_once(self, n_sims: int | None = None,
                 generate_predictions: bool = True) -> PipelineResult:
        n_sims = n_sims or self.cfg.mc_simulations
        newly = self.ingest()
        matches = self.db.load_matches()
        rankings = self.db.load_rankings()
        notes: list[str] = []
        mode = "reduced" if self.reduced or not any(
            m.is_finished and m.stats.xg_for is not None for m in matches
        ) else "full"

        # 3. evidence-based variable selection (drives the Dixon-Coles engine)
        selection = select_covariates(matches, rankings)
        from .selection import compute_variable_evidence
        variable_evidence = compute_variable_evidence(matches, rankings,
                                                      selection.selected)

        # 4. fit the interpretable Dixon-Coles engine (Wald weights) ...
        dc_model = DixonColesModel(selection.selected)
        fit = dc_model.fit(matches, rankings)

        # 5. honest engine comparison: DC vs ML (gradient boosting) via LOO
        comparison = compare_engines(matches, rankings, selection.selected,
                                     n_sims=min(n_sims, 12_000))
        notes.extend(comparison.notes)

        # 6. choose the PRIMARY engine. Default ENGINE=ml (user's choice);
        #    ENGINE=auto picks the LOO winner; ENGINE=dc forces Dixon-Coles.
        engine = self.cfg.engine
        ml_model = None
        ml_fit = None
        if engine in ("ml", "auto"):
            try:
                from .ml_model import MLGoalModel

                ml_model = MLGoalModel()
                ml_fit = ml_model.fit(matches, rankings)
            except Exception as e:  # degrade to DC if ML can't fit
                notes.append(f"ML engine unavailable ({e}); using Dixon-Coles.")
                engine = "dc"
        if engine == "auto":
            engine = comparison.winner if comparison.winner != "tie" else "dc"

        if engine == "ml" and ml_model is not None:
            primary_model = ml_model
            validation = comparison.ml
        else:
            engine = "dc"
            primary_model = dc_model
            validation = comparison.dc

        # 7. log the run (DC weights + primary engine metrics + comparison)
        extra = {
            "engine": engine,
            "dc_log_loss": comparison.dc.log_loss,
            "ml_log_loss": comparison.ml.log_loss,
            "dc_accuracy": comparison.dc.accuracy,
            "ml_accuracy": comparison.ml.accuracy,
            "winner": comparison.winner,
        }
        run_id = self.db.log_training_run(mode, fit, validation, engine=engine,
                                          extra_metrics=extra)

        # descriptive layer: per-team averages of the stats the engine does NOT
        # use directly (possession, shots, passes) -- visible, not predictive.
        descriptive = self._build_descriptive(dc_model.team_values, matches)

        # group standings computed from results (no extra API) + real-lineup
        # player threats (best effort)
        standings = compute_standings(matches)
        player_threats = {}
        try:
            player_threats = self.provider.get_player_threats()
        except Exception:
            player_threats = {}
        if not player_threats:
            # live player fetch is slow/unavailable (e.g. trial rate limit in CI);
            # fall back to a committed snapshot so real scorers still show.
            player_threats = _load_committed_threats()
        from .teamnames import normalize_keys
        player_threats = normalize_keys(player_threats)   # match across providers

        # 8. predictions for upcoming matches with the PRIMARY engine
        predictions: list[dict] = []
        if generate_predictions:
            predictions = self._predict_upcoming(primary_model, matches, n_sims,
                                                 player_threats)

        # quiniela: point-maximizing picks under the pool's scoring
        from .quiniela import build_quiniela
        quiniela = build_quiniela(predictions) if predictions else {}

        return PipelineResult(
            mode=mode, selection=selection, fit=fit, validation=validation,
            predictions=predictions, newly_finished=[m.provider_id for m in newly],
            run_id=run_id, engine=engine, comparison=comparison, ml_fit=ml_fit,
            standings=standings, descriptive=descriptive,
            variable_evidence=variable_evidence, quiniela=quiniela, notes=notes,
        )

    @staticmethod
    def _build_descriptive(tv, matches: list[Match]) -> dict:
        if tv is None or not getattr(tv, "has_xg", False):
            return {}
        teams = sorted({t for m in matches for t in (m.home_team, m.away_team)})
        out = {}
        for t in teams:
            out[t] = {
                "xg_attack": round(tv.xg_attack.get(t, 0.0), 2),
                "goal_attack": round(tv.goal_attack.get(t, 0.0), 2),
                "possession": round(tv.possession.get(t, 0.0), 1),
                "shots_on_target": round(tv.shots_on_target.get(t, 0.0), 1),
                "pass_accuracy": round(tv.pass_accuracy.get(t, 0.0), 1),
            }
        return out

    def _predict_upcoming(self, model: DixonColesModel, matches: list[Match],
                          n_sims: int, player_threats: dict | None = None) -> list[dict]:
        from .temporal import build_scorer_threats
        from .teamnames import normalize, normalize_keys

        # Prefer real-lineup threats (xG-weighted squad that played); fall back
        # to scorers aggregated from goals when the provider has no player data.
        scorer_threats = player_threats or normalize_keys(
            build_scorer_threats(matches))
        out = []
        for m in matches:
            if m.is_finished:
                continue
            # Predict any fixture whose BOTH teams are resolved -- group stage OR
            # a real knockout tie (e.g. a quarter-final 'Spain vs Belgium').
            # Only skip fixtures still holding placeholders ('W97 vs W98', 'TBD').
            if not _is_real_matchup(m):
                continue
            try:
                pred = predict_match(model, m.home_team, m.away_team, n_sims=n_sims,
                                     seed=hash(m.provider_id) % (2**31))
            except Exception:
                continue
            fg = predict_first_goal(
                pred.lam_home, pred.lam_away,
                home_xi_threat=scorer_threats.get(normalize(m.home_team)),
                away_xi_threat=scorer_threats.get(normalize(m.away_team)),
                home_team=m.home_team, away_team=m.away_team,
            )
            out.append({
                "provider_id": m.provider_id,
                "utc_date": m.utc_date,
                "stage": m.group,
                "is_knockout": not _is_group_stage(m),
                "home_team": m.home_team,
                "away_team": m.away_team,
                "lam_home": pred.lam_home,
                "lam_away": pred.lam_away,
                "rho": pred.rho,
                "prob_home": pred.prob_home,
                "prob_draw": pred.prob_draw,
                "prob_away": pred.prob_away,
                "most_likely_score": list(pred.most_likely_score),
                "score_probs": pred.score_probs,
                "total_goals_dist": pred.total_goals_dist,
                "over_2_5": pred.over_2_5,
                "under_2_5": pred.under_2_5,
                "btts": pred.btts,
                "first_goal": {
                    "expected_minute": fg.expected_minute,
                    "median_minute": fg.median_minute,
                    "p_no_goal": fg.p_no_goal,
                    "p_home_first": fg.p_home_first,
                    "p_away_first": fg.p_away_first,
                    "likely_scorers": fg.likely_scorers,
                },
            })
        return out

    # -- lineup job -------------------------------------------------------
    def check_lineups(self, model: DixonColesModel | None = None,
                      key_player_threat: dict[str, dict[str, float]] | None = None,
                      n_sims: int | None = None) -> list[dict]:
        """Detect matches with an official XI and recompute them, adjusting
        attacking strength for absent key starters.

        ``key_player_threat[team][player]`` = expected offensive contribution of
        that starter. When a usual key player is NOT in the posted XI, we shrink
        that team's attacking covariate accordingly. For football-data.org (no
        lineups) this is a no-op until a lineup-capable provider is configured.
        """
        n_sims = n_sims or self.cfg.mc_simulations
        matches = self.db.load_matches()
        with_xi = [m for m in matches if m.home_xi and m.away_xi and not m.is_finished]
        if not with_xi:
            return []  # [TODO] football-data.org does not publish XIs
        if model is None:
            rankings = self.db.load_rankings()
            selection = select_covariates(matches, rankings)
            model = DixonColesModel(selection.selected)
            model.fit(matches, rankings)

        recomputed = []
        for m in with_xi:
            override = self._lineup_override(m, key_player_threat)
            pred = predict_match(model, m.home_team, m.away_team, n_sims=n_sims,
                                 overrides=override)
            recomputed.append({
                "provider_id": m.provider_id,
                "home_team": m.home_team, "away_team": m.away_team,
                "override": override,
                "prob_home": pred.prob_home, "prob_draw": pred.prob_draw,
                "prob_away": pred.prob_away,
                "most_likely_score": list(pred.most_likely_score),
            })
        return recomputed

    def _lineup_override(self, m: Match,
                         key_player_threat) -> dict | None:
        if not key_player_threat:
            return None
        adj = {}
        for team, xi, sign in ((m.home_team, set(m.home_xi), +1),
                               (m.away_team, set(m.away_xi), -1)):
            threat = key_player_threat.get(team, {})
            if not threat:
                continue
            total = sum(threat.values()) or 1.0
            missing = sum(w for p, w in threat.items() if p not in xi)
            # fraction of attacking threat absent -> reduce xg_attack diff
            frac_missing = missing / total
            adj_val = -sign * frac_missing  # weakens that side's attack diff
            adj["xg_attack"] = adj.get("xg_attack", 0.0) + adj_val
        return adj or None

    # -- scheduler --------------------------------------------------------
    def watch(self, max_cycles: int | None = None):
        cycle = 0
        interval = self.cfg.poll_interval_hours * 3600
        while True:
            result = self.run_once()
            print(f"[pipeline] run #{result.run_id} mode={result.mode} "
                  f"acc={result.validation.accuracy:.3f} "
                  f"newly_finished={len(result.newly_finished)}")
            cycle += 1
            if max_cycles is not None and cycle >= max_cycles:
                break
            time.sleep(interval)
