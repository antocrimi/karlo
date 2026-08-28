# NoKarl — Project Briefing

**Purpose:** hand the whole project to a fresh session, with any model, without losing state or relitigating settled ground. Read top to bottom before touching anything.

**Status:** shipped prototype, live at `antocrimi.github.io`. One HTML file, no build step, no dependencies, plus two image assets.
**Last worked:** August 2026 — visibility gate, pressure-level height profile, spot elevations, structured footer.

**Companion file:** `CLAUDE.md` carries Anto's voice rules, attribution tiers and working preferences. It governs every word written for or as him. This file governs the product.

---

## 1 · What this is

A San Francisco microclimate product. It answers one question: *where in the city is the sky clear enough to go outside right now.*

Karl is local vernacular for the SF fog. NoKarl is where Karl isn't.

**Tagline:** "Your SF sun chasing guide." — one line, used in both the masthead and the footer, both set in `--fog-dim`.

### The three altitudes it was specced at

| Altitude | Requirement |
|---|---|
| **User** | Reliably clear places to walk, run, or sit outside of work. |
| **Maker** | A fast prototype to assess quality of experience, not a production build. |
| **Business** | An honest viability read. |

The original brief also asked for a push at 3pm weekdays and 10am weekends. **That requirement is no longer represented anywhere.** It died when the notification framing was removed. Known gap, not an oversight.

---

## 2 · Page structure

Single column, mobile-first, in this order:

1. **Masthead** — `logo.png` wordmark at `clamp(165px, 44vw, 440px)`, plus a muted `°C / °F` control
2. **Tagline**
3. **"Best spot"** — section heading with a trailing rule
4. **Verdict** — glyph + name + conditions on the left, temperature on the right, all amber
5. **Map** — the west-to-east cross-section, bounded above and below by rules
6. **Scrubber** — 24 hours, continuous, Karl the cloud as the thumb
7. **"Clear spots" / "Under Karl"** — the ranked list, split at the fog line
8. **Footer** — four-panel accordion, colophon

---

## 3 · Design ethos

Derived from decisions actually made across the build. Each principle has its evidence.

### Respect a designed asset
When a component is supplied, use it as sent. Adapt only what context requires, and say which thing you adapted. The scrubber toggle came from Uiverse.io; it was resized, recoloured and re-glyphed, and all three were rejected. It was restored verbatim with a single background change and refined from there, one instruction at a time.

**Corollary:** don't improvise iconography where a vetted asset exists. Hand-drawn glyphs invented mid-task were called bad design and cut. The set is now Phosphor, inlined at its shipped weight.

### Size is a relationship, not a value
Nothing is sized by taste. The wordmark was once set so its x-height equalled the toggle pill height; when the toggle left, the number became free and was re-derived as 40% of viewport width. The masthead scales because it is *too big next to its neighbour*, never because a number is wrong in the abstract.

### Font choice encodes information class
Three faces, three jobs, and the boundary is semantic:
- **Display (Bricolage Grotesque)** — identity, headline numbers, section names
- **Mono** — telemetry, labels, timestamps, anything the machine measured
- **Body (system UI)** — content a person reads, including place names on the map and all footer prose

### Remove chrome, keep structure
The phone frame, lock-screen row, radial glow, map container and footer panel card were all cut in turn. Rules that separate meaning stay; boxes that decorate go.

### Binary over spectrum
Three modes collapsed to two, then to one. The send-window toggle was deleted once the cards subsumed it. Fewer knobs.

### Restraint as a feature
The **quiet rule**: when nothing sits above the fog line, no place is named. This is the strongest moment in the design and the one most likely to be optimised away. Protect it.

### Amber is spent, not decorated
`--clear` appears on the verdict, the clear map dots and labels, the open footer section, the live dot and the heart. Nowhere else. When the quiet rule fires the accent drains off the page automatically, because every amber element is gated on its own local predicate rather than on a "quiet mode" flag. Preserve that property.

### Legibility is non-negotiable, and you don't get it by hiding data
Map labels are measured and packed at the current width; no fixed tiers. Hilltops are placed lowest-summit-first so a shorter peak's name can never sit above a taller one's.

### Optical over metric
Two fixes came from this: the temperature centres against the whole two-line left block rather than against the name alone, and the verdict's `min-height` matches its content exactly so the block sits evenly between heading and rule.

### Mobile is the primary surface
Base CSS is the phone. Media queries only add. Breakpoints: 560px (type and layout), 720px (footer nav goes horizontal — below that "How it works" cannot fit a quarter column), 860px (map flattens).

