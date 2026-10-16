#!/usr/bin/env node
/* Karl: headless checks.
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
function harness({ width = 361, stageH = 152, locale = 'en-US', online = false, standalone = false, fetchImpl = null } = {}) {
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
    fonts: { ready: Promise.resolve() },
    visibilityState: 'visible',
    addEventListener(t, f) { (handlers.document = handlers.document || {})[t] = f }
  };
  global.window = { ResizeObserver: null };
  /* Node 21+ ships a read-only navigator, and plain assignment is silently
     ignored, so the locale and standalone switches never reached the page */
  Object.defineProperty(global, 'navigator',
    { value: { language: locale, standalone }, configurable: true, writable: true });
  global.matchMedia = () => ({ matches: false });
  global.addEventListener = (t, f) => { (handlers.window = handlers.window || {})[t] = f };
  global.scrollY = 0; global.window.scrollY = 0;
  global.requestAnimationFrame = f => f();
  global.performance = { now: () => 0 };
  global.fetch = u => {
    if (String(u).includes('open-meteo')) global.fetchCalls = (global.fetchCalls || 0) + 1;
    else global.pageFetches = (global.pageFetches || []).concat(String(u));
    return Promise.reject(new Error('offline'));
  };
  if (fetchImpl) global.fetch = fetchImpl;
  global.AbortController = function () { this.signal = {}; this.abort = () => {} };
  global.setTimeout = f => { f(); return 0 };
  global.clearTimeout = () => {};

  let js = fs.readFileSync(FILE, 'utf8');
  js = js.slice(js.lastIndexOf('<script>') + 8, js.lastIndexOf('</script>')).trim();
  js = js.replace('(function(){', '');
  js = js.slice(0, js.lastIndexOf('})();'));
  js += '\nmodule.exports={S,paint,simulate,split,profile,coverCurve,note,frameAt,' +
        'SPOTS,LEVELS,CLEAR,VIS_CLEAR,yM,yFog,GROUND,VBW,VBH,HOURS,BUILD,smooth,RIDGE,' +
        'overheadCurve,overheadAt,sunLine,T_EDGE,H_TRUE,yFog,OFF_AXIS_KM,columns,smoothAcross,' +
        'kmBetween,CELL_KM,sunAlt,isNight,sideProgress};';
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
        overheadCurve, overheadAt, sunLine, T_EDGE, H_TRUE, OFF_AXIS_KM, columns, smoothAcross,
        kmBetween, CELL_KM } = api;
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
  ok('the mass and its edge are gated by the same coverage ramp', (() => {
    const src2 = fs.readFileSync(FILE, 'utf8');
    return /mask="url\(#mCover\)"/.test(src2)
        && /id="fogLine"[^>]*stroke="url\(#rCover\)"/.test(src2);
  })(), 'sharing the ramp is what stops the edge outliving the body at the front');
  ok('density falls to nothing where there is no layer',
     /const DENSE=/.test(fs.readFileSync(FILE, 'utf8')));

  /* the vertical falloff has to be data, not decoration: a layer sitting aloft
     thins toward the ground because you can see under it, and a layer on the
     deck does not, because you cannot */
  {
    const src6 = fs.readFileSync(FILE, 'utf8');
    const air = (src6.match(/id="fogAir"[\s\S]*?<\/linearGradient>/) || [''])[0];
    const deck = (src6.match(/id="fogDeck"[\s\S]*?<\/linearGradient>/) || [''])[0];
    const ops = g => (g.match(/stop-opacity="([\d.]+)"/g) || []).map(m => +m.match(/[\d.]+/)[0]);
    const a = ops(air), d = ops(deck);
    ok('the layer aloft thins toward the ground',
       a.length >= 2 && a[0] > a[a.length - 1], a.join(' > '));
    ok('the ground layer runs the other way',
       d.length >= 2 && d[0] < d[d.length - 1], d.join(' < '));
    ok('the ground layer is gated on fog actually being at street level',
       /rDeck.*deckNow|deckNow\[i\]/.test(src6) && /fr\.spots\.map\(s=>s\.here\)/.test(src6),
       'cover at your own altitude is exactly that question');
    ok('the profile spans the body, not the frame',
       /\$\(id\)\.setAttribute\("y1",f\(y1\)\)/.test(src6),
       'anchoring to the frame would make a shallow layer nearly invisible');
  }

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
     /smoothAcross\(await fetchLive\(\)\)/.test(src4) && /smoothAcross\(saved\?saved\.frames:simulate\(\)\)/.test(src4));
  /* The blend was removed on 1 Sept. A single clear cell inside a covered city
     used to be hidden as grid noise; it is now shown, because it is what the
     model said about that place and ?debug can prove it either way. */
  ok('no place is judged on another place\'s cell', (() => {
    const f = smoothAcross(simulate());
    return f.every(fr => fr.spots.every((sp, i) => sp.O === fr.raw[i].O && sp.sun === fr.raw[i].sun));
  })(), 'a verdict was moved by a neighbour');
  {
    const O = overheadCurve([6, 8, 4, 3], 0, 6);
    ok('an isolated clear cell stays clear', sunLine(O, CLEAR) === 0);
  }
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
  /* force the opposite sky, or the check depends on what the simulator had at 3:30 */
  const forced = before > 0 ? 0 : 90;
  S.frames = kept.map(f => ({ ...f, spots: f.spots.map(sp => ({ ...sp, O: sp.O.map(() => forced) })) }));
  const after = frameAt(3.5).spots[0].sun;
  S.frames = kept;
  ok('the interpolation cache is invalidated by a refresh', after !== before,
     'sun ' + before.toFixed(0) + ' then ' + after.toFixed(0));

  /* and the scrubber can actually reach the in-between positions */
  const step = (fs.readFileSync(FILE, 'utf8')
    .match(/id="time"[^>]*step="([\d.]+)"/) || [])[1];
  ok('scrubber steps below the hour', step && +step < 1, 'step=' + step);
}

