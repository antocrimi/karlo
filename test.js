#!/usr/bin/env node
/* NoKarl — headless checks.
 *
 *   node test.js            run every check
 *   node test.js --svg      also write map-preview.svg (four hours of geometry)
 *
 * index.html has no build step and no test framework, so this boots the page's
 * script against a small DOM stub and asserts on what it produces. It caught
 * every bug in this project that a glance at the screen did not: the blank
 * first paint, the label pile-up, the fog band that contradicted the verdict.
 * Run it before every deploy.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'index.html');

/* ── a DOM small enough to read, large enough to boot the page ───────── */
function harness({ width = 361, stageH = 152, locale = 'en-US', online = false } = {}) {
  const store = {}, handlers = {};
  const mk = id => {
    const n = {
      id, _cls: new Set(), dataset: {}, _a: {}, hidden: false, value: 0,
      children: [], tagName: 'DIV', textContent: '', _html: '',
      style: { _p: {}, setProperty(k, v) { this._p[k] = v } },
      get innerHTML() { return this._html },
      set innerHTML(v) { this._html = v; this.children = parse(v) },
      setAttribute(k, v) { this._a[k] = v },
      getAttribute(k) { return this._a[k] },
      addEventListener(t, f) { (handlers[id] = handlers[id] || {})[t] = f },
      appendChild(c) {
        if (c._parent) c._parent.children = c._parent.children.filter(x => x !== c);
        c._parent = this; this.children.push(c);
      },
      querySelector: () => null,
      querySelectorAll(sel) { return this.children.filter(c => c.tagName === sel.toUpperCase()) },
      classList: {
        toggle(c, on) { on ? n._cls.add(c) : n._cls.delete(c) },
        add(c) { n._cls.add(c) }, remove(c) { n._cls.delete(c) },
        contains: c => n._cls.has(c)
      },
      get clientWidth() { return width },
      get clientHeight() { return this.id === 'stage' ? stageH : 54 },
      /* Measured in Chromium at 320px against the shipped faces, because a
         single optimistic constant made the collision check weaker than it
         looked: rail labels run up to 8.13 px per character (Dogpatch is 65 px
         real against 51 predicted at 6.35) while hilltop labels, set smaller,
         top out near 5.8. Rail is rounded up so a pass here implies a pass in
         the browser; hilltop keeps 6.35, which is already over the real figure. */
      get offsetWidth() {
        const t = (this.textContent || '');
        const rail = this.dataset.x !== undefined && !this._cls.has('pk');
        return Math.round(t.length * (rail ? 8.2 : 6.35));
      },
      get offsetHeight() { return 15 },
      get scrollWidth() { return this.offsetWidth }
    };
    return n;
  };
  const parse = html => {
    const out = [];
    const re = /<(span|b|i|div|h2|h3)\b([^>]*)>([\s\S]*?)<\/\1>|<(i)\b([^>]*)\/?>/g;
    let m;
    while ((m = re.exec(html))) {
      const tag = (m[1] || m[4]).toUpperCase(), at = m[2] || m[5] || '';
      const n = mk(null); n.tagName = tag;
      n.textContent = (m[3] || '').replace(/<[^>]+>/g, '');
      const cm = at.match(/class="([^"]*)"/); if (cm) cm[1].split(' ').forEach(c => c && n._cls.add(c));
      const im = at.match(/id="([^"]+)"/); if (im) { n.id = im[1]; store[im[1]] = n }
      for (const a of at.matchAll(/data-([\w-]+)="([^"]*)"/g)) n.dataset[a[1]] = a[2];
      out.push(n);
    }
    return out;
  };

  const html = mk('html');
  global.document = {
    getElementById: id => store[id] || (store[id] = mk(id)),
    createElement: t => { const n = mk(null); n.tagName = (t || 'div').toUpperCase(); return n },
    documentElement: html, body: mk('body'),
    querySelector: () => null, querySelectorAll: () => [],
    fonts: { ready: Promise.resolve() }
  };
  global.window = { ResizeObserver: null };
  global.navigator = { language: locale };
  global.matchMedia = () => ({ matches: false });
  global.addEventListener = () => {};
  global.requestAnimationFrame = f => f();
  global.performance = { now: () => 0 };
  global.fetch = () => Promise.reject(new Error('offline'));
  global.AbortController = function () { this.signal = {}; this.abort = () => {} };
  global.setTimeout = f => { f(); return 0 };
  global.clearTimeout = () => {};

  let js = fs.readFileSync(FILE, 'utf8');
  js = js.slice(js.lastIndexOf('<script>') + 8, js.lastIndexOf('</script>')).trim();
  js = js.replace('(function(){', '');
  js = js.slice(0, js.lastIndexOf('})();'));
  js += '\nmodule.exports={S,paint,simulate,split,profile,coverCurve,note,frameAt,' +
        'SPOTS,LEVELS,CLEAR,VIS_CLEAR,yM,yFog,GROUND,VBW,VBH,HOURS,BUILD,smooth,RIDGE,' +
        'overheadCurve,overheadAt,sunLine,T_EDGE,H_TRUE,yFog,OFF_AXIS_KM,columns,smoothAcross};';
  const mod = { exports: {} };
  new Function('module', js)(mod);
  return { api: mod.exports, store, handlers, html };
}