### The voice is wry, never earnest
Weather copy defaults to cheerful and useless. NoKarl personifies the fog as an adversary you outmanoeuvre. Quiet-rule line: "Karl's winning right now."

---

## 4 · Visual system

```css
--ink:#0E161C      /* page ground */
--ink-2:#16222A    /* rarely used since containers were removed */
--line:rgba(169,183,190,.18)      --line-hi:rgba(169,183,190,.34)
--fog:#A9B7BE      --fog-dim:#63757C      --fog-faint:#3B4A52
--clear:#F0A03C    --clear-dim:#9A6520
--paper:#E9EAE4
```

**Type.** Bricolage Grotesque loaded as a true variable font: `opsz,wdth,wght@12..96,75..100,400..800`. `font-optical-sizing: auto` is on, so a 19px row name gets a different cut from a 48px temperature. `wdth` is used **only** for copyfitting via `font-stretch`, never for expression, floored at 75 which is the axis minimum. Measured from the font binary: every place name fits at 100%; the only string that needs the axis is the quiet-state sentence.

**Signature element.** The west-to-east cross-section: Ocean Beach → Twin Peaks ridge → Dogpatch, generated by Catmull-Rom smoothing. It encodes the physical mechanism, which is why the product works at all. Protect it above everything else.

---

## 5 · The eleven spots

| Spot | Glyph | Elev (m) | Hill | rel | x | y |
|---|---|---|---|---|---|---|
| Ocean Beach | wave | 5 | | 26 | 40 | 218 |
| GG Park | tree | 60 | | 48 | 248 | 200 |
| Twin Peaks | peak | 281 | ✓ | 55 | 330 | 104 |
| Glen Canyon | tree | 110 | | 68 | 387 | 158 |
| Corona Heights | peak | 156 | ✓ | 62 | 444 | 142 |
| Fort Mason | sail | 25 | | 52 | 505 | 190 |
| Dolores Park | palm | 45 | | 78 | 563 | 196 |
| McLaren | tree | 150 | | 79 | 628 | 172 |
| Bernal Heights | peak | 132 | ✓ | 82 | 690 | 156 |
| Potrero Hill | slope | 85 | ✓ | 84 | 780 | 182 |
| Dogpatch | dog | 5 | | 85 | 860 | 212 |

**One name per spot.** Earlier builds carried three fields — full name, neighbourhood, short map label — doing four inconsistent jobs. Collapsed to one string chosen for whichever name a San Franciscan recognises fastest. India Basin was folded into Dogpatch.

`x` is **not** true longitude. It is blended halfway between true longitude and even spacing, because true longitude clusters seven spots into the middle third and their labels collide. `y` sits on the smoothed ridge and is a drawing coordinate only — `e` is the real elevation.

`h:1` marks the four true hilltops, which label themselves on the map rather than in the rail. Explicit rather than inferred from `y`, because Glen Canyon sits high on the chart and is a canyon.

---

## 6 · How it decides

### The fog line
```
clear  ⟺  cloud overhead < 45%  AND  visibility > 5000 m
```
Both conditions. Cloud alone cannot tell a sunny smoke day from a sunny one, and cannot see fog at street level.

### Cloud overhead, not cloud cover
`cloud_cover_low` is a layer fraction with no altitude, and on many models it is derived from pressure-level humidity where levels can sit **below ground** at elevated spots. That artefact is what once called a visibly fogged Bernal Heights clear.

Four pressure levels are read instead:

| Variable | Approx. height |
|---|---|
| `cloud_cover_1000hPa` | 110 m |
| `cloud_cover_975hPa` | 320 m |
| `cloud_cover_950hPa` | 540 m |
| `cloud_cover_925hPa` | 760 m |
| `cloud_cover_mid` | 2–7 km |

`coverCurve()` interpolates cover at any height between the samples, because snapping a spot to its nearest level cannot tell Bernal (132 m) from Twin Peaks (281 m) — the exact distinction the product exists for. Three separate questions are then asked of that curve, and conflating them is what has broken this twice:

| | Means | Used for |
|---|---|---|
| `here` | cloud at your own altitude | are you inside it |
| `overhead` | **max** cover anywhere above you, plus mid-level | is the sun blocked |
| `beneath` | cover below you | are you standing above the fog |

**The 28 August failure:** `overhead` read only the *first* level above a spot. With clear air at 110 m and a solid deck at 540 m, the app reported 15% cloud on a completely grey morning. Overhead is now the maximum across everything above, and `cloud_cover_mid` catches decks higher than the top sample.

