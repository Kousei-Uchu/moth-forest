---
name: moth-species-designer
description: Design biologically realistic moth species (real-feeling, fictional, or "what would a moth look like in X habitat"). Use whenever the user wants to invent, generate, illustrate, describe, or worldbuild a moth or moth-like Lepidoptera, write a field-guide entry, make an image or SVG prompt of a moth, build a game or fantasy creature based on moths, or asks why a moth looks the way it does. Walks through genetics, development, diet, climate, predation, mimicry, wing optics, and wear to produce a coherent species profile in which every visual trait has a causal reason. Trigger even if the user just says "make me a moth" or "design a creature like a moth."
---

# Moth Species Designer

Real moths look the way they do because of a chain of causes: the ecological problem the species solves, the genes and pigments available to solve it, the conditions it developed under, and what has happened to the individual since it emerged. A moth that looks "realistic" is one where every visible trait can be traced to one of those causes and where the traits do not contradict each other. A moth that looks generic or fake usually has pretty colors with no reason behind them.

Work from cause to appearance, not from appearance to cause. Decide the ecology first, then let it constrain the look.

## Files in this skill

- `references/factor-effects.md`: the full catalog. For every known factor (genetic, developmental, nutritional, environmental, ecological, optical, post-emergence, human-caused), what it does to appearance, in which direction, and how well supported it is. Read the sections relevant to the design.
- `references/strategies.md`: ready-made appearance recipes for the major defensive and ecological strategies (bark mimic, leaf mimic, bird-dropping, wasp mimic, aposematic, flash-and-hide, and so on).
- `references/baseline.md`: body plans by lineage, size classes, antennae, pigment-to-color map, base rates for how common each look is in nature, and short per-biome notes (desert, tropical forest, temperate woodland, boreal, alpine/arctic, grassland, wetland, island).
- `references/output-template.md`: the species profile template, a render brief template, and one worked example.

Read `strategies.md` and `baseline.md` (including the biome note that matches the habitat) for every design. Read `factor-effects.md` sections as needed; for a full-detail profile, read all of it.

## Workflow

### 1. Take the user's constraints, then fill the gaps yourself

Users usually give a few anchors (a habitat, a color, a mood, a region, a family, "something spooky"). Treat these as fixed and decide everything else yourself instead of interrogating the user. Ask a question only if the request is truly contradictory or has no anchor at all and the user seems to want something specific. State your assumptions in one line.

If the user wants a fantasy or non-Earth moth, keep the same causal logic and change the ecology (different predators, light, plants); do not drop the causality.

### 2. Fix the ecology first (the design axes)

Choose a value for each axis. These choices drive almost everything visual.

| Axis | Choices to consider |
|---|---|
| Activity time | nocturnal (most), crepuscular, diurnal |
| Biome and region | sets palette, size, furriness, seasonality |
| Daytime resting substrate | bark, lichen, leaf litter, living leaf, rock, sand, flower, twig, bare ground |
| Main visual predator | birds (day-resting moths), lizards, spiders, mantids; bats and owls shape shape/fur not color |
| Defense strategy | see `strategies.md` |
| Larval host plant | decides larval color, sequestered chemistry, adult size |
| Adult feeding | feeds (proboscis, nectar, fluids) or non-feeding (vestigial mouthparts, short life, usually big and fat-bodied) |
| Voltinism | one brood a year, or several (several means possible seasonal forms) |
| Dimorphism | none, size only, antennae only, color, wing reduction in female |
| Polymorphism | monomorphic, or 2 to 3 discrete morphs with set frequencies |
| Individual condition | fresh, mid-life, worn, damaged |

Rule of thumb for realism: most moths are nocturnal, cryptic, and brown, grey, buff, or cream. Bright, aposematic, iridescent, or wildly patterned moths are a minority, and nearly all of them are day-fliers or hide the bright part at rest. If the user asks for something showy, justify it (see Coherence checks).

### 3. Build the genetic baseline

Pick a body plan from `baseline.md` (hawkmoth, silkmoth, tiger moth, geometrid, noctuid, and so on), then size, wing shape, antennae, and palette. Choose which pigments are available (see the pigment-to-color map in `baseline.md`); this is what stops you from painting an impossible color.

Pattern is modular. Bands, spots, eyespots, fringe, and basal patches vary semi-independently, and forewing and hindwing are partly independent. Use this: change one element and keep the rest, instead of regenerating the whole pattern.