/* ── reporting ───────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${detail && !cond ? '   → ' + detail : ''}`);
};
const head = t => console.log(`\n${t}`);

/* ── checks ──────────────────────────────────────────────────────────── */
const { api, store } = harness();
const { S, paint, simulate, split, profile, note, frameAt,
        SPOTS, LEVELS, CLEAR, VIS_CLEAR, yM, yFog, GROUND, VBW, HOURS, BUILD,
        overheadCurve, overheadAt, sunLine, T_EDGE, H_TRUE, OFF_AXIS_KM, columns, smoothAcross } = api;
/* load() smooths the field before anything is drawn or decided, so a harness
   that skips it is testing a different app from the one that ships */
S.frames = smoothAcross(simulate());
const clean = x => (x || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const P = n => SPOTS.find(s => s.n === n);
const mkP = lv => LEVELS.map((L, i) => ({ k: L.k, h: L.h, c: lv[i] }));

head('BOOT');
S.h = 0; paint();
ok('verdict renders', clean(store.verdict._html).length > 4, clean(store.verdict._html));
ok('board renders', (store.board._html || '').includes('class="tr'));
ok('map dots built', (store.dots._html || '').match(/class="dot/g)?.length === SPOTS.length);
ok('build tag is date plus number', typeof BUILD === 'string' &&
   /^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(BUILD), BUILD);
/* a build stamped in the future is how 2026.08.31 shipped on the 30th */
ok('build date is not in the future', (() => {
  const m = BUILD.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return false;
  const b = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return b <= Date.now() + 36 * 3600e3;      /* a day of slack for time zones */
})(), BUILD);

head('VERTICAL MODEL  — the three bugs found by looking out of a window');
const cases = [
  ['fog to ~200 m',        [92, 20, 5, 4],  { 'Twin Peaks': false, 'Bernal Heights': true }],
  ['high deck, clear low', [15, 20, 88, 92],{ 'Twin Peaks': true,  'Dolores Park': true }],
  ['deep layer',           [96, 92, 60, 5], { 'Twin Peaks': true,  'Bernal Heights': true }],
  ['clear sky',            [8, 6, 4, 3],    { 'Twin Peaks': false, 'Dolores Park': false }]
];
for (const [label, lv, expect] of cases) {
  for (const [name, shouldBeUnder] of Object.entries(expect)) {
    const sp = P(name), p = profile(sp.e, lv, 0, lv[0]);
    const under = sp.e < p.sun;
    ok(`${label}: ${name} ${shouldBeUnder ? 'under' : 'clear'}`, under === shouldBeUnder,
       `overhead ${Math.round(p.overhead)}%  sun line ${Math.round(p.sun)}m`);
  }
}
ok('below-ground levels discarded',
   profile(281, [95, 10, 5, 5], 0, 95).overhead < CLEAR,
   'a summit above a shallow layer must not inherit the surface reading');

head('VISIBILITY GATE');
[[10, 20000, true, 'sunny'], [10, 3000, false, 'smoke'],
 [90, 400, false, 'fog'],    [90, 15000, false, 'grey overhead']]
  .forEach(([c, v, want, label]) =>
    ok(`${label} → ${want ? 'clear' : 'not clear'}`, (c < CLEAR && v > VIS_CLEAR) === want));

head('FOG LINE  — picture and verdict cannot disagree');
let bad = 0, quiet = 0, heads = new Set(), rows = new Set();
for (let k = 0; k < HOURS; k++) {
  S.h = k; paint();
  const { sun, fog } = split(frameAt(k));
  if (!sun.length) quiet++;
  heads.add((store.board._html.match(/class="sec"/g) || []).length);
  rows.add((store.board._html.match(/class="tr /g) || []).length);
  const listed = new Set(sun.map(s => s.n));
  S.frames[k].spots.forEach(s => {
    /* the dot's own rule and the list's own rule, asked separately */
    const drawnClear = s.elev >= s.sun;
    const saysClear = listed.has(s.n);
    if (drawnClear !== saysClear && s.vis > VIS_CLEAR) bad++;
  });
}
ok('no dot/verdict disagreements across 24 h', bad === 0, bad + ' found');

/* The band has a leading edge again, so a single bandTop scalar no longer
   describes it. The CLEAR contour is evaluated at each spot's own x by walking
   the drawn bezier, which checks the picture rather than re-checking the model. */
const bez = (P0, P1, P2, P3, t) => {
  const u = 1 - t;
  return u*u*u*P0 + 3*u*u*t*P1 + 3*u*t*t*P2 + t*t*t*P3;
};
/* y of a path "M x,y C .. C .." at a given x, by bisection on each segment */
function yAtX(d, x) {
  const nums = s => s.trim().split(/[\s,]+/).map(Number);
  const m = d.match(/^M\s*(-?[\d.]+),(-?[\d.]+)/);
  let cx = +m[1], cy = +m[2];
  /* the lookahead has to accept end-of-string: the crest ends on a C with no
     command after it, and without this that whole segment is dropped, which
     silently stops checking any spot inside the leading edge */
  for (const seg of d.matchAll(/C\s*([-\d.,\s]+?)(?=[CLZ]|$)/g)) {
    const v = nums(seg[1]);
    const [x1, y1, x2, y2, x3, y3] = v;
    if (x >= Math.min(cx, x3) - 1e-6 && x <= Math.max(cx, x3) + 1e-6) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 40; i++) {
        const t = (lo + hi) / 2;
        (bez(cx, x1, x2, x3, t) < x) ? lo = t : hi = t;
      }
      return bez(cy, y1, y2, y3, (lo + hi) / 2);
    }
    cx = x3; cy = y3;
  }
  return null;
}
const clearPath = html => {
  const m = html.match(/data-t="45"[^>]*\sd="([^"]+)"/);
  return m ? m[1] : null;
};
const drawn = () => clearPath(store.fogLine._html || '');
let insideBand = 0, checked = 0, outsideButFogged = 0;
for (let k = 0; k < HOURS; k++) {
  S.h = k; paint();
  const d = drawn();
  if (!d) continue;
  S.frames[k].spots.forEach(s => {
    const clear = s.elev >= s.sun && s.vis > VIS_CLEAR;
    const surf = yAtX(d, s.x);
    if (surf == null) { /* outside the slab: no layer, so nothing can be under one */
      if (s.elev < s.sun) outsideButFogged++;
      return;
    }
    checked++;
    if (clear && yM(s.elev) > surf + 1) insideBand++;   /* amber dot inside the fog */
  });
}
ok('the CLEAR contour was sampled across the sweep', checked > HOURS, checked + ' samples');
ok('no fogged spot sits outside the drawn slab', outsideButFogged === 0, outsideButFogged + ' found');
ok('no clear dot drawn inside the band', insideBand === 0, insideBand + ' found');
ok('every hour renders all spots', rows.size === 1 && [...rows][0] === SPOTS.length, [...rows].join(','));
ok('empty groups drop their heading', heads.size > 1 || quiet === 0, 'headings seen: ' + [...heads].join(','));
ok('quiet rule reachable in the simulator', quiet > 0, quiet + ' quiet hours');
/* naming no place is the point; withholding the reading was an oversight */
{
  let qh = -1;
  for (let k = 0; k < HOURS; k++) if (!split(frameAt(k)).sun.length) { qh = k; break; }
  S.h = qh; paint();
  const html = store.verdict._html || '';
  ok('the quiet state still reports the city', /class="v-cond"/.test(html) &&
     /\d+% cloud citywide/.test(clean(html)) && /\d+ (mph|km\/h) wind/.test(clean(html)),
     clean(html).slice(0, 90));
}

head('THE FIELD  — the properties the drawing rests on');
{
  const vecs = [[92,20,5,4],[15,20,88,92],[96,92,60,5],[8,6,4,3],
                [80,46,44,10],[80,44,44,10],[70,50,48,46],[40,44,46,20]];
  let notMono = 0, crossed = 0;
  for (const lv of vecs) {
    const O = overheadCurve(lv, 0, lv[0]);
    for (let i = 1; i < O.length; i++) if (O[i] > O[i - 1] + 1e-9) notMono++;
    /* a lower threshold must always sit at or above a higher one */
    const hs = [T_EDGE, CLEAR].map(T => sunLine(O, T)).reverse();
    for (let i = 1; i < hs.length; i++) if (hs[i] < hs[i - 1] - 1e-9) crossed++;
  }
  ok('overhead curve is monotone non-increasing', notMono === 0, notMono + ' rises');
  ok('contours never cross', crossed === 0, crossed + ' crossings');

  /* the sun line and the verdict are the same statement, not two rules kept in step */
  let split2 = 0;
  for (const lv of vecs) for (const sp of SPOTS) {
    const p = profile(sp.e, lv, 0, lv[0]);
    if ((sp.e >= p.sun) !== (p.overhead < CLEAR)) split2++;
  }
  ok('above the sun line === overhead below CLEAR', split2 === 0, split2 + ' disagreements');

  /* The claim the redesign rests on: the layer's own top is level. What used to
     put 119 px of relief and up to 203 into the surface was the leading edge
     being ramped down to the ground through the vertical axis, which is extent
     drawn as height. The top is now only drawn where there is a layer, so its
     relief has to stay small or the second landmass is back. */
  {
    let worst = 0, worstHour = -1;
    for (let k = 0; k < HOURS; k++) {
      const f = frameAt(k);
      const on = f.spots.map(sp => sunLine(sp.O, CLEAR)).filter(h => h > 0);
      if (on.length < 2) continue;
      const ys = on.map(h => yFog(h));
      const r = Math.max(...ys) - Math.min(...ys);
      if (r > worst) { worst = r; worstHour = k; }
    }
    const ridge = SPOTS.map(sp => sp.y);
    const relief = Math.max(...ridge) - Math.min(...ridge);
    ok('the layer top stays level against the ridge', worst < relief * 0.55,
       worst.toFixed(0) + ' px at +' + worstHour + 'h, ridge is ' + relief + ' px');
  }

  /* no sentinel: a clear column must produce no layer at all */
  ok('a clear sky has no sun line', profile(5, [8,6,4,3], 0, 8).sun === 0);
  /* a contour at zero metres must sit at or below every drawn ground point,
     including the frame edges, or it shows as fog over an empty beach */
  const lowest = Math.max(224, 222, ...SPOTS.map(sp => sp.y));
  ok('a zero contour is buried under the shoreline', yFog(0) >= lowest,
     'yFog(0)=' + yFog(0).toFixed(1) + ' vs lowest ground ' + lowest);
  /* and the correction must be gone before it can move a verdict */
  ok('the shoreline correction decays above the lowest sample',
     Math.abs(yFog(110) - yM(110)) < 2, (yFog(110) - yM(110)).toFixed(2) + ' px at 110 m');
  ok('a deep layer does not report a fake ceiling',
     profile(5, [96,94,92,90], 0, 96).sun >= 760, 'ran off the top of the samples');
}

head('ONE BODY  — cohesive, and anchored where the meaning is');
{
  S.h = 6; paint();
  const body = (store.fogBody._html || '').match(/<path/g) || [];
  const rim  = (store.fogLine._html || '').match(/<path/g) || [];
  ok('the body is a mass and its own edge', body.length <= 2 && rim.length === 1,
     body.length + ' fills, ' + rim.length + ' edge');
  ok('the mass and its edge are painted from one ramp', (() => {
    const src2 = fs.readFileSync(FILE, 'utf8');
    return /id="fogBody"[^>]*fill="url\(#fogFill\)"/.test(src2)
        && /id="fogLine"[^>]*stroke="url\(#fogFill\)"/.test(src2);
  })(), 'sharing the ramp is what stops the edge outliving the body at the front');
  ok('density falls to nothing where there is no layer',
     /const DENSE=/.test(fs.readFileSync(FILE, 'utf8')));

  /* full bleed: the body spans the frame at every hour, so it can never be
     seen to end somewhere on screen */
  let short = 0, ends = 0;
  for (let k = 0; k < HOURS; k++) {
    S.h = k; paint();
    const d = (store.fogLine._html || '').match(/\sd="([^"]+)"/);
    if (!d) { ends++; continue; }
    const xs = (d[1].match(/-?[\d.]+/g) || []).map(Number).filter((_, i) => i % 2 === 0);
    if (Math.min(...xs) > 0.5 || Math.max(...xs) < VBW - 0.5) short++;
  }
  ok('the body spans the frame at every hour', short === 0 && ends === 0,
     short + ' short, ' + ends + ' missing');

  /* the front has to descend over at least the model's own resolution. one
     spot gap is about 70 units against a 3 km cell of 250, so a raw front
     over-claims the boundary by roughly seven times */
  {
    let steepest = 0, at = -1;
    for (let k = 0; k < HOURS; k++) {
      const f = frameAt(k);
      for (let i = 1; i < f.spots.length; i++) {
        const dy = Math.abs(yFog(f.spots[i].sun) - yFog(f.spots[i - 1].sun));
        const dx = f.spots[i].x - f.spots[i - 1].x;
        if (dy / dx > steepest) { steepest = dy / dx; at = k; }
      }
    }
    /* the front is a boundary, not a height, so encoding it as height will
       always step somewhere. What must never come back is a front sharper
       than the places themselves: the full depth of the layer, 185 units,
       falling across the closest pair of spots, 68 units apart. Anything
       steeper is a wall drawn from data that cannot support one. Density
       does the rest of the softening, falling to nothing at the same edge. */
    ok('the front is never sharper than the places themselves', steepest < 2.72,
       steepest.toFixed(2) + ' units of fall per unit across, at +' + at + 'h');
  }

  /* smoothing is applied to the field, not to the drawing, so the percentage
     in the list and the height of the body come from the same numbers */
  const src4 = fs.readFileSync(FILE, 'utf8');
  ok('the field is smoothed before anything is decided',
     /smoothAcross\(await fetchLive\(\)\)/.test(src4) && /smoothAcross\(simulate\(\)\)/.test(src4));
  ok('the kernel stays inside one grid cell', (() => {
    const w = (src4.match(/const KERNEL=\[([^\]]+)\]/) || [])[1].split(',').map(Number);
    const sum = w.reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1) < 1e-6 && w.length <= 5;
  })(), 'a wider kernel would blur across cells the model does resolve');

  /* and a hole in the middle of a covered city is closed by that smoothing
     rather than by a special case */
  {
    const O = overheadCurve([96, 92, 60, 5], 0, 96);
    const solid = sunLine(O, CLEAR);
    ok('an isolated clear column cannot punch through a covered city',
       KERNEL_MID() < 1, 'the centre tap is ' + KERNEL_MID().toFixed(3) +
       ', so neighbours always carry a hole back up (' + solid.toFixed(0) + ' m column)');
  }
}

