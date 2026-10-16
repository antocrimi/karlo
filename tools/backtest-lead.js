/* Lead-time back-test on total cloud cover. Open-Meteo's Previous Runs API
   carries `cloud_cover_previous_dayN` but, as tools/probe.js showed on
   2026-10-16, not pressure-level cloud cover, cloud_cover_low or visibility.
   Total cover is the proxy: it shows how fast skill decays with lead, not
   Karl's own variables. Day 0 is the latest run, days 1 to 3 are 24 to 72 h. */
"use strict";
const fs = require("fs");
const L = require("./backtest-lib.js");
const { STATIONS, get, iemUrl, sleep, args } = require("./backtest-io.js");
const { start, end } = args;
const LEADS = [0, 1, 2, 3];
const name = d => d === 0 ? "cloud_cover" : "cloud_cover_previous_day" + d;

async function modelAtLead(s, d) {
  const out = { time: [], cloud_cover: [] };
  const iso = x => x.toISOString().slice(0, 10);
  let cur = new Date(start + "T00:00:00Z"); const stop = new Date(end + "T00:00:00Z");
  while (cur <= stop) {
    const to = new Date(Math.min(+cur + 30 * 864e5, +stop));
    const u = "https://previous-runs-api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lon +
      "&start_date=" + iso(cur) + "&end_date=" + iso(to) + "&hourly=" + name(d) + "&timeformat=unixtime&timezone=GMT";
    const j = await (await get(u)).json();
    out.time.push(...j.hourly.time); out.cloud_cover.push(...j.hourly[name(d)]);
    cur = new Date(+to + 864e5); await sleep(800);
  }
  return out;
}
const daytime = p => { const h = L.localHour(p.t); return h >= 6 && h <= 18; };

(async () => {
  const obs = L.parseIem(await (await get(iemUrl(start, end))).text());
  const md = ["# Karl back-test by lead time (total cloud cover)", "",
    "Total cloud cover from the forecast issued 0 to 3 days ahead, against airport METARs, " + start + " to " + end + ". Proxy for Karl's own variables, which the API does not carry at lead.", ""];
  const all = {}; LEADS.forEach(d => all[d] = []);
  for (const s of STATIONS) {
    const o = obs.filter(x => x.station === s.id);
    md.push("## " + s.name, "", "Truth: any broken or overcast layer.", "", L.HEAD.replace("| |", "| lead |"));
    const rows2 = [];
    for (const d of LEADS) {
      const pairs = L.pairHours(o, await modelAtLead(s, d)); all[d].push(...pairs);
      md.push(L.row(d + " day, cover >= 45", L.tally(pairs, L.predTotal(45), L.truthAny)));
      md.push(L.row(d + " day, 06:00 to 18:00", L.tally(pairs.filter(daytime), L.predTotal(45), L.truthAny)));
      rows2.push(L.row(d + " day, cover >= 45", L.tally(pairs, L.predTotal(45), L.truthLayer)));
      console.error(s.id + " lead " + d + ": " + pairs.length + " paired");
    }
    md.push("", "Truth: broken or overcast at or below " + L.CEIL_FT + " ft.", "", L.HEAD.replace("| |", "| lead |"), ...rows2, "");
  }
  md.push("## All stations, any broken layer", "", L.HEAD.replace("| |", "| lead |"));
  for (const d of LEADS) md.push(L.row(d + " day, cover >= 45", L.tally(all[d], L.predTotal(45), L.truthAny)));
  const text = md.join("\n");
  fs.writeFileSync("report-lead.md", text); console.log(text);
})().catch(e => { console.error(e); process.exit(1); });
