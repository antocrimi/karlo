# NoKarl

Where the fog isn't, in San Francisco. One place at a time, five steps ahead.

An experience prototype for a microclimate notification product: twelve SF spots ranked west to east on low cloud, visibility, wind, and temperature fit for what you're going out to do.

## Deploy

Drop `index.html` at the repo root, then Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`. Live at `https://<user>.github.io/<repo>/` in about a minute.

No build step. No dependencies. One file.

## Data

Live conditions come from [Open-Meteo](https://open-meteo.com/) in a single batched request for all twelve coordinates, using the HRRR 3 km model where available. If the request fails, the page drops to a simulated mode with a marine-push slider so the message can be evaluated across the full condition range.

Two constraints carried over from the RFC:

- **Attribution is required.** Open-Meteo data is CC BY 4.0. The credit line in the footer stays.
- **The free tier is non-commercial only.** Ads or a subscription move this to a paid plan. A public GitHub Pages demo with neither is fine.

## What is and isn't measured

- **Live:** low cloud, visibility, wind, temperature, and a four-hour lookahead for the hold time.
- **Static:** the `Clear yr` column is a local climatology estimate of how often each spot is fog-free. It is hardcoded and unverified, and it exists as a tiebreak. Replace it with observed data before anyone relies on it.

## Scoring

```
score = clarity×Wc + visibility×Wv + wind comfort×Ww + temperature fit×Wt
```

Weights shift by mode. Run weights wind highest and targets 59°F; relax weights clarity highest and targets 72°F. If the top score falls under 55, no place is named.
