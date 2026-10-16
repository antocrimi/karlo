/* Pure functions for the METAR back-test. No network here, so they can be
   tested against fixtures. Used by backtest.js and backtest.test.js. */
"use strict";

const LEVELS = ["cloud_cover_1000hPa", "cloud_cover_975hPa", "cloud_cover_950hPa", "cloud_cover_925hPa"];
const CEIL_FT = 2500;       /* 760 m, the height of the top pressure level Karl samples */
const VIS_KM = 5;           /* Karl calls anything under 5 km not clear */
const SM_PER_KM = 0.621371;

/* IEM asos.py CSV (format=onlycomma): station,valid,skyc1..4,skyl1..4,vsby,metar */
function parseIem(text) {
  const lines = text.split(/\r?\n/).filter(l => l && l[0] !== "#");
  if (!lines.length) return [];
  const head = lines[0].split(",");
  const ix = n => head.indexOf(n);
  const need = ["station", "valid", "skyc1", "skyl1", "vsby"];
  for (const n of need) if (ix(n) < 0) throw new Error("IEM header lacks " + n + ": " + lines[0].slice(0, 200));
  const out = [];
  for (let r = 1; r < lines.length; r++) {
    const c = lines[r].split(",");
    const t = Date.parse(c[ix("valid")].replace(" ", "T") + "Z");
    if (isNaN(t)) continue;
    const layers = [];
    for (let k = 1; k <= 4; k++) {
      const cov = c[ix("skyc" + k)], ft = parseFloat(c[ix("skyl" + k)]);
      if (cov && cov !== "M") layers.push({ cov, ft: isNaN(ft) ? null : ft });
    }
    const v = parseFloat(c[ix("vsby")]);
    out.push({ station: c[ix("station")], t, layers, vsbyMi: isNaN(v) ? null : v });
  }
  return out;
}

/* Lowest broken, overcast or vertical-visibility layer, in feet, or null for none. */
function ceilingFt(layers) {
  let best = null;
  for (const l of layers) {
    if ((l.cov === "BKN" || l.cov === "OVC" || l.cov === "VV") && l.ft != null)
      if (best === null || l.ft < best) best = l.ft;
  }
  return best;
}

/* One METAR per model hour: the one nearest the hour, within 35 minutes. */
function pairHours(obs, model) {
  const byHour = new Map();
  for (const o of obs) {
    const h = Math.round(o.t / 3600000) * 3600;
    const d = Math.abs(o.t / 1000 - h);
    if (d > 35 * 60) continue;
    const cur = byHour.get(h);
    if (!cur || d < cur.d) byHour.set(h, { d, o });
  }
  const pairs = [];
  for (let i = 0; i < model.time.length; i++) {
    const hit = byHour.get(model.time[i]);
    if (!hit) continue;
    const m = {};
    for (const k of Object.keys(model)) m[k] = model[k][i];
    pairs.push({ t: model.time[i], obs: hit.o, m });
  }
  return pairs;
}

const lowPressure = m => {
  let mx = null;
  for (const k of LEVELS) if (m[k] != null) mx = mx === null ? m[k] : Math.max(mx, m[k]);
  return mx;
};

/* Truth and predictions. Each predicate returns true, false, or null when the
   needed field is missing, and null pairs are left out of the tally. */
const truthLayer = p => (p.obs.layers.length === 0 && p.obs.vsbyMi == null) ? null : (ceilingFt(p.obs.layers) !== null && ceilingFt(p.obs.layers) <= CEIL_FT);
const predLevels = th => p => { const v = lowPressure(p.m); return v === null ? null : v >= th; };
const predLow = th => p => p.m.cloud_cover_low == null ? null : p.m.cloud_cover_low >= th;
/* Any broken or overcast layer at any height: the proxy truth for total cloud cover. */
const truthAny = p => p.obs.layers.length === 0 ? null : p.obs.layers.some(l => l.cov === "BKN" || l.cov === "OVC" || l.cov === "VV");
const predTotal = th => p => p.m.cloud_cover == null ? null : p.m.cloud_cover >= th;
const truthVis = p => p.obs.vsbyMi == null ? null : p.obs.vsbyMi < VIS_KM * SM_PER_KM;
const predVis = p => p.m.visibility == null ? null : p.m.visibility < VIS_KM * 1000;

function tally(pairs, pred, truth) {
  const c = { hit: 0, miss: 0, fa: 0, cn: 0 };
  for (const p of pairs) {
    const a = pred(p), b = truth(p);
    if (a === null || b === null) continue;
    if (b) c[a ? "hit" : "miss"]++; else c[a ? "fa" : "cn"]++;
  }
  return c;
}
const total = c => c.hit + c.miss + c.fa + c.cn;
const pct = (n, d) => d ? Math.round(100 * n / d) : null;
function stats(c) {
  return { n: total(c), obsYes: c.hit + c.miss, acc: pct(c.hit + c.cn, total(c)),
           pod: pct(c.hit, c.hit + c.miss), far: pct(c.fa, c.hit + c.fa) };
}

/* How often a METAR layer was there, by the model's own cover (reliability). */
function calibration(pairs, edges) {
  const rows = edges.slice(0, -1).map((lo, i) => ({ lo, hi: edges[i + 1], n: 0, yes: 0 }));
  for (const p of pairs) {
    const v = lowPressure(p.m), t = truthLayer(p);
    if (v === null || t === null) continue;
    const r = rows.find(x => v >= x.lo && v < x.hi) || (v >= edges[edges.length - 1] ? rows[rows.length - 1] : null);
    if (!r) continue;
    r.n++; if (t) r.yes++;
  }
  return rows;
}
const calRow = r => "| " + r.lo + " to " + (r.hi - 1) + " | " + r.n + " | " + (r.n ? Math.round(100 * r.yes / r.n) + "%" : "-") + " |";
const CAL_HEAD = "| model cover | hours | METAR layer present |\n|---|---|---|";

const fmt = v => v === null ? "-" : String(v);
function localHour(t) {
  return +new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }).format(t * 1000) % 24;
}
function localMonth(t) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" }).format(t * 1000);
}
function row(label, c) {
  const s = stats(c);
  return "| " + label + " | " + s.n + " | " + s.obsYes + " | " + fmt(s.acc) + "% | " + fmt(s.pod) + "% | " + fmt(s.far) + "% |";
}
const HEAD = "| | hours | METAR yes | right | caught | false alarm |\n|---|---|---|---|---|---|";

module.exports = { parseIem, ceilingFt, pairHours, lowPressure, truthLayer, truthAny, predTotal, predLevels, predLow, truthVis, predVis,
  tally, stats, calibration, calRow, CAL_HEAD, localHour, localMonth, row, HEAD, CEIL_FT, LEVELS };
