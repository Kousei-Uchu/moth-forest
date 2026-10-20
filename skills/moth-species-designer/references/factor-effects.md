# Factor-effects catalog

How every known factor changes a moth's appearance, and by how much. Use it as a lookup while designing.

**Confidence tags**
- **[E]** Well documented in moths or in Lepidoptera generally. Safe as a backbone.
- **[P]** Documented in some Lepidoptera or some moths; varies by species. Use with a stated reason.
- **[S]** Hypothesized, weakly supported, or inferred. Use only as a subtle touch.
- **[U]** Unsourced: written from general knowledge without a specific citation, or the direction of the effect varies by species and is not settled. Usable, but hedge it in the output ("plausibly", "in some species") and do not use it as the sole justification for a striking trait. Tags can combine, for example [P, U].

**Contents**
1. Genetic and evolutionary
2. Developmental and physiological
3. Nutritional
4. Environmental (during development)
5. Ecological and behavioral
6. Physical, optical, structural
7. Post-emergence and external
8. Human-caused
9. How factors interact and which wins

---

## 1. Genetic and evolutionary

**Species genome** [E]: fixes body plan, venation, scale types, and the baseline palette. Every other factor modulates this. Start here.

**Patterning genes** (pattern-placement genes work like sliders on separate traits). Most mechanism work is in butterflies; moth confirmation is partial.
- *WntA*: shifts where dark bands and color boundaries sit [E in butterflies, P in moths]. Effect: bands wider, narrower, fused, or broken.
- *cortex*: controls melanic vs. light regions. In the peppered moth, a transposon insertion at this locus produces the melanic form [E]. Effect: wing becomes mostly black or dark brown, with the fine pattern faint or invisible.
- *optix*: places red and orange (ommochrome) pigment [E butterflies, P moths]. Effect: red/orange patches appear, move, or vanish.
- *aristaless*: switches white vs. yellow scale types [E butterflies]. Effect: pale areas are white or yellow.
- *doublesex*: sex-limited traits and some mimicry morphs [E butterflies]. Effect: one sex shows a morph the other lacks.
- Melanin pathway genes (such as *yellow*, *ebony*, *tan*): shift black vs. brown vs. tan [E in insects]. Effect: overall tone warmer or cooler, darker or lighter.
- **Modularity** [E]: bands, spots, eyespots, fringes, and basal patches can change independently. Forewing and hindwing are partly independent. Design by editing modules.

**Allelic polymorphism** [E]: discrete morphs in one species, typically 2 to 3, not a continuum. Melanic alleles are often dominant. Morph frequencies reflect local selection and can change over decades.
- Example frequencies: melanic 5 to 15% in a clean-air woodland, 80 to 98% near heavy soot (historical industrial Britain), and falling again after pollution cleanup.

**Sex-limited genes** [E]: dimorphism can be in size, color, antenna shape, wing shape, or wing loss. No universal direction. Examples of logic: males have large pectinate antennae to detect pheromones; females are heavier with eggs and sometimes brachypterous or wingless (winter moth, vapourer, bagworms).

**Supergenes and mimicry loci** [E butterflies, P moths]: several traits (color, pattern, shape) switch together as one block. If you invent a mimic morph, change all linked traits at once.

**Mutations and aberrations** [E]: rare (usually well under 1%).
- Albinism or leucism: pale to white, eyes may stay dark.
- Melanic aberration: unusually dark individual in a normally pale species.
- Flavism or xanthism: yellower than normal.
- Missing or enlarged pattern elements: absent spot, fused bands.
- **Gynandromorph**: half male, half female (often split down the midline) or mosaic; striking in dimorphic species, very rare.
- Asymmetry between left and right wings.

**Hybridization and introgression** [E, rare in nature]: intermediate or mosaic pattern; hybrids between close hawkmoth or silkmoth species are documented. Hybrids are often intermediate in color, antennae, and size, and may show odd pattern combinations.

**Genetic drift and founder effects** [P, U]: small isolated populations can fix an unusual morph, a smaller size, or a simplified pattern. Island or mountain-top forms can differ distinctly from the mainland form. Effect size is unpredictable; describe one clear difference, not many.