head('OWN CELL  — every place is judged on what the model said about it');
{
  /* the 1 Sept failure: a blend in list order gave Ocean Beach 60% of its reading
     from places over a cell away and turned a north-south sky into list-order
     holes. The blend is gone; these pin that it stays gone. */
  /* a sky that varies only north to south must come out the way it went in */
  const deckAt = lat => Math.max(0, Math.min(100, (lat - 37.748) * 9000));
  const mkFrame = () => ({ t: 0, spots: SPOTS.map(s => {
    const d = deckAt(s.lat), p = profile(s.e, [6, 8, d, d], 0, 6);
    return { ...s, elev: s.e, lowCloud: p.overhead, here: p.here, aboveFog: p.aboveFog, sun: p.sun,
             O: p.O, beneath: p.beneath, mid: p.mid, temp: 60, wind: 9, vis: 20000 };
  }) });
  const rawClear = split(mkFrame()).sun.map(s => s.n).sort().join(',');
  const blended = smoothAcross([mkFrame()])[0];
  const outClear = split(blended).sun.map(s => s.n).sort().join(',');
  ok('a north-south sky comes out the way it went in', rawClear === outClear, 'in ' + rawClear + '  out ' + outClear);

  /* the column count is the model's, not the blend's */
  const same = { t: 0, spots: mkFrame().spots.map(s => ({ ...s, O: mkFrame().spots[0].O.slice() })) };
  ok('column count reads the raw field', smoothAcross([same])[0].cols === 1,
     'identical skies counted as ' + smoothAcross([{ t: 0, spots: same.spots.map(s => ({ ...s })) }])[0].cols);
  ok('the model reading is kept beside the blend', !!blended.raw && blended.raw.length === SPOTS.length);
}