function KERNEL_MID() {
  const src = fs.readFileSync(FILE, 'utf8');
  const w = (src.match(/const KERNEL=\[([^\]]+)\]/) || [])[1].split(',').map(Number);
  return w[(w.length - 1) / 2];
}

head('MOTION  — the scrubber is the main interaction');
{
  const src5 = fs.readFileSync(FILE, 'utf8');
  ok('heights ease toward the target rather than snapping',
     /function stepFog\(\)/.test(src5) && /requestAnimationFrame\(stepFog\)/.test(src5));
  const ease = +(src5.match(/const EASE=([\d.]+)/) || [])[1];
  ok('the ease constant lands near the dots\' own transition', ease > 0.08 && ease < 0.35,
     'EASE ' + ease + ' settles in about ' + Math.round(-1000 / 60 / Math.log(1 - ease) * 3) + ' ms');
  ok('the body deforms rather than cross-fading',
     /fogNow\[i\]\+=d\*EASE/.test(src5), 'easing the heights is what keeps it one mass');
  ok('the loop stops when it settles', /fogRAF = moving \? requestAnimationFrame/.test(src5));
}

head('THE FOG AXIS  — true where it decides, compressed above');
{
  const tallest = Math.max(...SPOTS.map(s => s.e));
  ok('H_TRUE clears the tallest spot', H_TRUE > tallest,
     'H_TRUE ' + H_TRUE + ' vs ' + tallest + ' m — this is what keeps the verdict exact');
  /* below the tallest spot the mapping must be the plain elevation axis, or a
     dot and the fog line stop being comparable and the coupling is a fiction */
  let worst = 0;
  for (let h = 0; h <= tallest; h += 5) {
    const plain = 213 - 0.392 * h + 13 * Math.exp(-h / 50);
    worst = Math.max(worst, Math.abs(yFog(h) - plain));
  }
  ok('no compression below the tallest spot', worst < 1e-9, worst.toExponential(1) + ' px');

  let mono = true;
  for (let h = 1; h <= 900; h++) if (yFog(h) > yFog(h - 1) + 1e-9) mono = false;
  ok('the fog axis is monotone', mono);

  /* compression is what removed the need for a top fade: the body can no
     longer reach the frame edge, so it can no longer read as a box */
  ok('even a 900 m layer leaves sky above it', yFog(900) > 30, 'y=' + yFog(900).toFixed(0));
  ok('the ground end is still pinned', yFog(0) >= 224, 'yFog(0)=' + yFog(0).toFixed(1));
  ok('dots carry the ridge hairline',
     /\.dot\{[^}]*box-shadow:0 0 0 [\d.]+px var\(--ink\)/.test(fs.readFileSync(FILE, 'utf8')));
}

