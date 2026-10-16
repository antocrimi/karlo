/* Lead-time back-test: how the low-layer call degrades from 1 to 3 days ahead.
   Uses Open-Meteo's Previous Runs API, whose `_previous_dayN` variables are the
   forecast issued N days before the hour it describes. Which variables the API
   carries for N > 0 is not documented, so each one is probed and reported. */
"use strict";
const fs = require("fs");
const L = require("./backtest-lib.js");
const { STATIONS, get, iemUrl, sleep, args } = require("./backtest-io.js");
const { start, end } = args;
const BASE = ["cloud_cover_low", "visibility"].concat(L.LEVELS);
const LEADS = [1, 2, 3];
const notes = [];

async function fetchVars(s, names, from, to) {
  const u = "https://previous-runs-api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lon +
    "&start_date=" + from + "&end_date=" + to + "&hourly=" + names.join(",") + "&timeformat=unixtime&timezone=GMT";
  try { return (await (await get(u, 2)).json()).hourly || null; } catch (e) { return null; }
}

/* Returns { time, <base name>: [...] } for one lead, or null when nothing works. */
async function modelAtLead(s, d) {
  const out = { time: [] }, have = {};
  const iso = x => x.toISOString().slice(0, 10);
  let cur = new Date(start + "T00:00:00Z"); const stop = new Date(end + "T00:00:00Z");
  while (cur <= stop) {
    const to = new Date(Math.min(+cur + 30 * 864e5, +stop));
    const names = BASE.map(b => b + "_previous_day" + d);
    let h = await fetchVars(s, names, iso(cur), iso(to));
    if (!h) { /* one of them is unsupported: take them one at a time */
      h = { time: null };
      for (const b of BASE) {
        const one = await fetchVars(s, [b + "_previous_day" + d], iso(cur), iso(to));
        if (one) { h.time = h.time || one.time; h[b + "_previous_day" + d] = one[b + "_previous_day" + d]; }
        else have[b] = false;
        await sleep(500);
      }
      if (!h.time) return null;
    }
    out.time.push(...h.time);
    for (const b of BASE) if (have[b] !== false) (out[b] = out[b] || []).push(...(h[b + "_previous_day" + d] || []));
    cur = new Date(+to + 864e5); await sleep(1500);
  }
  for (const b of BASE) if (!out[b]) { notes.push(s.id + " lead " + d + "d: " + b + " not available"); out[b] = out.time.map(() => null); }
  else if (out[b].every(v => v == null)) notes.push(s.id + " lead " + d + "d: " + b + " returned only nulls");
  return out;
}

const daytime = p => { const h = L.localHour(p.t); return h >= 6 && h <= 18; };

(async () => {
  const csv = await (await get(iemUrl(start, end))).text();
  const obs = L.parseIem(csv);
  const md = ["# Karl back-test by lead time", "", "Forecast issued 1, 2 and 3 days ahead against airport METARs, " + start + " to " + end + ".", ""];
  const all = { 1: [], 2: [], 3: [] };
  for (const s of STATIONS) {
    const o = obs.filter(x => x.station === s.id);
    md.push("## " + s.name, "", L.HEAD.replace("| |", "| lead |"));
    for (const d of LEADS) {
      const m = await modelAtLead(s, d);
      if (!m) { md.push("| " + d + " day | no data |"); notes.push(s.id + " lead " + d + "d: no data at all"); continue; }
      const pairs = L.pairHours(o, m); all[d].push(...pairs);
      md.push(L.row(d + " day, levels >= 45", L.tally(pairs, L.predLevels(45), L.truthLayer)));
      md.push(L.row(d + " day, 06:00 to 18:00", L.tally(pairs.filter(daytime), L.predLevels(45), L.truthLayer)));
      md.push(L.row(d + " day, cloud_cover_low >= 45", L.tally(pairs, L.predLow(45), L.truthLayer)));
      console.error(s.id + " lead " + d + ": " + pairs.length + " paired");
    }
    md.push("");
  }
  md.push("## All stations", "", L.HEAD.replace("| |", "| lead |"));
  for (const d of LEADS) md.push(L.row(d + " day, levels >= 45", L.tally(all[d], L.predLevels(45), L.truthLayer)));
  md.push("", "## Notes", "", notes.length ? notes.map(n => "- " + n).join("\n") : "All variables came back for every lead.");
  const text = md.join("\n");
  fs.writeFileSync("report-lead.md", text); console.log(text);
})().catch(e => { console.error(e); process.exit(1); });
