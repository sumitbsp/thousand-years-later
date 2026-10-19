# Handoff: start here in a new chat

_Last updated: 2026-10-19 (end of the long planning chat with Claude)._

This file lets a new Claude chat pick up where we left off. Read it first, then the files it points to.

## Read these, in this order

1. **This file**: where things stand and what's next.
2. **docs/DESIGN.md**: the full game design (source of truth).
3. **DECISIONS.md**: every decision and why, newest first. The top section, "Design revision: real Earth, visible chaos", is the latest thinking.
4. **FLOW.md**: how the code works today, plus "Next: step 2.5".
5. **docs/DISCOVERIES.md**: special creatures players can evolve.
6. **docs/screens/**: mockups. `map-concept.png` (map style) and `creatures.png` (creature style) are the newest. The four numbered screens are older hex-era mockups.

## The game in three lines

**Thousand Years Later:** pick a version of the real Earth and 3–5 real animals (or one of three human versions), place them on a storybook world map (or let the game decide), watch 1,000 years of cartoonish evolution, and see what the world became.
**Core principle: show the chaos, don't tell it.** Creatures visibly mutate, events animate on the map, and big moments slow the game down and point at them.
Fun and replayability over realism.

## Where things stand

| Step | Status |
| --- | --- |
| 1. Hex world, biomes, presets, map | Done |
| 2. Animals, food chain, populations, placement, simulate screen, balance script | Done and playtested. **Not committed yet; commit before step 2.5.** |
| 2.5a. Real Earth regions + Earth variants, sim on Earth, re-balance | **Next** |
| 2.5b. Storybook atlas map, territory washes, updated screens | After 2.5a |
| 2.5c. Our own parts-based animated creatures + Creature Lab | After 2.5b |
| 3. Visible mutations, new species, animated events, Moments, discoveries | Later |
| 4. The reveal screen | Later |
| 5+. Postcard, Bestiary, challenges, Daily Earth, polish | Later |

**Last balance report (hex map, after playtest fixes):** average survival ~72%, highest "top" share 37%, humans well balanced. Lizards spread too far (20.6 regions). Re-balance on the real Earth; don't tune more on hexes.

## Design mockups

- **Design canvas (private, Sumit's account):** https://claude.ai/artifact/QFKJFWszc15HzxFKkFpX7J
  Boards: Setup, Placement, Simulating (all rebuilt for the storybook Earth + creatures), The reveal (old hex style, not updated yet), Map concept, Creatures (animated), plus shared components Atlas map and Critter.
- An older Claude Doc of the design exists; it's outdated. docs/DESIGN.md wins.

## Open questions / things Sumit isn't fully happy with

- Map style: "somewhat" happy. Keep iterating; drawing is separate from the sim.
- Creature style: "not 100% satisfied". Refine in review rounds (Creature Lab helps).
- The reveal screen mockup still uses the old hex style.
- The continent outlines in the mockups were hand-drawn approximations; the real build uses Natural Earth data.

## How Sumit likes to work

- Wants honest, blunt opinions, including "this is boring" or "don't build that".
- Builds with Claude Code; planning and design happen in Claude chats.
- Usage-conscious: split big steps into smaller prompts, start fresh Claude Code sessions per step (`/clear`), keep chats short, don't re-read big docs every session unless needed.
- After each step: test the app (dev server usually on http://localhost:5199), read the balance report, commit, then plan the next step.
- Project docs must stay current: Claude Code updates FLOW.md and DECISIONS.md at the end of every step.
- Accessibility is deliberately out of scope for now.

## Ready-to-use Claude Code prompts

Commit first: `git add -A && git commit -m "Step 2: animals, food chain, placement, simulation, balance; design revision docs"`

### Step 2.5a: real Earth data and simulation

```
Read CLAUDE.md, FLOW.md and DECISIONS.md first, especially "Design revision: real Earth, visible chaos" in DECISIONS.md and "Next: step 2.5" in FLOW.md. The full design is in docs/DESIGN.md ("The world" section).

This is step 2.5a: move the simulation from the generated hex world to the real Earth. Data and simulation only. Do NOT build the storybook map style or the creature art yet (2.5b and 2.5c). For now, draw the regions simply (flat biome colors, region outlines) so the game stays playable.

## Earth regions
- Add world-atlas, topojson-client, d3-geo and d3-delaunay (pin exact versions).
- Create src/sim/data/earthRegions.ts: ~40–50 regions as plain data (id, name, center lon/lat, isWater, biome, temperature, elevation, plantFood). Include the land and ocean regions listed in docs/DESIGN.md, plus enough others to cover every continent sensibly.
- Build region shapes as Voronoi cells around the centers, clipped to land (land regions) or sea (ocean regions). Neighbors = shared edges. Land regions on different continents are neighbors only across listed straits (Bering, Gibraltar, Sinai, Southeast Asia–Australia chain). Keep the geometry code out of the sim's tick logic: the sim needs only regions + a neighbor list, and both must be deterministic.
- Keep generateWorld and the hex code in place, unused by the main flow.

## Earth variants
- Replace climate presets and the temperature/rainfall/sea-level sliders with: Today's Earth, Ice Age Earth, Hot Earth, Drowned Earth, Wild Earth (as described in docs/DESIGN.md). Each variant adjusts biomes, temperature, sea level and land bridges on top of the base regions. Keep the chaos slider.
- RunInput becomes { earthVariant, chaos, seed, chosenAnimals, placements }. The seed drives auto placement and (later) events and mutations, not the map.

## Simulation and screens
- The tick model stays the same; it now runs on Earth regions.
- Setup: Earth variant chips + chaos + run seed. Placement and simulate screens: use the Earth regions with simple flat drawing; hit-testing = nearest region (Delaunay find). All placement rules still apply.

## Tests and balance
- Update tests: determinism, every region has neighbors, land/sea neighbors make sense, straits connect the right continents, variants change biomes as described, habitat rules hold on the new map.
- Run npm run balance (200 runs) across the Earth variants. Re-tune toward the existing targets (50–80% average survival, no animal top in more than ~35% of its runs). Check lizards specifically: they spread too far last time. Report the table briefly.

## Docs
- Update FLOW.md for the new world source and shrink the "Next: step 2.5" section to what remains (2.5b and 2.5c).
- Add DECISIONS.md entries for choices you make (region list, variant details, strait links, tuning changes).
```

### Step 2.5b: storybook atlas map

```
Read CLAUDE.md, FLOW.md and DECISIONS.md first. This is step 2.5b: draw the Earth as a storybook atlas, matching docs/screens/map-concept.png and the "Visual style → Atlas map" part of docs/DESIGN.md. Do NOT build creature art yet (2.5c); keep the current tokens.

- Canvas 2D, scaled for devicePixelRatio. Paint the base map ONCE to an offscreen canvas and reuse it; only redraw tokens, territories and effects.
- Parchment paper with subtle grain and a darker vignette; ink coastlines with a slight hand-drawn wobble; faint ripple lines along coasts; watercolor biome washes that blend at edges (blurred, noise-distorted fills), clipped to land; small inked mountains, trees and dunes; hand-lettered region and ocean names (Google font "IM Fell English"); a compass rose and a small sea serpent.
- Simulate screen: each species gets a fixed territory color; regions where it dominates get a soft wash in that color with dashed edges. Replace the population dots.
- Placement screen: faint dotted region borders; while dragging, outline the region under the pointer and label it ("Drop on Sahara · Bad fit"); "Can't survive here" in red where the animal can't live.
- Keep the dark app chrome; the map is the warm centerpiece.
- Update FLOW.md and add DECISIONS.md entries for rendering choices.
```

### Step 2.5c: our own animated creatures

```
Read CLAUDE.md, FLOW.md and DECISIONS.md first. This is step 2.5c: our own parts-based creature art, matching docs/screens/creatures.png and the "Creature art" section of docs/DESIGN.md. No icon library.

- Create src/art/ with one SVG definition per animal (16 incl. 3 humans), 64×64 grid, side view facing right, solid ink (#2E2414) with a few parchment details; amber (#E8A33D) only for beaks, feet and the smart-human lightbulb.
- Build every animal from named parts (body, head, legs, tail, ears, wings…), each its own SVG group with a pivot point.
- Group animals into body plans (four-legged, bird, reptile, frog, fish, insect, human). Each body plan defines named anchor points (headTop, mouth, shoulder, back, tailBase, feet, eyes); each animal supplies their coordinates.
- Humans: one shared figure. Weak = smaller, shown as a small crowd; strong = broad torso, thick arms; smart = normal + amber lightbulb.
- renderCreature(animalId, mutations[], options) → SVG. mutations[] is empty in this step, but the signature and anchor system must be ready for step 3.
- Idle animation for all creatures: gentle breathing with a random phase per creature, and blinking eyes. One animation clock or CSS, not per-creature timers.
- Use the creatures everywhere: setup cards, placement tokens (inside a parchment circle: auto = dashed ring, placed = amber), simulate screen, sidebars.
- Add a hidden Creature Lab page (e.g. /#lab): all 16 animals large, with anchor points marked. Step 3 will add every mutation here.
- Update FLOW.md and DECISIONS.md.
```

## How to start the next chat

> "I'm building Thousand Years Later. Read HANDOFF.md in my project folder, then docs/DESIGN.md and the top of DECISIONS.md. [What I want to do today.]"

When a step is done, update the "Where things stand" table here (or ask Claude to).