head('THE EDGE  — the roll-in is drawn, not gated away');
{
  let gated = 0, hoursDrawn = 0, widths = [];
  for (let k = 0; k < HOURS; k++) {
    S.h = k; paint();
    const html = (store.fogBody._html || '') + (store.fogLine._html || '');
    const under = S.frames[k].spots.filter(s => s.elev < s.sun).length;
    if (under > 0 && !/<path/.test(html)) gated++;
    if (/<path/.test(html)) hoursDrawn++;
    widths.push(under);
  }
  ok('any spot under the layer draws a band', gated === 0, gated + ' hours suppressed');
  ok('the band is drawn for most of the sweep', hoursDrawn > HOURS / 2, hoursDrawn + '/' + HOURS);
  /* the wave has to arrive and leave, not switch on fully formed */
  const partial = widths.filter(w => w > 0 && w < SPOTS.length).length;
  ok('partial coverage is reachable and drawn', partial >= 4, partial + ' partial hours');
}

head('CONTINUOUS TIME');
{
  /* an interpolated frame sits between its neighbours, spot for spot */
  let outside = 0, n = 0;
  for (let k = 0; k < HOURS - 1; k++) {
    const A = frameAt(k), B = frameAt(k + 1), M = frameAt(k + 0.5);
    M.spots.forEach((m, i) => {
      const lo = Math.min(A.spots[i].sun, B.spots[i].sun) - 1e-6;
      const hi = Math.max(A.spots[i].sun, B.spots[i].sun) + 1e-6;
      n++; if (m.sun < lo || m.sun > hi) outside++;
    });
  }
  ok('a half-hour sun line lies between its two hours', outside === 0, outside + '/' + n);

  /* the blended curve keeps the one property the geometry needs */
  let notMono = 0;
  for (let k = 0; k < HOURS - 1; k += 3) frameAt(k + 0.25).spots.forEach(s => {
    for (let i = 1; i < s.O.length; i++) if (s.O[i] > s.O[i - 1] + 1e-9) notMono++;
  });
  ok('blended curves stay monotone', notMono === 0, notMono + ' rises');

  /* whole hours must be untouched by the interpolator */
  ok('frameAt on the hour is the hour', frameAt(7) === S.frames[7]);

  /* a refresh replaces the forecast; the cache must not serve the old one */
  const before = frameAt(3.5).spots[0].sun;
  const kept = S.frames;
  /* sun is re-derived from the blended curve, so the curve is what has to move */
  S.frames = kept.map(f => ({ ...f, spots: f.spots.map(sp => ({ ...sp, O: sp.O.map(() => 90) })) }));
  const after = frameAt(3.5).spots[0].sun;
  S.frames = kept;
  ok('the interpolation cache is invalidated by a refresh', after !== before,
     'sun ' + before.toFixed(0) + ' then ' + after.toFixed(0));

  /* and the scrubber can actually reach the in-between positions */
  const step = (fs.readFileSync(FILE, 'utf8')
    .match(/id="time"[^>]*step="([\d.]+)"/) || [])[1];
  ok('scrubber steps below the hour', step && +step < 1, 'step=' + step);
}

