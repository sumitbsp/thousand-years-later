# Thousand Years Later — Game Design

> Source of truth for what the game is and how it should eventually look.
> This describes the FULL game. Each build step implements only what its prompt asks for.
> See also: docs/DISCOVERIES.md (special creatures players can evolve).

## The idea

The player picks a climate and 3 to 5 real animals, decides where they start (or lets the game decide), simulates 1,000 years of cartoonish evolution, and gets a big reveal of what the world and its creatures became.

No realism needed. The goal is surprise, fun and replayability. Starting with real animals gives instant attachment ("what happened to my wolves?"), and the reveal at the end is the payoff.

## The core loop

1. **Set up** (about 30 seconds): pick a world and 3 to 5 animals.
2. **Place** (optional): see where every animal starts, drag the ones you care about.
3. **Simulate** (1 to 2 minutes): watch centuries fly by with events popping up, or skip to the end.
4. **The reveal**: "A thousand years later…" — what survived, what died out, what new creatures exist, and how the world looks now.
5. **Replay**: back to placement with the same setup, tweak one thing, or start fresh with a new seed.

The reveal is the whole game. Everything else exists to make it surprising.

## Setup

**World presets:** Ice World, Jungle, Desert, Archipelago, Volcanic, Swamp, Mixed.

**Sliders:** temperature, rainfall, sea level, and chaos (how often disasters and wild mutations happen).

**Seed:** a text seed plus a "Random" button. Same seed + same settings + same placements = same world and same history.

**Skip option:** "Start with auto placement" goes straight to the simulation for players who don't want to place animals.

## Animal roster

Each animal fills a different role, so picking it changes the run. Each has simple stats: size, speed, attack, defense, diet, heat tolerance, cold tolerance, land or water, breeding rate.

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
| Rat | Tiny, eats anything, breeds explosively. The great survivor. |
| Shark | Ocean predator, water only |
| Lizard | Hot-climate specialist, cold-blooded |
| Beetle | Insect, huge numbers, armored |
| Weak humans | Small, breed fast, eat anything. Survive by numbers. |
| Strong humans | Big attack and defense, need lots of food, breed slowly. Dominate early, crash in hard times. |
| Smart humans | Better climate tolerance (they "build shelter") and a better chance of helpful mutations, but weak in fights and slow to breed. |

**Humans are animals like any other.** No tools, farming, buildings or technology. The three versions must have clear tradeoffs so none wins most runs.

### Later batches (unlock rewards)

Monkey, Octopus, Eagle, Camel, Bat, Tortoise, Crab, Goat. New additions should lean toward plant-eaters and prey, since predators are already well covered.

**Ancient pack (later unlock):** mammoth, sabre-toothed cat, giant sloth, dodo, moa. Earned by re-evolving a few of these creatures through discoveries.

**Skipped:** pets and farm animals (they overlap with existing roles), dinosaurs as starting animals (breaks the "real animals today" idea).

## Placement

A separate screen between setup and simulation.

- **Opens with every animal already auto-placed**, so the player can just press Start.
- **Each animal is either "Auto" or "Placed by you."** Dragging an animal onto a hex marks it as placed.
- **Auto placement is sensible:** it picks a region that suits the animal (penguins near ice or coast, frogs near swamp or water). It uses the seed, so it's the same every time for the same setup.
- **Players can place animals somewhere bad on purpose.** Penguins in the desert is a valid experiment. Only auto placement is "smart."
- **Sidebar** lists each animal with its region and how well it fits ("Penguin · Desert · Bad fit").
- **Buttons:** "Re-roll auto placements" and "Reset."
- Animals don't share a starting hex unless the player puts them there.
- Drag and drop must work with mouse and touch.

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
6. New species are checked against the discovery rules (docs/DISCOVERIES.md).
7. Events reshape biomes and wipe out the unlucky.

### Mutation catalog (about 32)

Each mutation has a stat effect and a visual change. Some are rare so players hunt for them.

- **Movement:** wings, flightless, gills, webbed feet, extra legs, longer legs
- **Defense:** shell, spikes, armor plates, thick fur, no fur
- **Weapons:** horns, tusks, fangs, venom, claws
- **Diet:** meat-eater (lets plant-eaters become predators)
- **Body:** giant size, tiny size, long neck, long tail
- **Senses and looks:** camouflage, glowing skin, extra eyes, big ears
- **Habits:** burrowing, tree-climbing, swimming

### Events

- **Common:** ice age, drought, flood, plague, volcano.
- **Rare** (memorable when they happen): supervolcano, comet strike, sudden sea level drop, a plague that targets one animal.

### Naming