**Sexual selection** [E for scent, P for visual in nocturnal species]:
- Scent organs show up as visible structures: hair pencils (coremata) that can be everted, tufts of scent scales on wings or legs, brush-like legs, patches of androconia (often a differently textured or colored patch on the male forewing) [E].
- Visual mate signals matter mostly in day-fliers, where UV reflectance and bright patches can be tuned to mate choice [P]. In nocturnal species keep visual dimorphism modest.

**Natural selection** [E]: sets the intensity of conformity. Strong predation on resting moths gives precise background matching and low tolerance for mismatched individuals; relaxed predation allows more variation. Aposematic signals are selected to be uniform; cryptic patterns are selected to be variable among individuals so predators cannot form a search image.

---

## 2. Developmental and physiological

**Life stage** [E]: egg, larva (caterpillar), pupa, adult are four visually independent forms.
- Egg: spherical, flattened, ribbed, or barrel-shaped; laid singly, in rows, or in masses; masses may be covered in hair from the female's abdomen (tussock and lasiocampid moths); color often changes as embryo develops (pale, then darkening or gaining colored bands).
- Pupa: naked and brown, or in a silk cocoon, or in soil or leaf litter; color often matches the substrate; shapes include smooth, spiny, with a free or fused proboscis case.

**Instar stage** [E]: caterpillars change between molts. Early instars are small, proportionally large-headed, and simpler in pattern; later instars gain bold or cryptic patterning. Many hawkmoth larvae in the final instar change from green to brown or pink before leaving the plant to pupate (the "wandering" phase).

**Hormones** [E/P]:
- Ecdysone (20-hydroxyecdysone) pulses drive molts and, in the pupa, the timing of wing scale maturation. Pigments mature in sequence, so pupal wings visibly develop color over the final days before emergence [E].
- Juvenile hormone: levels during critical windows shift color of larvae (for example, heat-induced black form in the tobacco hornworm mutant strain) [E] and in butterflies shift seasonal form [E butterflies, P moths].
- The PBAN/MRCH peptide family is linked to pheromone production, diapause, and darkening/reddish coloration in some noctuid larvae [P].
- Practical effect: hormone timing is the mechanism behind seasonal forms and density-dependent darkening; it does not give a new color, it moves a threshold.

**Wing scale development** [E]: each scale is one cell and carries essentially one pigment color, so wing patterns are a mosaic of single-color scales, like pixels. Scales overlap like roof tiles. Scale types: cover scales (visible color), ground scales (underlying), androconia (scent, male), hair-like scales (thorax and abdomen). Ridges and cross-ribs on the scale surface create gloss and structural color.

**Pigment biochemistry** [E]: see the pigment-to-color table in `baseline.md`. Key constraint: a moth can only show colors its biochemistry or nanostructure can produce.

**Size and body condition** [E]: set by larval growth, nutrition, and temperature. Within-species variation is commonly 20 to 30% in wingspan, more in females. Poor condition: smaller, paler, weaker pattern contrast, thin body.

**Wing expansion** [E]: after emerging, a moth pumps fluid into its wings and hangs while they expand and harden over roughly an hour. Failure (falling, cramped pupa, damaged pupa, dry air) produces crumpled, curled, or stunted wings with a compressed version of the normal pattern.

**Age** [E]: fresh adults have full scale cover, vivid color, intact fringe. With time scales are lost, colors fade, the body may look greasy, and the fringe frays.

**Diapause** [P, U]: overwintering pupae or adults often show distinct spring forms, and pupal color may be set by substrate cues.

**Reproductive state** [E]: egg-laden females have a thick, rounded abdomen and look small-winged by comparison. After laying, females of some tussock moths have a bald abdomen tip because they used their hairs to cover the eggs.

---

## 3. Nutritional (mostly larval)

**Host plant species** [E]: affects larval color through ingested pigments and through chemistry; some species are polyphagous and vary a lot, others are specialists and stay uniform. Many caterpillars match their host plant's green or its bark.

