"""Refresh the committed per-team player-threat snapshot used for the first-goal
scorer prediction.

Run this when new matches have been played (e.g. after a matchday):

    python -m wc2026.refresh_threats                 # from openfootball (free)
    SOURCE=balldontlie BALLDONTLIE_API_KEY=... python -m wc2026.refresh_threats

Default source is openfootball, which carries the REAL goal scorers (names) for
each played match -- free, no key, no rate limit. It writes data/player_threats.json
keyed by NORMALIZED team name, so the page/pipeline (whatever provider it uses)
can look it up. BALLDONTLIE mode weights by per-player xG instead of goal counts.
"""
from __future__ import annotations

import json
import os

from .teamnames import normalize

OUT = os.path.join(os.path.dirname(__file__), "data", "player_threats.json")


def _from_openfootball() -> dict[str, dict[str, float]]:
    from .data_provider import OpenFootballProvider
    from .temporal import build_scorer_threats

    matches = OpenFootballProvider().get_matches()
    raw = build_scorer_threats(matches)          # {team: {scorer: goals}}
    return {normalize(team): players for team, players in raw.items()}


def _from_balldontlie() -> dict[str, dict[str, float]]:
    from .data_provider import BalldontlieProvider

    key = os.environ.get("BALLDONTLIE_API_KEY")
    interval = float(os.environ.get("BDL_REQUEST_INTERVAL", "1"))
    prov = BalldontlieProvider(key, fetch_player_goals=True,
                               min_request_interval=interval)
    raw = prov.get_player_threats()
    return {normalize(team): players for team, players in raw.items()}


def main() -> int:
    source = os.environ.get("SOURCE", "openfootball").lower()
    threats = _from_balldontlie() if source == "balldontlie" else _from_openfootball()
    if not threats:
        print(f"No player threats from {source}.")
        return 2
    rounded = {team: {p: round(w, 3) for p, w in players.items()}
               for team, players in threats.items()}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rounded, f, ensure_ascii=False, indent=0, sort_keys=True)
    n = sum(len(v) for v in rounded.values())
    print(f"Wrote {OUT} from {source}: {len(rounded)} teams, {n} players.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
