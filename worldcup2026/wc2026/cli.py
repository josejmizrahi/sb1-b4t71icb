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


def _print_validation(v):
    print(f"\n[validacion LOO] n={v.n}")
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


def cmd_predict(args):
    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        result = pipe.run_once(n_sims=args.sims)
        _print_selection(result.selection)
        _print_wald(result.fit)
        _print_validation(result.validation)
        path = render_report(result, args.out)
        print(f"\n[reporte] HTML escrito en: {path}")
        print(f"[predicciones] {len(result.predictions)} partidos proximos.")
    finally:
        pipe.close()


def cmd_backtest(args):
    from .selection import select_covariates
    from .validation import leave_one_out

    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        pipe.ingest()
        matches = pipe.db.load_matches()
        rankings = pipe.db.load_rankings()
        sel = select_covariates(matches, rankings)
        _print_selection(sel)
        v = leave_one_out(matches, rankings, sel.selected, n_sims=args.sims)
        _print_validation(v)
    finally:
        pipe.close()


def cmd_pipeline(args):
    cfg = load_config()
    pipe = Pipeline(cfg)
    try:
        result = pipe.run_once(n_sims=args.sims)
        print(f"[pipeline] run #{result.run_id} mode={result.mode} "
              f"acc={result.validation.accuracy:.3f} "
              f"newly_finished={len(result.newly_finished)}")
        print("[historial de reentrenamientos]")
        for r in pipe.db.training_history():
            print(f"  run#{r['id']} {r['ts'][:19]} mode={r['mode']} "
                  f"n={r['n_matches']} acc={r['accuracy']:.3f} "
                  f"loglik={r['loglik']:.2f}")
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
                     ("pipeline", cmd_pipeline), ("watch", cmd_watch),
                     ("lineups", cmd_lineups)):
        sp = sub.add_parser(name)
        sp.add_argument("--sims", type=int, default=50_000,
                        help="Monte Carlo simulations per match")
        if name == "predict":
            sp.add_argument("--out", default="reports/report.html")
        if name == "watch":
            sp.add_argument("--cycles", type=int, default=None)
        sp.set_defaults(func=fn)
    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main(sys.argv[1:])
