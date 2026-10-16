/* Prints what the Previous Runs API answers for each variable and model. */
"use strict";
const vars = ["cloud_cover_previous_day1", "cloud_cover_low_previous_day1", "cloud_cover_mid_previous_day1", "visibility_previous_day1",
  "cloud_cover_925hPa_previous_day1", "cloud_cover_1000hPa_previous_day1", "cloud_cover_low", "cloud_cover_925hPa", "visibility"];
const models = [null, "best_match", "ecmwf_ifs025", "gfs_seamless", "ncep_hrrr_conus", "icon_seamless"];
(async () => {
  for (const m of models) for (const v of vars) {
    const u = "https://previous-runs-api.open-meteo.com/v1/forecast?latitude=37.62&longitude=-122.37&start_date=2026-09-01&end_date=2026-09-02&hourly=" + v + "&timeformat=unixtime&timezone=GMT" + (m ? "&models=" + m : "");
    try {
      const r = await fetch(u); const t = await r.text(); let note = t.slice(0, 120);
      try { const j = JSON.parse(t); if (j.hourly) { const k = Object.keys(j.hourly).find(x => x !== "time"); const a = j.hourly[k] || []; note = k + ": " + a.filter(x => x != null).length + "/" + a.length + " non-null"; } } catch (e) {}
      console.log((m || "default") + " | " + v + " | " + r.status + " | " + note);
    } catch (e) { console.log((m || "default") + " | " + v + " | error " + e.message); }
    await new Promise(r => setTimeout(r, 300));
  }
})();