**Diet-induced polymorphism** [E]: the emerald moth *Nemoria arizonaria* is the classic case. Spring larvae fed on oak catkins look like catkins; summer larvae fed on leaves look like twigs. The cue is diet chemistry (tannins). Use for any species with a seasonal host switch.

**Plant quality and nitrogen** [E]: high-quality hosts give faster growth, larger adults, and brighter colors; poor hosts give small, pale adults and longer development.

**Sequestered toxins** [E]: caterpillars store plant toxins and carry them to the adult. Aristolochic acids, cardenolides, pyrrolizidine alkaloids (as in the cinnabar moth on ragwort and many tiger moths), cyanogenic glycosides (burnet moths). Correlates with warning colors (red, orange, yellow with black), slow flight, and sometimes frothing or odor. Pyrrolizidine alkaloids can also feed pheromone production, visible as everted scent tufts on males.

**Carotenoids** [E larvae, P adults]: dietary; yield yellow and orange. Caterpillars on carotenoid-rich plants show more yellow or orange.

**Starvation and malnutrition** [E]: smaller, paler, deformed, weak adult; slower pupation.

**Larval density and crowding** [E for some noctuid pests such as armyworms]: crowded larvae become darker and more active (density-dependent phase polyphenism); solitary larvae are paler and greener or brown. If a species swarms as larvae, show two phases.

**Feeding mode** [E]: leaf-chewers, borers, leaf-miners, and root-feeders have different larval looks (borers are pale and soft; miners are tiny and flat; external feeders are pigmented).

---

## 4. Environmental (during development)

**Temperature** [E general, P moths]:
- Cooler rearing gives larger adults (the temperature-size rule applies to most ectotherms) [E], and often more melanin, so darker wings [E in butterflies, P in moths].
- Warm rearing gives faster development, smaller, often paler or brighter adults [P, U].
- A cold or heat shock to pupae causes aberrant forms with enlarged dark areas or missing pattern [E; well known to collectors].

**Photoperiod** [E butterflies, P/U moths]: short days vs long days trigger seasonal morphs in multivoltine species. Moths with two or more broods (for example thorn moths in the genus *Selenia*) often differ between spring and summer broods in size and tone. The direction of the difference varies by species; pick one and state why.

**Humidity and moisture** [P, U]: humid regions often have darker, more saturated moths than arid regions, which tend toward pale, sandy, sleek forms (a Gloger-type pattern; weaker and less consistent in insects than in birds).

**Altitude and latitude** [E/P; direction in moths U]:
- Cold sites: darker basal wing areas (to absorb heat), dense long hair on thorax and abdomen, smaller wings relative to body, reduced flight in some species, sometimes smaller size overall because of short seasons.
- Thermal melanism hypothesis: darker forms in cooler climates [E for several taxa; assemblage-level patterns in moths and butterflies support it, but with exceptions].

**Season and generation** [E]: see photoperiod and temperature. Early-season individuals can differ from late-season.

**Light quality and background color** [E/P]:
- Peppered moth caterpillars adjust their body color toward the twig color they sit on, using light sensed through the skin [E].
- Many pupae take on color from the substrate they pupate on [P, U].

**Seasonal extremes** [P, U]: drought lowers host quality, so smaller moths. Early frost can kill or deform pupae. Extreme heat can produce pale, small, malformed adults.

**Chemical exposure** [P, U]: pesticides and heavy metals can cause wing deformities, asymmetry, and reduced size. Soot or dust deposits can darken scales superficially.

**Radiation** [P, U]: UV-B and ionizing radiation have caused wing, eye, and antenna deformities and size reductions in butterflies near nuclear accidents; evidence in moths is thinner.

---

## 5. Ecological and behavioral

For full appearance recipes see `strategies.md`. The factor-level effects:

**Habitat and background matching** [E]: match the **substrate the moth actually rests on in daytime**, not the average habitat. Bark gives grey-brown with lichen patches; leaf litter gives ochre and russet; lichen gives pale green-grey with black speckle; sand gives buff; rock-specific morphs exist. Populations on dark and light substrates differ in morph frequency.

