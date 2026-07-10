"""Persistence layer (SQLite by default).

Stores the dataset (matches, goals, lineups, FIFA ranks), the fitted weights of
each training run, and a full log of every retraining so the evolution of
confidence over time is auditable.

Supabase is an optional backend [TODO]: the same method surface would be
implemented against the Supabase Postgres REST/JSON-RPC API. We prefer JSON-RPC
over XML-RPC for any external integration, per the spec.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone

from .types import FifaRank, Goal, Match, MatchStats

SCHEMA = """
CREATE TABLE IF NOT EXISTS matches (
    provider_id   TEXT PRIMARY KEY,
    utc_date      TEXT,
    competition   TEXT,
    home_team     TEXT,
    away_team     TEXT,
    status        TEXT,
    home_goals    INTEGER,
    away_goals    INTEGER,
    stats_json    TEXT,
    home_xi_json  TEXT,
    away_xi_json  TEXT,
    lineup_posted_at TEXT,
    group_name    TEXT,
    updated_at    TEXT
);
CREATE TABLE IF NOT EXISTS goals (
    match_id TEXT, minute INTEGER, team TEXT, scorer TEXT
);
CREATE TABLE IF NOT EXISTS fifa_rankings (
    team TEXT, rank INTEGER, points REAL, as_of TEXT
);
CREATE TABLE IF NOT EXISTS training_runs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ts           TEXT,
    mode         TEXT,           -- 'full' or 'reduced'
    engine       TEXT,           -- 'ml' | 'dc'
    n_matches    INTEGER,
    covariates   TEXT,
    loglik       REAL,
    accuracy     REAL,
    log_loss     REAL,
    brier        REAL,
    acc_ci_low   REAL,
    acc_ci_high  REAL,
    binomial_p   REAL,
    beats_baselines INTEGER,
    metrics_json TEXT
);
CREATE TABLE IF NOT EXISTS weights (
    run_id    INTEGER,
    name      TEXT,
    coef      REAL,
    std_error REAL,
    p_value   REAL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, path: str = "worldcup2026.db"):
        self.path = path
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def close(self):
        self.conn.close()

    # -- matches ----------------------------------------------------------
    def upsert_match(self, m: Match) -> bool:
        """Insert/update one match. Returns True if this call newly marks the
        match as FINISHED (used by the pipeline to detect just-ended games)."""
        cur = self.conn.execute(
            "SELECT status FROM matches WHERE provider_id=?", (m.provider_id,))
        row = cur.fetchone()
        was_finished = bool(row and row["status"] == "FINISHED")

        self.conn.execute(
            """INSERT INTO matches (provider_id, utc_date, competition, home_team,
                 away_team, status, home_goals, away_goals, stats_json,
                 home_xi_json, away_xi_json, lineup_posted_at, group_name, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(provider_id) DO UPDATE SET
                 utc_date=excluded.utc_date, status=excluded.status,
                 home_team=excluded.home_team, away_team=excluded.away_team,
                 home_goals=excluded.home_goals, away_goals=excluded.away_goals,
                 stats_json=excluded.stats_json, home_xi_json=excluded.home_xi_json,
                 away_xi_json=excluded.away_xi_json,
                 lineup_posted_at=excluded.lineup_posted_at,
                 group_name=excluded.group_name,
                 updated_at=excluded.updated_at""",
            (m.provider_id, m.utc_date, m.competition, m.home_team, m.away_team,
             m.status, m.home_goals, m.away_goals,
             json.dumps(m.stats.__dict__), json.dumps(m.home_xi),
             json.dumps(m.away_xi), m.lineup_posted_at, m.group, _now()),
        )
        self.conn.execute("DELETE FROM goals WHERE match_id=?", (m.provider_id,))
        for g in m.goals:
            self.conn.execute(
                "INSERT INTO goals (match_id, minute, team, scorer) VALUES (?,?,?,?)",
                (m.provider_id, g.minute, g.team, g.scorer))
        self.conn.commit()
        return m.is_finished and not was_finished

    def save_matches(self, matches: list[Match]) -> list[Match]:
        newly_finished = []
        for m in matches:
            if self.upsert_match(m):
                newly_finished.append(m)
        return newly_finished

    def load_matches(self) -> list[Match]:
        out = []
        for r in self.conn.execute("SELECT * FROM matches"):
            stats = MatchStats(**json.loads(r["stats_json"] or "{}"))
            goals = [Goal(minute=g["minute"], team=g["team"], scorer=g["scorer"])
                     for g in self.conn.execute(
                         "SELECT * FROM goals WHERE match_id=?", (r["provider_id"],))]
            out.append(Match(
                provider_id=r["provider_id"], utc_date=r["utc_date"],
                competition=r["competition"], home_team=r["home_team"],
                away_team=r["away_team"], status=r["status"],
                home_goals=r["home_goals"], away_goals=r["away_goals"],
                stats=stats, goals=goals,
                home_xi=json.loads(r["home_xi_json"] or "[]"),
                away_xi=json.loads(r["away_xi_json"] or "[]"),
                lineup_posted_at=r["lineup_posted_at"],
                group=(r["group_name"] if "group_name" in r.keys() else None),
            ))
        return out

    # -- rankings ---------------------------------------------------------
    def save_rankings(self, rankings: list[FifaRank]):
        self.conn.execute("DELETE FROM fifa_rankings")
        for fr in rankings:
            self.conn.execute(
                "INSERT INTO fifa_rankings (team, rank, points, as_of) VALUES (?,?,?,?)",
                (fr.team, fr.rank, fr.points, fr.as_of))
        self.conn.commit()

    def load_rankings(self) -> list[FifaRank]:
        return [FifaRank(team=r["team"], rank=r["rank"], points=r["points"],
                         as_of=r["as_of"])
                for r in self.conn.execute("SELECT * FROM fifa_rankings")]

    # -- training runs ----------------------------------------------------
    def log_training_run(self, mode: str, fit, validation, engine: str = "dc",
                         extra_metrics: dict | None = None) -> int:
        """Log a run. ``fit`` is always the Dixon-Coles FitResult (kept for the
        interpretable Wald weights); ``validation`` is the PRIMARY engine's LOO
        report; ``engine`` records which engine is primary."""
        metrics = dict(validation.baselines)
        if extra_metrics:
            metrics.update(extra_metrics)
        cur = self.conn.execute(
            """INSERT INTO training_runs
                 (ts, mode, engine, n_matches, covariates, loglik, accuracy,
                  log_loss, brier, acc_ci_low, acc_ci_high, binomial_p,
                  beats_baselines, metrics_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (_now(), mode, engine, fit.n_matches, json.dumps(fit.covariates),
             fit.loglik, validation.accuracy, validation.log_loss,
             validation.brier, validation.acc_ci95[0], validation.acc_ci95[1],
             validation.binomial_p_vs_chance, int(validation.beats_all_baselines),
             json.dumps(metrics)),
        )
        run_id = cur.lastrowid
        for row in fit.wald_table():
            self.conn.execute(
                "INSERT INTO weights (run_id, name, coef, std_error, p_value) "
                "VALUES (?,?,?,?,?)",
                (run_id, row["parameter"], row["coef"], row["std_error"],
                 row["p_value"]))
        self.conn.commit()
        return run_id

    def training_history(self) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT * FROM training_runs ORDER BY id")]