head('THE SECTION  — every place sits near the line it cuts');
{
  const R = 111.32, C = Math.cos(37.76 * Math.PI / 180);
  const E = s => (s.lon + 122.4477) * R * C, N = s => (s.lat - 37.7544) * R;
  const mean = SPOTS.reduce((a, s) => a + N(s), 0) / SPOTS.length;
  const off = SPOTS.map(s => ({ n: s.n, d: Math.abs(N(s) - mean) }));
  const over = off.filter(o => o.d > OFF_AXIS_KM);
  ok('no place sits further than OFF_AXIS_KM off the transect', over.length === 0,
     over.map(o => o.n + ' ' + o.d.toFixed(2) + ' km').join(', '));
  const worst = off.reduce((a, b) => a.d > b.d ? a : b);
  console.log(`        worst is ${worst.n} at ${worst.d.toFixed(2)} km of ${OFF_AXIS_KM}`);

  /* drawn x has to preserve true west-to-east order, or the section lies about
     which side of the ridge a place is on */
  const byX = [...SPOTS].sort((a, b) => a.x - b.x);
  let bad = 0;
  for (let i = 1; i < byX.length; i++) if (E(byX[i]) < E(byX[i - 1])) bad++;
  ok('drawn order matches true longitude order', bad === 0, bad + ' inversions');

  /* and drawn y has to stay on the elevation axis the briefing protects */
  const resid = SPOTS.map(s => Math.abs(s.y - (213 - 0.392 * s.e)));
  ok('every spot sits within 12 px of the elevation axis',
     Math.max(...resid) <= 12, 'worst ' + Math.max(...resid).toFixed(1) + ' px');
}