### 4. Apply development, diet, and climate

Go through the development, nutrition, and environment sections of `factor-effects.md`. Decide the host plant and rearing conditions, then derive larva color, pupa form, adult size, melanism level, furriness, and any seasonal form. Describe the caterpillar and pupa too; they are separate organisms visually.

### 5. Apply ecology, structure, and sex

Layer in resting posture, mimicry or warning signals, structural color or metallic scales, bat-defense features (tails, thick fur), antennae type, eye shine, and sexual dimorphism. Check that the pattern works in the resting posture, because that is how it is seen in nature.

### 6. Place an individual specimen in time

A species is an average; an image or description is of one individual. Choose age, wear, damage, dust, pollen, parasites, and whether it is a living animal in the field or a pinned museum specimen. Worn moths are the norm in the wild after a few days of flight. Default to "a few days old, lightly worn" unless the user wants pristine.

### 7. Run the coherence checks, then write the output

Use the template in `output-template.md`. Every notable visual trait gets a short "because" reason. Include the palette block always. Include the separate cause map only for full-length profiles, because in a short profile it repeats the "because" clauses. If an image or SVG is wanted, also write the render brief.

## Coherence checks

Before finalizing, confirm each of these. Fix the design rather than the check.

1. **Conspicuous means a reason.** Bright, high-contrast, or iridescent upper surfaces need one of: diurnal activity, aposematism with a plausible toxin source, a mimicry model that exists, or a flash color hidden at rest. Otherwise the predator problem has no solution.
2. **Cryptic and aposematic do not mix on the same surface.** Warning species are uniform and bold; cryptic species are variable and broken up. A species can hide bright hindwings under cryptic forewings (flash strategy), but the visible resting surface must follow one strategy.
3. **Resting view matters.** Pattern lines should continue across overlapping wings in the resting pose. Describe the resting pose and what it exposes.
4. **Pigments match the diet and biochemistry.** Saturated blue is structural. Greens fade. Reds and oranges need ommochromes or dietary carotenoids. Toxic species need a named toxin source.
5. **Size, flight, and shape agree.** Fast migrants are narrow-winged and heavy-bodied; slow low fliers are broad-winged; heavy egg-laden females may be flightless. Non-feeding species are short-lived, so expect rapid wear.
6. **Climate matches coat.** Cold or high-altitude species are darker at the base, furrier, and often smaller-winged; hot arid species tend pale and sleek. Say what the exceptions are.
7. **Dimorphism has a logic.** Males: big feathery antennae to detect pheromone, slimmer body. Females: heavier abdomen, thinner antennae, sometimes reduced wings. Color dimorphism direction varies across lineages; choose and justify it.
8. **Morphs are discrete and have frequencies.** Do not blend. Give morph frequencies and the reason they persist (for example, melanic form common near soot or on dark bark).
9. **Stages are independent.** The caterpillar's look reflects its own predators and diet, not the adult's.
10. **Evidence tiers are respected.** Use well-established effects as the backbone. Use plausible, unsourced, or speculative effects only as subtle touches, and never present them as certain.
11. **Novelty check.** Make sure the design is not just a real species with the serial numbers filed off. If it closely matches a well-known moth (peppered moth, luna moth, hummingbird hawkmoth, cinnabar, a red underwing, and so on), change at least two ecology axes, or say plainly that it is modeled on that species. Do not present a fictional species as real.

## Style of the output

Be concrete and visual. Name colors precisely (for example "ash-grey with a bluish bloom, rust-brown costal patch, jet-black dashes"), describe textures (velvety, silky, powdery, fur-like, glossy), and say where each element sits on the wing (costa, apex, termen, tornus, discal spot, basal patch, antemedial and postmedial lines, fringe). Use terms like "forewing" and "hindwing" consistently. Keep it readable by someone who is not an entomologist, and define a term once if you use it.

Do not invent a Latin binomial unless asked; if you do, make it clearly fictional and consistent (genus ending, species epithet that describes a trait). Do not claim a fictional species is real or attribute it to real researchers.

## Honesty about the science

Most of the genetic mechanism research is from butterflies (especially Heliconius) and the peppered moth. State where a rule is borrowed from butterflies. When a factor is only plausible, or is tagged unsourced ([U]) in `factor-effects.md`, say so briefly in the profile instead of dressing it up as fact. The confidence tags in the references were written from general knowledge and not individually cited, so a user who needs a real field-guide claim should be told to verify it.
