# Predictor Mundial 2026 ⚽📊

Sistema de predicción de resultados del Mundial 2026 en Python: **reproducible**,
**auto-entrenable** y con **honestidad metodológica por encima de números
impresionantes**. Modelo base **Dixon-Coles** (Poisson bivariado con corrección
de dependencia para marcadores bajos), pesos por **máxima verosimilitud**,
marcador exacto por **Monte Carlo** (50.000 simulaciones) y validación por
**leave-one-out** contra baselines.

> **Para el CFO, en una frase:** no inflamos la precisión. Con pocos partidos el
> techo realista de acierto 1X2 ronda **52–55 %**, no 80 %. El sistema te dice
> cuándo *no* le gana a un baseline tonto.

---

## Decisión metodológica central (léela antes que el código)

Un Dixon-Coles clásico estima un parámetro de **ataque** y otro de **defensa por
equipo**: ~2·N parámetros libres. Un Mundial da **~3 partidos por equipo**, así
que estimar ~96 ratings (48 equipos) con ~24–48 partidos es sobreajuste puro.

**Lo que hacemos en su lugar:** la fuerza de cada selección es **función de
covariables observables** (ranking FIFA, y xG cuando el proveedor lo entrega),
no un parámetro libre por equipo:

```
log(λ_local)   = μ + ventaja_local + Σ_c β_c · (v_c[local] − v_c[visita])
log(λ_visita)  = μ                 − Σ_c β_c · (v_c[local] − v_c[visita])
```

Así el motor tiene **3 parámetros estructurales** (μ, ventaja_local, ρ) **+ 1 β
por cada covariable seleccionada**, respetando la regla dura de **≤ 1 variable
por cada ~10 partidos de entrenamiento**.

---

## Dos motores, comparados honestamente

El sistema corre **dos motores** y los compara **out-of-sample** (LOO) en cada run:

- **Dixon-Coles** (paramétrico, ≤2-3 variables, robusto con muestra chica).
- **ML avanzado** (gradient boosting Poisson regularizado, motor primario por
  defecto `ENGINE=ml`): estima λ de cada equipo desde un set ampliado de
  variables (rank, xG ataque/defensa, posesión, tiros, pases, forma) y alimenta
  el **mismo** Monte Carlo + corrección Dixon-Coles, así que produce idénticos
  marcadores/distribuciones/1X2/O/U/BTTS.

El que se despliega lo decides con `ENGINE` (`ml` | `dc` | `auto`). **Pase lo que
pase, el reporte muestra la comparación**: acierto, log-loss y Brier de ambos, y
quién gana por log-loss (regla de scoring propia). El ML se entrena sobre filas
**por equipo-partido** (duplica la muestra) y con regularización fuerte (árboles
someros, L2, early stopping) — aun así, **con pocos partidos puede sobreajustar y
perder contra el Dixon-Coles**; el sistema lo dice sin maquillar.

## Estructura

| Archivo | Rol |
|---|---|
| `wc2026/data_provider.py` | Abstracción `DataProvider` + backends (football-data.org, openfootball, BALLDONTLIE, API-Football*, Sportmonks*, mock) |
| `wc2026/model.py` | Dixon-Coles + MLE + Monte Carlo + shrinkage |
| `wc2026/ml_model.py` | Motor ML avanzado: gradient boosting Poisson regularizado |
| `wc2026/features.py` | Ingeniería de variables (filas por equipo-partido, xG/forma) |
| `wc2026/fifa_ranking.py` | Ranking FIFA: ingest CSV + snapshot de 48 selecciones |
| `wc2026/selection.py` | Selección de variables por evidencia (correlación + Lasso/ElasticNet + cap) |
| `wc2026/validation.py` | Backtest LOO, baselines, bootstrap, test binomial |
| `wc2026/temporal.py` | Primer gol (Poisson inhomogéneo con pausas de hidratación) |
| `wc2026/pipeline.py` | Orquestación / scheduler / job de alineaciones |
| `wc2026/report.py` | Reporte HTML interactivo autocontenido |
| `wc2026/db.py` | Persistencia SQLite (dataset, pesos, log de reentrenamientos) |
| `wc2026/cli.py` | CLI: `predict`, `backtest`, `pipeline`, `watch`, `lineups` |