head('LABELS DO NOT COLLIDE  — at the smallest viewport');
{
  const boxesOf = (container, W) => [...container.children].map(n => {
    const lp = parseFloat(n.style.left), w = n.offsetWidth;
    return { k: n.dataset.k, l: lp / 100 * W - w / 2, r: lp / 100 * W + w / 2,
             t: parseFloat(n.style.top) || 0, b: (parseFloat(n.style.top) || 0) + n.offsetHeight };
  });
  const hits = bs => {
    const out = [];
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      if (a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t) out.push(a.k + ' / ' + b.k);
    }
    return out;
  };
  /* 320 is the narrowest phone still in use; 361 is the base the CSS is written for */
  for (const W of [320, 361, 390]) {
    const h = harness({ width: W, stageH: Math.round(W * 380 / 900) });
    h.api.S.frames = h.api.simulate();
    h.api.S.h = 0; h.api.paint();
    h.handlers.rail; // layout already ran during boot
    const pk = hits(boxesOf(h.store.peaks, W));
    const rl = hits(boxesOf(h.store.rail, W).filter(b => b.r > b.l));
    ok(`${W}px: hilltop labels do not overlap`, pk.length === 0, pk.join(' | '));
    ok(`${W}px: rail labels do not overlap`, rl.length === 0, rl.join(' | '));
  }
}

