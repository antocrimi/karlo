/* Back-test: archived Open-Meteo forecasts against airport METARs.
   Run by .github/workflows/backtest.yml (the build workspace cannot reach these
   hosts) or locally with `node tools/backtest.js 2026-06-01 2026-10-10`.
   Node 18+, no dependencies. Writes a markdown report to stdout. */
"use strict";
const L = require("./backtest-lib.js");
const fs = require("fs");

const { STATIONS, get, iemUrl, sleep, args } = require("./backtest-io.js");
const { start, end } = args;

async function model(s) {
  const vars = ["cloud_cover_low", "cloud_cover_mid", "visibility"].concat(L.LEVELS).join(",");
  const out = { time: [] };
  let cur = new Date(start + "T00:00:00Z");
  const stop = new Date(end + "T00:00:00Z");
  while (cur <= stop) {
    const to = new Date(Math.min(+cur + 30 * 864e5, +stop));
    const iso = d => d.toISOString().slice(0, 10);
    const u = "https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lon +
      "&start_date=" + iso(cur) + "&end_date=" + iso(to) + "&hourly=" + vars + "&timeformat=unixtime&timezone=GMT";
    const j = await (await get(u)).json();
    if (!j.hourly) throw new Error("No hourly block: " + JSON.stringify(j).slice(0, 200));
    for (const k of Object.keys(j.hourly)) (out[k] = out[k] || []).push(...j.hourly[k]);
    cur = new Date(+to + 864e5);
    await sleep(1500);
  }
  return out;
}

(async () => {
  const csv = await (await get(iemUrl(start, end))).text();
  fs.writeFileSync("metar.csv", csv);
  const obs = L.parseIem(csv);
  console.error("METAR rows: " + obs.length);
  const md = ["# Karl back-test", "", "Archived Open-Meteo forecasts against airport METARs, " + start + " to " + end + ".", ""];
  const all = {};
  for (const s of STATIONS) {
    const o = obs.filter(x => x.station === s.id);
    const m = await model(s);
    const pairs = L.pairHours(o, m);
    all[s.id] = pairs;
    console.error(s.id + ": " + o.length + " METARs, " + m.time.length + " model hours, " + pairs.length + " paired");
    md.push("## " + s.name, "", o.length + " METARs, " + pairs.length + " paired hours.", "");
    md.push("### Low layer (METAR broken or overcast at or below " + L.CEIL_FT + " ft) against the model", "", L.HEAD);
    [["levels >= 30", L.predLevels(30)], ["levels >= 45 (Karl's line)", L.predLevels(45)], ["levels >= 60", L.predLevels(60)],
     ["cloud_cover_low >= 45", L.predLow(45)]].forEach(([n, f]) => md.push(L.row(n, L.tally(pairs, f, L.truthLayer))));
    md.push("", "### Visibility under 5 km", "", L.HEAD, L.row("model visibility", L.tally(pairs, L.predVis, L.truthVis)), "");
    md.push("### By hour of day, Pacific time (levels >= 45)", "", L.HEAD);
    for (let h = 0; h < 24; h++) md.push(L.row(String(h).padStart(2, "0") + ":00", L.tally(pairs.filter(p => L.localHour(p.t) === h), L.predLevels(45), L.truthLayer)));
    md.push("", "### By month (levels >= 45)", "", L.HEAD);
    [...new Set(pairs.map(p => L.localMonth(p.t)))].sort().forEach(mo =>
      md.push(L.row(mo, L.tally(pairs.filter(p => L.localMonth(p.t) === mo), L.predLevels(45), L.truthLayer))));
    md.push("");
  }
  const everyone = [].concat(...Object.values(all));
  md.push("## All three stations", "", L.HEAD, L.row("levels >= 45", L.tally(everyone, L.predLevels(45), L.truthLayer)), "");
  const text = md.join("\n");
  fs.writeFileSync("report.md", text);
  console.log(text);
})().catch(e => { console.error(e); process.exit(1); });
