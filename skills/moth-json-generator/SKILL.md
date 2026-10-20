---
name: moth-json-generator
description: Write the parameter JSON for the Moth Generator web page, so a moth can be pasted into its "Parameters (JSON)" box and rendered as an SVG. Use whenever the user wants a moth they can render, "give me JSON for a moth", a moth for the moth generator/moth.html, a moth species turned into parameters, or wants to turn a moth-species-designer profile or render brief into something drawable. Works on its own (from a one-line idea) or together with the moth-species-designer skill (ecology first, then this skill for the numbers). Trigger on "make a moth I can render", "moth JSON", "paste into the generator".
---

# Moth JSON generator

The Moth Generator page draws a top-down vector moth (forewings, hindwings, body, antennae) from a JSON object. The user pastes the JSON into **Species tab → Parameters (JSON) → Apply JSON**. Your job is to output JSON that renders well on the first try.

## Files

- `references/parameters.md`: every parameter, its range, default, and dependent limits (generated from the page code; trust it over memory).
- `references/examples.md`: five real, working JSONs with notes on what each demonstrates.
- `references/design-guide.md`: how to turn ecology and looks into parameters, the wing coordinate system, and layout rules for markings.
- `scripts/moth_render.js`: optional. `node scripts/moth_render.js params.json out.svg` validates the JSON, reports anything clamped, and renders the SVG. Use it if you have a code tool; if you also can convert SVG to PNG, look at the result and fix problems.

Read `design-guide.md` and skim `examples.md` for every moth. Consult `parameters.md` for ranges.

## Workflow

1. **Get the concept.** From the user's idea, or from a moth-species-designer profile (use its *palette block* for colours, *adult appearance* for pattern, *render brief* for the few defining features). If the user gave only a mood or word, pick the rest yourself; do not interrogate. If there is no profile, decide in one line: activity time, resting surface, defence (cryptic / warning / flash / eyespot), then let that drive the look.
2. **Pick 3 or 4 defining features** (silhouette, dominant colours, one signature mark, body/antenna type). The renderer shows flat vector shapes, so a few strong features read better than many fine ones.
3. **Write partial JSON.** Only include keys that differ from the defaults. Omitted keys take defaults and objects merge, so `{"fore":{"base":"#c9b18c"}}` is valid.
4. **Check** against the rules below (and run the script if you can).
5. **Reply** with: one line naming the moth and the assumption you made, then **one JSON code block**, then at most two lines on how to tweak it (which sliders/tabs). If a species profile was supplied, mention anything you could not draw.

## Hard rules for valid JSON

- Pure JSON: double quotes, no comments, no trailing commas, no `undefined`, and **numbers need a leading zero** (`0.2`, never `.2`; `-0.3`, never `-.3`). The page's `JSON.parse` rejects `.2` and shows only "Invalid JSON". Output in a single fenced ```json block with nothing else inside it. Do not add a "name" key; put the name in prose.
- Colours are 6-digit hex only, `#rrggbb`. Not `#abc`, not `rgb()`, not names. Invalid colours break shading.
- **Lists replace, not merge, and items are NOT filled with defaults.** `bands`, `spots`, `eyes` (under `fore` and `hind`) are arrays; every item must include all its fields:
  - band: `{"u","w","w2","skew","wave","freq","c"}`
  - spot: `{"u","v","rx","ry","c","ring","rw","o","rot"}` (`ring` is a colour even when `rw` is 0)
  - eyespot: `{"u","v","r","cols":[outer,...,pupil],"hl":true}` (1 to 4 colours, outer ring first, pupil last; fewer than 4 is padded)
- Toggled features are objects with `on`: `margin`/`costalBand` `{"on":true,"w":4,"c":"#..."}`, `fringe` `{"on":true,"len":.5,"c":"#..."}`, `grad` `{"on":true,"c":"#..."}` (blends from `base` to this colour toward the outer edge), `veins` `{"on":true,"c":"#..."}`, `speck` `{"on":true,"n":60,"s":.012,"c":"#...","ring":false,"rc":"#111111"}`. Setting `bands`, `spots`, `eyes` needs no `on`.
- Stay inside the ranges in `parameters.md`. The page silently clamps out-of-range values, so the moth the user sees can differ from what you intended. The main traps: `fore.hook` is only allowed when `fore.chord` is narrow (max `(70-chord)/25`); `hind.len` is 55 to `min(92, fore.chord*2.3)`; `hind.chord` is `0.7*hind.len` to `min(1.08*hind.len, 1.5*fore.chord)`; `body.abdLen` shrinks as `abdW` grows.
- Keep `fore.len` at 100 (all sizes are relative to it). Wing "size" is set by `fore.chord` and `hind.len`.
- **Corner shape:** `fore.apex`, `fore.tornus`, `hind.apex`, `hind.anal` run -0.9 (rounded) to +0.9 (sharp), 0 = neutral. Use negative values for soft, fuzzy, "cute" moths; positive for hawkmoths and angular moths.

## Colour and honesty limits

The renderer has no iridescence, transparency, or texture beyond subtle mottling. Approximate: iridescent blue/green = a saturated band with a lighter or darker neighbouring band; glassy wings = pale base with veins on; furry = high `body.fuzz` and `fringe`. Keep real-moth logic: bright, high-contrast upper wings need a reason (day flier, warning colours, or the bright part is hidden at rest). Cryptic moths get muted, speckled, broken-up patterns. If the user wants something purely fantastical, that is fine; say so.

## Variants and edits

When the user asks to tweak a moth they already have, return the **full** updated JSON (not a diff) so it can be pasted over the old one. To make several moths, change one or two defining features each, not everything. For a "bottom view", set `"view":"bottom"` and optionally `underFade` (0 to .8).
