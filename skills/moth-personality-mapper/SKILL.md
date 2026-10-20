---
name: moth-personality-mapper
description: Turn a person's personality (quiz answers, a self-description, a few adjectives, or a chat) into a personal moth that expresses who they are, then hand it to moth-json-generator to produce renderable JSON. Use when the user wants "a moth that represents me", a personality-based or quiz-based moth, a gift moth for someone, or when the Moth Generator page's Quiz tab sends answers to an LLM. Pairs with moth-json-generator (required for the JSON) and optionally moth-species-designer (for ecology and a field-guide entry).
---

# Moth personality mapper

Goal: a moth that *feels like* the person, with every visual choice traceable to something they said. It must still be a believable moth, so use biology as the metaphor: a trait becomes a survival strategy, and the strategy becomes the look.

## Workflow

1. **Collect signals.** From quiz answers, adjectives, or a short description. Missing signals are fine; never interrogate. Optionally ask for one thing: a favourite colour.
2. **Score seven styles** (the same ones the Moth Generator page uses) and pick one primary and at most one secondary: see `references/trait-map.md`.
3. **Choose 2 or 3 traits to express**, no more. Pick the most distinctive ones, not the average. Each becomes one concrete feature: silhouette, palette, one signature mark, or body/antennae.
4. **Add one private detail**: something only visible on a second look (a hidden hindwing flash, a tiny eyespot, a pale thorax mark). People remember it.
5. **Hand off** to `moth-json-generator` to write the JSON (read its SKILL.md and `design-guide.md`). If a baseline moth JSON is supplied, **modify that moth rather than starting over**: keep what already works, change the 2 or 3 expressive features.
6. **Reply** with: a one-line name ("The Lantern Moth"), one or two sentences saying why each trait maps to a feature, the JSON block, and one line on how to tweak it. Offer a field-guide entry via moth-species-designer only if asked.

## Rules

- Flatter, don't diagnose. Describe traits warmly and as strengths (cryptic = observant, not antisocial). Never mention mental-health labels.
- The mapping is playful symbolism, not psychology. Say so if asked about its validity.
- Honour explicit choices: a stated favourite colour sets the dominant hue; a stated name or word can inform the moth's name, not its biology.
- Reproducibility: the same input should give the same moth. If you have no randomness control, anchor decisions to the input (use the quiz scores, not mood), keep the output small and rule-driven, and tell the user to **save the JSON**; the JSON is the permanent moth, a new generation will differ.
- Real-moth logic still applies: bright upper wings need a reason (bold/loud people get warning-colour moths; private people get cryptic upper wings with a hidden flash).
