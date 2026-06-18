"""Refresh the committed per-team player-threat snapshot used for the first-goal
scorer prediction.

Run this when new matches have been played (e.g. after a matchday):

    BALLDONTLIE_API_KEY=... python -m wc2026.refresh_threats

It pulls /player_match_stats + /players from BALLDONTLIE and writes
data/player_threats.json. The page/pipeline then reads this snapshot instead of
hitting the slow, rate-limited player API on every CI build.
"""
from __future__ import annotations

import json
import os

from .data_provider import BalldontlieProvider

OUT = os.path.join(os.path.dirname(__file__), "data", "player_threats.json")


def main() -> int:
    key = os.environ.get("BALLDONTLIE_API_KEY")
    if not key:
        print("BALLDONTLIE_API_KEY not set; cannot refresh.")
        return 1
    # Pace requests (~13s apart) to stay under the trial's ~5 req/min and avoid
    # 429 storms, so the full player fetch completes deterministically.
    interval = float(os.environ.get("BDL_REQUEST_INTERVAL", "13"))
    prov = BalldontlieProvider(key, fetch_player_goals=True,
                               min_request_interval=interval)
    threats = prov.get_player_threats()
    if not threats:
        print("No player threats fetched (rate limit or no data).")
        return 2
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    # round weights to keep the file small
    rounded = {team: {p: round(w, 3) for p, w in players.items()}
               for team, players in threats.items()}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rounded, f, ensure_ascii=False, indent=0, sort_keys=True)
    n_players = sum(len(v) for v in rounded.values())
    print(f"Wrote {OUT}: {len(rounded)} teams, {n_players} players.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
