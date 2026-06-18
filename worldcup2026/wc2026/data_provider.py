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
from .types import FifaRank, Match


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
            "  (DATA_PROVIDER=api-football o sportmonks). Ver .env.example.\n"
            + "=" * 72 + "\n"
        )
        return True
    return False
