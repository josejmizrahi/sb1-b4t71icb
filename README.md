# Predictor Mundial 2026

Sistema de predicción del Mundial 2026 en Python: reproducible, auto-entrenable,
con honestidad metodológica por encima de resultados impresionantes.

El proyecto vive en [`worldcup2026/`](worldcup2026/) — empieza por su
[README](worldcup2026/README.md).

```bash
cd worldcup2026
pip install -r requirements.txt

# Demo offline sin API key:
DATA_PROVIDER=mock python -m wc2026.cli predict --out reports/report.html

# Datos reales gratis (sin xG):
DATA_PROVIDER=openfootball python -m wc2026.cli predict

# Datos reales con xG (BALLDONTLIE):
DATA_PROVIDER=balldontlie python -m wc2026.cli predict --engine auto

python -m pytest -q   # tests
```

Motor base **Dixon-Coles** + motor **ML** (gradient boosting Poisson), comparados
honestamente out-of-sample en cada run. Ver la sección "Limitaciones honestas"
del README del proyecto.