head('ONE VERDICT  — map dots and the list apply the same rule');
{
  let off = 0;
  for (let k = 0; k < HOURS; k += 2) {
    S.h = k; paint();
    const lit = new Set(split(frameAt(k)).sun.map(s => s.n));
    const src = require('fs').readFileSync(FILE, 'utf8');
    if (!/state\[s\.n\]=\{on:lit\.has\(s\.n\)/.test(src)) { off = -1; break }
  }
  ok('dots light on the list rule, visibility included', off === 0);
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
    {
      const SP = h.api.SPOTS, Hh = Math.round(W * 380 / 900), R = 9;
      const onDot = boxesOf(h.store.peaks, W).filter(b => SP.some(s => {
        const cx = s.x / h.api.VBW * W, cy = s.y / h.api.VBH * Hh;
        return b.l < cx + R && b.r > cx - R && b.t < cy + R && b.b > cy - R;
      })).map(b => b.k);
      ok(`${W}px: no hilltop label sits on a dot`, onDot.length === 0, onDot.join(', '));
    }
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

head("DEPLOY ADDRESS  — byekarl.com");
{
  /* Every absolute self-URL has to agree with the address the README names.
     A canonical or og:image that points somewhere else sends search engines
     to the wrong place and makes the link preview lose its image. The site
     moved from the /karlo/ project path to byekarl.com on 2026-10-13. */
  const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  const base = (readme.match(/Live at \[[^\]]+\]\((https:\/\/[^)]+?\/)\)/) || [])[1];
  ok('the README states a live URL', !!base, base || 'none found');

  const abs = [...src.matchAll(/(?:href|content)="(https:\/\/(?:byekarl\.com|[a-z0-9-]+\.github\.io)[^"]*)"/g)]
    .map(m => m[1]);
  const jsonld = [...src.matchAll(/"url":"(https:\/\/(?:byekarl\.com|[a-z0-9-]+\.github\.io)[^"]*)"/g)]
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
  const htmlBuild = (src.match(/<!-- Karl build ([\d.]+)/) || [])[1];
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


/* ── night ───────────────────────────────────────────────────────────── */
head('night');
{
  /* a fresh page: later blocks rebuild the DOM stub, so the first one's
     store no longer sees what paint() touches */
  const { api: nApi, store: nStore, html: htmlEl } = harness();
  const { sunAlt, isNight, S, paint, simulate, smoothAcross, HOURS } = nApi;
  const store = nStore;
  const at = iso => Date.parse(iso) / 1000;
  /* published San Francisco times, PDT: 6 Oct 2026 sunrise 7:11, sunset 6:42;
     21 Jun 2026 sunset 8:35 */
  ok('day before the 6 Oct sunset', !isNight(at('2026-10-07T01:35:00Z')), sunAlt(at('2026-10-07T01:35:00Z')).toFixed(2));
  ok('night after the 6 Oct sunset', isNight(at('2026-10-07T01:50:00Z')), sunAlt(at('2026-10-07T01:50:00Z')).toFixed(2));
  ok('night before the 6 Oct sunrise', isNight(at('2026-10-06T14:05:00Z')));
  ok('day after the 6 Oct sunrise', !isNight(at('2026-10-06T14:15:00Z')));
  ok('midsummer 8:25 pm is still day', !isNight(at('2026-06-21T03:25:00Z')));
  ok('midsummer 8:45 pm is night', isNight(at('2026-06-21T03:45:00Z')));
  ok('noon sun is high in June', sunAlt(at('2026-06-21T20:10:00Z')) > 70);

  S.frames = smoothAcross(simulate());
  let nightLit = 0, dayLit = 0, wrong = 0;
  for (let k = 0; k < HOURS; k++) {
    S.h = k; paint();
    const fr = S.frames[k], night = isNight(fr.t);
    if (htmlEl._cls.has('night') !== night) wrong++;
    const lit = [...store.dots.children].filter(d => d._cls.has('on')).length;
    if (lit) night ? nightLit++ : dayLit++;
  }
  ok('night class follows the sun at every hour', wrong === 0, wrong + ' hours wrong');
  ok('the simulator has clear places after dark', nightLit > 0, nightLit + ' hours');
  ok('and clear places in daylight', dayLit > 0, dayLit + ' hours');

  const src = fs.readFileSync(FILE, 'utf8');
  ok('night swaps the whole accent to light blue',
     /\.night\{--clear:var\(--night\); --clear-dim:var\(--night-dim\)\}/.test(src));
  ok('no hard-coded amber outside the tokens',
     (src.replace(/<link rel="icon"[^>]*>/, '').match(/#F0A03C|#9A6520/gi) || []).length === 2);
  ok('the app is called Karl everywhere on the page', !/NoKarl/.test(src));
  ok('canonical, og and structured data use byekarl.com',
     !/antocrimi\.github\.io/.test(src) && (src.match(/https:\/\/byekarl\.com\//g) || []).length >= 4);
  ok('desktop: two panes from 1100px, map left and list right',
     /@media\(min-width:1100px\)\{[^@]*grid-template-columns:minmax\(0,1\.7fr\) minmax\(340px,1fr\)[^@]*\.pane\{grid-column:1; align-self:stretch\}[^@]*\.side\{grid-column:2; align-self:stretch\}/.test(src));
  ok('desktop: pinning needs a window at least 760px tall',
     /@media\(min-width:1100px\) and \(min-height:760px\)\{/.test(src));
  ok('desktop: both panes pin, the list window is driven by the page scroll',
     /\.pane \.ridge\{position:sticky; top:44px\}[^@]*\.side\{min-height:var\(--side-h,0px\)\}[^@]*#board\{position:sticky; top:20px; max-height:calc\(100vh - 40px\); overflow:hidden/.test(src));
  ok('wordmark stops at the 390px phone size and never grows with the window',
     /h1 img\{display:block; width:clamp\(165px, 44vw, 172px\)/.test(src) && !/h1 img\{width:/.test(src));
  ok('no min-width rule changes a font size, so type never grows with the window', (() => {
     const bad = []; const re = /@media\(min-width:(\d+)px\)[^{]*\{/g; let m;
     while ((m = re.exec(src))) {
       let i = re.lastIndex, d = 1; while (d && i < src.length) { const c = src[i++]; d += (c === '{') - (c === '}'); }
       if (/font-size:/.test(src.slice(re.lastIndex, i))) bad.push(m[1]);
     }
     return bad.length === 0;
  })());
  ok('no type size depends on the window width', !/font-size:[^;}]*(vw|vh|vmin|vmax)/.test(src));
  {
    const sp = api.sideProgress;
    ok('list window: nothing scrolls until the pane pins', sp(100, 300, 1000, 700) === 0);
    ok('list window: it follows the page once pinned', sp(480, 300, 1000, 700) === 200);
    ok('list window: it stops at the end, so the panes can unlock', sp(5000, 300, 1000, 700) === 300);
    ok('list window: a short list never scrolls', sp(900, 300, 600, 700) === 0);
  }
  ok('footer: every panel flows in one row from 1100px, whatever the column count',
     /@media\(min-width:1100px\)\{\s*\.cols,\.cols\.two\{grid-template-columns:none; grid-auto-flow:column; grid-auto-columns:minmax\(0,1fr\)/.test(src));
  ok('footer: Method runs in two columns on wide windows', /\.meth\{column-count:2/.test(src));
  ok('footer: Method text is held to about 70 characters at any width', /\.meth > div\{display:grid; grid-template-columns:130px minmax\(0,54ch\)/.test(src));
  ok('footer: no paragraph in a panel runs wider than 60ch',
     (src.match(/\.cols p\{[^}]*max-width:(\d+)ch/) || [])[1] <= 68);
  ok('labels re-measure when the stage changes size, not only the rail',
     /ro\.observe\(\$\("rail"\)\); ro\.observe\(\$\("stage"\)\)/.test(src) && /addEventListener\("resize",again\)/.test(src));
  ok('and once more after the last change has settled', /rz2=setTimeout\(safeLayout,350\)/.test(src));
  ok('no layout prototype switch left in the page', !/data-lay|lay=/.test(src.replace(/family=[^"]*/g, '')));
  ok('CNAME file names the domain',
     fs.readFileSync(require('path').join(require('path').dirname(FILE), 'CNAME'), 'utf8').trim() === 'byekarl.com');
  ok('hilltop leader is placed from the label centre, so bold cannot move it',
     /\.pk::after\{[^}]*left:calc\(50% \+ var\(--dx/.test(src) && !/--lx/.test(src));
  ok('no rays at night, pick included', /\.night \.dot\.pick \.rays\{opacity:0/.test(src));
}

/* ── coming back, and pull to refresh ────────────────────────────────── */
async function resumeTests() {
head('resume and pull to refresh');
{
  const realNow = Date.now;
  let clock = realNow();
  Date.now = () => clock;
  const h = harness({ standalone: true });
  const tick = () => new Promise(r => setImmediate(r));
  await tick(); await tick();
  const st = h.store;
  ok('first open fetches', global.fetchCalls > 0, global.fetchCalls);
  let before = global.fetchCalls;
  h.api.S.h = 7;
  clock += 60e3; h.handlers.document.visibilitychange(); await tick();
  ok('back within a minute keeps the scrub and does not refetch',
     global.fetchCalls === before && h.api.S.h === 7, `${global.fetchCalls - before} fetches, h=${h.api.S.h}`);
  clock += 10 * 60e3; h.handlers.document.visibilitychange(); await tick(); await tick();
  /* the offline stub fails every call, so one load is an attempt and one retry */
  ok('back after ten minutes refetches', global.fetchCalls === before + 2, global.fetchCalls - before);
  ok('and returns to now', h.api.S.h === 0, h.api.S.h);
  document.visibilityState = 'hidden'; before = global.fetchCalls;
  clock += 10 * 60e3; h.handlers.document.visibilitychange(); await tick();
  ok('going to the background does not fetch', global.fetchCalls === before);
  document.visibilityState = 'visible';

  const W = h.handlers.window;
  ok('standalone app listens for the pull', !!(W.touchstart && W.touchmove && W.touchend));
  const pull = dy => { W.touchstart({ target: {}, touches: [{ clientY: 100 }] });
    W.touchmove({ touches: [{ clientY: 100 + dy }] }); W.touchend(); };
  before = global.fetchCalls; pull(30); await tick();
  ok('a short pull does nothing', global.fetchCalls === before);
  pull(90); await tick(); await tick();
  ok('a full pull refreshes', global.fetchCalls === before + 2, global.fetchCalls - before);
  before = global.fetchCalls;
  W.touchstart({ target: { closest: () => ({}) }, touches: [{ clientY: 100 }] });
  W.touchmove({ touches: [{ clientY: 200 }] }); W.touchend(); await tick();
  ok('dragging the scrubber never refreshes', global.fetchCalls === before);
  global.scrollY = global.window.scrollY = 400; before = global.fetchCalls;
  pull(120); await tick();
  ok('a pull lower down the page is a scroll', global.fetchCalls === before);
  global.scrollY = global.window.scrollY = 0;

  /* the bug from the phone: 7:46 am on 8 Oct, sunrise 7:13, forecast frames
     starting at the top of the hour. "Now" must be 7:46 and daylight. */
  {
    const h2 = harness();
    await tick(); await tick();
    const t0 = Date.parse('2026-10-08T14:00:00Z') / 1000;    /* 7:00 am PDT */
    h2.api.S.frames = h2.api.S.frames.map((f, k) => ({ ...f, t: t0 + k * 3600 }));
    clock = Date.parse('2026-10-08T14:46:00Z');
    h2.api.S.h = 0; h2.api.paint();
    ok('frames span one hour past the scrubber', h2.api.S.frames.length === h2.api.HOURS + 1, h2.api.S.frames.length);
    ok('now at 7:46 am is daylight, not the 7:00 frame', !h2.html._cls.has('night'));
    clock = Date.parse('2026-10-08T14:10:00Z');                /* 7:10, before sunrise */
    h2.api.paint();
    ok('7:10 am is still night', h2.html._cls.has('night'));
    before = global.fetchCalls; clock = Date.parse('2026-12-01T00:00:00Z');   /* well past the last load */
    h2.handlers.window.focus(); await tick(); await tick();
    ok('focus after a long gap refetches too', global.fetchCalls > before);
  }

  /* a phone running an old build reloads itself on return */
  {
    const h3 = harness();
    await tick(); await tick();
    let reloaded = 0;
    global.location = { protocol: 'https:', pathname: '/karlo/', reload: () => reloaded++ };
    const realFetch = global.fetch;
    global.fetch = u => String(u).includes('?build=')
      ? Promise.resolve({ ok: true, text: () => Promise.resolve('<script>const BUILD="2099.01.01.1";</script>') })
      : realFetch(u);
    clock += 2 * 60e3; h3.handlers.document.visibilitychange(); await tick(); await tick(); await tick();
    ok('an old build reloads when a newer one is live', reloaded === 1, reloaded);
    global.fetch = u => String(u).includes('?build=')
      ? Promise.resolve({ ok: true, text: () => Promise.resolve(`const BUILD="${h3.api.BUILD}";`) })
      : realFetch(u);
    clock += 2 * 60e3; h3.handlers.document.visibilitychange(); await tick(); await tick(); await tick();
    ok('the current build does not reload', reloaded === 1, reloaded);
    global.fetch = realFetch; delete global.location;
  }

  const tab = harness({ standalone: false });
  ok('Safari in a tab keeps its own pull to refresh', !tab.handlers.window || !tab.handlers.window.touchstart);
  Date.now = realNow;
}
}

/* ── when the forecast fails ─────────────────────────────────────────── */
async function failureTests() {
head('failure is explained, and a saved forecast comes before the simulator');
{
  const tick = () => new Promise(r => setImmediate(r));
  const good = () => {                      /* a real-shaped Open-Meteo answer for all eleven spots */
    const n = 72, t0 = Math.floor(Date.now() / 3600e3) * 3600 - 7200;
    const hourly = { time: Array.from({ length: n }, (_, i) => t0 + i * 3600),
      temperature_2m: Array(n).fill(64), cloud_cover_low: Array(n).fill(10), visibility: Array(n).fill(24000),
      wind_speed_10m: Array(n).fill(9), cloud_cover_mid: Array(n).fill(0) };
    for (const L of api0.LEVELS) hourly[L.k] = Array(n).fill(0);
    return Array.from({ length: api0.SPOTS.length }, () => ({ elevation: 50, hourly }));
  };
  const api0 = harness().api;
  const ls = {};
  global.localStorage = { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v) }, removeItem: k => { delete ls[k] } };
  const realFetch = global.fetch;
  const run = async mk => {
    const h = harness({ fetchImpl: mk }); await tick(); await tick(); await tick(); await tick();
    return h;
  };
  const reply = (status, body) => () => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
  const text = (h, id) => h.store[id].textContent;

  for (const k of Object.keys(ls)) delete ls[k];
  let h = await run(() => Promise.reject(new TypeError('Failed to fetch')));
  ok('unreachable host says so, and is labeled simulated',
     text(h, 'liveLabel') === 'Simulated' && text(h, 'updated') === 'Could not reach Open-Meteo', text(h, 'updated'));
  ok('the scrubber does not claim live while simulated', text(h, 'tbRel') === 'Simulated', text(h, 'tbRel'));

  h = await run(reply(429, {}));
  ok('a busy service reads as busy', text(h, 'updated') === 'Open-Meteo is busy (429)', text(h, 'updated'));
  h = await run(reply(500, {}));
  ok('a server error shows its status', text(h, 'updated') === 'Open-Meteo error (500)', text(h, 'updated'));
  h = await run(reply(200, { nonsense: true }));
  ok('an unreadable answer says so', text(h, 'updated') === 'Forecast unreadable', text(h, 'updated'));

  let calls = 0;
  h = await run(() => (++calls === 1 ? Promise.reject(new TypeError('x')) : reply(200, good())()));
  ok('one failed attempt is retried and the page ends up live',
     calls === 2 && text(h, 'liveLabel') === 'Live forecast', calls + ' calls, ' + text(h, 'liveLabel'));
  ok('a good answer is kept for later', !!ls['karl.raw']);

  h = await run(() => Promise.reject(new TypeError('x')));
  ok('with a saved forecast, a failure shows it instead of the simulator',
     text(h, 'liveLabel') === 'Saved forecast' && /^From .* · Could not reach Open-Meteo$/.test(text(h, 'updated')),
     text(h, 'liveLabel') + ' / ' + text(h, 'updated'));
  ok('and the scrubber says saved', text(h, 'tbRel') === 'Saved', text(h, 'tbRel'));

  const o = JSON.parse(ls['karl.raw']); o.at -= 7 * 3600e3; ls['karl.raw'] = JSON.stringify(o);
  h = await run(() => Promise.reject(new TypeError('x')));
  ok('a forecast older than six hours is not trusted', text(h, 'liveLabel') === 'Simulated', text(h, 'liveLabel'));

  global.fetch = realFetch; delete global.localStorage;
}
}

head('leaders are light, and only the best spot\'s matches its dot');
{
  const src = fs.readFileSync(FILE, 'utf8');
  const pk = (src.match(/\.pk::after\{[^}]*\}/) || [''])[0], rail = (src.match(/\.rail i\{[^}]*\}/) || [''])[0];
  ok('hilltop leaders use --line', /background:var\(--line\)/.test(pk), pk);
  ok('rail ticks use --line', /background:var\(--line\)/.test(rail), rail);
  ok('a clear place that is not the pick keeps a light leader', !/\.pk\.on::after|\.rail i\.on/.test(src));
  const dot = (src.match(/\.dot\.on\{[^}]*background:(var\(--[a-z-]+\))/) || [])[1];
  const esc = dot ? dot.replace(/[()]/g, '\\$&') : '';
  ok('the pick\'s hilltop leader is the colour of its dot', !!dot && new RegExp('\\.pk\\.pick::after\\{background:' + esc + '\\}').test(src), dot);
  ok('and so is its rail tick', !!dot && new RegExp('\\.rail i\\.pick\\{background:' + esc + '\\}').test(src), dot);
  ok('no leader uses the dim accent', !/\.(pk\.pick::after|rail i\.pick)\{[^}]*clear-dim/.test(src));
  const h = harness(); h.api.S.frames = h.api.smoothAcross(h.api.simulate()); h.api.S.h = 12; h.api.paint();
  const kids = h.store.rail.children;
  const tickPicks = kids.filter(n => n.tagName === 'I' && n._cls.has('pick')).map(n => n.dataset.k);
  const labelPicks = kids.filter(n => n.tagName === 'B' && n._cls.has('pick')).map(n => n.dataset.k);
  ok('exactly one rail tick is the pick, and it is the bold label\'s', tickPicks.length === 1 && labelPicks.length === 1 && tickPicks[0] === labelPicks[0], tickPicks + ' / ' + labelPicks);
}

/* ── counting visits ─────────────────────────────────────────────────── */
async function analyticsTests() {
head('visits are counted on byekarl.com only, never on a flagged device, and without cookies');
{
  const tick = () => new Promise(r => setImmediate(r));
  const SRC = 'https://cloud.umami.is/script.js';
  const ls = {};
  const replaced = [];
  const setup = (host, search) => {
    global.localStorage = { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v) }, removeItem: k => { delete ls[k] } };
    global.location = { hostname: host, search, pathname: '/', hash: '', protocol: 'https:' };
    global.history = { replaceState: (a, b, u) => replaced.push(u) };
  };
  const scripts = () => global.document.documentElement.children.filter(c => c.src);
  const clear = () => { for (const k of Object.keys(ls)) delete ls[k]; replaced.length = 0; };
  const text = (h, id) => (h.store[id] ? h.store[id].textContent : '');

  /* where it loads */
  clear(); setup('byekarl.com', '');
  let h = harness(); await tick();
  ok('on byekarl.com one outside script is added', scripts().length === 1 && scripts()[0].src === SRC, scripts().length);
  const s = scripts()[0];
  ok('it carries the site id, the domain lock and Do Not Track',
     s._a['data-website-id'] === 'd59c07a5-fe76-4f55-be9d-cde3f01de557' &&
     s._a['data-domains'] === 'byekarl.com' && s._a['data-do-not-track'] === 'true', JSON.stringify(s._a));
  ok('the footer does not say the device is excluded', !/not counted/.test(h.store.fPlace.innerHTML));

  for (const host of ['localhost', 'antocrimi.github.io', '']) {
    clear(); setup(host, ''); harness(); await tick();
    ok(`on "${host || 'no host'}" nothing is added`, scripts().length === 0, scripts().length);
  }
  delete global.location; delete global.history; delete global.localStorage;
  harness(); await tick();
  ok('with no location at all the page still starts and adds nothing', scripts().length === 0);

  /* ?me */
  clear(); setup('byekarl.com', '?me');
  h = harness(); await tick();
  ok('?me sets the flag', ls['karl.me'] === '1', JSON.stringify(ls));
  ok('?me adds no script', scripts().length === 0, scripts().length);
  ok('?me is removed from the address', replaced.length === 1 && replaced[0] === '/', JSON.stringify(replaced));
  ok('the footer says this device is not counted', /not counted/.test(h.store.fPlace.innerHTML), h.store.fPlace.innerHTML);

  clear(); setup('byekarl.com', '?debug&me');
  harness(); await tick();
  ok('?me leaves other parameters in the address', replaced[0] === '/?debug=', JSON.stringify(replaced));

  ls['karl.me'] = '1'; replaced.length = 0; setup('byekarl.com', '');
  h = harness(); await tick();
  ok('the flag holds on later visits without ?me', scripts().length === 0 && replaced.length === 0);

  setup('byekarl.com', '?me=off');
  h = harness(); await tick();
  ok('?me=off clears the flag', !('karl.me' in ls), JSON.stringify(ls));
  ok('and the visit is counted again', scripts().length === 1, scripts().length);

  /* events */
  const events = [];
  const withCounter = async (host, search) => {
    setup(host, search);
    const hh = harness();
    global.window.umami = { track: (n, d) => events.push([n, d]) };
    await tick(); await tick(); await tick();
    return hh;
  };
  clear(); events.length = 0;
  h = await withCounter('byekarl.com', '');
  ok('the forecast state is reported once the page has loaded',
     events.some(e => e[0] === 'forecast' && e[1].src === 'sim' && typeof e[1].why === 'string'), JSON.stringify(events));

  events.length = 0;
  for (let i = 0; i < 15; i++) h.handlers.time.change({ target: { value: String(i * 0.25 + 5) } });
  const sc = events.filter(e => e[0] === 'scrub');
  ok('a scrub is one event per release, capped at twelve a visit', sc.length === 12, sc.length);
  ok('and it names the hour only', sc[0][1].hour === 5 && Object.keys(sc[0][1]).join() === 'hour', JSON.stringify(sc[0]));

  events.length = 0;
  h.handlers.acc.click({ target: { closest: () => ({ id: 't-met' }) } });
  h.handlers.acc.click({ target: { closest: () => ({ id: 't-met' }) } });
  h.handlers.acc.click({ target: { closest: () => ({ id: 't-dat' }) } });
  ok('opening a panel is reported and closing it is not',
     JSON.stringify(events) === JSON.stringify([['panel', { name: 'met' }], ['panel', { name: 'dat' }]]), JSON.stringify(events));

  events.length = 0;
  h.handlers.units.click({ target: { closest: () => ({ dataset: { u: 'c' }, setAttribute() {} }) } });
  ok('a unit change is reported', JSON.stringify(events) === JSON.stringify([['units', { unit: 'c' }]]), JSON.stringify(events));

  events.length = 0;
  h.handlers.refresh.click(); await tick();
  ok('the refresh button is reported', events.some(e => e[0] === 'refresh' && e[1].how === 'button'), JSON.stringify(events));

  /* a flagged device sends nothing */
  clear(); events.length = 0; ls['karl.me'] = '1';
  h = await withCounter('byekarl.com', '');
  h.handlers.time.change({ target: { value: '3' } });
  h.handlers.acc.click({ target: { closest: () => ({ id: 't-how' }) } });
  ok('a flagged device sends no events', events.length === 0, JSON.stringify(events));

  /* before the script arrives, events wait for it */
  clear(); setup('byekarl.com', '');
  h = harness(); await tick(); await tick();
  const sn = scripts()[0];
  h.handlers.units.click({ target: { closest: () => ({ dataset: { u: 'f' }, setAttribute() {} }) } });
  events.length = 0;
  global.window.umami = { track: (n, d) => events.push([n, d]) };
  sn.onload();
  ok('events raised before the script loads are sent when it does',
     events.some(e => e[0] === 'units') && events.some(e => e[0] === 'forecast'), JSON.stringify(events));

  /* what the page says about it */
  const src = fs.readFileSync(FILE, 'utf8');
  const outside = [...src.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1])
    .concat([...src.matchAll(/\.src\s*=\s*"(https?:\/\/[^"]+)"|UMAMI_SRC\s*=\s*"([^"]+)"/g)].map(m => m[1] || m[2]));
  ok('the only outside script is Umami', outside.filter(u => /\.js(\?|$)/.test(u)).every(u => u === SRC), outside.join(' '));
  ok('the privacy line no longer claims there is no tracking', !/no tracking/i.test(src) && /counted anonymously\s+with Umami/.test(src));
  ok('no cookie is set', !/document\.cookie/.test(src));
  const brief = fs.readFileSync(path.join(__dirname, 'BRIEFING.md'), 'utf8');
  ok('the decision is recorded in BRIEFING.md', /### Counting visits/.test(brief) && /Umami/.test(brief));

  delete global.location; delete global.history; delete global.localStorage; delete global.window;
}
}

resumeTests().then(failureTests).then(analyticsTests).catch(e => { fail++; console.log('  FAIL  async tests threw   → ' + e.stack); }).then(() => {
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
});
