import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from wc2026 import fixtures
from wc2026.model import DixonColesModel
from wc2026.selection import select_covariates


@pytest.fixture(scope="session")
def rankings():
    return fixtures.fifa_ranking_snapshot()


@pytest.fixture(scope="session")
def matches():
    return fixtures.synthetic_world_cup(with_xg=False, seed=2026)


@pytest.fixture(scope="session")
def fitted_model(matches, rankings):
    sel = select_covariates(matches, rankings)
    model = DixonColesModel(sel.selected)
    model.fit(matches, rankings)
    return model
