# Karl: working on this repo

Karl shows where the fog (local name: Karl) isn't across eleven San Francisco places. It is one static page served by GitHub Pages from `main` at https://byekarl.com/. This file says how to work on it. `BRIEFING.md` holds the design rationale, the decisions log and the rejected directions; read it before changing anything visible.

## Start of every session

1. Pull `main`. This repo is the only source of truth; copies elsewhere (project docs, old downloads) may be stale.
2. Read `BRIEFING.md`.
3. Run `node test.js` and confirm it passes before touching anything.

## Shape of the code

- Everything ships in `index.html`: markup, CSS and script. No build step and no dependencies. Keep it that way. The one exception is the Umami script that counts visits (see "Counting visits" in `BRIEFING.md`).
- `test.js` is a headless harness that runs the page's script against a stubbed DOM. `node test.js` runs it; `node test.js --svg` also writes `map-preview.svg`.
- Assets at the root: `logo.png`, `og-image.png`, `apple-touch-icon.png`.

## Rules

- **Build tag.** Every deploy bumps `BUILD` in the script and the matching HTML comment above `<title>`. Format is date plus number, `YYYY.MM.DD.N`. The footer shows it only on a device flagged with `?me`, and the home screen app reloads itself when the live build differs from the one it is running.
- **Tests.** Add a test with every fix or feature. Never push to `main` with a failing test.
- **Design changes** (anything that looks different): show screenshots in the conversation and wait for approval before merging to `main`. Work on a branch and push the branch.
- **Fixes with no visual change** can go straight to `main` once tests pass. Say so when reporting.
- **Accent colour** lives only in `--clear` and `--clear-dim` (and `--night`, `--night-dim` after sunset). Never hard-code it; a test enforces this.
- **Data.** One batched Open-Meteo request for all eleven places with nine hourly variables; ten or more bills as two calls. Free tier is non-commercial and needs the CC BY 4.0 credit in the footer. Each place is judged on its own grid cell; do not blend readings across places (see the rejected directions in `BRIEFING.md`).
- **Elevation axis.** Anything drawn vertically on the cross section is placed in metres. The fog goes through `yFog()`, which follows `yM()` apart from a shoreline correction and the compression above `H_TRUE`. The tests check the two against each other.
- Record each decision in `BRIEFING.md` in the same commit that makes it.

## Voice for any copy

No em dashes; connect with "and". No "not X but Y" reversals. No tidy triads. US spelling, plain and direct. No promotional language and no exclamation marks.

## Commits

Write the reason in the body, not only the change. Branch per change, fast-forward into `main`.
