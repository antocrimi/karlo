# NoKarl — Project Briefing

**Purpose:** hand the whole project to a fresh session, with any model, without losing state or relitigating settled ground. Read top to bottom before touching anything.

**Status:** shipped prototype, live at `antocrimi.github.io/karlo/`. A **project** site, so it is served from the `/karlo/` sub-path and every absolute URL in the head has to carry it. One HTML file, no build step, no dependencies, plus two image assets.
**Last worked:** 1 September 2026 — the fog redrawn as one body on a part-compressed axis, after seeing live data on a phone. Before that, 30 August 2026 — the marine layer redrawn as a contoured surface with a leading edge, per-spot sunlight lines, continuous time, then the roster constrained to the transect and the ridge given a hairline.

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

**Naming no place is the rule. Saying nothing was a bug.** Until 30 August the quiet state showed a headline and an empty space where the winning spot's conditions sit, so the one hour the page had least to offer was also the only hour it reported no numbers at all. The city average now fills that slot, in the same position and the same style. The restraint is in withholding the *recommendation*, never in withholding the reading.

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

**The chart's vertical axis is an elevation axis.** Fitting all eleven spots' drawn `y` against their real elevation gives `y = 213 − 0.392 × metres`, r = 0.958, exposed as `Y0`, `Y_PER_M` and `yM()`. **Anything drawn on this axis must use that mapping.** The fog band was once `GROUND − cloudCover% × 1.55`, which put a percentage and a height on the same axis, and a summit could appear to stand above a layer it was in fact inside. If a new element needs a vertical position, derive it in metres and pass it through `yM()`.

---

## 5 · The eleven spots

| Spot | Glyph | Elev (m) | Hill | rel | x | y | Off the line |
|---|---|---|---|---|---|---|---|
| Ocean Beach | wave | 5 | | 26 | 40 | 211 | 0.18 km |
| West Portal | tree | 66 | | 45 | 176 | 187 | 1.88 km |
| GG Park | tree | 60 | | 48 | 268 | 189 | 1.62 km |
| Twin Peaks | peak | 281 | ✓ | 55 | 352 | 103 | 0.33 km |
| Glen Canyon | tree | 110 | | 68 | 420 | 170 | 1.94 km |
| Corona Heights | peak | 156 | ✓ | 62 | 486 | 152 | 0.85 km |
| Alamo Square | palm | 68 | | 66 | 560 | 186 | 2.11 km |
| Dolores Park | palm | 45 | | 78 | 636 | 195 | 0.24 km |
| Bernal Heights | peak | 132 | ✓ | 82 | 700 | 161 | 1.59 km |
| Potrero Hill | slope | 85 | ✓ | 84 | 784 | 180 | 0.29 km |
| Dogpatch | dog | 5 | | 85 | 860 | 212 | 0.46 km |

**The roster is chosen for somewhere worth sitting, then constrained by the section.** `OFF_AXIS_KM = 2.5` is the rule: a place may sit a couple of kilometres north or south of the west-to-east line the chart cuts, and no further. Beyond that it is reading a different air mass and the section renders it as a spike in the middle of the city.

**Fort Mason and McLaren failed that rule and were removed, 30 August.** Fort Mason sat 5.34 km north and McLaren 4.46 km south, each alone in its own 3 km grid cell to the *side* of the transect rather than further along it. Fort Mason takes its fog through the Golden Gate, not over the Twin Peaks ridge, so it is a different mechanism from the one the section exists to show. West Portal and Alamo Square replaced them. A place worth sitting in that fails the rule does not go on the chart, and losing it is the right trade.

They were also the two worst fits to the elevation axis, at −13 and +18 px. Not a coincidence: their drawn heights had been fudged to accommodate being off-axis. Every spot now sits within 12 px of `y = 213 − 0.392 e`, asserted in `test.js`.

**One name per spot.** Earlier builds carried three fields — full name, neighbourhood, short map label — doing four inconsistent jobs. Collapsed to one string chosen for whichever name a San Franciscan recognises fastest. India Basin was folded into Dogpatch.

