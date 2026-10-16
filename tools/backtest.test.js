/* Fixture tests for the back-test arithmetic. `node tools/backtest.test.js` */
"use strict";
const L = require("./backtest-lib.js");
const assert = require("assert");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const csv = [
  "station,valid,skyc1,skyc2,skyc3,skyc4,skyl1,skyl2,skyl3,skyl4,vsby",
  "SFO,2026-08-01 15:56,OVC,M,M,M,800,M,M,M,2.50",
  "SFO,2026-08-01 16:56,FEW,BKN,M,M,300,6000,M,M,10.00",
  "SFO,2026-08-01 17:56,OVC,M,M,M,500,M,M,M,10.00",
  "SFO,2026-08-01 18:20,BKN,M,M,M,1200,M,M,M,M"
].join("\n");
const obs = L.parseIem(csv);
ok(obs.length === 4, "parses four rows");
ok(L.ceilingFt(obs[0].layers) === 800, "overcast base 800 ft");
ok(L.ceilingFt(obs[1].layers) === 6000, "few cloud is not a ceiling, broken at 6000 is");
ok(L.ceilingFt([{cov:"CLR",ft:null}]) === null, "clear has no ceiling");
ok(obs[3].vsbyMi === null, "missing visibility stays null");
assert.throws(() => L.parseIem("a,b\n1,2"), /lacks/); n++;

const t0 = Date.parse("2026-08-01T16:00:00Z") / 1000;
const model = { time: [t0, t0 + 3600, t0 + 7200],
  cloud_cover_low: [80, 10, 0], visibility: [3000, 20000, 20000],
  cloud_cover_1000hPa: [90, 5, 0], cloud_cover_975hPa: [70, 0, 0], cloud_cover_950hPa: [0, 0, 0], cloud_cover_925hPa: [0, 0, 0] };
const pairs = L.pairHours(obs, model);
ok(pairs.length === 3, "56-minute METARs pair with the next hour");
ok(pairs[0].obs.layers[0].cov === "OVC", "15:56 pairs with 16:00");

const hit = L.tally(pairs, L.predLevels(45), L.truthLayer);
ok(hit.hit === 1 && hit.cn === 1 && hit.miss === 1 && hit.fa === 0, "hit, miss and correct negative counted: " + JSON.stringify(hit));
ok(L.stats(hit).pod === 50 && L.stats(hit).acc === 67, "rates");
const vis = L.tally(pairs, L.predVis, L.truthVis);
ok(vis.hit === 1 && vis.cn === 2, "visibility 2.5 mi is under 5 km and 10 mi is not");
ok(L.tally(pairs, L.predLevels(95), L.truthLayer).hit === 0, "threshold above the data catches nothing");
ok(L.tally([{ t: t0, obs: { layers: [], vsbyMi: null }, m: {} }], L.predLow(45), L.truthLayer).hit === 0, "missing fields are skipped, not counted");
ok(L.localHour(t0) === 9, "16:00 UTC in August is 9 am Pacific");
const tot = L.pairHours(obs, { time: model.time, cloud_cover: [95, 20, 90] });
const tt = L.tally(tot, L.predTotal(45), L.truthAny);
ok(tt.hit === 2 && tt.miss === 1, "total cover against any broken layer: " + JSON.stringify(tt));
ok(L.tally(tot, L.predTotal(45), L.truthAny).fa === 0 && L.truthAny({ obs: { layers: [{ cov: "FEW", ft: 300 }] } }) === false, "few cloud is not broken");
console.log(n + " backtest tests passed");
