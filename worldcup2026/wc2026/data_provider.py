"""DataProvider abstraction layer.

The rest of the codebase talks only to the :class:`DataProvider` interface, so
swapping vendors is a one-line env-var change (DATA_PROVIDER=...). Three concrete
backends are wired:

  * FootballDataOrgProvider  -- FREE, World Cup fixtures/results/standings, NO xG.
  * ApiFootballProvider      -- PAID, xG + lineups + stats.        (TODO: finish)
  * SportmonksProvider       -- PAID, xG + lineups + stats.        (TODO: finish)
  * MockProvider             -- offline synthetic data for dev/tests/demo.

`supports_xg` tells the model whether it may use the advanced engine or must
degrade to the reduced FIFA-only mode (and warn on the console).
"""
from __future__ import annotations

import abc
import warnings
from typing import Iterable

from .config import Config
from .types import FifaRank, Goal, Match, MatchStats


class DataProvider(abc.ABC):
    """Vendor-agnostic interface. Every backend returns normalized types."""

    name: str = "abstract"
    supports_xg: bool = False

    @abc.abstractmethod
    def get_matches(self, competition: str = "WC") -> list[Match]:
        """All known matches (scheduled + finished) for the competition."""

    @abc.abstractmethod
    def get_fifa_rankings(self) -> list[FifaRank]:
        """Current FIFA ranking for every team we care about."""

    def get_lineups(self, competition: str = "WC") -> list[Match]:
        """Matches that have an official starting XI published. Default: derive
        from get_matches; vendors with a dedicated endpoint can override."""
        return [m for m in self.get_matches(competition) if m.home_xi and m.away_xi]

    def get_standings(self, competition: str = "WC") -> list[dict]:
        """Group standings/points. Default: none (vendors override)."""
        return []

    def get_player_threats(self, competition: str = "WC") -> dict[str, dict[str, float]]:
        """{team: {player: attacking_threat}} from the real lineups that played.
        Default: empty (the pipeline falls back to goal scorers)."""
        return {}