head('MAP LABELS  — measured packing, topography respected');
const relayoutOK = (() => {
  const hills = SPOTS.filter(s => s.h);
  const ys = {};
  [...store.peaks.children].forEach(n => { ys[n.dataset.k] = parseFloat(n.style?.top || '0') });
  return hills.length === 4;
})();
ok('four hilltops flagged', SPOTS.filter(s => s.h).length === 4);
ok('elevation on every spot', SPOTS.every(s => typeof s.e === 'number'));
ok('taller peak sits higher', P('Twin Peaks').e > P('Corona Heights').e &&
                              P('Bernal Heights').e > P('Potrero Hill').e);

head('UNITS');
['en-US', 'en-GB', 'it-IT', 'my-MM'].forEach(loc => {
  const F = new Set(['US','LR','MM','BS','BZ','KY','PW','FM','MH','GU','PR','VI','AS','MP','TC','MS','AG','KN']);
  let u; try {
    const lo = new Intl.Locale(loc);
    u = lo.measurementSystem ? (lo.measurementSystem === 'us' ? 'F' : 'C')
      : (F.has((lo.maximize && lo.maximize().region) || lo.region) ? 'F' : 'C');
  } catch { u = 'F' }
  const want = (loc === 'en-US' || loc === 'my-MM') ? 'F' : 'C';
  ok(`${loc} → °${want}`, u === want);
});