`x` is **not** true longitude, and this asymmetry should be understood rather than rediscovered. The vertical axis is a measured metre scale with a law in §4; the horizontal axis is a hand-set ordering, because true longitude clusters most of the roster into the middle third and their labels collide. It diverged from longitude by up to 126 px in the old roster. Two properties are enforced instead of a mapping, both in `test.js`: drawn order matches true west-to-east order, and no place sits further than `OFF_AXIS_KM` off the line. Making `x` a real distance axis was considered on 30 August and deliberately deferred: it moves every label and the packing is tuned around the current positions. `y` sits on the smoothed ridge and is a drawing coordinate only — `e` is the real elevation.

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

`overheadCurve()` builds `O(h)`, the most cloud anywhere at or above `h`, as a running maximum taken downward from the ceiling. That makes it **monotonically non-increasing**, which is the single property the whole drawing rests on: a monotone curve crosses any threshold exactly once, so the sunlight line is unique and moves continuously with the data. `sunLine(O, T)` is that crossing.

`coverCurve()` interpolates cover at any height between the samples, because snapping a spot to its nearest level cannot tell Bernal (132 m) from Twin Peaks (281 m) — the exact distinction the product exists for. Three separate questions are then asked of that curve, and conflating them is what has broken this twice:

| | Means | Used for |
|---|---|---|
| `here` | cloud at your own altitude | are you inside it |
| `overhead` | **max** cover anywhere above you, plus mid-level | the percentage shown in the UI |
| `beneath` | cover below you | are you standing above the fog |
| `sun` | the height you must reach to be out of the cloud | **the verdict, and how the band is drawn** |

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

**Unresolved:** whether a request covering eleven coordinates bills as one call or eleven. The published rule only describes the ten-variable and two-week thresholds "for a single location". Confirm with info@open-meteo.com before assuming the free tier covers commercial traffic.

**The one thing that costs money:** the free tier is non-commercial only. The moment NoKarl carries an ad or a subscription it needs the $29 plan. That is a business decision, not a technical one.

---

## 9 · Accuracy — the live problem

On 22 August a photo from Noe Valley showed fog blanketing the hills toward Bernal while the app showed every spot clear. That is the product's core risk made concrete: it is falsifiable by looking out of a window, and it names a place you then travel to.

**Phase one is done** (§6): visibility gate, height profile, real elevations.

**Three failures caught in the wild so far, all from looking at something rather than from a test.** 22 August: fog on the hills, app said clear — `cloud_cover_low` was reading pressure levels below ground. 28 August, morning: high overcast with clear air beneath, app said 15% cloud — only the first level above a spot was being read. 28 August, afternoon: the chart drew Twin Peaks standing above the fog band while the verdict said nothing was clear — the band was a percentage and the terrain was a height, sharing one axis.

All three were failures of the *vertical* model. Keep looking out of the window.

**The leading edge is back, and the reason it was cut does not survive measurement.** 30 August. The claim recorded here for two revisions was that per-spot tops are grid noise that shredded the surface, and that the extent had to be smoothed into a contiguous run which then covered spots the list called clear. Both were checked against the simulator:

- The run is **already contiguous** in all 24 frames, no holes, and it only ever grows or shrinks from the west.
- The tops fall **monotonically west to east** — hour 20 reads `480 460 450 450 440 430 430 420 420 410 400`, an 80 m spread over the full 900 px chart. That is marine air deepest at the coast and mixing out inland, which is the mechanism the product exists to show.

What was actually shredding the surface was `layerOf()`, which walked the raw cover curve for the first band over 45% and took its top. That curve is not monotone, so two points of cover at one pressure level handed back a different band: `[80 46 44 10]` gave 440 m and `[80 44 44 10]` gave 320 m, a fifth of the chart for a rounding difference. It also returned a sentinel `820` when it ran out of samples, which is "we stopped looking" drawn as a layer filling the frame.

