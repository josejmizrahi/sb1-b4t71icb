"""Self-contained interactive HTML report.

Renders, with no external assets:
  * model mode (full / reduced) and an honesty banner,
  * the variable-selection table (correlation, Lasso coef, kept vs dropped),
  * the Wald table (coef, std error, p-value) for the fitted weights,
  * validation metrics with the bootstrap CI and baseline comparison,
  * per-match predictions: 1X2, most-likely score, goal-total distribution
    (bar chart), O/U, BTTS, and the first-goal minute + likely scorers,
  * a descriptive layer for covariates that did NOT enter the engine.
"""
from __future__ import annotations

import html
import json
from datetime import datetime, timezone

from .pipeline import PipelineResult


def _fmt(x, nd=3):
    try:
        if x != x:  # NaN
            return "n/a"
        return f"{x:.{nd}f}"
    except Exception:
        return str(x)


def render_report(result: PipelineResult, path: str = "reports/report.html") -> str:
    import os

    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    cmp = result.comparison
    payload = {
        "mode": result.mode,
        "engine": result.engine,
        "comparison": None if cmp is None else {
            "winner": cmp.winner,
            "dc": {"accuracy": cmp.dc.accuracy, "log_loss": cmp.dc.log_loss,
                   "brier": cmp.dc.brier, "beats": cmp.dc.beats_all_baselines},
            "ml": {"accuracy": cmp.ml.accuracy, "log_loss": cmp.ml.log_loss,
                   "brier": cmp.ml.brier, "beats": cmp.ml.beats_all_baselines},
            "notes": cmp.notes,
        },
        "ml_importance": (None if result.ml_fit is None
                          else result.ml_fit.importances[:12]),
        "standings": result.standings or [],
        "descriptive": result.descriptive or {},
        "selection": {
            "selected": result.selection.selected,
            "dropped": result.selection.dropped,
            "cap": result.selection.cap,
            "n_matches": result.selection.n_matches,
            "method": result.selection.method,
            "correlations": result.selection.correlations,
            "lasso_coefs": result.selection.lasso_coefs,
            "notes": result.selection.notes,
        },
        "wald": result.fit.wald_table(),
        "validation": {
            "n": result.validation.n,
            "accuracy": result.validation.accuracy,
            "log_loss": result.validation.log_loss,
            "brier": result.validation.brier,
            "acc_ci95": result.validation.acc_ci95,
            "baselines": result.validation.baselines,
            "binomial_p": result.validation.binomial_p_vs_chance,
            "beats_all_baselines": result.validation.beats_all_baselines,
            "notes": result.validation.notes,
        },
        "predictions": result.predictions,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    html_str = _TEMPLATE.replace("__DATA__", json.dumps(payload))
    with open(path, "w", encoding="utf-8") as f:
        f.write(html_str)
    return path


_TEMPLATE = r"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Predictor Mundial 2026 - Reporte</title>
<style>
  :root{--bg:#0f1216;--card:#181d24;--ink:#e8edf2;--mut:#9aa7b4;--acc:#36c;--ok:#2e9e5b;--warn:#d8a23a;--bad:#d05454}
  *{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink)}
  .wrap{max-width:1100px;margin:0 auto;padding:24px}
  h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:28px 0 10px;border-bottom:1px solid #2a323c;padding-bottom:6px}
  .mut{color:var(--mut)}.card{background:var(--card);border:1px solid #232a33;border-radius:10px;padding:16px;margin:12px 0}
  .banner{padding:12px 16px;border-radius:10px;margin:12px 0;font-weight:600}
  .banner.full{background:#10301f;color:#7fe0a6;border:1px solid #1c5a38}
  .banner.reduced{background:#332a12;color:#f0d18a;border:1px solid #5a4a1c}
  table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:7px 10px;text-align:left;border-bottom:1px solid #232a33}
  th{color:var(--mut);font-weight:600}.sig{color:var(--ok);font-weight:600}.nsig{color:var(--mut)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:#222a33;color:var(--mut);margin:2px 4px 2px 0}
  .bar{height:14px;background:var(--acc);border-radius:3px}
  .bars div{display:flex;align-items:center;gap:8px;margin:3px 0}.bars .lab{width:34px;color:var(--mut);font-size:12px}
  .x2{display:flex;height:22px;border-radius:5px;overflow:hidden;margin:6px 0}
  .x2 span{display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff}
  .h{background:#2e6fd0}.d{background:#6b7480}.a{background:#c0603a}
  .kpi{font-size:22px;font-weight:700}.small{font-size:12px}
  code{background:#222a33;padding:1px 5px;border-radius:4px}
</style></head><body><div class="wrap" id="root"></div>
<script>
const D = __DATA__;
const pct = x => (x==null||isNaN(x))?'n/a':(100*x).toFixed(1)+'%';
const f = (x,n=3) => (x==null||isNaN(x))?'n/a':Number(x).toFixed(n);
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let H='';
H += `<h1>Predictor Mundial 2026</h1><div class="mut">Generado ${esc(D.generated_at)} &middot; motor: <b>${D.mode==='full'?'COMPLETO (con xG)':'REDUCIDO (solo-FIFA)'}</b></div>`;
H += D.mode==='full'
  ? `<div class="banner full">Motor completo: usa xG y ranking FIFA. Motor primario: <b>${esc((D.engine||'dc').toUpperCase())}</b>.</div>`
  : `<div class="banner reduced">MODO REDUCIDO: sin xG disponible. El motor usa solo el ranking FIFA. Techo de acierto 1X2 realista ~52-55%, no 80%. Motor primario: <b>${esc((D.engine||'dc').toUpperCase())}</b>.</div>`;

// Engine comparison
if(D.comparison){const c=D.comparison;
  H+=`<h2>Comparacion de motores (out-of-sample, LOO)</h2><div class="card">
      <table><tr><th>Motor</th><th>Acierto 1X2</th><th>Log-loss</th><th>Brier</th><th>&gt; baselines</th></tr>
      <tr><td>Dixon-Coles</td><td>${pct(c.dc.accuracy)}</td><td>${f(c.dc.log_loss)}</td><td>${f(c.dc.brier)}</td><td class="${c.dc.beats?'sig':'nsig'}">${c.dc.beats?'si':'no'}</td></tr>
      <tr><td>ML (Gradient Boosting)</td><td>${pct(c.ml.accuracy)}</td><td>${f(c.ml.log_loss)}</td><td>${f(c.ml.brier)}</td><td class="${c.ml.beats?'sig':'nsig'}">${c.ml.beats?'si':'no'}</td></tr>
      </table>
      <div class="small" style="margin-top:6px">Ganador por log-loss (menor=mejor): <b>${esc(c.winner.toUpperCase())}</b></div>`;
  if(c.notes&&c.notes.length){H+=`<div class="small mut" style="margin-top:6px">`+c.notes.map(esc).join('<br>')+`</div>`;}
  H+=`</div>`;
}

// ML feature importance
if(D.ml_importance){
  H+=`<h2>ML: importancia por permutacion <span class="mut small">(relativa; con muestra chica, caveat)</span></h2><div class="card"><div class="bars">`;
  const mx=Math.max(...D.ml_importance.map(r=>Math.abs(r.importance)),1e-9);
  for(const r of D.ml_importance){
    H+=`<div><span class="lab" style="width:150px">${esc(r.feature)}</span><div class="bar" style="width:${Math.round(220*Math.abs(r.importance)/mx)}px"></div><span class="small mut">${f(r.importance,4)}</span></div>`;
  }
  H+=`</div></div>`;
}

// Validation
const v=D.validation;
H+=`<h2>Validacion honesta (leave-one-out, n=${v.n})</h2><div class="card grid">`;
H+=`<div><div class="mut small">Acierto 1X2</div><div class="kpi">${pct(v.accuracy)}</div>
    <div class="small mut">IC95% bootstrap: ${pct(v.acc_ci95[0])} – ${pct(v.acc_ci95[1])}</div></div>`;
H+=`<div><div class="mut small">Log-loss</div><div class="kpi">${f(v.log_loss)}</div>
    <div class="small mut">Brier: ${f(v.brier)}</div></div>`;
H+=`<div><div class="mut small">Test binomial vs azar</div><div class="kpi">p=${f(v.binomial_p)}</div>
    <div class="small mut">${v.binomial_p<0.05?'Supera el azar (5%)':'NO supera el azar de forma significativa'}</div></div>`;
H+=`</div>`;
H+=`<div class="card"><b>Baselines</b><table><tr><th>Modelo</th><th>Acierto</th></tr>
    <tr><td>Nuestro modelo</td><td>${pct(v.accuracy)}</td></tr>`;
for(const k in v.baselines){H+=`<tr><td>${esc(k)}</td><td>${pct(v.baselines[k])}</td></tr>`;}
H+=`</table><div class="small ${v.beats_all_baselines?'sig':'nsig'}">${v.beats_all_baselines?'Supera a todos los baselines.':'No supera a todos los baselines (reportado sin maquillar).'}</div>`;
if(v.notes&&v.notes.length){H+=`<div class="small mut">`+v.notes.map(esc).join('<br>')+`</div>`;}
H+=`</div>`;

// Variable selection
const s=D.selection;
H+=`<h2>Seleccion de variables por evidencia</h2><div class="card">`;
H+=`<div class="small mut">Metodo: <code>${esc(s.method)}</code> &middot; n=${s.n_matches} &middot; tope (regla &le;1 var/10 partidos): <b>${s.cap}</b></div>`;
H+=`<div style="margin:8px 0">En el motor: `+(s.selected.length?s.selected.map(c=>`<span class="pill" style="background:#1c3a2a;color:#7fe0a6">${esc(c)}</span>`).join(''):'<i>ninguna</i>');
H+=`<br>Capa descriptiva (fuera del motor): `+(s.dropped.length?s.dropped.map(c=>`<span class="pill">${esc(c)}</span>`).join(''):'<i>ninguna</i>')+`</div>`;
H+=`<table><tr><th>Covariable</th><th>corr. (r)</th><th>p (corr)</th><th>coef Lasso</th><th>Estado</th></tr>`;
for(const c of s.candidates||Object.keys(s.correlations)){
  const cor=s.correlations[c]||{}; const lc=s.lasso_coefs[c];
  const inEngine=s.selected.includes(c);
  H+=`<tr><td>${esc(c)}</td><td>${f(cor.r,2)}</td><td>${f(cor.p,3)}</td><td>${f(lc,3)}</td>
      <td class="${inEngine?'sig':'nsig'}">${inEngine?'MOTOR':'descriptiva'}</td></tr>`;
}
H+=`</table>`;
if(s.notes&&s.notes.length){H+=`<div class="small mut" style="margin-top:8px">`+s.notes.map(esc).join('<br>')+`</div>`;}
H+=`</div>`;

// Wald
H+=`<h2>Pesos estimados por MLE (test de Wald)</h2><div class="card"><table>
    <tr><th>Parametro</th><th>coef</th><th>error est.</th><th>z</th><th>p-value</th><th>signif. 5%</th></tr>`;
for(const r of D.wald){
  H+=`<tr><td>${esc(r.parameter)}</td><td>${f(r.coef)}</td><td>${f(r.std_error)}</td>
      <td>${f(r.z,2)}</td><td>${f(r.p_value,3)}</td>
      <td class="${r.significant_5pct?'sig':'nsig'}">${r.significant_5pct?'si':'no'}</td></tr>`;
}
H+=`</table></div>`;

// Group standings
if(D.standings && D.standings.length){
  const byG={};
  for(const s of D.standings){const g=s.group||'-'; (byG[g]=byG[g]||[]).push(s);}
  H+=`<h2>Puntos por grupo</h2><div class="grid">`;
  for(const g of Object.keys(byG).sort()){
    const rows=byG[g].sort((a,b)=>(b.points||0)-(a.points||0)||((b.gd||0)-(a.gd||0)));
    H+=`<div class="card"><b>Grupo ${esc(g)}</b><table>
        <tr><th>Equipo</th><th>PJ</th><th>Pts</th><th>DG</th></tr>`;
    for(const r of rows){H+=`<tr><td>${esc(r.team||'')}</td><td>${r.played??''}</td>
        <td><b>${r.points??''}</b></td><td>${r.gd??''}</td></tr>`;}
    H+=`</table></div>`;
  }
  H+=`</div>`;
}

// Predictions
H+=`<h2>Predicciones por partido (${D.predictions.length})</h2><div class="grid">`;
for(const p of D.predictions){
  const fg=p.first_goal;
  H+=`<div class="card"><b>${esc(p.home_team)} vs ${esc(p.away_team)}</b>
      <div class="small mut">${esc(p.utc_date)} &middot; &lambda; ${f(p.lam_home,2)} / ${f(p.lam_away,2)}</div>
      <div class="x2"><span class="h" style="width:${Math.max(8,100*p.prob_home)}%">${pct(p.prob_home)}</span>
      <span class="d" style="width:${Math.max(8,100*p.prob_draw)}%">${pct(p.prob_draw)}</span>
      <span class="a" style="width:${Math.max(8,100*p.prob_away)}%">${pct(p.prob_away)}</span></div>
      <div class="small mut">Local / Empate / Visita</div>
      <div style="margin-top:8px">Marcadores mas probables (MC): `+
      Object.entries(p.score_probs).slice(0,3).map(([sc,pr],i)=>
        `<b>${esc(sc)}</b> <span class="small mut">${pct(pr)}</span>`).join(' &middot; ')+`</div>
      <div class="small mut">Goles totales</div><div class="bars">`;
  for(const k of ['0','1','2','3','4+']){const val=p.total_goals_dist[k]||0;
    H+=`<div><span class="lab">${k}</span><div class="bar" style="width:${Math.round(220*val)}px"></div><span class="small mut">${pct(val)}</span></div>`;}
  H+=`</div><div class="small" style="margin-top:6px">
      Over 2.5: <b>${pct(p.over_2_5)}</b> &middot; Under: <b>${pct(p.under_2_5)}</b> &middot; BTTS: <b>${pct(p.btts)}</b></div>
      <div class="small mut" style="margin-top:8px">1er gol ~ min <b>${f(fg.expected_minute,1)}</b> (mediana ${f(fg.median_minute,0)}) &middot; sin gol: ${pct(fg.p_no_goal)}</div>
      <div class="small">Probable anotador <span class="mut">(por goles en el torneo)</span>: `+
      (fg.likely_scorers||[]).slice(0,3).map(x=>`${esc(x.player)} (${pct(x.prob)})`).join(', ')+`</div></div>`;
}
H+=`</div>`;
// Descriptive layer (stats NOT in the engine: possession, shots, passes)
if(D.descriptive && Object.keys(D.descriptive).length){
  const rows=Object.entries(D.descriptive).sort((a,b)=>b[1].xg_attack-a[1].xg_attack);
  H+=`<h2>Capa descriptiva <span class="mut small">(promedios por equipo; NO entran al motor)</span></h2>
      <div class="card"><div class="small mut">Posesion, tiros a puerta y precision de pase son utiles para leer el partido, pero el Lasso los descarta del motor por ser redundantes con el xG. Aqui visibles, fuera del predictor.</div>
      <table><tr><th>Equipo</th><th>xG/p</th><th>Goles/p</th><th>Posesion%</th><th>Tiros p.</th><th>Pase%</th></tr>`;
  for(const [t,s] of rows){H+=`<tr><td>${esc(t)}</td><td>${f(s.xg_attack,2)}</td>
      <td>${f(s.goal_attack,2)}</td><td>${f(s.possession,1)}</td>
      <td>${f(s.shots_on_target,1)}</td><td>${f(s.pass_accuracy,1)}</td></tr>`;}
  H+=`</table></div>`;
}

H+=`<h2 class="mut">Nota metodologica</h2><div class="card small mut">
  La fuerza de cada seleccion es funcion de covariables observables (ranking FIFA, xG cuando existe),
  no parametros libres por equipo: con ~3 partidos por equipo no se pueden estimar ~2N ratings sin sobreajustar.
  Las probabilidades 1X2 suman 1 por construccion (Monte Carlo sobre la pmf conjunta Dixon-Coles).</div>`;

document.getElementById('root').innerHTML=H;
</script></body></html>"""
