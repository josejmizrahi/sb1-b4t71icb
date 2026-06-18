"""World Cup 2026 predictor.

A reproducible, self-retraining football prediction system built around a
Dixon-Coles bivariate Poisson model. Methodological honesty over impressive
numbers: team strength is driven by *observable covariates* (FIFA ranking, and
xG when available) rather than free per-team attack/defence ratings, because a
World Cup gives only ~3 matches per team -- far too few to estimate ~2N free
parameters without gross overfitting.

See README.md, section "Limitaciones honestas".
"""

__version__ = "0.1.0"