**The median gate was worse than the picture it produced.** `cityLayer()` judged Ocean Beach at 5 m and Twin Peaks at 281 m by one city-wide number, and required six of eleven spots before drawing anything. In the simulated sweep the band showed nothing for six hours while the layer was visibly arriving (2, 2, 3, 3, 4, 5 spots under it), and the clear count went from six to zero in a single hour as the median crossed the gate. That is the product's main output stepping off a cliff, not a rendering artefact. Both are gone.

**Lighting the terrain above the layer was tried and reverted.** Painting the ground twice — cold, then a warm fill clipped to everything above the fog surface — sounded right and looked awful: mottled brown patches across a silhouette that works precisely because it is a single clean dark shape. Fourth ornament proposed, built and rejected. See §10.

**The geometry is single-sourced, and now it is single-sourced locally.** Each spot has its own `sun`, the height at which `O` falls through 45%. A spot is in daylight when `elev >= sun`, and because `O` is monotone that is the *same statement* as `overhead < CLEAR` — one rule asked twice, not two rules kept in step. `test.js` asserts the equivalence directly. The CLEAR contour is drawn as the fog line, so the line at a spot's own x is what its dot is judged against. The picture cannot contradict the list at any x, which is what the previous two attempts could not guarantee. Visibility remains a separate gate. Mid-level cloud no longer needs one: `O` carries it.

**Extent was being drawn as height, and that built a second landmass.** 1 September. Measured across the eleven columns: the layer's own top varies **3 to 36 px**, while the surface as drawn carried **119 px of relief and up to 203**, against the ridge's 109. All of the excess was the leading edge being ramped down to the ground through the vertical axis, because a column with no layer was encoded as height zero. Extent is a horizontal fact. Putting it on the elevation scale is the same error as drawing cloud-cover per cent as a height, which is the bug this chart was rebuilt around in the first place.

Three complaints turned out to be one bug. The picture was unbalanced because there were two undulating masses of similar relief. It was illegible because both sat in the same narrow value range. It was over-complicated because five stacked fills were being used to soften an edge that a single line would have carried.

**So the layer is a slab.** The top is drawn only where there is a layer, and where the layer stops the slab stops, falling to the ground across `FRONT` (34 px) — steep enough to read as the face of a bank, brief enough to leave the top level. The ridge is then the only jagged thing in the frame, which is correct, because the ridge is the only jagged thing. `test.js` asserts the drawn top's relief stays under 55% of the ridge's.

**One body, seen on live data, 1 September.** A wash with a bright line on top read as two elements rather than as a mass of cloud. It is now a single filled body plus its own top edge at `.34` against a `.20` fill, close enough in value to belong to it. Three things make it cohesive:
- The top is drawn only where there is a layer, so extent stays horizontal.
- **Interior holes are bridged, not drawn.** Live data has cells that read clear in the middle of a covered city. Drawing one as ground pulled the body to the floor mid-city and split the mass in two, which the simulator never produced.
- **The ends dissolve** over 78 px via a mask gradient positioned from the front each paint, rather than stopping at a vertical cut that read as a sharp line passing behind the terrain.

**The fog's vertical axis is true to 300 m and compressed above it, and this is a deliberate departure from the §4 law.** Live data put the layer top at 500 to 900 m while the tallest place on the chart is Twin Peaks at 281 m, so a true-scale top spent most of its life pinned to the frame edge with a third of the picture empty beneath it. That band decides nothing: no dot can ever be in it.

The verdict is untouched and provably so. A dot is clear when `elev >= sun`, so the two heights only ever need to be comparable below the tallest spot. `H_TRUE = 300` sits above it, so every height that can decide anything is still at true scale. `test.js` asserts both halves: that `H_TRUE` clears the roster, and that `yFog` matches the plain elevation axis exactly below it. **Do not "fix" this back to `yM` without breaking those two tests first and reading why they exist.**