`*` = stub listo para enchufar (el motor ya soporta xG; solo falta el mapeo de ingesta).

---

## Configurar las API keys

Las claves se leen de variables de entorno (`.env`), **nunca hardcodeadas**.

```bash
cd worldcup2026
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # y edita .env
```

En `.env`:

```ini
# Proveedor de datos
DATA_PROVIDER=football-data            # football-data | api-football | sportmonks | mock
FOOTBALL_DATA_API_KEY=tu_clave_aqui    # https://www.football-data.org/client/register (gratis)

# Persistencia
STORAGE_BACKEND=sqlite
SQLITE_PATH=worldcup2026.db
```

| Proveedor (`DATA_PROVIDER`) | Costo | Key | xG | Modo |
|---|---|---|---|---|
| `football-data` | Gratis | sí | ❌ | reducido |
| `openfootball` | Gratis | **no** | ❌ | reducido |
| `balldontlie` | ~$10/mes (trial 48h) | sí | ✅ | **completo** |
| `api-football` | De pago | sí | ✅ | completo (`TODO` ingesta) |
| `sportmonks` | De pago | sí | ✅ | completo (`TODO` ingesta) |
| `mock` | Gratis | no | opcional | demo offline |

- **football-data.org** / **openfootball** (gratis): fixtures + resultados, **sin
  xG**. El sistema **degrada elegantemente a modo reducido (solo-FIFA)** y lo
  **avisa en consola**. `openfootball` ni siquiera requiere key (dominio público).
- **BALLDONTLIE** (de pago, la opción **más barata con xG**): aporta xG,
  posesión, tiros y pases por partido → **activa el motor completo**.
- **API-Football / Sportmonks** (de pago): mismas capacidades, mapeo `TODO`.
- **mock**: dataset sintético offline para correr todo **sin ninguna API key**.

> Ningún proveedor (ni de pago) entrega el **ranking FIFA** limpio. Hasta
> enchufar un CSV oficial, el pipeline cae al snapshot placeholder de
> `fixtures.py` (marcado `TODO`).

> **Nota:** football-data.org **no publica el ranking FIFA**. Hasta enchufar un
> CSV oficial, el ranking sale de `wc2026/fixtures.py` (`FIFA_RANKING_SNAPSHOT`,
> marcado `TODO: reemplazar por snapshot oficial`). No inventamos puntos FIFA.

---

## Correr una predicción

```bash
# Demo offline sin API key (modo reducido sintético, end-to-end):
DATA_PROVIDER=mock python -m wc2026.cli predict --out reports/report.html

# Datos reales GRATIS (sin xG, modo reducido):
DATA_PROVIDER=openfootball python -m wc2026.cli predict --out reports/report.html

# Datos reales CON xG (motor completo, requiere key):
DATA_PROVIDER=balldontlie python -m wc2026.cli predict --sims 50000

# Elegir motor explícitamente (ml | dc | auto):
python -m wc2026.cli predict --engine auto
```

Imprime selección de variables, tabla de Wald (coef, error estándar, p-value),
métricas de validación, y escribe un **HTML interactivo** con 1X2, marcador más
probable (Monte Carlo), distribución de goles totales, over/under, BTTS, minuto
del primer gol y anotador probable, más la capa descriptiva.

## Correr el backtest

```bash
DATA_PROVIDER=mock python -m wc2026.cli backtest --sims 20000
```

Leave-one-out CV con comparación **siempre** contra baselines (azar, mejor
ranqueado FIFA, local), IC95 % por bootstrap (1000 remuestreos) y test binomial
vs azar (p-value sin maquillar).