**Predation** [E]:
- Daytime visual predators (birds, lizards, some mammals) act on resting moths, so they shape color and pattern. This is the key fact for nocturnal moths: their color is shaped by what finds them at rest by day.
- Bats (night, acoustic) shape tails, body fur, and wing shape (see section 6), not color.
- Spiders, mantids, parasitoid wasps and flies shape defensive behavior and sometimes body size.
- Marks left by predator attacks: symmetrical beak-shaped notches in folded wings, torn hindwing tails, missing hindwing lobes.

**Mimicry** [E]:
- Batesian (harmless mimics a harmful model): the model must share the mimic's range and season and be more common than the mimic. Wasp-mimic moths (clearwings) have transparent wings, banded abdomens, wasp-like waists, and diurnal behavior.
- Müllerian (several harmful species converge): groups of tiger moths and relatives share orange/black or yellow/black patterns, forming rings.
- Non-living mimicry: bird droppings (white and dark glossy splash, flat posture), dead leaves (apex hook, painted midrib and veins), broken twigs or branches (cylindrical wrapped resting shape, as in birch-twig mimic buff-tip), lichen (pale green-grey with dark speckle).

**Aposematism** [E]: bold red, orange, yellow, or white on black; large contiguous patches; low variation between individuals; slow flight; often day-flying; larvae often gregarious and brightly colored. Needs a toxin source.

**Resting posture** [E]: roof-shape (many noctuids), flat delta (geometrids, spread against bark), wrapped around a twig (notodontids), tent or bell-shape (many tortricids), head-up on a trunk (many hawkmoths), tail-curl or abdomen-raised. The pattern is designed for the resting view. Lines on forewings and hindwings should line up when the wings are in the resting position.

**Parasites and disease** [E]:
- Ear mites: tiny red or orange mites on thorax or near the wing base [E].
- Fungal infection (on dead or dying moths): fuzzy white, grey, or colored growth.
- Parasitoids affect larvae mostly (holes, cocoons on skin).

**Competition and density** [P]: density mostly matters through larval phase polyphenism (section 3).

**Migration and range** [E]: migrants (silver Y, hummingbird hawkmoth, black cutworm moths) have narrow pointed forewings, heavy flight muscle, plain or modest patterns, and show heavy wear. Ranges with distinct climates produce clinal variation or subspecies.

---

## 6. Physical, optical, structural

**Scale microstructure** [E]: ridge spacing, cross-ribs, lamellae, and multilayers cause iridescent or structural color. The gold and silver metallic marks of many plusiine noctuids (for example the golden *Diachrysia* spots) are scale-level reflectors [E]. Day-flying uraniid moths use multilayer reflectors for shimmering greens, blues, and coppers [E].

**Pigment-structure combinations** [E]: structural color needs a dark pigment layer below to look saturated. Remove the dark layer and the structural color goes pale and washed.

**Angle of view and lighting** [E]: iridescence shifts hue with angle (blue to green to gold to violet) and with lighting. In a still image pick one view and note the shift.

**UV reflectance and polarization** [P]: many moths reflect UV in species-specific ways, used in recognition and mating. Invisible to humans; in a visible render it shows as pale or white-looking areas. Optional detail only.

**Hair, scale, and bristle density** [E]: thick fur-like scales and hairs on the thorax and abdomen provide thermal insulation and also absorb bat ultrasound [P/E]; cold-climate moths are woollier. Raised scale tufts on the forewing (and dorsal projections on the trailing edge in prominent moths) break the outline.

**Wing venation and shape** [E]:
- Narrow, pointed, swept-back forewings: fast flyers (hawkmoths, migrants).
- Broad thin wings: slow, fluttery fliers (geometrids, ghost moths).
- Falcate (hooked) apex: dead-leaf mimicry (hook-tip moths).
- Hindwing tails: in silk moths (luna, comet), long tails scramble bat sonar and deflect strikes [E]. Tails are twisted or spatulate with a colored tip and often accompany eyespots.

