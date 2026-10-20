# Parameter reference (generated from the generator page code)

Ranges are what the page clamps to. Dynamic limits are shown as formulas over other parameters (`fore.chord` etc.). Defaults are used for any key you omit.


## Forewing

| path | meaning | range | default | only used when |
|---|---|---|---|---|
| `fore.chord` | Wing width | 30 … 62, step 0.5 | 44 |  |
| `fore.sweep` | Apex rake (forward sweep) | 0 … 0.34, step 0.01 | 0.14 |  |
| `fore.hook` | Falcate apex hook | 0 … `clamp((70-fore.chord)/25,0,.9)`, step 0.01 | 0 |  |
| `fore.bulge` | Outer margin convexity | 0 … `.4-fore.hook*.25`, step 0.01 | 0.2 |  |
| `fore.tx` | Tornus position | 0.68 … 0.92, step 0.01 | 0.8 |  |
| `fore.costal` | Leading-edge convexity | 0 … 0.5, step 0.01 | 0.3 |  |
| `fore.apex` | Front corner (apex): round ◂ 0 ▸ sharp | -0.9 … 0.9, step 0.01 | 0 |  |
| `fore.tornus` | Back corner (tornus): round ◂ 0 ▸ sharp | -0.9 … 0.9, step 0.01 | 0 |  |
| `fore.teeth` | Scallops | 0 … 7, step 1 | 0 |  |
| `fore.tooth` | Scallop depth | 0 … `fore.chord*.05`, step 0.1 | 0 | `fore.teeth>0` |
| `fore.tilt` | Wing angle | -6 … 8, step 0.5 | 0 |  |

## Hindwing

| path | meaning | range | default | only used when |
|---|---|---|---|---|
| `hind.len` | Length | 55 … `Math.min(92,fore.chord*2.3)`, step 1 | 66 |  |
| `hind.chord` | Width | `hind.len*.7` … `Math.min(hind.len*1.08,fore.chord*1.5)`, step 0.5 | 56 |  |
| `hind.round` | Outer roundness | 0 … 1, step 0.01 | 0.4 |  |
| `hind.apex` | Front corner: round ◂ 0 ▸ sharp | -0.9 … 0.9, step 0.01 | 0 |  |
| `hind.anal` | Back corner (anal angle): round ◂ 0 ▸ sharp | -0.9 … 0.9, step 0.01 | 0 | `hind.tail<=2` |
| `hind.tail` | Tail length | 0 … `hind.len*1.6`, step 1 | 0 |  |
| `hind.tw` | Tail root width | 2 … `Math.max(2.5,hind.tail*.12+2)`, step 0.1 | 4 | `hind.tail>2` |
| `hind.curl` | Tail curl | -0.5 … 0.5, step 0.01 | 0 | `hind.tail>2` |
| `hind.tailPos` | Tail position along trailing edge | 0.35 … 0.78, step 0.01 | 0.58 | `hind.tail>2` |
| `hind.teeth` | Scallops | 0 … 7, step 1 | 0 |  |
| `hind.tooth` | Scallop depth | 0 … `hind.chord*.05`, step 0.1 | 0 | `hind.teeth>0` |
| `hind.tilt` | Wing angle | 4 … 24, step 0.5 | 12 |  |

## Body

| path | meaning | range | default | only used when |
|---|---|---|---|---|
| `body.tw` | Thorax width | 10 … `Math.min(21,fore.chord*.5)`, step 0.5 | 13 |  |
| `body.head` | Head size | 0.42 … 0.66, step 0.01 | 0.55 |  |
| `body.abdW` | Abdomen width | `body.tw*.45` … `body.tw*.95`, step 0.5 | 11 |  |
| `body.abdLen` | Abdomen length | 38 … `Math.min(100,1100/body.abdW,hind.chord+40)`, step 1 | 62 |  |
| `body.taper` | Abdomen taper | 0 … 1, step 0.01 | 0.5 |  |
| `body.fuzz` | Fuzz / hair-scales | 0 … 2.2, step 0.05 | 1 |  |
| `body.eyes` | Show eyes | true/false | true |  |
| `body.eyeSize` | Eye size | 0.08 … 0.26, step 0.01 | 0.15 | `!!get(c,p)` |
| `body.segments` | Abdomen segments | true/false | true |  |
| `body.stripe.on` | Abdomen bands | true/false | false |  |
| `body.stripe.c` | Band colour | #rrggbb | "#3a2c20" | `!!get(c,p)` |
| `body.mark.on` | Thorax marking | true/false | false |  |
| `body.mark.c` | Marking colour | #rrggbb | "#e8d8a8" | `!!get(c,p)` |
| `body.legs.c` | Leg colour (bottom view only) | #rrggbb | "#7a6244" |  |

