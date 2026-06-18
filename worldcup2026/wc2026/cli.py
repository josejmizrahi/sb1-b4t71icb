"""Command-line entry point.

  python -m wc2026.cli predict     # fit + predict upcoming + write HTML report
  python -m wc2026.cli backtest    # leave-one-out validation against baselines
  python -m wc2026.cli pipeline    # one auto-training cycle (ingest->fit->valid)
  python -m wc2026.cli watch       # daemon: re-run every POLL_INTERVAL_HOURS
  python -m wc2026.cli lineups     # check for official XIs and recompute

Provider/storage come from the environment (.env). With no API key configured,
set DATA_PROVIDER=mock for an offline end-to-end demo.
"""
from __future__ import annotations

import argparse
import os
import sys

from .config import load_config
from .pipeline import Pipeline
from .report import render_report


def _print_selection(sel):
    print(f"\n[seleccion] metodo={sel.method} n={sel.n_matches} "
          f"cap(<=1/10)={sel.cap}")
    print(f"  motor      : {sel.selected or '(ninguna)'}")
    print(f"  descriptiva: {sel.dropped or '(ninguna)'}")
    for c in sel.candidates:
        cor = sel.correlations.get(c, {})
        print(f"    - {c:18s} r={cor.get('r',float('nan')):+.2f} "
              f"p={cor.get('p',float('nan')):.3f} "
              f"lasso={sel.lasso_coefs.get(c,0):+.3f}")
    for n in sel.notes:
        print(f"  nota: {n}")


def _print_wald(fit):
    print("\n[pesos MLE] (test de Wald)")
    print(f"  {'param':18s} {'coef':>9s} {'se':>9s} {'z':>7s} {'p':>8s}  sig")
    for r in fit.wald_table():
        print(f"  {r['parameter']:18s} {r['coef']:9.3f} {r['std_error']:9.3f} "
              f"{r['z']:7.2f} {r['p_value']:8.3f}  "
              f"{'*' if r['significant_5pct'] else ''}")


def _print_validation(v, label="validacion LOO"):
    print(f"\n[{label}] n={v.n}")
    print(f"  acierto 1X2 : {v.accuracy:.3f}  IC95% [{v.acc_ci95[0]:.3f}, {v.acc_ci95[1]:.3f}]")
    print(f"  log-loss    : {v.log_loss:.3f}   Brier: {v.brier:.3f}")
    print(f"  binomial p  : {v.binomial_p_vs_chance:.3f} "
          f"({'supera azar' if v.binomial_p_vs_chance < 0.05 else 'NO supera azar signif.'})")
    print("  baselines:")
    for k, val in v.baselines.items():
        print(f"    - {k:18s}: {val:.3f}")
    print(f"  {'SUPERA' if v.beats_all_baselines else 'NO supera'} a todos los baselines.")
    for n in v.notes:
        print(f"  nota: {n}")


def _print_comparison(cmp):
    if cmp is None:
        return
    print("\n[comparacion de motores] (out-of-sample, LOO)")
    print(f"  {'motor':14s} {'acierto':>8s} {'log-loss':>9s} {'Brier':>7s}")
    print(f"  {'Dixon-Coles':14s} {cmp.dc.accuracy:8.3f} {cmp.dc.log_loss:9.3f} {cmp.dc.brier:7.3f}")
    print(f"  {'ML (GBM)':14s} {cmp.ml.accuracy:8.3f} {cmp.ml.log_loss:9.3f} {cmp.ml.brier:7.3f}")
    print(f"  ganador (menor log-loss): {cmp.winner.upper()}")
    for n in cmp.notes:
        print(f"  nota: {n}")


def _print_ml_importance(ml_fit):
    if ml_fit is None:
        return
    print("\n[ML] importancia por permutacion (relativa; con muestra chica, caveat)")
    for row in ml_fit.importances[:10]:
        print(f"    - {row['feature']:20s} {row['importance']:+.4f} "
              f"(+/-{row['std']:.4f})")
    for n in ml_fit.notes:
        print(f"  nota: {n}")


def cmd_predict(args):
    if getattr(args, "engine", None):
        os.environ["ENGINE"] = args.engine
    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        result = pipe.run_once(n_sims=args.sims)
        _print_selection(result.selection)
        _print_wald(result.fit)
        _print_comparison(result.comparison)
        _print_ml_importance(result.ml_fit)
        _print_validation(result.validation,
                          label=f"validacion motor PRIMARIO ({result.engine})")
        path = render_report(result, args.out)
        print(f"\n[motor primario] {result.engine.upper()}")
        print(f"[reporte] HTML escrito en: {path}")
        print(f"[predicciones] {len(result.predictions)} partidos proximos.")
    finally:
        pipe.close()