**Eyes** [E]: large compound eyes. Nocturnal moths have light-gathering eyes that show eyeshine (reflecting orange, red, yellow-green) when lit; dark or brown otherwise. Eyes are often partly obscured by hair or scale.

**Antennae** [E]: pectinate (comb-like or feathery) in males of many silk moths, tussock moths, and others; thread-like (filiform) in most females; spindle-shaped with a hooked tip in hawkmoths; thickened club-like in burnet moths and some day fliers. Color can be banded or have contrasting tips.

**Fluorescence and bioluminescence** [S]: no moth is known to produce its own light, so never make a moth glow on its own in a realistic design. Some pigments show faint fluorescence under UV light; treat as an optional touch only for a UV-lamp scene.

---

## 7. Post-emergence and external

**Dust, pollen, and residue** [E]: yellow or orange pollen dusting on the head, proboscis, and thorax in flower visitors; orchid pollinia attached near the eyes or on the proboscis in hawkmoth pollinators; mud, plant dust, sooty mold or honeydew residue.

**Moisture damage and fungal growth** [E]: damp, clumped scales; fuzzy mold on dead or hibernating moths.

**Sun bleaching** [P]: fugitive pigments (greens, pinks, reds) fade over the moth's life; melanin is stable.

**Handling and collecting damage** [E]: fingerprint-shaped patches where scales rub off, bent or broken antennae and legs, pin holes, torn wing edges.

**Specimen and museum effects** [E]: pinned specimens are spread flat in an unnatural pose with a flattened thorax; greens fade quickly to yellow or brown, pinks fade, grease can seep through the body and wing bases, verdigris near the pin, dermestid beetle damage leaves frass and chewed antennae and wings, long-term light exposure fades color.

**Photographic factors** [E]: lighting, flash glare on structural scales, white balance, depth of field, background, and post-processing change appearance without changing the moth.

---

## 8. Human-caused

**Industrial pollution** [E]: soot-darkened bark selected for melanic forms of many species (peppered moth is the textbook case); frequencies reversed after clean-air policy.

**Light pollution** [S for appearance]: strongly affects behavior (attraction, disorientation, mortality) but has no well-established direct effect on appearance. Avoid inventing one. Possible subtle touch: more wear on moths that circle lights.

**Climate change** [P, U]: range shifts, earlier flight seasons, cline shifts, possible changes in assemblage-level lightness. Treat as a population-level trend, not a visual rule for one moth.

**Habitat loss and fragmentation** [P, U]: isolation promotes drift and sometimes smaller body sizes in small fragments.

**Captive rearing** [E]: bigger, brighter, or paler than wild moths depending on diet and temperature; more deformities; no natural wear; the domesticated silkworm moth is white, hairy, with reduced eyes and flight ability.

**Introduced species and agriculture** [E]: crop hosts alter larval color and size; polyphagous pest moths often have several larval color forms (green, brown, striped); pesticide pressure can lower body size and symmetry.

---

## 9. How factors interact and which wins

When two factors push in opposite directions, resolve in this order.

1. **Survival constraint first** (predator problem). The pattern must solve the daytime-rest or warning problem.
2. **Biochemical feasibility.** If the pigment or structure cannot be made, it is not available.
3. **Developmental and environmental modulation.** Temperature, diet, and photoperiod shift tone and size within the allowed range; they do not rewrite the strategy.
4. **Sex and polymorphism.** Add dimorphism and morphs on top.
5. **Individual history.** Age, wear, damage, residue last.

Typical conflicts and their resolutions:
- Thermal melanism vs. crypsis on pale bark: the species becomes darker at the basal wing and thorax (heat absorption) while the exposed wing surface stays cryptic.
- Mate signal vs. crypsis: put the signal on hidden surfaces, in UV, on small scent patches, or on the hindwing; keep the resting surface cryptic.
- Structural color vs. camouflage: iridescent moths are diurnal or reveal color only in flight.
- Fur for cold or bats vs. hot climates: expect fur-like thorax in cold or bat-rich places; sleeker in hot, arid, bat-poor places.