## Antennae

| path | meaning | range | default | only used when |
|---|---|---|---|---|
| `antenna.type` | Type | one of: thread, serrate, feather | "thread" |  |
| `antenna.len` | Length | 22 … 60, step 1 | 36 |  |
| `antenna.spread` | Spread angle | 15 … 50, step 1 | 30 |  |
| `antenna.barb` | Barb length | 2 … `antenna.len*.28`, step 0.5 | 7 | `antenna.type!=='thread'` |

## Fore pattern

| path | meaning | range | default | only used when |
|---|---|---|---|---|
| `fore.base` | Base colour | #rrggbb | "#c9b18c" |  |
| `fore.edge` | Outline colour | #rrggbb | "#4a3a28" |  |
| `fore.grad.on` | Gradient to outer edge | true/false | false |  |
| `fore.grad.c` | Outer colour | #rrggbb | "#8a6a45" | `!!get(c,p)` |
| `fore.margin.on` | Margin band | true/false | false |  |
| `fore.margin.w` | Margin width | 1 … 14, step 0.5 | 5 | `!!get(c,p)` |
| `fore.margin.c` | Margin colour | #rrggbb | "#6b4f33" | `!!get(c,p)` |
| `fore.costalBand.on` | Leading-edge band | true/false | false |  |
| `fore.costalBand.w` | Band width | 1 … 12, step 0.5 | 5 | `!!get(c,p)` |
| `fore.costalBand.c` | Band colour | #rrggbb | "#6b4f33" | `!!get(c,p)` |
| `fore.fringe.on` | Wing fringe (hair-like scales along the edge) | true/false | false |  |
| `fore.fringe.len` | Fringe length | 0.2 … 1.6, step 0.05 | 0.6 | `!!get(c,p)` |
| `fore.fringe.c` | Fringe colour | #rrggbb | "#e8ddc6" | `!!get(c,p)` |
| `fore.veins.on` | Veins | true/false | false |  |
| `fore.veins.c` | Vein colour | #rrggbb | "#6b4f33" | `!!get(c,p)` |
| `fore.speck.on` | Speckling | true/false | false |  |
| `fore.speck.n` | Speck count | 5 … 200, step 1 | 50 | `!!get(c,p)` |
| `fore.speck.s` | Speck size | 0.006 … 0.03, step 0.001 | 0.012 | `!!get(c,p)` |
| `fore.speck.c` | Speck colour | #rrggbb | "#3a2c20" | `!!get(c,p)` |
| `fore.speck.ring` | Ringed specks | true/false | false | `!!get(c,p)` |
| `fore.speck.rc` | Ring colour | #rrggbb | "#111111" | `g(c,k+'.speck.on')&&g(c,k+'.speck.ring')` |
| `fore.bands` | LIST of Bands / lines; each item needs ALL of: u, w, w2, skew, wave, freq, c | | [] | |
|  | item fields: u (0.03…0.97); w (0.01…0.4); w2 (0.01…0.5); skew (-0.6…0.6); wave (0…8); freq (2…16); c (colour) | | | |
| `fore.spots` | LIST of Spots; each item needs ALL of: u, v, rx, ry, rot, o, c, rw, ring | | [] | |
|  | item fields: u (0.03…0.97); v (-0.1…1.1); rx (0.01…0.2); ry (0.01…0.2); rot (-90…90); o (0.2…1); c (colour); rw (0…3); ring (colour) | | | |
| `fore.eyes` | LIST of Eyespots; each item needs ALL of: u, v, r, hl, cols.0, cols.1, cols.2, cols.3 | | [] | |
|  | item fields: u (0.05…0.95); v (0…1); r (0.04…0.24); hl (bool); cols.0 (colour); cols.1 (colour); cols.2 (colour); cols.3 (colour) | | | |

