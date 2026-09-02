# NoKarl

Where the fog isn't, in San Francisco. Eleven spots, twenty-four hours, one place at a time.

NoKarl reads live forecast data across the city and splits eleven places at the fog line: clear on one side, under Karl on the other. When nothing is clear it says so and names no place.

The eleven are chosen for somewhere worth sitting outside, and then constrained by the chart. A cross section only means something if the places sit near the line it cuts, so a place more than 2.5 km off that line does not go on it however good it is. Fort Mason and McLaren failed that rule: both sat alone in a grid square to the side of the transect rather than further along it, and Fort Mason takes its fog through the Golden Gate rather than over the Twin Peaks ridge, so the section drew it as a spike in the middle of the city.

Live at [antocrimi.github.io/karlo](https://antocrimi.github.io/karlo/).

It is a project site, not a user site, so it is served from the `/karlo/` sub-path. The `canonical`, `og:url` and `og:image` tags in `index.html` are absolute and have to carry that sub-path: `og-image.png` at the bare domain is a 404, which is a link preview with no image and nothing on the page to show it. `test.js` checks them against this README so the two cannot drift.

## Deploy

Put `index.html` and `logo.png` at the repo root, then Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.

`og-image.png` (1200×630) is optional and only feeds link previews.

No build step. No dependencies. One code file plus the wordmark.

## Data

One batched [Open-Meteo](https://open-meteo.com/) request covers all eleven coordinates and nine hourly variables for the next twenty-four hours. If it fails the page falls back to a simulator built on the same physics, so the interface still behaves correctly offline.

Two constraints:

- **Attribution is required.** Open-Meteo data is CC BY 4.0. The credit line in the footer stays.
- **The free tier is non-commercial only.** 10,000 calls per day, rate-limited by IP. An ad or a subscription moves this to a paid plan at $29/month.

Nine variables is deliberate: requests covering more than ten variables bill as multiple calls.

## How it decides

A spot is **clear** when cloud overhead is under 45% *and* visibility is over 5 km. Both, because cloud alone can't tell a sunny smoke day from a sunny one, and can't see fog at street level.

The chart's vertical axis is an elevation axis, and the cloud is drawn on it as a real surface running through all eleven places, with a leading edge where the layer runs out. Each spot has its own **sunlight line**: the height you would have to climb to get out from under the cloud. Stand at or above it and you are clear. That is the same curve the surface is drawn from, at that spot's own place in the city, so the picture and the list cannot disagree at any point along the section.

The fog is drawn as one body of cloud, full bleed. It spans the frame at every hour and carries everything in its height and its density, so it grows out of the ground and sinks back into it rather than ending somewhere on screen. Drag the hours and it moves: the heights ease toward the new reading instead of snapping to it.

The model runs on a 3 km grid across a city 10.8 km wide, so one grid cell is a quarter of the chart and covers two or three of the eleven places. Treating them as independent draws a fog edge about seven times sharper than the model can resolve. The readings are smoothed at that scale first, once, before anything is drawn or decided, so the percentage in the list and the height of the body come from the same numbers.

The vertical scale is true up to 300 m and compressed above it. The layer often sits at 700 m while the tallest place on the chart is Twin Peaks at 281 m, so drawing it literally pushed the cloud off the top of the frame and left a third of the picture empty. Nothing is lost: a place is clear when it stands above the fog line, so the two heights only ever need to be comparable below the tallest place, and everything below that is still at true scale.

"Cloud overhead" is not the model's low-cloud figure. Cloud is sampled at four altitudes — roughly 110, 320, 540 and 760 metres — plus a mid-level field, and cover at any height in between is interpolated. Each spot then asks three separate questions of that curve using its own elevation: is there cloud at my altitude, is there cloud anywhere above me, and is there cloud below me. The second is what decides whether the sun is blocked, and it is the maximum across everything overhead — otherwise a high overcast deck with clear air beneath reads as a sunny day.

The Data panel reports how many of the eleven are reading genuinely different air. The model runs on a 3 km grid and the city is about 11 km across, so places share grid squares, and that count is what the cross section actually has to draw with.

Inside each group the calmest spot sits on top, so exposed places sink. A score combining clarity, visibility, wind and temperature breaks ties on equal wind; it isn't displayed.

The forecast is hourly and the scrubber moves in quarter hours, reading between two hours. That is where you see the layer come in off the Pacific and pull back, which is the thing the numbers are describing.

## What is and isn't measured

- **Model output:** cloud, visibility, wind, temperature. Forecast data, not station observations.
- **Estimated:** the year-round clear-sky figure used as a tiebreak is a local estimate. Replace it before anyone relies on it.
- **Read from the API:** each spot's elevation, from Open-Meteo's own 90 m digital elevation model.

## Units

Inferred from the browser's locale, with a manual override in the footer. Scoring always runs in °F and mph internally, so the ranking never shifts when units change.

## Known limits

It's a 3 km model resolving a fog edge sharper than 3 km. It can be wrong, and it's verifiable by looking out of a window — twice now that's exactly how a bug was found. See `BRIEFING.md` §9 for the accuracy work and what's planned next.

The build tag in the footer (`v2026.08.31`) shows which version is actually being served, which is useful when a deploy looks like it hasn't landed.
