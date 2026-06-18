"""Official FIFA ranking ingest.

Priority order when the pipeline asks for rankings:
  1. A CSV you provide via FIFA_RANKING_CSV (columns: team,rank[,points]).
  2. The bundled snapshot below (covers the 48 likely WC-2026 participants).

The bundled values are approximate (early-2026 ballpark) and clearly marked as
a placeholder -- replace with the official date-stamped snapshot or a CSV. We do
NOT invent FIFA points; `points` stays None unless your CSV supplies it.
"""
from __future__ import annotations

import csv
import os

from .types import FifaRank

# Approximate FIFA ranking covering the expected 48-team WC-2026 field plus a
# few extras that show up in openfootball sample data. TODO: replace with the
# official snapshot (or set FIFA_RANKING_CSV).
_SNAPSHOT: list[tuple[str, int]] = [
    ("Argentina", 1), ("France", 2), ("Spain", 3), ("England", 4),
    ("Brazil", 5), ("Portugal", 6), ("Netherlands", 7), ("Belgium", 8),
    ("Italy", 9), ("Germany", 10), ("Croatia", 11), ("Morocco", 12),
    ("Colombia", 13), ("Uruguay", 14), ("USA", 15), ("United States", 15),
    ("Mexico", 16), ("Switzerland", 17), ("Senegal", 18), ("Japan", 19),
    ("Denmark", 20), ("Iran", 21), ("Serbia", 22), ("Ecuador", 23),
    ("South Korea", 24), ("Korea Republic", 24), ("Australia", 25),
    ("Poland", 26), ("Ukraine", 27), ("Nigeria", 28), ("Sweden", 29),
    ("Austria", 30), ("Canada", 31), ("Wales", 32), ("Egypt", 33),
    ("Panama", 34), ("Peru", 35), ("Czech Republic", 36), ("Czechia", 36),
    ("Norway", 37), ("Tunisia", 38), ("Costa Rica", 39), ("Ghana", 40),
    ("Algeria", 41), ("Scotland", 42), ("Cameroon", 43), ("Paraguay", 44),
    ("Ivory Coast", 45), ("Cote d'Ivoire", 45), ("Mali", 46),
    ("Saudi Arabia", 56), ("Qatar", 58), ("Jamaica", 53), ("South Africa", 60),
    ("Honduras", 76), ("New Zealand", 95), ("Bolivia", 85), ("Venezuela", 54),
    ("Turkey", 26), ("Turkiye", 26), ("Hungary", 30), ("Romania", 47),
    ("Greece", 48), ("Chile", 49), ("Slovakia", 50), ("Uzbekistan", 57),
    ("Jordan", 64), ("UAE", 65), ("Iraq", 58), ("Cape Verde", 70),
]


def default_snapshot() -> list[FifaRank]:
    seen: set[str] = set()
    out: list[FifaRank] = []
    for team, rank in _SNAPSHOT:
        if team in seen:
            continue
        seen.add(team)
        out.append(FifaRank(team=team, rank=rank, points=None,
                            as_of="PLACEHOLDER-2026"))
    return out


def load_from_csv(path: str) -> list[FifaRank]:
    """Load an official ranking CSV. Expected headers: team,rank[,points]."""
    out: list[FifaRank] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            team = (row.get("team") or row.get("Team") or "").strip()
            rank = row.get("rank") or row.get("Rank")
            if not team or rank is None:
                continue
            pts = row.get("points") or row.get("Points")
            out.append(FifaRank(
                team=team, rank=int(float(rank)),
                points=float(pts) if pts not in (None, "") else None,
                as_of=row.get("as_of") or "CSV",
            ))
    return out


def get_rankings() -> list[FifaRank]:
    """Resolve rankings: CSV (if FIFA_RANKING_CSV set) else bundled snapshot."""
    csv_path = os.environ.get("FIFA_RANKING_CSV", "").strip()
    if csv_path and os.path.exists(csv_path):
        rows = load_from_csv(csv_path)
        if rows:
            return rows
    return default_snapshot()