## Hind pattern

| path | meaning | range | default | only used when |
|---|---|---|---|---|
| `hind.base` | Base colour | #rrggbb | "#d8c4a0" |  |
| `hind.edge` | Outline colour | #rrggbb | "#4a3a28" |  |
| `hind.grad.on` | Gradient to outer edge | true/false | false |  |
| `hind.grad.c` | Outer colour | #rrggbb | "#8a6a45" | `!!get(c,p)` |
| `hind.margin.on` | Margin band | true/false | false |  |
| `hind.margin.w` | Margin width | 1 … 14, step 0.5 | 5 | `!!get(c,p)` |
| `hind.margin.c` | Margin colour | #rrggbb | "#6b4f33" | `!!get(c,p)` |
| `hind.costalBand.on` | Leading-edge band | true/false | false |  |
| `hind.costalBand.w` | Band width | 1 … 12, step 0.5 | 5 | `!!get(c,p)` |
| `hind.costalBand.c` | Band colour | #rrggbb | "#6b4f33" | `!!get(c,p)` |
| `hind.fringe.on` | Wing fringe (hair-like scales along the edge) | true/false | false |  |
| `hind.fringe.len` | Fringe length | 0.2 … 1.6, step 0.05 | 0.6 | `!!get(c,p)` |
| `hind.fringe.c` | Fringe colour | #rrggbb | "#e8ddc6" | `!!get(c,p)` |
| `hind.veins.on` | Veins | true/false | false |  |
| `hind.veins.c` | Vein colour | #rrggbb | "#6b4f33" | `!!get(c,p)` |
| `hind.speck.on` | Speckling | true/false | false |  |
| `hind.speck.n` | Speck count | 5 … 200, step 1 | 50 | `!!get(c,p)` |
| `hind.speck.s` | Speck size | 0.006 … 0.03, step 0.001 | 0.012 | `!!get(c,p)` |
| `hind.speck.c` | Speck colour | #rrggbb | "#3a2c20" | `!!get(c,p)` |
| `hind.speck.ring` | Ringed specks | true/false | false | `!!get(c,p)` |
| `hind.speck.rc` | Ring colour | #rrggbb | "#111111" | `g(c,k+'.speck.on')&&g(c,k+'.speck.ring')` |
| `hind.bands` | LIST of Bands / lines; each item needs ALL of: u, w, w2, skew, wave, freq, c | | [] | |
|  | item fields: u (0.03…0.97); w (0.01…0.4); w2 (0.01…0.5); skew (-0.6…0.6); wave (0…8); freq (2…16); c (colour) | | | |
| `hind.spots` | LIST of Spots; each item needs ALL of: u, v, rx, ry, rot, o, c, rw, ring | | [] | |
|  | item fields: u (0.03…0.97); v (-0.1…1.1); rx (0.01…0.2); ry (0.01…0.2); rot (-90…90); o (0.2…1); c (colour); rw (0…3); ring (colour) | | | |
| `hind.eyes` | LIST of Eyespots; each item needs ALL of: u, v, r, hl, cols.0, cols.1, cols.2, cols.3 | | [] | |
|  | item fields: u (0.05…0.95); v (0…1); r (0.04…0.24); hl (bool); cols.0 (colour); cols.1 (colour); cols.2 (colour); cols.3 (colour) | | | |

## Style

| path | meaning | range | default | only used when |
|---|---|---|---|---|
| `view` | View | one of: top, bottom | "top" |  |
| `organic` | Organic irregularity | 0 … 1, step 0.01 | 0 |  |
| `underFade` | Underside fade (bottom view) | 0 … 0.8, step 0.01 | 0.35 |  |

## Keys without a UI slider (JSON only)

`seed` (integer; drives organic wobble, mottling, speck positions), `fore.len` (keep 100: all sizes are relative to it), `fore.base/edge`, `hind.base/edge`, `body.color/alt/eyeColor`, `antenna.color`.
