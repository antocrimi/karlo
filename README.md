# NoKarl

Where the fog isn't, in San Francisco. Eleven spots, twenty-four hours, one place at a time.

NoKarl reads live forecast data across the city and splits eleven places at the fog line — clear on one side, under Karl on the other. When nothing is clear it says so and names no place.

Live at [antocrimi.github.io](https://antocrimi.github.io/).

## Deploy

Put `index.html` and `logo.png` at the repo root, then Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.

`og-image.png` (1200×630) is optional and only feeds link previews.

No build step. No dependencies. One code file plus the wordmark.

## Data

One batched [Open-Meteo](https://open-meteo.com/) request covers all eleven coordinates and eight hourly variables for the next twenty-four hours. If it fails the page falls back to a simulator built on the same physics, so the interface still behaves correctly offline.

Two constraints:

- **Attribution is required.** Open-Meteo data is CC BY 4.0. The credit line in the footer stays.
- **The free tier is non-commercial only.** 10,000 calls per day, rate-limited by IP. An ad or a subscription moves this to a paid plan at $29/month.

Eight variables is deliberate: requests covering more than ten variables bill as multiple calls.

## How it decides

A spot is **clear** when cloud overhead is under 45% *and* visibility is over 5 km. Both, because cloud alone can't tell a sunny smoke day from a sunny one, and can't see fog at street level.

"Cloud overhead" is not the model's low-cloud figure. Cloud is read at four altitudes — roughly 110, 320, 540 and 760 metres — and the height where cover crosses the threshold is interpolated to estimate the top of the marine layer. Each spot is compared against that using its own elevation. Levels sitting below a spot's ground are discarded first, which is what stops a hilltop above the fog being reported as fogged in.

Inside each group the calmest spot sits on top, so exposed places sink. A score combining clarity, visibility, wind and temperature breaks ties on equal wind; it isn't displayed.

## What is and isn't measured

- **Model output:** cloud, visibility, wind, temperature. Forecast data, not station observations.
- **Estimated:** the year-round clear-sky figure used as a tiebreak is a local estimate. Replace it before anyone relies on it.
- **Read from the API:** each spot's elevation, from Open-Meteo's own 90 m digital elevation model.

## Units

Inferred from the browser's locale, with a manual override in the footer. Scoring always runs in °F and mph internally, so the ranking never shifts when units change.

## Known limits

It's a 3 km model resolving a fog edge sharper than 3 km. It can be wrong, and it's verifiable by looking out of a window. See `BRIEFING.md` §9 for the accuracy work and what's planned next.