Verified against five states: today's elevated deck, shallow fog (Twin Peaks above, Bernal inside), deep fog (all three inside), genuinely sunny, and a deck above 760 m visible only to the mid field.

### Ordering
Clarity decides which side of the line. **Wind decides the order within it**, calmest first, so exposed spots sink. Comparison is on the *rounded* wind figure so equal displayed readings tie and fall through to score rather than to an invisible decimal.

### Score
```
score = clarity×.42 + visibility×.13 + wind comfort×.22 + temperature fit×.23,  ideal 66°F
```
Score no longer drives ordering. It only breaks ties on equal wind and is not displayed.

### One conditional word
`note()` adds at most one word, and only when visibility or elevation contradicts the cloud reading: **fogged in** (<1 km), **above the fog**, **misty** (<5 km), **hazy** (<10 km). A plain sunny day reads exactly as before.

---

## 7 · Build

```
index.html    everything — markup, CSS, JS. No build, no dependencies.
logo.png      masthead wordmark, 638×196, required at repo root
og-image.png  1200×630 social card, link previews only
README.md     deploy note + data constraints
```

Deploy: repo root → Settings → Pages → Deploy from branch, `main`, `/ (root)`.

### Data flow
One batched request covers all eleven coordinates and **nine** hourly variables:

```
/v1/forecast
  ?latitude=<11 csv>&longitude=<11 csv>
  &hourly=temperature_2m,cloud_cover_low,visibility,wind_speed_10m,cloud_cover_mid,
          cloud_cover_1000hPa,cloud_cover_975hPa,cloud_cover_950hPa,cloud_cover_925hPa
  &forecast_days=3&timeformat=unixtime
  &temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Los_Angeles
```

Nine variables matters: **more than ten bills as multiple calls.** That headroom is what keeps this free. Spot elevation is read from the response's own 90 m DEM `elevation` field, falling back to the hardcoded `e` values offline.

`load()` is the only place data is fetched, used by both boot and the footer refresh button. On failure it drops to a simulator built on the same physics — a layer with a top in metres and an inland reach — so the offline mode exercises the real logic. A manual refresh returns the scrubber to now.

### Units
Inferred from locale via `Intl.Locale.measurementSystem`, falling back to a region list for the Fahrenheit holdouts. Wind follows the system. **Scoring always runs in °F and mph internally**, so the ranking never moves when units flip. The `°C / °F` control is an override, deliberately muted, because inference is right most of the time and wrong sometimes.

### Layout engine
Map labels are measured and packed on load, on font swap and on resize, driven by one `ResizeObserver` on the rail. `paint()` runs before any measurement so content is never gated on layout succeeding, and `relayout()` is wrapped so an exception cannot blank the page.

---

## 8 · Cost

| | Limit | Cost |
|---|---|---|
| Open-Meteo free | 600/min, 5,000/hr, 10,000/day, 300,000/mo | $0 |
| Open-Meteo Standard | 1M calls/mo | $29/mo |
| Open-Meteo Professional | 5M calls/mo | $99/mo |
| NWS / api.weather.gov | undocumented | $0 |

**The architecture is client-direct, and for once that is the right call.** Open-Meteo rate-limits by IP, so each visitor spends their own quota rather than a pooled one. The exposure is CGNAT, where a mobile carrier puts many users behind one address. Unlikely at this traffic.

**The one thing that costs money:** the free tier is non-commercial only. The moment NoKarl carries an ad or a subscription it needs the $29 plan. That is a business decision, not a technical one.

---

## 9 · Accuracy — the live problem

On 22 August a photo from Noe Valley showed fog blanketing the hills toward Bernal while the app showed every spot clear. That is the product's core risk made concrete: it is falsifiable by looking out of a window, and it names a place you then travel to.

**Phase one is done** (§6): visibility gate, height profile, real elevations.

**Two failures caught in the wild so far, both from photographs.** 22 August: fog on the hills, app said clear — cause was `cloud_cover_low` reading pressure levels below ground. 28 August: high overcast with clear air beneath, app said 15% cloud — cause was reading only the first level above a spot. Both were failures of the *vertical* model, and both were found by looking out of a window rather than by any test. Keep doing that.

**Phase two, not built.** METAR ceiling from KSFO, KOAK, KHAF. Free, no key, User-Agent header required. Two unknowns to test first: browsers cannot set a User-Agent header, and CORS from a static page is unverified. `aviationweather.gov` is the documented fallback.