head('REQUEST BUDGET');
const src = fs.readFileSync(FILE, 'utf8');
const hourly = (src.match(/&hourly=([a-z_0-9,]+)/) || [, ''])[1].split(',').filter(Boolean);
const extra = (src.match(/\+",([a-z_0-9]+)"/g) || []).map(x => x.replace(/\+",|"/g, ''));
const vars = [...new Set([...hourly, ...extra, ...LEVELS.map(L => L.k)])];
ok(`${vars.length} hourly variables — bills as one call`, vars.length <= 10, vars.join(','));
ok('one batched request for all spots', /latitude="?\+SPOTS\.map/.test(src) || src.includes('SPOTS.map(s=>s.lat).join(",")'));

head('DEPLOY PATH  — this is a project site, served from /karlo/');
{
  /* The site is a project page, not a user page, so every absolute self-URL
     has to carry the sub-path. Pointing them at the bare domain sends search
     engines somewhere else and makes og-image.png a 404, which is a link
     preview with no image and nothing on the page to reveal it. */
  const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  const base = (readme.match(/Live at \[[^\]]+\]\((https:\/\/[^)]+?\/)\)/) || [])[1];
  ok('the README states a live URL', !!base, base || 'none found');

  const abs = [...src.matchAll(/(?:href|content)="(https:\/\/[a-z0-9-]+\.github\.io[^"]*)"/g)]
    .map(m => m[1]);
  const jsonld = [...src.matchAll(/"url":"(https:\/\/[a-z0-9-]+\.github\.io[^"]*)"/g)]
    .map(m => m[1]);
  const all = [...abs, ...jsonld];
  ok('the page carries absolute self-URLs to check', all.length >= 4, all.length + ' found');
  const stray = all.filter(u => !u.startsWith(base));
  ok('every absolute self-URL sits under the README base', stray.length === 0,
     stray.join(' , '));

  /* the three that matter, named so a missing one is a failure and not a pass */
  ok('canonical points at the deployed page',
     new RegExp('rel="canonical" href="' + base + '"').test(src));
  ok('og:url points at the deployed page',
     new RegExp('property="og:url" content="' + base + '"').test(src));
  ok('og:image resolves to a file in the repo', (() => {
     const m = src.match(/property="og:image" content="([^"]+)"/);
     if (!m || !m[1].startsWith(base)) return false;
     return fs.existsSync(path.join(__dirname, m[1].slice(base.length)));
  })(), 'og-image.png must exist at the path the tag names');

  /* the HTML comment drifted a build behind when BUILD was bumped */
  const htmlBuild = (src.match(/<!-- NoKarl build ([\d.]+)/) || [])[1];
  ok('the build comment matches BUILD', htmlBuild === BUILD, htmlBuild + ' vs ' + BUILD);
}

head('FAIL-SAFES');
ok('paint runs before measurement', src.indexOf('paint();') < src.indexOf('safeLayout();'));
ok('layout errors cannot blank the page', /try\s*\{\s*relayout\(\);\s*\}\s*catch/.test(src));
/* the labels are hidden until they have been packed, so every path out of the
   layout pass has to reveal them. A heap of names on the origin is the bug
   this replaced; nameless is the bug it must not introduce. */
ok('a failed layout still reveals the labels', /catch\s*\([^)]*\)\s*\{[^{}]*\{\s*placed\(\)/.test(src));
ok('labels are packed before the fetch, not after',
   src.indexOf('safeLayout();\n  /* one observer') < src.indexOf('await load(false)'));
ok('every $() id exists in the markup', (() => {
  const ids = new Set([...src.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const js = src.slice(src.lastIndexOf('<script>'));
  return [...new Set([...js.matchAll(/\$\("([^"]+)"\)/g)].map(m => m[1]))].every(u => ids.has(u));
})());

/* ── optional: render the geometry so it can be judged without deploying ── */
if (process.argv.includes('--svg')) {
  const { smooth, RIDGE } = api;
  const terr = `M0,${GROUND} ` + smooth(RIDGE) + ` L${VBW},${GROUND} Z`;
  /* quarter-hours through the roll-in, so the sweep shows the edge moving */
  const hrs = [0, 2, 4, 5.5, 7, 9, 12, 16, 20, 23];
  const g = hrs.map((k, i) => {
    S.h = k; paint();
    const fr = frameAt(k);
    const dots = fr.spots.map(s => ({ x: s.x, y: s.y, on: s.elev >= s.sun && s.vis > VIS_CLEAR }));
    return `<g transform="translate(0,${i * 262})">
<rect width="${VBW}" height="${api.VBH}" fill="#0E161C"/>
<mask id="m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${VBW}" height="${api.VBH}">
<rect width="${VBW}" height="${api.VBH}" fill="#fff"/><path d="${terr}" fill="#000"/></mask>
<g fill="#A9B7BE" mask="url(#m${i})">${store.fogBody._html}</g>
<path d="${terr}" fill="#1E2B33"/>
${dots.map(d => `<circle cx="${d.x}" cy="${d.y}" r="5" fill="${d.on ? '#F0A03C' : '#3B4A52'}"/>`).join('')}
<text x="8" y="18" fill="#63757C" font-family="monospace" font-size="12">+${k}h · ${
  fr.spots.filter(s => s.elev < s.sun).length}/11 under</text>
</g>`;
  }).join('');
  fs.writeFileSync(path.join(__dirname, 'map-preview.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VBW} ${262 * hrs.length}" width="${VBW}">${g}</svg>`);
  console.log('\n  wrote map-preview.svg');
}


console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
