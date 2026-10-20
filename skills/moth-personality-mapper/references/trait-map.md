# Trait map

| Style | Typical traits | Look (renderer parameters) | Biological story |
|---|---|---|---|
| Cute | gentle, warm, cosy, nurturing | rounded corners (apex/tornus/anal negative), broad wings `fore.chord` 48 to 58, pastel palette, `body.fuzz` ~2, big head and eyes, short fat body, feather antennae | slow, plump, cold-adapted fur: safe because it stays home |
| Cool | magnetic, wildcard, stylish, restless | dark base + two saturated accents from opposite sides of the wheel, parallel wavy bands, bright hindwing with dark margin, optional tails | a day-flying warning display that says "not worth the chase" |
| Cryptic | observant, private, grounded, unassuming | muted bark/lichen/leaf palette, speckle, zigzag lines, kidney spots, `costalBand` | disappears into the background until it chooses not to |
| Showy | funny, bold, social, generous | black/white/red/orange/yellow, big simple blotches, banded abdomen | aposematic: advertises itself, confident enough to be seen |
| Spooky | mysterious, reflective, intense, nocturnal | near-black or bone base, one glow colour, falcate wings (`fore.hook`), pale thorax mark, thin pale lines | night flier, hides a startling hindwing glow |
| Elegant | graceful, calm, organised, refined | narrow wings, long curled `hind.tail`, pale palette, veins on, small eyespots, feather antennae | tails confuse bats: composure under pressure |
| Eyespot | playful, bluffing, creative, resilient | big hindwing eyespots (3 to 4 rings), warm browns and ochres, forewing plain | looks bigger than it is: courage as a performance |

## Question to feature shortcuts

- Evening alone vs out vs making things: Spooky / Showy / Eyespot (+ Cryptic).
- Role in a group: joker → Showy; observer → Cryptic; planner → Elegant; wildcard → Cool.
- Setting: forest → Cryptic, neon city → Cool, meadow → Cute, ruins → Spooky.
- Under pressure: improvise → Showy/Cool; recharge → Cryptic/Cute; plan → Elegant; bluff → Eyespot.
- Hue: favourite colour sets the dominant hue; keep accent colours harmonious (opposite or +/-30 degrees).

## The page's deterministic version

The Moth Generator's Quiz tab scores these same styles (2 points for a strong match, 1 for a weak one), breaks ties with a hash of the answers, uses that hash as the seed, and rotates the palette to the chosen hue. An LLM using this skill should treat that moth as the baseline and personalise it.
