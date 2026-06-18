"""Team-name normalization, so data from different providers (openfootball uses
"Czech Republic", BALLDONTLIE uses "Czechia", etc.) lines up. Used to key the
scorer-threat snapshot and to look it up during prediction."""
from __future__ import annotations

import unicodedata

# Canonical aliases: variant -> canonical token (already normalized form).
_ALIASES = {
    "czech republic": "czechia",
    "korea republic": "south korea",
    "republic of korea": "south korea",
    "turkey": "turkiye",
    "ivory coast": "cote divoire",
    "cote d ivoire": "cote divoire",
    "united states": "usa",
    "united states of america": "usa",
    "bosnia and herzegovina": "bosnia herzegovina",
    "bosnia & herzegovina": "bosnia herzegovina",
    "dr congo": "congo dr",
    "democratic republic of the congo": "congo dr",
    "iran islamic republic of": "iran",
    "korea dpr": "north korea",
}


def normalize(name: str | None) -> str:
    if not name:
        return ""
    # strip accents, lowercase, drop punctuation, collapse whitespace
    s = unicodedata.normalize("NFKD", str(name))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", " and ")
    s = "".join(c if c.isalnum() or c.isspace() else " " for c in s)
    s = " ".join(s.split())
    return _ALIASES.get(s, s)


def normalize_keys(threats: dict) -> dict:
    """Return a copy of a {team: {...}} dict with team keys normalized."""
    out: dict = {}
    for team, val in (threats or {}).items():
        out[normalize(team)] = val
    return out
