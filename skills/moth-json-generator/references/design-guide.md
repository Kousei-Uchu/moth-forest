# Design guide: from idea to parameters

## Wing coordinates (for placing bands, spots, eyespots)

Each wing is drawn as the right-hand wing and mirrored.

- `u` runs **along** the wing: 0 at the body, 1 at the outer edge (wingtip for the forewing).
- `v` runs **across** the wing: 0 at the leading edge (costa, the front edge), 1 at the trailing edge. Values slightly outside 0 to 1 spill past the edge (clipped to the wing shape).
- Bands are lines at roughly constant `u` running from leading to trailing edge. `w` is width at the leading edge, `w2` at the trailing edge (all fractions of wing length; .02 is a thin line, .1 a fat band, .2+ a big block). `skew` tilts the band (positive tilts outward toward the trailing edge; max ±.6). `wave` is wiggle amplitude in pixels, `freq` its frequency. Parallel wavy lines: same `wave`, `freq`, similar `skew`, different `u`.
- Spots: `rx` is a fraction of wing **length**, `ry` a fraction of wing **chord** (width). Forewing chord is about half its length, so `rx` .03 with `ry` .06 gives a circle. `rot` rotates in degrees, `o` is opacity.
- Eyespots: `r` is a fraction of wing length; rings shrink from `cols[0]` (outer) to the last colour (pupil).

## Draw order (back to front on each wing)

fringe, base fill (or gradient), faint mottling, veins, margin band, leading-edge band, bands, spots, specks, eyespots, outline. Later items cover earlier ones, so eyespots always sit on top.

## Top-view overlap

In the resting top view the forewing covers the front of the hindwing. Only the hindwing area behind the forewing's trailing edge is fully visible (roughly `v` > .45, `u` .25 to .95). Put hindwing spots, eyespots, and flash colours there or they will be hidden. A hindwing `margin` shows nicely as a coloured border.

## Biology to parameters

| Idea | Parameters |
|---|---|
| Hawkmoth / fast flier | narrow `fore.chord` 30 to 38, high `fore.sweep` .2+, `fore.hook` .2 to .5, `apex` +.4, small `hind.len` ~55 (and `hind.chord` low), thick body (`body.tw` 15 to 17, `abdLen` 60+), thread antennae |
| Silkmoth / giant | big `fore.chord` 50 to 62, broad `hind` (`hind.len` 70 to 90), `body.fuzz` 1.4+, no mouthpart so short fat abdomen, feather antennae (males) |
| Geometrid / carpet moth | wide flat wings, `fore.chord` 40 to 52, thin body (`abdW` small, long `abdLen`), thread/serrate antennae, wavy parallel bands + speckle |
| Bark / lichen mimic | muted greys and browns, `speck` on, 2 to 3 zigzag bands (`wave` 4 to 7, `freq` 8 to 13), a kidney-shaped pair of spots, `costalBand` mottled, veins off |
| Dead-leaf mimic | brown, `fore.hook` .3 to .7 with narrow chord, `veins` on, one long skewed band as midrib (`skew` ±.5), scallops (`teeth` 3 to 5) |
| Bird-dropping mimic | white + black blotch: one large spot or fat band, few details, small and plump |
| Warning (aposematic) | black/white/red/orange/yellow only, large simple shapes, banded abdomen (`body.stripe`), no cryptic speckle |
| Flash / startle | cryptic forewing, bright hindwing (red/orange/yellow with dark `margin`) |
| Eyespot defence | `hind.eyes` large (`r` .16 to .24), 3 to 4 ring colours, forewing plain |
| Tailed (bat defence) | `hind.tail` .7 to 1.2 times `hind.len`, `hind.curl` ±.3, narrow `hind.chord`, `fore.chord` ≤ 44 |
| Cold / alpine | darker `body.color`, `body.fuzz` 1.6+, smaller wings |
| Desert | pale, sandy, sleek, `fuzz` ≤ 1, few markings |
| Male vs female | males: `antenna.type` "feather", longer; females: "thread", `abdW` larger. One JSON = one individual |
| Worn individual | `organic` .6 to .8, fewer spots, `fringe.len` small |

## Cute / cool / spooky shortcuts

- **Cute:** rounded corners (all four sharpness params negative), `fore.chord` 48 to 58, `body.fuzz` ~2, `body.tw` 16 to 19, short `abdLen` 38 to 50, big `head` .62 and `eyeSize` .2+, pastel palette, feather antennae. (Legs are drawn only in the bottom view, so `body.legs.c` just sets their colour there.)
- **Cool:** dark base, two saturated accent colours from opposite sides of the wheel, parallel wavy bands alternating them, bright hindwing with dark margin, optional tails and eyespot.
- **Spooky:** near-black or bone base, one glow colour (blood red, sickly green, violet), `body.mark` pale (skull-like thorax), falcate wings, thin pale lines, glowing hindwing eyespots.

## Palette craft

Pick one dark, one mid, one light from the same hue family, plus at most one accent. Outline (`edge`) = the base darkened ~40%. Fringe colour = base lightened. Body = base or the mid tone; `body.alt` is the tuft colour (a second tone). Colour the antennae darker than the body.

## Final check before sending

1. Every list item has every field. 2. All colours are `#rrggbb`. 3. Ranges respected (see parameters.md). 4. Hindwing markings are in the visible zone. 5. The look agrees with the stated ecology (or you said it is fantasy).


## Defaults to respect

`organic` defaults to 0 (smooth, clean outlines) and `fringe.on` to false: edge fringe renders as small spikes, so leave it off unless the user asks for a fluffy edge (then use `fringe.len` 0.3 to 0.5). Raise `organic` (0.3 to 0.6) only for a worn or hand-drawn feel.
