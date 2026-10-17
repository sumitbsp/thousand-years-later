# Thousand Years Later — Game Design

> Source of truth for what the game is and how it should eventually look.
> This describes the FULL game. Each build step implements only what its prompt asks for.

## The idea

The player picks a climate and 3 to 5 real animals, simulates 1,000 years of cartoonish evolution, and gets a big reveal of what the world and its creatures became.

No realism needed. The goal is surprise, fun and replayability. Starting with real animals gives instant attachment ("what happened to my wolves?"), and the reveal at the end is the payoff.

## The core loop

1. **Set up** (about 30 seconds): pick a world and 3 to 5 animals.
2. **Simulate** (1 to 2 minutes): watch centuries fly by with events popping up, or skip to the end.
3. **The reveal**: "A thousand years later…" — what survived, what died out, what new creatures exist, and how the world looks now.
4. **Replay**: same setup with a new seed for a different outcome, or tweak one thing.

The reveal is the whole game. Everything else exists to make it surprising.

## Setup

**World presets:** Ice World, Jungle, Desert, Archipelago, Volcanic, Swamp, Mixed.

**Sliders:** temperature, rainfall, sea level, and chaos (how often disasters and wild mutations happen).

**Seed:** a text seed plus a "Random" button. Same seed + same settings = same world and same history.

**Animal roster (first 8):** wolf, rabbit, deer, bear, owl, frog, crocodile, penguin. Later: elephant, snake, crab, cat, shark, beetle.

Each animal has simple stats: size, speed, attack, defense, diet, heat tolerance, cold tolerance, land or water, breeding rate.

## The simulation (cartoon evolution)

- **World:** about 36 to 48 hex regions. Each region has a biome, temperature, moisture, elevation and plant food.
- **Time:** 100 ticks of 10 years each.
- **Model:** populations per region, not individual creatures.

**Each tick:**

1. Plants grow based on biome and climate.
2. Each population's fitness is calculated: does it suit the climate, and can it find food (plants, or animals smaller and weaker than it)?
3. Populations grow, shrink, or move to neighboring regions.
4. Mutations roll: each population has a chance to gain one from the catalog.
5. If a mutation helps, that group outgrows the rest. After two or three mutations set a population apart, it becomes a new species with a name and portrait.
6. Events: ice age, meteor, volcano, flood, plague, drought. These reshape biomes and wipe out the unlucky.

### Mutation catalog (about 30)

Each mutation has a stat effect and a visual change. Some are rare so players hunt for them.

- **Movement:** wings, gills, webbed feet, extra legs, longer legs
- **Defense:** shell, spikes, armor plates, thick fur, no fur
- **Weapons:** horns, tusks, fangs, venom, claws
- **Body:** giant size, tiny size, long neck, long tail
- **Senses and looks:** camouflage, glowing skin, extra eyes, big ears
- **Habits:** burrowing, tree-climbing, swimming

### Naming

Base animal + key mutations: "Fanged Snow Rabbit", "Glowing Swamp Frog", "Burrow Owl", plus a joke scientific name like *Lepus dentatus*.

## The reveal screen

- **World map, before and after**: ice spread, deserts grew, islands flooded.
- **Survivors gallery**: portraits of every living species, each with a short field-guide entry and a rarity label.
- **Family tree**: each starting animal with branches showing what it turned into and when.
- **Extinctions**: a list with causes ("starved during the Great Freeze, year 655").
- **Headlines**: the three most surprising outcomes ("Rabbits became the top predator").
- **Postcard**: a side-view scene of the most dominant region with its creatures. This is the image people share.

## Replayability

- **Randomness:** the same setup gives a different result with a new seed.
- **Bestiary:** every species ever created across runs, with rarity labels.
- **Discoveries:** "First flying fish", "First giant rabbit", "A world with no predators".
- **Challenges:** "Make penguins dominate a desert world", "Survive with only plant-eaters".
- **Rare endings:** occasionally a species becomes intelligent and starts building simple shelters.

## Screens (see docs/screens/)

1. **Setup:** left panel with preset chips, sliders, seed, and a 4×2 grid of animal cards (selected cards have an amber border). Right side shows the hex map preview with a biome legend and summary stats. Big amber "Begin 1,000 years" button.
2. **Simulating:** a huge "Year 640" counter with the current era name, pause and speed controls (1×, 4×, 16×), "Skip to the end". The map shows colored dots for species. Below it, a timeline from year 0 to 1000 with diamond markers for events. Right side: living species with population bars, and a running chronicle of events, newest first.
3. **The reveal:** "A thousand years later…" headline with a one-line summary and Run again / Share postcard / Tweak one thing buttons. Then before/after maps, three headline cards, new-species cards with portraits and trait chips, family tree, and a "Gone" list.

## Visual style

Dark "natural history at night" theme. Calm and slightly stylized, not neon.

| Role | Color |
| --- | --- |
| Background | #0F1A17 |
| Panels | #16241F |
| Borders | #24352F |
| Text | #EDE6D6 |
| Muted text | #A9B3A6 |
| Accent (amber) | #E8A33D |
| Text on accent | #1A1206 |

**Biome colors:** ocean #1E4E5F, coast #D8C58E, grassland #8AA650, forest #3F6B3A, jungle #2E7D4F, desert #D9A95F, tundra #B9C8C2, ice #EEF3F2, mountains #8A8378, swamp #5E6E3A.

**Fonts:** Bricolage Grotesque (headings, the big year counter), IBM Plex Sans (body), IBM Plex Mono (numbers, years, seeds).

**Shapes:** rounded corners (8 to 16px), pill-shaped chips and buttons, pointy-top hexes with a small gap between them.

**Creature art:** flat shapes with a consistent dark outline, built from parts (body, head, legs, tail) plus mutation overlays (wings, horns, shell, fangs). Size and color come from scaling and tinting. Use simple placeholders until the simulation is fun.

## Tech

- TypeScript + Vite + React, Vitest for tests.
- Simulation in pure TypeScript under `src/sim/` (later in a Web Worker).
- Canvas 2D for the map; SVG for creature portraits.
- Seeded random generator; the simulation must be fully deterministic.
- Static site, no backend. Bestiary and discoveries saved in IndexedDB.
- A headless balancing script that runs 1,000 simulations and reports survival, new species, total wipeouts, and whether any animal wins too often.

## Milestones (part-time)

1. **Week 1:** hex world, biomes, climate presets, rendered map.
2. **Week 2:** animals with stats, food chain, populations growing and moving.
3. **Week 3:** mutations, new species, naming, events. Build the balancing script.
4. **Week 4:** reveal screen with placeholder art.
5. **Weeks 5–6:** part-based portraits and the postcard scene.
6. **Week 7:** Bestiary, discoveries, challenges, share card.
7. **Week 8:** balancing and polish.

**The week 4 test:** if reading the reveal with placeholder art already makes you want to hit "Run again", the idea works.

## Out of scope

No 3D, no physics, no individual creature agents, no evolving brains, no backend. Accessibility is out of scope for the first builds, by choice.
