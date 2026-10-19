# Thousand Years Later — Game Design

> Source of truth for what the game is and how it should eventually look.
> This describes the FULL game. Each build step implements only what its prompt asks for.
> See also: docs/DISCOVERIES.md (special creatures players can evolve) and docs/screens/ (visual references).

## The idea

The player picks a version of Earth and 3 to 5 real animals, decides where on the real world map they start (or lets the game decide), simulates 1,000 years of cartoonish evolution, and watches what the world and its creatures become.

No realism needed. The goal is surprise, fun and replayability. Real animals on the real Earth give instant meaning: "what happened to my wolves in Siberia?", "penguins in the Sahara?!"

## The core principle: show the chaos, don't tell it

The fun is **watching** chaos happen, not reading about it. Every important change must be visible on screen:

- A population that mutates **visibly changes**: fangs appear, wings grow, it gets bigger.
- Stacked mutations produce absurd creatures. That's the point.
- Events are **animated on the map**: meteors strike, ice creeps south, volcanoes erupt, floods swallow coasts.
- Species territories **spread and shrink** as colored washes on the map.
- When something big happens, the game **slows down and points at it** (see Moments).

Text (chronicle, headlines) supports what the player sees. It never replaces it.

## The core loop

1. **Set up** (about 30 seconds): pick an Earth and 3 to 5 animals.
2. **Place** (optional): see where every animal starts, drag the ones you care about.
3. **Watch** (1 to 2 minutes): centuries fly by, creatures mutate, events hit, moments pause to show the big ones. Or skip to the end.
4. **The reveal**: "A thousand years later…" — what survived, what died out, what new creatures exist, and how the world looks now.
5. **Replay**: back to placement with the same setup, tweak one thing, or start fresh.

## The world: the real Earth as a storybook atlas

- The map is the **real Earth** (Natural Earth public-domain outlines), drawn like an illustrated storybook atlas. See docs/screens/map-concept.png.
- About **40–50 named regions**: land regions like Sahara, Amazonia, Congo, Siberia, The Outback, Great Plains, Himalaya, The Steppe, Greenland, Arctic, Patagonia, Arabia, Europe, India, Southeast Asia; and ocean regions like North Pacific, South Atlantic, Indian Ocean, Arctic Ocean, Southern Ocean.
- Region shapes are **Voronoi cells** around region centers, clipped to land or sea. Neighbors come from shared edges. Continents connect only across real narrow straits (Bering, Gibraltar, Sinai, the Southeast Asia–Australia island chain).
- Each region has a biome, temperature, elevation and plant food. The map is the same every run.

### Earth variants (replace generated presets)

| Variant | What changes |
| --- | --- |
| Today's Earth | The world as it is (default) |
| Ice Age Earth | Ice over northern Europe and North America, lower seas, land bridges open (Bering, Australia–New Guinea) |
| Hot Earth | Deserts spread, rainforests shrink, polar ice melts |
| Drowned Earth | High seas, low coastal regions become ocean |
| Wild Earth | High chaos: frequent events and wild mutations |

**Chaos slider:** how often events and wild mutations happen. **Run seed:** drives events, mutations and auto placement (the map itself never changes).

**Variety tradeoff:** because the map is fixed, variety comes from Earth variants, events, placement, chaos and the seed. Later, **Alien worlds** (procedurally generated maps, reusing the old generator) can be an unlock.

## Animal roster

Each animal fills a different role. Stats: size, speed, attack, defense, diet, heat tolerance, cold tolerance, land/water/both, breeding rate.

### Launch roster (13 animals + 3 humans)

| Animal | Role |
| --- | --- |
| Wolf | Pack predator |
| Rabbit | Small plant-eater, fast breeder |
| Deer | Grazer |
| Bear | Big omnivore |
| Owl | Flying hunter |
| Frog | Water and land, swamp lover |
| Crocodile | Ambush predator, water and land |
| Penguin | Cold specialist, swimmer |
| Elephant | Giant plant-eater, tough, breeds very slowly |
| Rat | Tiny, eats anything, breeds explosively |
| Shark | Ocean predator, water only |
| Lizard | Hot-climate specialist, cold-blooded |
| Beetle | Insect, huge numbers, armored |
| Weak humans | Small, breed fast, eat anything. Survive by numbers. |
| Strong humans | Big attack and defense, need lots of food, breed slowly. Dominate early, crash in hard times. |
| Smart humans | Wide climate tolerance ("build shelter"), better mutation luck, but weak in fights and slow to breed. |

Humans are animals like any other: no tools, farming, buildings or technology.

**Later batches (unlock rewards):** Monkey, Octopus, Eagle, Camel, Bat, Tortoise, Crab, Goat. **Ancient pack:** mammoth, sabre-toothed cat, giant sloth, dodo, moa.

## Creature art: our own, built from parts

See docs/screens/creatures.png.

