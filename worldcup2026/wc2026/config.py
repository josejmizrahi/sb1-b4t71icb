"""Central configuration. All secrets are read from environment variables
(optionally via a local .env file) -- never hardcoded.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv

    load_dotenv()  # loads .env from CWD if present; no-op otherwise
except Exception:  # pragma: no cover - dotenv is optional at runtime
    pass


@dataclass(frozen=True)
class Config:
    data_provider: str
    football_data_api_key: str | None
    api_football_key: str | None
    sportmonks_token: str | None
    balldontlie_key: str | None
    storage_backend: str
    sqlite_path: str
    supabase_url: str | None
    supabase_key: str | None
    poll_interval_hours: float
    mc_simulations: int
    engine: str                 # 'ml' | 'dc' | 'auto'

    @property
    def has_xg_provider(self) -> bool:
        """True when the configured provider can deliver xG / advanced stats.

        football-data.org and openfootball cannot; that triggers reduced mode.
        """
        return self.data_provider in {"api-football", "sportmonks", "balldontlie"}


def _get(name: str, default: str | None = None) -> str | None:
    val = os.environ.get(name, default)
    if val is not None:
        val = val.strip()
    return val or default


def load_config() -> Config:
    return Config(
        data_provider=_get("DATA_PROVIDER", "mock") or "mock",
        football_data_api_key=_get("FOOTBALL_DATA_API_KEY"),
        api_football_key=_get("API_FOOTBALL_KEY"),
        sportmonks_token=_get("SPORTMONKS_API_TOKEN"),
        balldontlie_key=_get("BALLDONTLIE_API_KEY"),
        storage_backend=_get("STORAGE_BACKEND", "sqlite") or "sqlite",
        sqlite_path=_get("SQLITE_PATH", "worldcup2026.db") or "worldcup2026.db",
        supabase_url=_get("SUPABASE_URL"),
        supabase_key=_get("SUPABASE_KEY"),
        poll_interval_hours=float(_get("POLL_INTERVAL_HOURS", "6") or "6"),
        mc_simulations=int(_get("MC_SIMULATIONS", "50000") or "50000"),
        engine=(_get("ENGINE", "ml") or "ml").lower(),
    )