## Auto-entrenamiento en tiempo real

```bash
python -m wc2026.cli pipeline           # un ciclo: ingesta → MLE → re-valida → log
python -m wc2026.cli watch              # daemon: repite cada POLL_INTERVAL_HOURS
python -m wc2026.cli lineups            # detecta XI oficial y recalcula ese partido
```

Cada ciclo guarda en SQLite el histórico de reentrenamientos (fecha, nº partidos,
pesos, métricas) para ver cómo **evoluciona la confianza** a medida que entran
partidos.

## Tests

```bash
python -m pytest -q
```

Cubren: que las probabilidades **sumen 1**, que el **shrinkage** funcione, que el
**marcador simulado sea coherente con λ**, los dips post-pausa del modelo
temporal, la selección de variables (cap y redundancia) y la validación.

---

## Limitaciones honestas

Esta sección no es decorativa: es el punto del proyecto.

1. **Muestra minúscula.** Fase de grupos = ~3 partidos por equipo. Cualquier
   métrica tiene un intervalo de confianza **ancho**: lo mostramos (bootstrap),
   no lo escondemos. Un acierto puntual de 65 % puede tener IC95 % [46 %, 81 %].

2. **Techo realista de acierto 1X2: ~52–55 %, no 80 %.** El fútbol tiene
   muchísimo ruido y el empate es difícil. Quien te prometa 80 % está
   sobreajustando o midiendo mal.

3. **A veces NO le ganamos a los baselines, y lo decimos.** Si "gana el mejor
   ranqueado FIFA" acierta más que el modelo, el reporte lo dice en su cara. Con
   datos donde el ranking lo explica casi todo, ese baseline es casi un oráculo.

4. **Modo reducido (solo football-data.org).** Sin xG, la única señal real es el
   ranking FIFA. El modelo funciona, pero su poder predictivo es limitado por
   construcción. El xG es lo que más mueve la aguja.

5. **Pocas variables a propósito.** Regla dura ≤ 1 variable/10 partidos. Con 24
   partidos, **máximo 2–3** en el motor. Posesión/pases suelen ser **redundantes
   con xG** (lo verificamos con Lasso, no lo asumimos) y van a la capa
   descriptiva, fuera del motor predictivo.

6. **Shrinkage agresivo en la "forma reciente".** Con 1–2 partidos por equipo, la
   forma observada se encoge fuertemente hacia el promedio. Un 5-0 aislado no
   convierte a un equipo en favorito.

7. **Ventaja de localía ≈ 0 en sede neutral.** El Mundial es casi todo en cancha
   neutral (salvo anfitriones USA/MEX/CAN). El parámetro existe pero suele salir
   no significativo; no lo fuerces.

8. **Datos sintéticos en el demo.** `DATA_PROVIDER=mock` usa un dataset
   **sintético, claramente etiquetado**, generado por un proceso conocido para
   ejercitar la maquinaria offline. No son partidos reales.

9. **El ML "avanzado" NO es automáticamente mejor.** Medido sobre los 24
   partidos reales ya jugados del 2026 en modo reducido (solo rank), el gradient
   boosting cayó a **33% de acierto (= azar) y perdió contra el Dixon-Coles y
   contra todos los baselines**. Con muestra chica y poca señal, más capacidad de
   modelo = más sobreajuste. El ML solo aporta cuando hay variables con señal real
   (xG vía BALLDONTLIE) y aun así el reporte muestra la comparación honesta y
   despliega el mejor out-of-sample si usas `ENGINE=auto`.

---

## Integración externa

Si se conecta un servicio externo, se prefiere **JSON-RPC sobre XML-RPC**.
Persistencia por defecto **SQLite**; **Supabase** queda como backend opcional
(`STORAGE_BACKEND=supabase`, `TODO`) con la misma superficie de métodos.