- Every animal is our own SVG, drawn on a 64×64 grid, side view facing right, solid ink (#2E2414) with a few parchment details. Amber (#E8A33D) only for beaks, feet and the smart-human lightbulb. No icon library.
- Each animal is built from **named parts** (body, head, legs, tail, ears, wings…), each with a **pivot point** for animation.
- Animals are grouped into **body plans**: four-legged (wolf, rabbit, deer, bear, elephant, rat), bird (owl, penguin), reptile (crocodile, lizard), frog, fish (shark), insect (beetle), human.
- Each body plan has named **anchor points**: headTop, mouth, shoulder, back, tailBase, feet, eyes. Mutation overlays snap to these.
- **Mutations are drawn per body plan, not per animal** (~30 mutations across a few body plans, roughly 60–100 small pieces). Size is scaling; color is tinting.
- Mutation layering has a fixed order (fur under spikes under armor) and exclusion rules (flightless removes wings).
- Humans: one shared figure. Weak = smaller, shown as a small crowd. Strong = broad torso, thick arms. Smart = normal figure + amber lightbulb.
- A hidden **Creature Lab** debug page shows every animal with every mutation, to catch broken combinations quickly.

### Animation

1. **Idle life (all creatures):** gentle breathing, blinking, slight bob. Random phase per creature.
2. **Part motion:** tail wag, wing flap, ear twitch, throat sac, glowing pulse.
3. **Movement:** hops and simple walk cycles when creatures move on the map. Mutation parts ride along on the part they're attached to.
4. Keep it cheap: CSS or a single animation clock, not per-creature timers.

## Placement

A separate screen between setup and the simulation.

- Opens with every animal already **auto-placed**, so the player can just press Start.
- Each animal is **Auto** (dashed ring) or **Placed by you** (solid amber). Dragging marks it as placed.
- Auto placement is sensible (penguins near ice or coast, frogs near swamp or water), uses the seed, and stays stable unless the player presses Re-roll or Reset.
- Players can place animals somewhere bad on purpose (penguins in the Sahara). Land animals can't be dropped in the ocean and vice versa: "Can't survive here".
- While dragging, the region under the pointer is outlined and labeled with its name and fit ("Drop on Sahara · Bad fit").
- Faint dotted region borders show only on this screen.
- Drag and drop works with mouse and touch.

## The simulation (cartoon evolution)

- **Time:** 100 ticks of 10 years each.
- **Model:** populations per region, not individual creatures.

**Each tick:** plants grow → fitness per population → feeding (plant competition, predation, omnivores) → growth and decline → migration → mutation rolls → new species when a population is set apart by 2–3 mutations → discovery check (docs/DISCOVERIES.md) → events → extinction.

### Mutation catalog (about 32)

- **Movement:** wings, flightless, gills, webbed feet, extra legs, longer legs
- **Defense:** shell, spikes, armor plates, thick fur, no fur
- **Weapons:** horns, tusks, fangs, venom, claws
- **Diet:** meat-eater
- **Body:** giant size, tiny size, long neck, long tail
- **Senses and looks:** camouflage, glowing skin, extra eyes, big ears
- **Habits:** burrowing, tree-climbing, swimming

### Events (all animated on the map)

- **Common:** ice age (ice creeps from the poles), drought (land browns), flood (coasts swallowed), plague (sickly tint on a species' territory), volcano (eruption, darkened land).
- **Rare:** supervolcano, comet strike (streak, flash, crater), sudden sea level drop (land bridges appear), a plague that targets one animal.

### Naming

Base animal + key mutations + often a place: "Fanged Snow Rabbit", "Glowing Swamp Frog", "Burrow Owl", plus a joke scientific name like *Lepus dentatus*. Discovery matches take the discovery's name ("Woolly Mammoth"). Every species is still visually unique.

## Moments

When something big happens, the game directs attention to it, like a sports replay:

- **Triggers:** new species, discovery, mass extinction, a top predator falling, a rare event, a species crossing to a new continent.
- **What happens:** time slows (e.g. ¼×), a pulsing ring marks the spot on the map, and a **moment card** pops up with the animated creature (or event), its name, one line of story, and what changed ("Rabbit + thick fur + fangs + meat-eater").
- Then the speed returns to normal. Players can turn moments off or skip them.
- Limit how often moments fire so they stay special (e.g. at most one per 30–50 years).

## The reveal screen

- **World map, before and after**: ice spread, deserts grew, coasts flooded, territories redrawn.
- **The showcase**: every surviving species shown big and animated, the strangest one front and center.
- **Discovery cards**: big card for first-time discoveries, small badge for repeats.
- **Family tree**: each starting animal with branches showing what it became and when.
- **Extinctions**: with causes and places ("Wolves starved in Siberia during the Great Freeze, year 655").
- **Headlines**: the three most surprising outcomes, using real places ("Rabbits conquered Australia").
- **Postcard**: a storybook-style scene of the most dominant region with its creatures. The image people share.

## Replayability and keeping it fresh

- **Randomness:** the same setup gives a different result with a new seed.
- **Placement and Earth variants:** the same animals in different places or Earths lead to very different outcomes.
- **Bestiary:** every species ever created, with rarity labels and hints for undiscovered entries.
- **Discoveries:** see docs/DISCOVERIES.md.
- **Challenges:** "Make penguins rule the Sahara", "Survive the Ice Age with only plant-eaters".
- **Daily Earth:** everyone gets the same Earth, seed and chaos each day and compares results.
- **Rare events and rare endings:** occasionally a non-human species becomes intelligent ("The Awakening").

**Balancing protects variety.** The balance script tracks: which animal ends on top (by biomass and regions, not raw headcount), survival rates (target roughly 50–80% average with clear losers), total wipeouts (rare), new species and discovery rates, and how different runs are. No animal or human version should be top in more than ~35% of the runs it's in.

## Screens (see docs/screens/)

1. **Setup:** Earth variant chips, chaos slider, run seed, the 16 animals as creature cards (selected = amber border), the storybook map preview. "Choose starting spots" or "Start now with auto placement".
2. **Placement:** the atlas map with creature tokens (auto = dashed, placed = amber), region highlight while dragging, sidebar with each animal's region, fit and Auto/Placed label, Re-roll auto, Reset, "Start 1,000 years".
3. **Watching:** big year counter and era name, pause and speed controls (1×, 4×, 16×), "Skip to the end", the atlas map with territory washes, animated events, creature tokens and moment cards. Below: a timeline with event markers. Sidebar: living species with creature icons and population bars (extinct ones struck through), and the chronicle.
4. **The reveal:** see above.
5. **Creature Lab** (hidden debug page).

## Visual style

**App chrome:** dark "natural history at night" theme. The map is the warm, lit centerpiece, like an open atlas under a lamp.

| Role | Color |
| --- | --- |
| Background | #0F1A17 |
| Panels | #16241F |
| Borders | #24352F |
| Text | #EDE6D6 |
| Muted text | #A9B3A6 |
| Accent (amber) | #E8A33D |
| Text on accent | #1A1206 |

**Atlas map:** parchment paper (#E2D4B2 sea, #EFE5CB land) with grain and a darker vignette; ink coastlines (#3A2E1C) with a slight hand-drawn wobble and ripple lines along coasts; soft watercolor biome washes (grassland #C6C485, forest #8EA376, jungle #5F8C5E, desert #E3BE7E, tundra #BFC6B3, swamp #7F8C62, ice #FBF8F0); inked mountain, tree and dune symbols; hand-lettered names; compass rose and a small sea serpent. Paint the base map once to an offscreen canvas and redraw only creatures, territories and effects.

**Species territory colors:** distinct, muted washes with dashed edges (e.g. rabbit #D9822B, wolf #4C6A9C, frog #2F8F83). Each species keeps its color for the whole run.

**Fonts:** Bricolage Grotesque (headings, the year counter), IBM Plex Sans (UI body), IBM Plex Mono (numbers, years, seeds), IM Fell English (map labels, field-guide text, moment-card stories).

## Tech

- TypeScript + Vite + React, Vitest for tests.
- Simulation in pure TypeScript under `src/sim/` (move to a Web Worker only if needed; a run currently takes ~16 ms).
- Earth data: world-atlas + topojson-client, d3-geo for projection, d3-delaunay for Voronoi regions. Pinned versions.
- Map: Canvas 2D, scaled for devicePixelRatio. Creatures: SVG from parts.
- Seeded random generator; the simulation is fully deterministic. RunInput = Earth variant + chaos + seed + animals + placements.
- Discovery rules in a data file. Static site, no backend. Bestiary in IndexedDB.
- Headless balance script (see "Balancing protects variety").

## Milestones (part-time)

1. ✅ World generation and map (later replaced by real Earth).
2. ✅ Animals, food chain, populations, placement screen, balance script.
3. **2.5 — Real Earth + creatures:** Earth data and regions, Earth variants, storybook atlas rendering, territory washes, parts-based creature art with idle animation, Creature Lab.
4. **3 — Visible chaos:** mutations (drawn on creatures), new species, naming, discoveries, animated events, moments.
5. **4 — The reveal:** before/after maps, showcase, family tree, extinctions, headlines, discovery cards.
6. **5 — Postcard, Bestiary, challenges, Daily Earth, share links.**
7. **6 — Animation polish (walk cycles, event effects), balancing, performance.**

**The test after step 3:** run the same setup 5 times. If at least 2 or 3 runs make you go "wait, what happened to the owls?", it's working.

## Out of scope

No 3D, no physics, no individual creature agents, no evolving brains, no backend, no human technology. Accessibility is out of scope for the first builds, by choice.
