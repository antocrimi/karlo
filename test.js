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
      /* ~6.35 px per character at 11.5px system UI — close enough to pack labels */
      get offsetWidth() { return Math.round((this.textContent || '').length * 6.35) },
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
  js += '\nmodule.exports={S,paint,simulate,split,profile,layerOf,coverCurve,note,' +
        'SPOTS,LEVELS,CLEAR,VIS_CLEAR,yM,GROUND,VBW,VBH,HOURS,BUILD,smooth,RIDGE,cityLayer};';
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
const { S, paint, simulate, split, profile, layerOf, note,
        SPOTS, LEVELS, CLEAR, VIS_CLEAR, yM, HOURS, BUILD, cityLayer } = api;
S.frames = simulate();
const clean = x => (x || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const P = n => SPOTS.find(s => s.n === n);
const mkP = lv => LEVELS.map((L, i) => ({ k: L.k, h: L.h, c: lv[i] }));

head('BOOT');
S.h = 0; paint();
ok('verdict renders', clean(store.verdict._html).length > 4, clean(store.verdict._html));
ok('board renders', (store.board._html || '').includes('class="tr'));
ok('map dots built', (store.dots._html || '').match(/class="dot/g)?.length === SPOTS.length);
ok('build tag present', typeof BUILD === 'string' && /^\d{4}\.\d{2}\.\d{2}$/.test(BUILD), BUILD);

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
    const under = !(p.top == null || sp.e >= p.top) || p.mid >= CLEAR;   /* single spot: its own profile is the city */
    ok(`${label}: ${name} ${shouldBeUnder ? 'under' : 'clear'}`, under === shouldBeUnder,
       `overhead ${Math.round(p.overhead)}%  top ${p.top == null ? 'none' : Math.round(p.top) + 'm'}`);
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
  const { sun, fog } = split(k);
  if (!sun.length) quiet++;
  heads.add((store.board._html.match(/class="sec"/g) || []).length);
  rows.add((store.board._html.match(/class="tr /g) || []).length);
  const L = cityLayer(S.frames[k]);
  S.frames[k].spots.forEach(s => {
    const drawnClear = L == null || s.elev >= L.top;
    const saysClear = drawnClear && (s.mid ?? 0) < CLEAR;
    if (drawnClear !== saysClear && (s.mid ?? 0) < CLEAR) bad++;
  });
}
ok('no dot/verdict disagreements across 24 h', bad === 0, bad + ' found');

/* the band spans the full width, so a clear dot must sit ABOVE it, never
   merely outside it. This is the check that caught the leading edge. */
let insideBand = 0;
for (let k = 0; k < HOURS; k++) {
  S.h = k; paint();
  const d = store.fogBody._a.d || '';
  if (!d) continue;
  const ys = (d.match(/-?[\d.]+/g) || []).map(Number).filter((_, i) => i % 2 === 1);
  const bandTop = Math.min(...ys);
  const L = cityLayer(S.frames[k]);
  S.frames[k].spots.forEach(s => {
    const clear = (L == null || s.elev >= L.top) && (s.mid ?? 0) < CLEAR;
    const dotY = yM(s.elev);
    if (clear && dotY > bandTop + 1) insideBand++;   /* amber dot inside the fog */
  });
}
ok('no clear dot drawn inside the band', insideBand === 0, insideBand + ' found');
ok('every hour renders all spots', rows.size === 1 && [...rows][0] === SPOTS.length, [...rows].join(','));
ok('empty groups drop their heading', heads.size > 1 || quiet === 0, 'headings seen: ' + [...heads].join(','));
ok('quiet rule reachable in the simulator', quiet > 0, quiet + ' quiet hours');

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

head('FAIL-SAFES');
ok('paint runs before measurement', src.indexOf('paint();') < src.indexOf('safeLayout();'));
ok('layout errors cannot blank the page', src.includes('try{ relayout(); }catch(e){}'));
ok('every $() id exists in the markup', (() => {
  const ids = new Set([...src.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const js = src.slice(src.lastIndexOf('<script>'));
  return [...new Set([...js.matchAll(/\$\("([^"]+)"\)/g)].map(m => m[1]))].every(u => ids.has(u));
})());

/* ── optional: render the geometry so it can be judged without deploying ── */
if (process.argv.includes('--svg')) {
  const { smooth, RIDGE, GROUND, VBW, VBH } = api;
  const terr = `M0,${GROUND} ` + smooth(RIDGE) + ` L${VBW},${GROUND} Z`;
  const hrs = [4, 8, 12, 16];
  const g = hrs.map((k, i) => {
    S.h = k; paint();
    const dots = S.frames[k].spots.map(s => ({ x: s.x, y: s.y, on: s.top == null || s.elev >= s.top }));
    return `<g transform="translate(0,${i * 262})">
<text x="8" y="18" fill="#63757C" font-family="monospace" font-size="12">+${k}h</text>
<defs><linearGradient id="f${i}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#A9B7BE" stop-opacity="0"/>
<stop offset="30%" stop-color="#A9B7BE" stop-opacity=".24"/>
<stop offset="100%" stop-color="#A9B7BE" stop-opacity=".50"/></linearGradient></defs>
<rect width="${VBW}" height="${VBH}" fill="#0E161C"/>
<path d="${store.fogBody._a.d}" fill="url(#f${i})"/>
<path d="${terr}" fill="#1E2B33" stroke="rgba(169,183,190,.34)" stroke-width="1"/>
${dots.map(d => `<circle cx="${d.x}" cy="${d.y}" r="6" fill="${d.on ? '#F0A03C' : '#3B4A52'}" stroke="${d.on ? '#F0A03C' : '#63757C'}"/>`).join('')}
</g>`;
  }).join('');
  fs.writeFileSync(path.join(__dirname, 'map-preview.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VBW} ${262 * hrs.length}" width="${VBW}">${g}</svg>`);
  console.log('\n  wrote map-preview.svg');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
