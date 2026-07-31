# Grind Converter

A Chrome extension that answers one question: *I grind at 24 clicks on my JX-Pro
— where do I set my C40?*

Pick the grinder you know, dial in your setting, pick the grinder you want, and
the extension shows the equivalent setting on it.

![Popup converting 24 clicks on a 1Zpresso JX-Pro to 10 clicks on a Comandante C40](docs/screens/01-espresso-jxpro-to-c40-light.png)

## How it works

Grinder settings are not comparable across machines — a "click" means a
different burr gap on every model. Particle size is comparable, so every
conversion goes through microns:

```
setting on A  ->  microns  ->  setting on B
```

Each grinder carries a calibration describing that mapping. Two kinds cover the
market:

- **`linear`** — the burr gap moves a fixed distance per click. Most hand
  grinders publish this figure (JX-Pro: 12.5 µm/click, C40: 30 µm/click), and
  they zero at burr contact, so `microns = clicks × µm-per-click`.
- **`anchors`** — an arbitrary dial with no meaningful zero (Encore 1–40, Ode
  1–11). Measured reference points are interpolated piecewise-linearly. This
  also handles non-linear dials like the Encore ESP, whose steps get coarser
  past click 20.

### Honest precision

The converter never reports a number it cannot justify.

- The answer is **snapped to detents the target grinder actually has**. A dial
  with 30 µm steps cannot express 307 µm, so it does not pretend to.
- Every entry declares a **confidence** — `manufacturer`, `community`, or
  `estimated` — and conversions show an **uncertainty band** derived from both
  grinders' confidence, combined in quadrature.
- Pairings involving an `estimated` calibration say so in the UI.
- When the target physically cannot reach the requested grind size, it says that
  instead of silently clamping.

## Data

The dataset lives in [`data/`](data/) as reviewable JSON, one file per brand.
Every entry cites its sources; the build rejects uncited entries.

The build reports its own size budget:

```
$ npm run build:data

  grinders        19
  brew methods    8
  confidence      manufacturer=11  community=4  estimated=4
  raw JSON        8.3 KB
  gzipped         1.9 KB
  per grinder     445 B raw
  projected 1000  435.0 KB raw, 101.2 KB gzipped
```

**This is why there is no backend.** At ~100 bytes gzipped per grinder, a
thousand-grinder catalogue is ~100 KB — smaller than a single product photo. It
ships inside the extension, so the converter works offline, needs no network
permission, and cannot leak what you grind.

If the catalogue ever outgrows that, the escape hatch is a static JSON file on a
CDN compared by `version`, not a server. Nothing here needs one.

### Growing the catalogue

`scripts/import-csv.mjs` converts a spreadsheet into a validated data file:

```bash
node scripts/import-csv.mjs grinders.csv my-source --source https://example.com/db
npm run build:data
```

Columns: `brand, model, type, burr, min, max, step, unit,
microns_per_step, zero_offset` **or** `anchors` (`"1:300; 6:800; 11:1300"`),
plus optional `clicks_per_rotation, confidence, aliases, note, source`.
Rows without a usable calibration are reported and skipped, never guessed at.

### Validation

`npm run check:data` goes past JSON well-formedness. It rejects duplicate ids,
uncited entries, scales whose step exceeds their range, and — most importantly —
**non-monotonic calibrations**, because the converter inverts these curves and a
non-monotonic one would make `microns → setting` ambiguous and silently wrong.

## Development

```bash
npm install
npm run build          # -> dist/
npm run verify         # data + typecheck + unit + build + e2e
```

Load `dist/` via `chrome://extensions` → Developer mode → *Load unpacked*.

### Tests

- **Unit** (`tests/unit`, Vitest) — the conversion maths: round-tripping,
  snapping, extrapolation, band widening, and invariants across the shipped
  dataset (every grinder monotonic, within a plausible micron range, and
  offering more than a handful of positions).
- **E2E** (`tests/e2e`, Playwright) — a real Chromium with the real unpacked
  extension loaded, driving the real popup.

Two things make the E2E suite work that are worth knowing before touching it:

1. The manifest pins a public `key`, which fixes the unpacked extension ID.
   Playwright blocks `chrome://extensions`, so tests derive the ID from that key
   and address `chrome-extension://` URLs directly.
2. The fixtures request `channel: 'chromium'`. Playwright's default headless
   build is `chromium_headless_shell`, which **silently ignores
   `--load-extension`** — the suite would launch, find nothing, and fail with
   `ERR_ABORTED`.

### Layout

```
src/core/      pure conversion + dataset access, no DOM, no chrome APIs
src/ui/        popup markup, styles, controller, prefs
src/generated/ built dataset (checked in; CI verifies it matches data/)
data/          hand-maintained source data, one file per brand
scripts/       dataset build, CSV import, screenshot rendering
tests/         unit (Vitest) and e2e (Playwright)
```

`src/core` has no dependency on `chrome.*` or the DOM, so the conversion logic is
testable in plain Node and reusable outside the extension.

## Preferences

The last source grinder, target grinder and setting are stored in
`chrome.storage.local`. No account, no sync, no network — it is scoped to the
browser profile and never leaves the machine.

## Licence

MIT. Grinder specifications are factual data drawn from manufacturer
documentation and public references, cited per entry in `data/`.