Base animal + key mutations: "Fanged Snow Rabbit", "Glowing Swamp Frog", "Burrow Owl", plus a joke scientific name like *Lepus dentatus*. A species that matches a discovery takes the discovery's name instead ("Woolly Mammoth").

Every species is still unique even when it matches a discovery: a Woolly Mammoth can also have glowing tusks or extra legs.

## Discoveries

Special creatures players can evolve, in three tiers: **Re-evolved** (echoes of real extinct animals, like the Woolly Mammoth or Megalodon), **Oddity** (this game's own, like the Killer Rabbit), and **Legend** (myths, like the Dragon or Yeti). Full list, conditions and data format: **docs/DISCOVERIES.md**.

## The reveal screen

- **World map, before and after**: ice spread, deserts grew, islands flooded.
- **Discovery cards**: big card for first-time discoveries, small badge for repeats.
- **Survivors gallery**: portraits of every living species, each with a short field-guide entry and a rarity label.
- **Family tree**: each starting animal with branches showing what it turned into and when.
- **Extinctions**: a list with causes ("starved during the Great Freeze, year 655").
- **Headlines**: the three most surprising outcomes, written from templates filled with details from this run ("The rabbits of the eastern plains became hunters after the wolves starved in year 655").
- **Postcard**: a side-view scene of the most dominant region with its creatures. This is the image people share.

## Replayability and keeping it fresh

Discoveries are the collectible layer. The main source of freshness must be that runs actually turn out differently.

- **Randomness:** the same setup gives a different result with a new seed.
- **Placement:** the same animals in different starting spots lead to very different outcomes.
- **Bestiary:** every species ever created across runs, with rarity labels and hints for undiscovered entries.
- **Discoveries:** see docs/DISCOVERIES.md.
- **Challenges:** "Make penguins dominate a desert world", "Survive with only plant-eaters".
- **Daily world:** everyone gets the same seed and world each day and compares results.
- **Rare events** that players remember.
- **Rare endings:** occasionally a non-human species becomes intelligent ("The Awakening"). Humans don't trigger this ending.

**Balancing must protect variety.** The balancing script tracks:
- which animal ends up on top (no animal or human version should win most runs),
- how many new species appear and survive,
- how often everything dies (should be rare),
- how often each discovery happens (see target rates in DISCOVERIES.md),
- how different runs are from each other.

## Screens (see docs/screens/)

1. **Setup:** left panel with preset chips, sliders, seed, and the animal roster as a grid of cards (selected cards have an amber border). Right side shows the hex map preview with a biome legend and summary stats. Big amber button to continue, plus a small "Start with auto placement" option.
2. **Placement:** large hex map with each chosen animal shown as a token on its starting hex. Tokens marked "Auto" are dashed; tokens the player placed are solid amber. A sidebar lists each animal with its region, fit ("Good fit", "Risky", "Bad fit") and an Auto / Placed label. Buttons: Re-roll auto, Reset, and a big "Start 1,000 years".
3. **Simulating:** a huge "Year 640" counter with the current era name, pause and speed controls (1×, 4×, 16×), "Skip to the end". The map shows colored dots for species. Below it, a timeline from year 0 to 1000 with diamond markers for events. Right side: living species with population bars, and a running chronicle of events, newest first.
4. **The reveal:** "A thousand years later…" headline with a one-line summary and Run again / Share postcard / Tweak one thing buttons. Then before/after maps, discovery cards, three headline cards, new-species cards with portraits and trait chips, family tree, and a "Gone" list.

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
- Seeded random generator; the simulation must be fully deterministic. Placements are part of the run's inputs.
- Discovery rules live in a data file, not hard-coded logic.
- Static site, no backend. Bestiary and discoveries saved in IndexedDB.
- A headless balancing script that runs 1,000 simulations and reports the metrics listed under "Balancing must protect variety".

## Milestones (part-time)

1. **Week 1:** hex world, biomes, climate presets, rendered map. ✅
2. **Week 2:** the 13 animals + 3 humans with stats, food chain, populations growing and moving, placement screen with auto placement and drag and drop.
3. **Week 3:** mutations (including flightless and meat-eater), new species, naming, events, discoveries. Build the balancing script.
4. **Week 4:** reveal screen with placeholder art, including discovery cards.
5. **Weeks 5–6:** part-based portraits and the postcard scene.
6. **Week 7:** Bestiary, challenges, daily world, share card.
7. **Week 8:** balancing and polish.

**The week 4 test:** if reading the reveal with placeholder art already makes you want to hit "Run again", the idea works.

## Out of scope

No 3D, no physics, no individual creature agents, no evolving brains, no backend, no human technology. Accessibility is out of scope for the first builds, by choice.
