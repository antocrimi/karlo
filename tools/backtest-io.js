/* Shared fetch helpers for the back-test scripts. */
"use strict";
const L = require("./backtest-lib.js");
const STATIONS = [
  { id: "SFO", name: "San Francisco Intl (KSFO)", lat: 37.6188, lon: -122.3754 },
  { id: "OAK", name: "Oakland Intl (KOAK)", lat: 37.7213, lon: -122.2208 },
  { id: "HAF", name: "Half Moon Bay (KHAF)", lat: 37.5134, lon: -122.5012 }
];
const args = { start: process.argv[2] || "2026-06-01", end: process.argv[3] || "2026-10-10" };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, tries) {
  for (let i = 1; i <= (tries || 4); i++) {
    const r = await fetch(url, { headers: { "User-Agent": "karl-backtest (github.com/antocrimi/karlo)" } });
    if (r.ok) return r;
    console.error("HTTP " + r.status + " for " + url.slice(0, 120));
    if (i === (tries || 4) || (r.status < 500 && r.status !== 429)) throw new Error("HTTP " + r.status + " " + url.slice(0, 160));
    await sleep(2000 * i);
  }
}

function iemUrl(start, end) {
  const [y1, m1, d1] = start.split("-").map(Number), [y2, m2, d2] = end.split("-").map(Number);
  const q = [];
  STATIONS.forEach(s => q.push("station=" + s.id));
  ["skyc1", "skyc2", "skyc3", "skyc4", "skyl1", "skyl2", "skyl3", "skyl4", "vsby"].forEach(d => q.push("data=" + d));
  q.push("year1=" + y1, "month1=" + m1, "day1=" + d1, "year2=" + y2, "month2=" + m2, "day2=" + (d2 + 1));
  q.push("tz=Etc/UTC", "format=onlycomma", "latlon=no", "missing=M", "trace=T", "direct=no", "report_type=3", "report_type=4");
  return "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?" + q.join("&");
}


module.exports = { STATIONS, get, iemUrl, sleep, args };