Compression also retired the top fade. The body can no longer reach the frame edge, so it can no longer read as a box.

**Legibility stopped depending on the fill.** A 1.5px stroke at `#6E7A80` scores **4.14** against the page and **3.29** against the terrain. No tonal fill could beat **1.03** at its worst point, because the sky ramps continuously through whatever value the fill sits at. That was proved on 30 August and answered with a hairline on the ridge; the same reasoning applies to the fog's own top edge, and the answer is the same. Marks that must read against a variable ground are strokes, not fills.

The count went nine, five, two. Nine and five were both attempts to buy softness with quantity. What made the picture legible was drawing the top as a line.

**The dots carry the ridge's hairline too**, for the same reason and by the same self-gating logic: an ink ring separates them from fog of any density and disappears against the bare page.

**The axis is deliberately left short.** `yM` clamps around 540 m, so a deep layer saturates the frame. Twin Peaks is 281 m: above the highest summit, depth changes no verdict, and the hours it saturates are the hours the city is genuinely socked in, where a filled frame is the true picture and the quiet rule is already saying so in words. Giving the sky headroom would shrink the ridge. Do not.

**`yFog` is `yM` plus a shoreline correction**, `13·e^(−h/50)`, because `Y0 = 213` is a regression intercept while the drawn shoreline is at 218 and the frame edges at 222 and 224. Without it a zero-metre contour floats a sliver of fog over an empty beach that the terrain mask cannot cover, the sliver being genuinely above the ground line. It decays to under 2 px by 110 m, the lowest pressure sample, so it never touches a height that decides anything. **`yM` itself is untouched: it remains the law for the terrain.**

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
5. **Lit terrain above the fog line.** Ground standing above the layer painted in a warm fill, clipped to the fog surface. The intent was the Bernal photograph — sunlit ridge over grey city. In practice it mottled the terrain silhouette and read as murky brown. Reverted the same session.
6. ~~**A leading edge on the fog band.**~~ **Reopened and shipped, 30 August.** Rejected twice on the grounds that the extent was not spatially coherent. Measurement says the run is contiguous in all 24 frames and the tops fall monotonically west to east; the incoherence was `layerOf()`'s threshold crossing, not the sampling. See §9. **A rejected direction is only as good as the measurement behind it — this one had none.**
7. ~~**A fog surface drawn through all eleven per-spot tops.**~~ **Reopened and shipped, 30 August.** Same misdiagnosis as 6.
8. **Panel card in the footer.** Added, then removed — dividers do the nav-versus-content job without a box.

The pattern: motion and ornament have been proposed, built and rejected six times. Twice the mistake was adding representation to the cross-section, which works because it is abstract and quiet. The product's identity is restraint. Take that seriously before proposing the fourth.

---

## 11 · Open decisions

Raised and deliberately left open.

