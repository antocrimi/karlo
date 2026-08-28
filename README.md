# NoKarl

Where the fog isn't, in San Francisco. Eleven spots, twenty-four hours, one place at a time.

NoKarl reads live forecast data across the city and splits eleven places at the fog line — clear on one side, under Karl on the other. When nothing is clear it says so and names no place.

Live at [antocrimi.github.io](https://antocrimi.github.io/).

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

The chart's vertical axis is an elevation axis, and the cloud band is drawn on it as a real layer — between the height where cover begins and the height where it ends. A summit appears above the band only when it genuinely stands above the cloud. The same number decides the verdict, so the picture and the list cannot disagree.

"Cloud overhead" is not the model's low-cloud figure. Cloud is sampled at four altitudes — roughly 110, 320, 540 and 760 metres — plus a mid-level field, and cover at any height in between is interpolated. Each spot then asks three separate questions of that curve using its own elevation: is there cloud at my altitude, is there cloud anywhere above me, and is there cloud below me. The second is what decides whether the sun is blocked, and it is the maximum across everything overhead — otherwise a high overcast deck with clear air beneath reads as a sunny day.

Inside each group the calmest spot sits on top, so exposed places sink. A score combining clarity, visibility, wind and temperature breaks ties on equal wind; it isn't displayed.

## What is and isn't measured

- **Model output:** cloud, visibility, wind, temperature. Forecast data, not station observations.
- **Estimated:** the year-round clear-sky figure used as a tiebreak is a local estimate. Replace it before anyone relies on it.
- **Read from the API:** each spot's elevation, from Open-Meteo's own 90 m digital elevation model.

## Units

Inferred from the browser's locale, with a manual override in the footer. Scoring always runs in °F and mph internally, so the ranking never shifts when units change.

## Known limits

It's a 3 km model resolving a fog edge sharper than 3 km. It can be wrong, and it's verifiable by looking out of a window — twice now that's exactly how a bug was found. See `BRIEFING.md` §9 for the accuracy work and what's planned next.

The build tag in the footer (`v2026.08.28`) shows which version is actually being served, which is useful when a deploy looks like it hasn't landed.