What METAR uniquely buys is *observation* rather than model. Open-Meteo is model output only — no station observations, no validated actuals. Phase one fixed the variable mismatch; it did not fix the 3 km resolution mismatch.

**Before phase two, measure.** Log the verdict hourly against METAR and a few webcams for two or three weeks. Without an error rate per spot and per hour, every further fix is a guess. Expect the error to cluster at 7–10am and on the hills.

---

## 10 · Rejected directions — do not re-propose

Each of these was built and reverted. A fresh session will be tempted by all of them.

1. **GSAP reveal timeline.** A two-act entrance drawing the terrain west to east, flooding the fog in, igniting the dots in sequence. Built, tested, reverted. Broke the map.
2. **GSAP Flip on the fog line.** Rows physically travelling between Clear and Under Karl as you scrub. Built, tested, reverted with the above.
3. **Full-page drifting fog layer** for the quiet state, with `feTurbulence` displacement and two banks at different drift rates. Built to spec. Called awful, reverted.
4. **Webcams as a data layer.** Researched and declined: no unified API, per-operator terms, CV classification is a real problem, and Outside Now already occupies the niche. Useful for *validation*, not as a source.
5. **Panel card in the footer.** Added, then removed — dividers do the nav-versus-content job without a box.

The pattern: motion and ornament have been proposed, built and rejected three times. The product's identity is restraint. Take that seriously before proposing the fourth.

---

## 11 · Open decisions

Raised and deliberately left open.

1. **`cloud_cover_mid` covers 2–7 km, and nothing samples 760 m to 2 km.** A deck sitting in that gap is still invisible. Adding `cloud_cover` (total) would close it at the cost of over-triggering on high cirrus.
2. **`rel` climatology is invented.** Eleven hardcoded, unverified numbers, still breaking ties. Highest-value data fix in the file.
3. **The 3pm / 10am push requirement is unrepresented.**
4. **Glyphs identify terrain, not place.** Three parks share `tree`; Dogpatch's dog is the only place-specific mark.
5. **Empty group headings are dropped**, which trades back a small page jump at the moment a group empties. Chosen deliberately over ghost headings.
6. **Google Fonts round trip.** Bricolage is a network dependency on cellular. Self-hosting untested.
7. **Wrong-once risk.** Nothing hedges a marginal call. The quiet rule could widen to cover model disagreement or a ceiling within a few hundred feet of a hilltop.
8. **Scrubber fill stays amber** in the quiet state, the only accent left on a page that says there is no sun. Decided: leave it.

---

## 12 · Working notes for the next session

**How Anto works.** Direction arrives as terse bullets. Execute exactly what is listed and nothing adjacent. Flag tradeoffs in a line; don't fix them unasked, because several flagged items are open on purpose. Present options at multiple altitudes and let him choose rather than collapsing to one recommendation. Be data-forward over opinion-forward. When something is supplied — an asset, a number, a name — it is the spec, not a starting point. On larger changes he will ask you to review and propose before building; do that rather than guessing.

**Verify, don't recall.** Measurements in this file came from the font binary, the Phosphor package and live documentation, not from memory. Do the same. Font metrics via `fontTools` on `@fontsource-variable/bricolage-grotesque`; icons via `@phosphor-icons/core`; pricing and API behaviour via search, since it changes.

### Version tag

`const BUILD` near the top of the script renders as `v2026.08.28` beside the location in the footer colophon, and appears again as an HTML comment above `<title>`. Bump it on every deploy — it is how a cache-stale page is spotted.

### Known hazards in this file

Three bugs recurred during the build. All are avoidable.

- **`str.replace('', x)` in Python inserts `x` between every character.** Slicing with `s.index(start)` and `s.index(end)` where the end marker also appears *before* the start yields an empty slice, and the replace then explodes the file. It corrupted `index.html` to 56 MB twice. Always find the end marker *after* the start, assert the slice is non-empty, and assert an exact match count before replacing.
- **Elements referenced by `id` that only carry a `class`.** `$("stage")` returned null, `relayout()` threw, and because it ran before `paint()` the whole page rendered blank. Audit every `$()` call against the markup after structural edits.
- **Constants declared inside a block that later gets removed.** `reduce` went missing twice this way and threw on load. Sweep for undeclared identifiers after any large deletion.

Test headlessly before delivering. A small DOM stub is enough to boot the script, render a verdict, sweep 24 hours and confirm the group headings, label placement and fog line behave.
