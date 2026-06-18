"""Offline tests for the data-provider abstraction and the new backends.

No network: we exercise the pure parsing/mapping helpers and the factory.
"""
import pytest

from wc2026.config import Config
from wc2026.data_provider import (
    BalldontlieProvider, MockProvider, OpenFootballProvider, make_provider,
)


def _cfg(provider, **kw):
    base = dict(
        data_provider=provider, football_data_api_key=None, api_football_key=None,
        sportmonks_token=None, balldontlie_key=None, storage_backend="sqlite",
        sqlite_path=":memory:", supabase_url=None, supabase_key=None,
        poll_interval_hours=6, mc_simulations=1000, engine="ml",
    )
    base.update(kw)
    return Config(**base)


def test_factory_resolves_backends():
    assert make_provider(_cfg("openfootball")).name == "openfootball"
    assert make_provider(_cfg("mock")).name == "mock"
    assert make_provider(_cfg("balldontlie", balldontlie_key="x")).name == "balldontlie"


def test_balldontlie_requires_key():
    with pytest.raises(ValueError):
        make_provider(_cfg("balldontlie"))


def test_openfootball_team_name_handles_str_and_dict():
    assert OpenFootballProvider._team_name({"name": "Argentina"}) == "Argentina"
    assert OpenFootballProvider._team_name("Brazil") == "Brazil"
    assert OpenFootballProvider._team_name(None) == "TBD"


def test_openfootball_parses_stoppage_time_minute():
    # '90+4' -> 94 ; plain ints pass through; junk -> None
    assert OpenFootballProvider._parse_minute("90+4") == 94
    assert OpenFootballProvider._parse_minute("45+2") == 47
    assert OpenFootballProvider._parse_minute(23) == 23
    assert OpenFootballProvider._parse_minute("foo") is None


def test_openfootball_goals_mapping():
    goals = OpenFootballProvider._goals(
        [{"name": "Messi", "minute": "90+1"}, {"name": "Di Maria", "minute": 12}],
        "Argentina")
    assert {g.minute for g in goals} == {91, 12}
    assert all(g.team == "Argentina" for g in goals)


def test_balldontlie_stats_builder():
    rows = [
        {"is_home": True, "expected_goals": 1.8, "possession_pct": 58,
         "shots_on_target": 6, "passes_accurate": 430, "passes_total": 480},
        {"is_home": False, "expected_goals": 0.9, "possession_pct": 42,
         "shots_on_target": 3, "passes_accurate": 300, "passes_total": 360},
    ]
    st = BalldontlieProvider._build_stats(rows)
    assert st.xg_for == 1.8 and st.xg_against == 0.9
    assert st.possession_home == 58
    assert st.pass_accuracy_home == pytest.approx(89.6, abs=0.1)
    # missing rows -> empty stats (None xG -> reduced mode), no crash
    assert BalldontlieProvider._build_stats([]).xg_for is None


def test_mock_provider_supports_xg_flag():
    # default mock = reduced (no xG); explicit flag flips it
    assert MockProvider(supports_xg=False).supports_xg is False
    assert MockProvider(supports_xg=True).supports_xg is True


def test_team_name_normalize_aliases():
    from wc2026.teamnames import normalize, normalize_keys
    assert normalize("Czech Republic") == normalize("Czechia")
    assert normalize("USA") == normalize("United States")
    assert normalize("Türkiye") == normalize("Turkey")
    assert normalize("Bosnia & Herzegovina") == normalize("Bosnia and Herzegovina")
    out = normalize_keys({"Czech Republic": {"X": 1.0}})
    assert "czechia" in out
