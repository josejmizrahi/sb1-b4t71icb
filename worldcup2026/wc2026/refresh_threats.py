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


GOALSCORERS_URL = ("https://raw.githubusercontent.com/martj42/"
                   "international_results/master/goalscorers.csv")


def _from_goalscorers(since_year: int = 2023, halflife_months: float = 18.0
                      ) -> dict[str, dict[str, float]]:
    """Per-team scorer threat from the full international-goals history
    (martj42). Each player's goals over recent years, recency-weighted (recent
    goals count more) -> who actually scores for each national team, not just
    who scored in this World Cup. Own goals excluded; penalties kept (penalty
    takers are reliable first scorers)."""
    import csv
    import datetime
    import io

    import requests

    txt = requests.get(GOALSCORERS_URL, timeout=90).text
    reader = csv.DictReader(io.StringIO(txt))
    today = datetime.date.today()
    threats: dict[str, dict[str, float]] = {}
    for row in reader:
        if (row.get("own_goal") or "").upper() == "TRUE":
            continue
        d = row.get("date") or ""
        if len(d) < 7 or d < f"{since_year}-01-01":
            continue
        scorer = (row.get("scorer") or "").strip()
        team = normalize(row.get("team"))
        if not scorer or not team:
            continue
        months_ago = (today.year - int(d[:4])) * 12 + (today.month - int(d[5:7]))
        w = 0.5 ** (max(0, months_ago) / halflife_months)
        # Penalty goals weigh extra: they flag the designated penalty taker, who
        # will take ANY penalty in the match and converts ~75% -> a reliable,
        # repeatable first-goal source.
        if (row.get("penalty") or "").upper() == "TRUE":
            w *= 2.0
        threats.setdefault(team, {})
        threats[team][scorer] = threats[team].get(scorer, 0.0) + w
    # keep only the meaningful threats per team (top ~12) to keep the file small
    out = {}
    for team, players in threats.items():
        top = sorted(players.items(), key=lambda kv: -kv[1])[:12]
        out[team] = {p: round(w, 3) for p, w in top}
    return out


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
    source = os.environ.get("SOURCE", "goalscorers").lower()
    if source == "balldontlie":
        threats = _from_balldontlie()
    elif source == "openfootball":
        threats = _from_openfootball()
    else:
        threats = _from_goalscorers()
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