# ---------------------------------------------------------------------------
# football-data.org  (FREE tier; no xG)
# ---------------------------------------------------------------------------
class FootballDataOrgProvider(DataProvider):
    """https://www.football-data.org/  -- free tier covers the World Cup.

    Free tier provides fixtures, scores, scorers (goals with minute) and
    standings, but NO xG / possession / passing. So ``supports_xg = False`` and
    the model will run in reduced mode.
    """

    name = "football-data"
    supports_xg = False
    BASE = "https://api.football-data.org/v4"
    # World Cup competition code on football-data.org.
    COMPETITION_CODE = "WC"

    def __init__(self, api_key: str | None):
        if not api_key:
            raise ValueError(
                "FOOTBALL_DATA_API_KEY is empty. Set it in your .env "
                "(see .env.example) or use DATA_PROVIDER=mock for offline runs."
            )
        self.api_key = api_key
        import requests  # local import keeps `requests` optional for mock/tests

        self._session = requests.Session()
        self._session.headers.update({"X-Auth-Token": api_key})

    def _get(self, path: str, **params):
        resp = self._session.get(f"{self.BASE}{path}", params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def get_matches(self, competition: str = "WC") -> list[Match]:
        code = competition or self.COMPETITION_CODE
        data = self._get(f"/competitions/{code}/matches")
        out: list[Match] = []
        for m in data.get("matches", []):
            score = m.get("score", {}).get("fullTime", {})
            goals = []
            # /matches list endpoint does not include goal-by-goal detail; we
            # enrich it lazily via _goals_for when needed (kept light here).
            out.append(
                Match(
                    provider_id=str(m["id"]),
                    utc_date=m.get("utcDate", ""),
                    competition=code,
                    home_team=(m.get("homeTeam") or {}).get("name") or "TBD",
                    away_team=(m.get("awayTeam") or {}).get("name") or "TBD",
                    status=m.get("status", "SCHEDULED"),
                    home_goals=score.get("home"),
                    away_goals=score.get("away"),
                    goals=goals,
                )
            )
        # NOTE: xG / possession / passing are intentionally left as None: this
        # provider does not expose them. That is what triggers reduced mode.
        return out

    def get_fifa_rankings(self) -> list[FifaRank]:
        # TODO: football-data.org does NOT publish the FIFA ranking. Options:
        #   (a) ingest a CSV snapshot of the official ranking (recommended), or
        #   (b) derive a proxy strength from the competition standings.
        # We deliberately do NOT invent numbers here -- callers must supply a
        # ranking snapshot (see wc2026/fixtures.py: FIFA_RANKING_SNAPSHOT) until
        # this is wired to a real source.
        warnings.warn(
            "football-data.org does not expose FIFA rankings; returning empty. "
            "Provide a ranking snapshot (see fixtures.FIFA_RANKING_SNAPSHOT) "
            "or implement a CSV ingest. [TODO]",
            stacklevel=2,
        )
        return []


# ---------------------------------------------------------------------------
# openfootball  (FREE, public domain, NO API key; no xG)
# ---------------------------------------------------------------------------
class OpenFootballProvider(DataProvider):
    """https://github.com/openfootball/worldcup.json

    Public-domain JSON, no key required. Gives the 2026 fixtures + results.
    No xG / possession / passing and no FIFA ranking -> reduced mode.
    """

    name = "openfootball"
    supports_xg = False
    URL = ("https://raw.githubusercontent.com/openfootball/worldcup.json/"
           "master/2026/worldcup.json")

    def __init__(self, url: str | None = None):
        self.url = url or self.URL
        import requests

        self._session = requests.Session()

    @staticmethod
    def _team_name(t) -> str:
        # team1/team2 may be a plain string or an object {name, code, key}
        if isinstance(t, dict):
            return t.get("name") or t.get("code") or t.get("key") or "TBD"
        return str(t) if t else "TBD"

    @staticmethod
    def _parse_minute(raw) -> int | None:
        """openfootball encodes stoppage time as '90+4'; map it to 94."""
        if raw is None:
            return None
        if isinstance(raw, int):
            return raw
        s = str(raw).strip()
        if not s:
            return None
        try:
            return sum(int(part) for part in s.split("+"))
        except ValueError:
            return None

    @classmethod
    def _goals(cls, raw_goals, team_name) -> list[Goal]:
        out = []
        for g in raw_goals or []:
            minute = cls._parse_minute(g.get("minute") or g.get("m"))
            if minute is None:
                continue
            out.append(Goal(minute=minute, team=team_name,
                            scorer=g.get("name") or g.get("player")))
        return out

    def get_matches(self, competition: str = "WC") -> list[Match]:
        data = self._session.get(self.url, timeout=30)
        data.raise_for_status()
        doc = data.json()

        # The schema nests matches under rounds[]; some snapshots expose a flat
        # "matches" list. Handle both.
        raw_matches = []
        if isinstance(doc.get("rounds"), list):
            for rnd in doc["rounds"]:
                for m in rnd.get("matches", []):
                    m = dict(m)
                    m.setdefault("round", rnd.get("name"))
                    raw_matches.append(m)
        else:
            raw_matches = doc.get("matches", [])

        out: list[Match] = []
        for i, m in enumerate(raw_matches):
            home = self._team_name(m.get("team1"))
            away = self._team_name(m.get("team2"))
            score = m.get("score") or {}
            ft = score.get("ft")  # [goals1, goals2] when played
            hg = ag = None
            status = "SCHEDULED"
            if isinstance(ft, (list, tuple)) and len(ft) == 2 and ft[0] is not None:
                hg, ag = int(ft[0]), int(ft[1])
                status = "FINISHED"
            goals = (self._goals(m.get("goals1"), home)
                     + self._goals(m.get("goals2"), away))
            goals.sort(key=lambda g: g.minute)
            out.append(Match(
                provider_id=str(m.get("num") or m.get("id") or f"OF-{i:03d}"),
                utc_date=f"{m.get('date','')}T{m.get('time','00:00')}",
                competition="WC", home_team=home, away_team=away,
                status=status, home_goals=hg, away_goals=ag, goals=goals,
                group=m.get("group") or m.get("round"),
            ))
        return out

    def get_fifa_rankings(self) -> list[FifaRank]:
        # openfootball does not carry the FIFA ranking.
        warnings.warn(
            "openfootball does not expose FIFA rankings; returning empty. The "
            "pipeline falls back to the ranking snapshot (fixtures). [TODO: "
            "ingest official ranking CSV]",
            stacklevel=2,
        )
        return []


# ---------------------------------------------------------------------------
# BALLDONTLIE FIFA World Cup  (PAID after 48h trial; HAS xG)
# ---------------------------------------------------------------------------
class BalldontlieProvider(DataProvider):
    """https://fifa.balldontlie.io/  (base: api.balldontlie.io/fifa/worldcup/v1)

    Cheapest provider with real xG (~$10/mo All-Star tier). Delivers fixtures,
    results, per-team match stats (xG, possession, shots, passes) and shot-level
    data (xG per shot, minute) -> activates the full engine.
    """

    name = "balldontlie"
    supports_xg = True
    BASE = "https://api.balldontlie.io/fifa/worldcup/v1"

    def __init__(self, api_key: str | None, fetch_shots: bool | None = None,
                 fetch_player_goals: bool | None = None,
                 min_request_interval: float = 0.0):
        if not api_key:
            raise ValueError("BALLDONTLIE_API_KEY is empty (see .env.example).")
        import os
        import requests

        # Proactive spacing between requests (seconds). 0 = off. Set to ~13s for
        # the trial tier (~5 req/min) to avoid 429s entirely (used by the
        # offline snapshot refresh, not by fast CI builds).
        self.min_request_interval = min_request_interval
        self._last_request_ts = 0.0

        # Shot-by-shot data (goal minutes) is heavy and, under the ~5 req/min
        # trial tier, very slow to paginate. Off by default; xG and all match
        # stats come from /team_match_stats regardless. Enable with
        # BALLDONTLIE_FETCH_SHOTS=true once on a higher rate limit.
        if fetch_shots is None:
            fetch_shots = (os.environ.get("BALLDONTLIE_FETCH_SHOTS", "false")
                           .strip().lower() in {"1", "true", "yes"})
        self.fetch_shots = fetch_shots
        # Player goal scorers (real names for the scorer prediction) come from
        # /player_match_stats + /players -- lighter than /match_shots. On by
        # default; disable with BALLDONTLIE_FETCH_PLAYER_GOALS=false.
        if fetch_player_goals is None:
            fetch_player_goals = (os.environ.get(
                "BALLDONTLIE_FETCH_PLAYER_GOALS", "true")
                .strip().lower() in {"1", "true", "yes"})
        self.fetch_player_goals = fetch_player_goals
        self._player_threats: dict[str, dict[str, float]] | None = None
        self._players_cache: dict[str, str] | None = None
        self._session = requests.Session()
        self._session.headers.update({"Authorization": api_key})

    def _request(self, path: str, params: dict, max_retries: int = 5):
        """GET with 429 backoff (the trial tier allows ~5 req/min) and a clear
        message when an endpoint is tier-gated (401)."""
        import time

        for attempt in range(max_retries):
            if self.min_request_interval > 0:
                wait = self.min_request_interval - (time.time() - self._last_request_ts)
                if wait > 0:
                    time.sleep(wait)
            self._last_request_ts = time.time()
            resp = self._session.get(f"{self.BASE}{path}", params=params,
                                     timeout=30)
            if resp.status_code == 429:
                wait = float(resp.headers.get("Retry-After", 12))
                time.sleep(min(wait, 60))
                continue
            if resp.status_code == 401:
                raise PermissionError(
                    f"BALLDONTLIE returned 401 for {path}. Your key authenticates "
                    "(e.g. /teams works) but this endpoint is gated behind a paid "
                    "tier. Activate the 48h GOAT trial or subscribe for the FIFA "
                    "World Cup sport to access matches/xG. See balldontlie.io.")
            resp.raise_for_status()
            return resp.json()
        raise RuntimeError(
            f"BALLDONTLIE rate limit (429) persisted for {path} after "
            f"{max_retries} retries. Trial tier is ~5 req/min; retry later or "
            "upgrade the plan.")

    def _get_all(self, path: str, **params) -> list[dict]:
        """Cursor-paginated GET. Returns the concatenated `data` arrays."""
        items: list[dict] = []
        cursor = None
        for _ in range(200):  # hard page cap as a safety valve
            p = dict(params, per_page=100)
            if cursor is not None:
                p["cursor"] = cursor
            body = self._request(path, p)
            items.extend(body.get("data", []))
            cursor = (body.get("meta") or {}).get("next_cursor")
            if not cursor:
                break
        return items

    @staticmethod
    def _team_name(t) -> str:
        if isinstance(t, dict):
            return t.get("name") or t.get("abbreviation") or "TBD"
        return str(t) if t else "TBD"

    def get_matches(self, competition: str = "WC") -> list[Match]:
        raw = self._get_all("/matches")
        # team-level stats keyed by match_id for xG/possession/shots/passes
        team_stats: dict[str, list[dict]] = {}
        try:
            for s in self._get_all("/team_match_stats"):
                team_stats.setdefault(str(s.get("match_id")), []).append(s)
        except Exception as e:  # stats are optional; matches still usable
            warnings.warn(f"team_match_stats unavailable ({e}); xG omitted.",
                          stacklevel=2)
        # shot-level data for goal minutes (shot_type == goal) — optional and
        # off by default because it is slow under the trial rate limit.
        shots_by_match: dict[str, list[dict]] = {}
        if self.fetch_shots:
            try:
                for sh in self._get_all("/match_shots"):
                    shots_by_match.setdefault(str(sh.get("match_id")), []).append(sh)
            except Exception:
                pass  # [TODO] confirm exact goal flag in match_shots

        # real goal scorers + per-team attacking threat from the lineups that
        # actually played (player stats) -> for the scorer prediction
        team_names = self._team_name_map(raw)
        goals_by_match, self._player_threats = self._build_player_data(team_names)

        out: list[Match] = []
        for m in raw:
            mid = str(m.get("id"))
            status = (m.get("status") or "").upper()
            home_g, away_g = m.get("home_score"), m.get("away_score")
            finished = status in {"FINISHED", "FULL_TIME", "FT", "COMPLETE",
                                   "COMPLETED"} or (
                home_g is not None and away_g is not None and status not in
                {"SCHEDULED", "NOT_STARTED", ""})
            goals = goals_by_match.get(mid)
            if not goals and self.fetch_shots:
                goals = self._build_goals(shots_by_match.get(mid, []), match_home=mid)
            match = Match(
                provider_id=mid,
                utc_date=m.get("datetime") or m.get("date") or "",
                competition="WC",
                home_team=self._team_name(m.get("home_team")),
                away_team=self._team_name(m.get("away_team")),
                status="FINISHED" if finished else "SCHEDULED",
                home_goals=home_g if finished else None,
                away_goals=away_g if finished else None,
                stats=self._build_stats(team_stats.get(mid, [])),
                goals=goals or [],
                group=m.get("group") or m.get("group_name"),
            )
            out.append(match)
        return out

    @staticmethod
    def _team_name_map(raw_matches: list[dict]) -> dict[str, str]:
        names: dict[str, str] = {}
        for m in raw_matches:
            for side in ("home_team", "away_team"):
                t = m.get(side)
                if isinstance(t, dict) and t.get("id") is not None:
                    names[str(t["id"])] = t.get("name") or t.get("abbreviation") or ""
        return names

    @staticmethod
    def _player_name(p: dict) -> str:
        if p.get("name"):
            return p["name"]
        parts = [p.get("first_name"), p.get("last_name")]
        return " ".join(x for x in parts if x).strip() or str(p.get("id"))

    def _build_player_data(self, team_names: dict[str, str]
                           ) -> tuple[dict[str, list[Goal]], dict[str, dict[str, float]]]:
        """From /player_match_stats build (a) real goal scorers per match and
        (b) per-team attacking threat for everyone who actually played (weighted
        by xG + goals). Names resolved via /players. Minute is unknown without
        /match_shots, so Goals carry minute=0 (used only for scorer aggregation)."""
        if not self.fetch_player_goals:
            return {}, {}
        try:
            rows = self._get_all("/player_match_stats")
        except Exception as e:
            warnings.warn(f"player_match_stats unavailable ({e}); no scorers.",
                          stacklevel=2)
            return {}, {}
        if not rows:
            return {}, {}
        if self._players_cache is None:
            try:
                self._players_cache = {str(p.get("id")): self._player_name(p)
                                       for p in self._get_all("/players")}
            except Exception:
                self._players_cache = {}
        players = self._players_cache

        goals_by_match: dict[str, list[Goal]] = {}
        threats: dict[str, dict[str, float]] = {}
        for r in rows:
            name = players.get(str(r.get("player_id")), str(r.get("player_id")))
            team = team_names.get(str(r.get("team_id")), str(r.get("team_id")))
            goals = int(r.get("goals") or 0)
            xg = float(r.get("expected_goals") or 0.0)
            played = (r.get("minutes_played") or 0) > 0 or goals > 0
            # scorers
            mid = str(r.get("match_id"))
            for _ in range(goals):
                goals_by_match.setdefault(mid, []).append(
                    Goal(minute=0, team=team, scorer=name))
            # attacking threat (real lineups): xG + goals, accumulated per player
            weight = xg + goals
            if played and weight > 0:
                threats.setdefault(team, {})
                threats[team][name] = threats[team].get(name, 0.0) + weight
        return goals_by_match, threats

    def get_player_threats(self, competition: str = "WC") -> dict[str, dict[str, float]]:
        if self._player_threats is None:
            self.get_matches(competition)
        return self._player_threats or {}


    @staticmethod
    def _build_stats(rows: list[dict]) -> MatchStats:
        home = next((r for r in rows if r.get("is_home")), None)
        away = next((r for r in rows if not r.get("is_home")), None)
        if not home or not away:
            return MatchStats()
        return MatchStats(
            xg_for=home.get("expected_goals"),
            xg_against=away.get("expected_goals"),
            possession_home=home.get("possession_pct"),
            possession_away=away.get("possession_pct"),
            shots_on_target_home=home.get("shots_on_target"),
            shots_on_target_away=away.get("shots_on_target"),
            passes_completed_home=home.get("passes_accurate"),
            passes_completed_away=away.get("passes_accurate"),
            pass_accuracy_home=_safe_ratio(home.get("passes_accurate"),
                                           home.get("passes_total")),
            pass_accuracy_away=_safe_ratio(away.get("passes_accurate"),
                                           away.get("passes_total")),
        )

    @staticmethod
    def _build_goals(shots: list[dict], match_home: str) -> list[Goal]:
        # [TODO] confirm the exact "is goal" flag; we accept shot_type == 'goal'.
        out = []
        for sh in shots:
            if str(sh.get("shot_type", "")).lower() == "goal":
                minute = sh.get("time_minute")
                if minute is not None:
                    out.append(Goal(minute=int(minute), team=str(sh.get("team_id")),
                                    scorer=str(sh.get("player_id"))))
        out.sort(key=lambda g: g.minute)
        return out

    def get_fifa_rankings(self) -> list[FifaRank]:
        # BALLDONTLIE FIFA does not expose the world ranking.
        warnings.warn(
            "BALLDONTLIE does not expose FIFA rankings; pipeline falls back to "
            "the ranking snapshot. [TODO: ingest official ranking]",
            stacklevel=2,
        )
        return []


def _safe_ratio(num, den):
    try:
        if num is None or not den:
            return None
        return round(100.0 * float(num) / float(den), 1)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Paid providers (stubs -- the engine is ready for xG the moment these land)
# ---------------------------------------------------------------------------
class ApiFootballProvider(DataProvider):
    name = "api-football"
    supports_xg = True

    def __init__(self, api_key: str | None):
        if not api_key:
            raise ValueError("API_FOOTBALL_KEY is empty (see .env.example).")
        self.api_key = api_key

    def get_matches(self, competition: str = "WC") -> list[Match]:
        # TODO: implement against https://www.api-football.com/ (v3 /fixtures,
        # /fixtures/statistics for xG/possession/shots/passes, /fixtures/lineups
        # for the official XI). Map into Match/MatchStats. Set stats.xg_* etc.
        raise NotImplementedError(
            "ApiFootballProvider is a stub. The model/engine already supports "
            "xG; only this ingestion mapping remains. [TODO]"
        )

    def get_fifa_rankings(self) -> list[FifaRank]:
        raise NotImplementedError("ApiFootballProvider.get_fifa_rankings [TODO]")


class SportmonksProvider(DataProvider):
    name = "sportmonks"
    supports_xg = True

    def __init__(self, token: str | None):
        if not token:
            raise ValueError("SPORTMONKS_API_TOKEN is empty (see .env.example).")
        self.token = token

    def get_matches(self, competition: str = "WC") -> list[Match]:
        # TODO: implement against Sportmonks "All-In" plan (fixtures + xG +
        # lineups + statistics includes). [TODO]
        raise NotImplementedError("SportmonksProvider is a stub. [TODO]")

    def get_fifa_rankings(self) -> list[FifaRank]:
        raise NotImplementedError("SportmonksProvider.get_fifa_rankings [TODO]")


# ---------------------------------------------------------------------------
# Mock provider -- deterministic synthetic data so the whole pipeline runs
# offline, with NO API key, for development, tests and the demo report.
# ---------------------------------------------------------------------------
class MockProvider(DataProvider):
    name = "mock"

    def __init__(self, supports_xg: bool = False, seed: int = 2026):
        # Defaults to NO xG so the demo exercises the reduced (FIFA-only) path,
        # matching a football-data.org-only setup. Flip supports_xg=True to
        # exercise the full engine end-to-end.
        self.supports_xg = supports_xg
        self.seed = seed
        self._matches: list[Match] | None = None

    def _build(self):
        from . import fixtures

        if self._matches is None:
            self._matches = fixtures.synthetic_world_cup(
                with_xg=self.supports_xg, seed=self.seed
            )
        return self._matches

    def get_matches(self, competition: str = "WC") -> list[Match]:
        return list(self._build())

    def get_fifa_rankings(self) -> list[FifaRank]:
        from . import fixtures

        return fixtures.fifa_ranking_snapshot()


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------
def make_provider(cfg: Config) -> DataProvider:
    p = cfg.data_provider
    if p == "football-data":
        return FootballDataOrgProvider(cfg.football_data_api_key)
    if p == "openfootball":
        return OpenFootballProvider()
    if p == "balldontlie":
        return BalldontlieProvider(cfg.balldontlie_key)
    if p == "api-football":
        return ApiFootballProvider(cfg.api_football_key)
    if p == "sportmonks":
        return SportmonksProvider(cfg.sportmonks_token)
    if p == "mock":
        return MockProvider(supports_xg=cfg.has_xg_provider)
    raise ValueError(f"Unknown DATA_PROVIDER={p!r}")


def warn_if_reduced_mode(provider: DataProvider) -> bool:
    """Emit the required console warning when running without xG. Returns True
    if reduced mode is active."""
    if not provider.supports_xg:
        print(
            "\n" + "=" * 72 + "\n"
            "  AVISO: operando en MODO REDUCIDO (solo-FIFA).\n"
            f"  El proveedor '{provider.name}' no entrega xG ni stats avanzadas.\n"
            "  El motor usa unicamente el ranking FIFA como senal predictiva.\n"
            "  Para activar el motor completo configura un proveedor con xG\n"
            "  (DATA_PROVIDER=balldontlie ~$10/mes, api-football o sportmonks).\n"
            "  Ver .env.example.\n"
            + "=" * 72 + "\n"
        )
        return True
    return False
