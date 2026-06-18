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
from .validation import ValidationReport, leave_one_out
from .types import Match


@dataclass
class PipelineResult:
    mode: str
    selection: SelectionReport
    fit: object
    validation: ValidationReport
    predictions: list[dict]
    newly_finished: list[str]
    run_id: int | None
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
            # provider couldn't supply ranks (e.g. football-data.org); fall back
            # to any previously stored snapshot.
            rankings = self.db.load_rankings()
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

        # 3. evidence-based variable selection
        selection = select_covariates(matches, rankings)

        # 4. single-MLE fit on selected covariates
        model = DixonColesModel(selection.selected)
        fit = model.fit(matches, rankings)

        # 5. honest re-validation
        validation = leave_one_out(matches, rankings, selection.selected,
                                   n_sims=min(n_sims, 20_000))

        # 6. log the run
        run_id = self.db.log_training_run(mode, fit, validation)

        # 7. predictions for upcoming matches
        predictions: list[dict] = []
        if generate_predictions:
            predictions = self._predict_upcoming(model, matches, n_sims)

        return PipelineResult(
            mode=mode, selection=selection, fit=fit, validation=validation,
            predictions=predictions, newly_finished=[m.provider_id for m in newly],
            run_id=run_id, notes=notes,
        )

    def _predict_upcoming(self, model: DixonColesModel, matches: list[Match],
                          n_sims: int) -> list[dict]:
        out = []
        for m in matches:
            if m.is_finished:
                continue
            if m.home_team in ("TBD",) or m.away_team in ("TBD",):
                continue
            try:
                pred = predict_match(model, m.home_team, m.away_team, n_sims=n_sims,
                                     seed=hash(m.provider_id) % (2**31))
            except Exception:
                continue
            fg = predict_first_goal(
                pred.lam_home, pred.lam_away,
                home_team=m.home_team, away_team=m.away_team,
            )
            out.append({
                "provider_id": m.provider_id,
                "utc_date": m.utc_date,
                "home_team": m.home_team,
                "away_team": m.away_team,
                "lam_home": pred.lam_home,
                "lam_away": pred.lam_away,
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