def cmd_backtest(args):
    from .selection import select_covariates
    from .validation import compare_engines

    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        pipe.ingest()
        matches = pipe.db.load_matches()
        rankings = pipe.db.load_rankings()
        sel = select_covariates(matches, rankings)
        _print_selection(sel)
        cmp = compare_engines(matches, rankings, sel.selected, n_sims=args.sims)
        _print_validation(cmp.dc, label="LOO Dixon-Coles")
        _print_validation(cmp.ml, label="LOO ML (GBM)")
        _print_comparison(cmp)
    finally:
        pipe.close()


def cmd_simulate_j1(args):
    from .selection import select_covariates
    from .model import CANDIDATE_COVARIATES, build_team_values
    from .validation import simulate_matchday, incremental_variable_analysis

    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        pipe.ingest()
        matches = pipe.db.load_matches()
        rankings = pipe.db.load_rankings()
        sel = select_covariates(matches, rankings)

        # 1. simulate each played match (LOO) vs the REAL result
        rows = simulate_matchday(matches, rankings, sel.selected, n_sims=args.sims)
        hits = sum(r["correct"] for r in rows)
        print(f"\n[simulacion jornada (LOO) vs resultados reales]  "
              f"motor={sel.selected}")
        print(f"  {'partido':38s} {'pred':>5s} {'real':>5s}  {'1X2 pred (H/D/A)':>20s}  ok")
        for r in rows:
            ps = f"{r['pred_score'][0]}-{r['pred_score'][1]}"
            as_ = f"{r['actual_score'][0]}-{r['actual_score'][1]}"
            p = r["pred_probs"]
            print(f"  {r['home'][:18]:18s} v {r['away'][:17]:17s} {ps:>5s} {as_:>5s}  "
                  f"{p['H']:.2f}/{p['D']:.2f}/{p['A']:.2f}  "
                  f"{'Y' if r['correct'] else '.'}")
        print(f"  -> acierto outcome: {hits}/{len(rows)} = {hits/len(rows):.3f}")

        # 2. which EXTRA variables actually explain the real results (OOS)
        tv = build_team_values(matches, rankings)
        cands = [c for c in CANDIDATE_COVARIATES if c != "rank_strength"]
        if not tv.has_xg:
            cands = [c for c in cands if c == "goal_attack"]
        inc = incremental_variable_analysis(
            matches, rankings, base=["rank_strength"], candidates=cands,
            n_sims=max(4000, args.sims // 3))
        print(f"\n[valor incremental de variables] base=['rank_strength']  "
              f"log-loss base={inc.base_log_loss:.3f} acc={inc.base_accuracy:.3f}")
        print(f"  {'variable':18s} {'log-loss':>9s} {'d_ll':>7s} {'acc':>6s} {'d_acc':>7s}  explica?")
        for c, v in sorted(inc.variables.items(), key=lambda kv: kv[1]["d_log_loss"]):
            print(f"  {c:18s} {v['log_loss']:9.3f} {v['d_log_loss']:+7.3f} "
                  f"{v['accuracy']:6.3f} {v['d_acc']:+7.3f}  "
                  f"{'SI' if v['helps'] else 'no (redundante)'}")
        for n in inc.notes:
            print(f"  nota: {n}")
    finally:
        pipe.close()


def cmd_quiniela(args):
    if getattr(args, "engine", None):
        os.environ["ENGINE"] = args.engine
    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        from .quiniela import build_quiniela
        result = pipe.run_once(n_sims=args.sims, generate_predictions=True)
        q = build_quiniela(result.predictions, matchday_size=args.next)
        print(f"\n[QUINIELA] picks que MAXIMIZAN puntos esperados "
              f"(motor={result.engine}, modo={result.mode})")
        print(f"  proximos {len(q['picks'])} partidos  |  "
              f"puntos esperados totales: {q['total_expected_points']:.1f}\n")
        hdr = (f"  {'partido':36s} {'marcador':>8s} {'1er equipo':>14s} "
               f"{'1er goleador':>20s} {'E[pts]':>7s}")
        print(hdr)
        for p in q["picks"]:
            sc = f"{p['pick_score'][0]}-{p['pick_score'][1]}"
            scorer = (p["first_scorer"] or "-")[:19]
            print(f"  {p['home_team'][:16]:16s} v {p['away_team'][:16]:16s} "
                  f"{sc:>8s} {p['first_team'][:14]:>14s} {scorer:>20s} "
                  f"{p['expected_points']:7.2f}")
        bs, bc = q.get("booster_safe"), q.get("booster_climber")
        if bs:
            print(f"\n  >> BOOSTER x2 SEGURO: {bs['home_team']} vs {bs['away_team']}"
                  f"  (E[pts]={bs['expected_points']:.2f} x2 = {2*bs['expected_points']:.1f})")
        if bc:
            side = "gana visita" if bc["underdog_outcome"] == "A" else "gana local"
            print(f"  >> BOOSTER x2 REMONTADA: {bc['home_team']} vs {bc['away_team']}"
                  f"  ({side} {bc['p_underdog']:.0%}, E[pts] underdog={bc['ep_underdog']:.2f}"
                  f" x2 = {2*bc['ep_underdog']:.1f}; mas varianza, mas upside)")
        if q["underdog_candidates"]:
            print("\n  >> Jugadas UNDERDOG para diferenciarte (+3 si <=10% del grupo):")
            for u in q["underdog_candidates"]:
                side = "gana visita" if u["underdog_outcome"] == "A" else "gana local"
                sc = f"{u['underdog_pick_score'][0]}-{u['underdog_pick_score'][1]}"
                print(f"     {u['home_team']} vs {u['away_team']}: {side} {sc} "
                      f"(modelo {u['p_underdog']:.0%}, E[pts]={u['ep_underdog']:.1f})")
        print("\n  nota: el marcador elegido NO es el mas probable, sino el que "
              "maximiza puntos esperados bajo el tablero de la quiniela.")
    finally:
        pipe.close()


def cmd_pipeline(args):
    if getattr(args, "engine", None):
        os.environ["ENGINE"] = args.engine
    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        result = pipe.run_once(n_sims=args.sims)
        print(f"[pipeline] run #{result.run_id} mode={result.mode} "
              f"engine={result.engine} acc={result.validation.accuracy:.3f} "
              f"newly_finished={len(result.newly_finished)}")
        _print_comparison(result.comparison)
        print("\n[historial de reentrenamientos]")
        for r in pipe.db.training_history():
            print(f"  run#{r['id']} {r['ts'][:19]} mode={r['mode']} "
                  f"engine={r['engine']} n={r['n_matches']} "
                  f"acc={r['accuracy']:.3f} loglik={r['loglik']:.2f}")
    finally:
        pipe.close()


def cmd_watch(args):
    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        pipe.watch(max_cycles=args.cycles)
    finally:
        pipe.close()


def cmd_lineups(args):
    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        rec = pipe.check_lineups(n_sims=args.sims)
        if not rec:
            print("[lineups] No hay XIs oficiales publicados "
                  "(football-data.org no expone alineaciones). [TODO]")
        for r in rec:
            print(f"  {r['home_team']} vs {r['away_team']}: "
                  f"{r['most_likely_score']} (override={r['override']})")
    finally:
        pipe.close()


def main(argv=None):
    p = argparse.ArgumentParser(prog="wc2026")
    sub = p.add_subparsers(dest="cmd", required=True)
    for name, fn in (("predict", cmd_predict), ("backtest", cmd_backtest),
                     ("simulate-j1", cmd_simulate_j1), ("quiniela", cmd_quiniela),
                     ("pipeline", cmd_pipeline), ("watch", cmd_watch),
                     ("lineups", cmd_lineups)):
        sp = sub.add_parser(name)
        sp.add_argument("--sims", type=int, default=50_000,
                        help="Monte Carlo simulations per match")
        if name in ("predict", "pipeline", "quiniela"):
            sp.add_argument("--engine", choices=["ml", "dc", "auto"], default=None,
                            help="Primary engine (default from ENGINE env, 'ml')")
        if name == "quiniela":
            sp.add_argument("--next", type=int, default=16,
                            help="How many upcoming matches (next matchday)")
        if name == "predict":
            sp.add_argument("--out", default="reports/report.html")
        if name == "watch":
            sp.add_argument("--cycles", type=int, default=None)
        sp.set_defaults(func=fn)
    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main(sys.argv[1:])