1. **Uncertainty band, half built.** The picture now shows the ambiguity: the contour spread *is* the slack in the layer top, and it widens on its own when the model is vague. The list still gives a hard yes or no, and Twin Peaks at 281 m will keep landing inside the spread. Carrying the spread into the list is the remaining half.
2. ~~**The level-plane assumption.**~~ **Closed, 30 August.** The layer is drawn as a surface through all eleven columns, so advection through the gap and uneven burn-off have somewhere to show. What is left is the grid: eleven points across ~3.6 cells of a 3 km model, so the surface has roughly four independent control points and no more.
3. ~~**Verify the column count against live data.**~~ **Resolved, 30 August, by measuring it in the page rather than in a script.** The question was how many of the eleven places read genuinely different air on a 3 km grid, and it could only be answered against live data. A one-off fetch would have answered it once, for one hour, and gone stale. `columns()` counts distinct overhead curves in the frame the scrubber is on, and the Data panel reports it every hour: *"the eleven places resolve to N distinct columns, which is what the cross section has to draw with."* The number is now a displayed measurement rather than an open question, it tracks the roster and the scrubber, and it tells the reader how much independent information the picture carries. If it routinely sits at three or lower, the surface is being drawn from too few control points and the roster or the tier count is the lever.
4. **`cloud_cover_mid` covers 2–7 km, and nothing samples 760 m to 2 km.** A deck sitting in that gap is still invisible. Adding `cloud_cover` (total) would close it at the cost of over-triggering on high cirrus.
5. **`rel` climatology is invented.** Eleven hardcoded, unverified numbers, still breaking ties. Highest-value data fix in the file.
5. **The 3pm / 10am push requirement is unrepresented.**
6. **Glyphs identify terrain, not place.** Three parks share `tree`; Dogpatch's dog is the only place-specific mark.
7. **Empty group headings are dropped**, which trades back a small page jump at the moment a group empties. Chosen deliberately over ghost headings.
8. **Google Fonts round trip.** Bricolage is a network dependency on cellular. Self-hosting untested.
9. **Wrong-once risk.** Nothing hedges a marginal call. The quiet rule could widen to cover model disagreement or a ceiling within a few hundred feet of a hilltop.
10. **Scrubber fill stays amber** in the quiet state, the only accent left on a page that says there is no sun. Decided: leave it.

---

## 12 · Working notes for the next session

**How Anto works.** Direction arrives as terse bullets. Execute exactly what is listed and nothing adjacent. Flag tradeoffs in a line; don't fix them unasked, because several flagged items are open on purpose. Present options at multiple altitudes and let him choose rather than collapsing to one recommendation. Be data-forward over opinion-forward. When something is supplied — an asset, a number, a name — it is the spec, not a starting point. On larger changes he will ask you to review and propose before building; do that rather than guessing.

**Verify, don't recall.** Measurements in this file came from the font binary, the Phosphor package and live documentation, not from memory. Do the same. Font metrics via `fontTools` on `@fontsource-variable/bricolage-grotesque`; icons via `@phosphor-icons/core`; pricing and API behaviour via search, since it changes.

### Version tag

`const BUILD` near the top of the script renders as `v2026.08.28` beside the location in the footer colophon, and appears again as an HTML comment above `<title>`. Bump it on every deploy — it is how a cache-stale page is spotted.

### Working in Claude Code

```
index.html      the whole app
logo.png        required at repo root
og-image.png    link previews only
test.js         headless checks — node test.js
BRIEFING.md     this file, read first
README.md       public-facing
CLAUDE.md       Anto's voice and working rules
```

`node test.js` boots the page against a small DOM stub and runs 33 checks: first paint, the vertical cloud model against all four sky states, the visibility gate, fog-line consistency across 24 hours, label placement, unit inference, the request budget, and the fail-safes. **Run it before every deploy.** It has caught every bug in this project that a glance at the screen did not.

`node test.js --svg` also writes `map-preview.svg`, four hours of the cross-section geometry, so a change to the map can be judged without deploying.

Bump `const BUILD` on every deploy. It renders in the footer colophon and as an HTML comment above `<title>`, and it is how a cache-stale page is spotted.

### Known hazards in this file

Three bugs recurred during the build. All are avoidable.

- **`str.replace('', x)` in Python inserts `x` between every character.** Slicing with `s.index(start)` and `s.index(end)` where the end marker also appears *before* the start yields an empty slice, and the replace then explodes the file. It corrupted `index.html` to 56 MB twice. Always find the end marker *after* the start, assert the slice is non-empty, and assert an exact match count before replacing.
- **Elements referenced by `id` that only carry a `class`.** `$("stage")` returned null, `relayout()` threw, and because it ran before `paint()` the whole page rendered blank. Audit every `$()` call against the markup after structural edits.
- **Constants declared inside a block that later gets removed.** `reduce` went missing twice this way and threw on load. Sweep for undeclared identifiers after any large deletion.

Test headlessly before delivering. A small DOM stub is enough to boot the script, render a verdict, sweep 24 hours and confirm the group headings, label placement and fog line behave.
