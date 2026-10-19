# Decisions

Every meaningful decision and why, newest first. Add an entry whenever a non-obvious choice is made.

---

## 2026-10-19 · Design revision: real Earth, visible chaos (Sumit + Claude (planning))

After playing step 2, the hex map and dot populations felt flat. These decisions change what the game looks like and plan step 2.5. Nothing below is built yet. Full details: docs/DESIGN.md.

### Core principle: show the chaos, don't tell it
- **Decision:** every important change must be visible on screen: creatures visibly mutate, events animate on the map, territories spread and shrink, and big moments are pointed out. Text (chronicle, headlines) supports what the player sees; it never replaces it.
- **Why:** the fun is watching what chaos different combinations generate, not reading "Fanged Snow Rabbit appeared in year 455". A text log of "X spread to Y" was the main reason step 2 felt boring.
- **Consequence:** creature art and animation are core features, not polish. Visible mutations move into step 3.
- **Who:** Sumit + Claude (planning)

### The real Earth replaces generated hex worlds
- **Decision:** the map is the real Earth (Natural Earth public-domain outlines via world-atlas + topojson-client, projected with d3-geo), split into ~40–50 named regions (Sahara, Amazonia, Siberia, The Outback, North Pacific…). **Supersedes** the 8 × 6 hex grid and `generateWorld` as the game's map.
- **Why:** real places give instant meaning ("penguins in the Sahara", "rabbits conquered Australia"), much better headlines, and are more shareable. A hex grid read as a chart, not a world.
- **Tradeoff:** the map is the same every run. Variety must come from Earth variants, events, placement, chaos and the seed.
- **Alternatives:** keeping generated worlds but drawing them as organic Voronoi maps (more variety, less meaning); realistic terrain with strategy-style territories (Humankind/EU4 look, less personality); a cozy diorama (Dorfromantik look, far more art). Shown game references for all three; none landed until "real Earth + storybook map" came up.
- **Who:** Sumit + Claude (planning)

### Keep the procedural generator for "Alien worlds"
- **Decision:** leave `generateWorld` and the hex code in place, unused by the main game. It may power an "Alien worlds" unlock later.
- **Why:** it works, it's tested, and it gives back map variety for players who want it.
- **Who:** Sumit + Claude (planning)

### Regions are Voronoi cells around named centers
- **Decision:** each region is a hand-defined center (lon/lat) with biome, temperature, elevation and plant food in `src/sim/data/earthRegions.ts`. Shapes are Voronoi cells (d3-delaunay) clipped to land or sea. Neighbors come from shared edges; continents connect only across listed straits (Bering, Gibraltar, Sinai, Southeast Asia–Australia).
- **Why:** the simulation only needs regions and neighbors, so it barely changes. Voronoi gives natural-looking borders and makes "which region is under the pointer" a nearest-center lookup, simpler than hex math.
- **Who:** Sumit + Claude (planning)

### Earth variants replace climate presets
- **Decision:** Today's Earth, Ice Age Earth (ice over the north, lower seas, land bridges), Hot Earth (deserts spread), Drowned Earth (coasts flooded), Wild Earth (high chaos). Keep the chaos slider. The seed no longer shapes the map; it drives events, mutations and auto placement. **Supersedes** the seven generated presets and the temperature/rainfall/sea-level sliders.
- **Why:** presets only made sense for generated maps. Variants keep the "pick a world" choice meaningful on a fixed map and set up great challenges ("survive the Ice Age").
- **Who:** Sumit + Claude (planning)

### Storybook atlas style for the map
- **Decision:** parchment paper with grain and vignette, ink coastlines with a slight wobble and coastal ripples, watercolor biome washes, inked mountains/trees/dunes, hand-lettered names (IM Fell English), compass rose and sea serpent. Species territories are soft colored washes with dashed edges. The app chrome stays dark; the map is the warm, lit centerpiece. Reference: docs/screens/map-concept.png.
- **Why:** matches the "natural history" theme, looks unlike WorldBox, hides the roughness of simplified art, and makes a great shareable postcard.
- **Note:** Sumit is "somewhat" happy with the style; it can keep evolving because drawing is separate from the simulation.
- **Who:** Sumit + Claude (planning)

### Our own parts-based creature art, not an icon library
- **Decision:** every animal is our own SVG on a 64×64 grid (ink silhouette, parchment details), built from named parts with pivot points. Animals are grouped into body plans (four-legged, bird, reptile, frog, fish, insect, human), each with anchor points (headTop, mouth, shoulder, back, tailBase, feet, eyes) where mutation overlays snap on. Mutations are drawn per body plan, not per animal. A hidden Creature Lab page shows every animal × mutation. Reference: docs/screens/creatures.png.
- **Why:** mutations must be visible on the creatures, and animation needs separate parts. An icon set can't grow fangs or wings. No license to manage.
- **Alternatives:** game-icons.net via `@iconify-json/game-icons` (CC BY 3.0, good silhouettes, but static and needs attribution); emoji sets (clash with the atlas); commissioned art (best quality, slowest; a possible later upgrade).
- **Note:** Sumit is not 100% satisfied with the first drafts; refine the style in review rounds.
- **Who:** Sumit + Claude (planning)

### Creatures are animated
- **Decision:** idle life for all creatures (breathing, blinking, a slight bob, random phase), part motion (tail wag, wing flap, ear twitch, glow pulse), and later hops/walk cycles when moving. One animation clock or CSS, not per-creature timers.
- **Why:** living creatures make the map feel like a stage. Cheap if parts and pivots exist from the start.
- **Who:** Sumit + Claude (planning)

### Moments: the game points at big events
- **Decision:** when something big happens (new species, discovery, mass extinction, a top predator falling, a rare event, a species reaching a new continent), time slows, a pulsing ring marks the spot, and a moment card shows the animated creature, its name, one line of story and what changed. Rate-limited so they stay special; can be turned off.
- **Why:** 1,000 years fly by in a minute or two; without this, players miss the chaos they came to see.
- **Who:** Sumit + Claude (planning)

### Re-balance after the map switch
- **Decision:** don't tune animal stats further on the hex map. Re-run `npm run balance` on the real Earth and tune then. Check lizards specifically (20.6 regions on average in the last report, too far for a heat specialist).
- **Why:** different regions, neighbors and amount of ocean will change every number. The last hex report (average survival ~72%, highest top share 37%) was good enough to move on.
- **Who:** Sumit + Claude (planning)

---

## 2026-10-19 · Step 2 playtest fixes (Claude Code)

Testing step 2 found too few extinctions, a "top animal" based on head count in places, shore animals living at sea, presets off-theme, auto placements that jumped around, and some UI rough edges. These entries record the fixes. Older entries they replace are marked below.

### Species compete for room, not just food (Lotka–Volterra)
- **Decision:** the logistic term uses shared room: `room = 1 − Σ (count_j / K_j) × α_ij` over everyone in the region. `α_ij = min(3, overlap × (strength_j / strength_i)³)`, where overlap = `1 − |diet_i − diet_j|` and strength = competitive weight (`0.6 + 0.4·attack + 0.4·size`) × local fitness. Negative room shrinks the loser.
- **Why:** each species had its own capacity per region, so species simply stacked and almost nothing died (survival 79–100%, only 24% of runs had any extinction). Shared room makes same-diet species fight over a region. Using local fitness in strength means each species wins where it fits best, so runs end with clear winners per region, and the species that is best nowhere loses. Edge exponents of 1.5, 2, 3 and 4 were tried; 3 gives decisive outcomes without one species sweeping every region.
- **Alternatives:** squaring the plant-sharing weight (tested in the audit, barely changes outcomes because plants are rarely the limit); a single shared capacity for everyone (makes predators compete with their prey).
- **Who:** Claude Code

### Allee effect, with a lower line for hunters
- **Decision:** below `0.3 × K × (1 − 0.4·diet)` a population breeds proportionally slower and loses up to 40% per tick extra (`0.4 × (1 − count / line)`).
- **Why:** with competition alone, survival plateaued at ~78% whatever else was tuned: a species pushed down to a few individuals in one corner always recovered. The Allee effect turns "nearly beaten" into "gone". At first the line was the same for everyone, and it was a cliff for meat-eaters: their food-limited numbers sit around 25–30% of K, so at 0.30 wolves dropped from 86% to 48% survival and at 0.35 owls vanished. Hunters really do live spread thin, so their line is lower.
- **Who:** Claude Code

### Harsher world: poor fit, hunger, droughts, predation
- **Decision:** poor-fit death 0.5 → 1.5 × (1 − fitness)²; hunger 0.5 → 0.8 × shortfall × (0.5 + foodNeed); migrants only go where fitness ≥ 0.45 (was 0.3); world climate swing ±0.15 → ±0.3; prey kill cap 0.5 → 0.8 × vulnerability; wild meat 6 → 8 per region, ×1.3 at sea.
- **Why:** animals in poor conditions should lose. Without these, a lizard in an ice world kept a foothold in marginal hexes forever. More wild meat (and a bit more at sea) offsets the harsher hunger so predators without prey still survive in small numbers. Sea ×3 made sharks top 66% of their runs; ×1.3 gives ~27%.
- **Who:** Claude Code

### Animal stats retuned for the new model
- **Decision:** rabbit breed 0.95 → 0.7; rat 1 → 0.68; deer breed 0.5 → 0.3, foodNeed 0.35 → 0.4; elephant breed 0.1 → 0.14, foodNeed 0.9 → 0.7; bear foodNeed 0.9 → 0.75; weak humans breed 0.5 → 0.42; strong humans breed 0.42 → 0.32, foodNeed 0.8 → 0.85; smart humans breed 0.3 → 0.25. **Supersedes** the audit's human stats. The brief's human ordering still holds (weak breed fastest, strong eat most, smart breed slowest with the widest tolerance).
- **Why:** after the model changes, grazers (rabbit, deer) and strong humans topped 40–57% of their runs, and elephants starved (30% survival). Tuned with 600-run sweeps on three seeds, because at 200 runs each animal is in only ~50 runs (±7% noise).
- **Who:** Claude Code

### "Top animal" = population × size
- **Decision:** the top animal (balance script and UI) is the largest `speciesBiomass` = population × size (in `run.ts`). The balance script also prints `regions` (average regions occupied at year 1000 when alive), average survival, runs with at least one extinction, and the highest top share. **Supersedes** count × (0.1 + size).
- **Why:** asked for directly in testing. Multiplying by size alone favors big animals more than the old formula, so the balance retune above accounts for it. Regions occupied shows whether a top animal is widespread or just dense in one place.
- **Who:** Claude Code

### Simulate screen ranks by biomass
- **Decision:** the species list is sorted by biomass and the bars show biomass relative to the highest biomass seen this run. Each row still shows head count and regions. The finished panel names the top animal with biomass and regions.
- **Why:** the UI ranked by raw head count, so the list disagreed with the balance script about who was "winning".
- **Who:** Claude Code

### Shore animals ("both") stay on the shore
- **Decision:** habitat `both` (frog, crocodile, penguin) is 1 on coast and swamp, 0.9 on other land next to water, and 0 at sea or deep inland. **Supersedes** 0.9/0.35 everywhere.
- **Why:** frogs and crocodiles were spreading across open ocean. The rule follows the brief literally: coast, swamp and land next to water. Water hexes are excluded entirely, including ones touching land, because "shallow water" isn't a thing on a 48-hex map; a coastal land hex already plays that role.
- **Consequence:** shore animals have few livable hexes, so auto placement may share one when all are taken; the placement test now checks that rule instead of "always distinct". When nowhere is livable, auto placement prefers a free hex in the animal's own medium.
- **Who:** Claude Code

### Sea level is an exact share of the map
- **Decision:** the lowest `round(seaLevel × 48)` regions are water (ties by id). **Supersedes** `elevation < seaLevel` (step 1, which rejected rank cutoffs as "too uniform").
- **Why:** with a threshold on normalized elevation, Archipelago (0.6) ranged from 17% to 83% land across seeds, so "~45–55% land" was impossible. Uniform land share turned out to be what presets need; variety still comes from shape, islands and biomes.
- **Who:** Claude Code

### High seas break land into islands
- **Decision:** above sea level 0.42 the edge falloff weakens and roughness rises, fully by 0.5 (edge pull −80%, roughness +0.8). Archipelago is now sea level 0.5.
- **Why:** with one central falloff, even 50% land formed 1–2 blobs (avg 1.6 landmasses). Now Archipelago averages ~3.3 islands and 92% of seeds have 2 or more. Tying it to sea level keeps presets as plain slider values, so a player who drags the sea up gets islands too.
- **Alternatives:** a hidden "islands" flag on presets (presets would no longer be just slider settings).
- **Who:** Claude Code

### Presets retuned, with a main biome each
- **Decision:** each `Preset` has a `mainBiome`. Jungle: temperature 0.95, rainfall 0.8, sea 0.3. Mixed: temperature 0.62, rainfall 0.38. Hot land (> 0.6) is jungle above moisture 0.5 (was 0.6), and in the tropics (> 0.7) swamp needs moisture > 0.95 instead of 0.8. Volcano chance `(chaos − 0.7) × 3.5` (was × 2.5). The test "each preset's main biome is common" replaces "presets lean toward their theme".
- **Why:** Jungle was 16% jungle, 22% swamp; no climate setting fixed that because wet land flipped to swamp and drier land to grassland. Now jungle covers ~51% of its land. Mixed had 15% tundra and 1% desert; now it has grassland 15%, forest 16%, desert 5%. Volcanic sat right at 15% volcanic; now ~22%.
- **Who:** Claude Code

### Auto placements are stored, not re-derived
- **Decision:** App keeps the auto placements as state, computed only on entering placement, Re-roll and Reset. The run starts from `withFixed(chosen, auto, fixed)`.
- **Why:** re-running `autoPlace` with the new fixed set on every drop changed which regions were taken and the RNG order, so dropping the wolf could move the owl.
- **Who:** Claude Code

### Players can only drop animals where they can live
- **Decision:** a drop on a hex where `habitatFit` is 0 (land animal at sea, shark on land, shore animal inland or at sea) snaps the token back. While hovering, the outline, label ("Can't survive here · Ocean") and token turn red. Bad but livable spots (penguins on a hot coast) are still allowed. **Supersedes** "Players can drop animals anywhere, including the wrong medium".
- **Why:** asked for in testing; a shark on land is not an experiment, just a wasted pick.
- **Who:** Claude Code

### Map drawing fixes
- **Decision:** MapView measures and draws in layout effects; the backing store is `round(css × devicePixelRatio)`, resized only on change, with a `matchMedia` listener for ratio changes. Tokens are 0.78 × hex size (34–64 px) with a light outline; population dots are slightly bigger with a light outline.
- **Why:** the first frame was blank (measured in a passive effect after paint), canvas size could be fractional (blurry), and a ratio change (zoom, other screen) wasn't picked up. Small dark-outlined tokens disappeared on forest and ocean.
- **Verified:** headless Chrome at 2× over the DevTools protocol: map drawn on the first frame, canvas 2× its CSS size, "Can't survive here" over ocean and the drop refused, other auto tokens unchanged after a drop, Re-roll keeps the placed one, finished panel shows the top animal.
- **Who:** Claude Code

---

## 2026-10-19 · Step 2 audit fixes (Claude Code)

An audit of step 2 against its brief found bugs and gaps. These entries record the fixes. Older step 2 entries they replace are marked below.

### Stranded animals can't leave the wrong medium
- **Decision:** a population in a region where its habitat fit is 0 (a shark the player dropped on land) never migrates; it just dies there (70% per tick).
- **Why:** before the fix, a shark dropped on coastal land "walked" into the sea next door, which breaks "sharks only move through water". A test now covers it.
- **Who:** Claude Code

### Plants follow a persistent climate, not per-tick noise
- **Decision:** the plant ceiling is `plantFood × 100 × (1 + climate + weather)`, clamped to 0.2–1.6. `climate` is one world-wide AR(1) drift (`0.85·old ± 0.15`, so good and bad spells last decades); `weather` is a per-region AR(1) drift (`0.6·old ± 0.25`). Both live in `RunState`. **Supersedes** the per-tick 0.55–1.45 weather factor.
- **Why:** independent noise each tick averaged out, so every run flattened into a fixed level by year ~500 and "hard times" never happened. Persistent droughts make populations visibly rise and fall, which strong humans' "crash in hard times" depends on. This is climate drift, not the step 3 events (no named ice age or drought, no biome changes).
- **Alternatives:** bigger per-tick noise (still averages out); scripted cycles (predictable).
- **Who:** Claude Code

### Big eaters starve faster
- **Decision:** hunger death is `0.5 × (1 − fed) × (0.5 + foodNeed)` instead of a flat `0.5 × (1 − fed)`.
- **Why:** "high foodNeed, crash in hard times" needs being hungry to hurt more when you need more food. A rabbit (foodNeed 0.12) loses about 0.31 × shortfall; strong humans (0.8) about 0.65 × shortfall.
- **Who:** Claude Code

### Plant competition is weighted by strength
- **Decision:** plants are shared in proportion to demand × competitive weight (`0.6 + 0.4·attack + 0.4·size`, range 0.6–1.4), and never beyond what each population asked for. Leftovers are re-shared. **Supersedes** pure proportional sharing.
- **Why:** with proportional sharing, every grazer in a region ends up equally fed, so the fastest breeder always wins and size or attack never matters. Squaring or cubing the weight was tested and barely changed outcomes, so the linear form stays.
- **Who:** Claude Code

### Human versions don't hunt each other
- **Decision:** `huntVulnerability` returns 0 when both animals are human.
- **Why:** strong humans were eating weak and smart humans. Smart humans survived only ~60% of head-to-head runs, and the "comparison" between versions was really predation. They're one kind of animal, so they compete for the same food instead.
- **Who:** Claude Code

### Human stats retuned within the brief's ordering
_Superseded by "Animal stats retuned for the new model" (playtest fixes)._
- **Decision:** weak humans size 0.35, breed 0.5, foodNeed 0.5; strong humans diet 0.4, breed 0.42, foodNeed 0.8; smart humans unchanged (breed 0.3, foodNeed 0.4, heat/cold 0.85, mutationLuck 0.3). Brief ordering kept: weak breed fastest and are smallest, strong eat the most, smart breed slowest with the widest tolerance.
- **Why:** an earlier tuning pass left weak humans breeding *slower* than strong (0.5 vs 0.55), against the brief. Strong humans at 60% meat needed ~46 meat per region at capacity against 6 wild meat, so they were chronically underfed and topped 0–4% of head-to-head runs. Picked by a sweep of 24 combinations (120 league runs each). The chosen one splits the league 23/36/32 (weak/strong/smart).
- **Who:** Claude Code

### Balance script reports more
- **Decision:** besides biomass `top`, it prints `top#` (head count, the brief's literal "largest population"), `top@200` (early dominance), `worst drop` (average biggest fall from a high), and a "human league" with all three versions in every run plus 0–2 random animals.
- **Why:** random 3–5 picks rarely include two human versions, so the separate human table couldn't compare them. Biomass stays the headline because head count crowns beetles and rats (top# ~70% when picked).
- **Who:** Claude Code

### Peak events measured from the trough before the high
- **Decision:** a peak needs the high to be at least 1.5× the lowest point *before* it, and the total to have fallen 25% below the high. It is dated to the year of the high; the UI sorts the event list by year.
- **Why:** the old tracker kept lowering its "low" during the decline, so any steep fall counted as a peak. That produced "year 0: Owl peaked at 75" (the starting number).
- **Who:** Claude Code

### Placement: a tap is not a placement
- **Decision:** a press becomes a drag only after 6 px of movement, and only a drag marks a token "Placed by you". The drop label is clamped inside the map. The sidebar shows the region number (e.g. "Forest #25").
- **Why:** a click on a token used to mark it placed without moving it. Without the region number, "Re-roll auto" looked broken whenever an animal moved to another hex of the same biome.
- **Verified:** in headless Chrome over the DevTools protocol: mouse drag, touch drag (touch events), tap, fit label while dragging, Re-roll, Reset, simulate, Skip to the end, Run again.
- **Who:** Claude Code

### Auto placement in a world with nowhere livable
- **Decision:** if no region is livable (a shark when sea level is 0), auto placement still picks a free region at random and the animal dies out quickly. The sidebar shows "Bad fit".
- **Why:** every chosen animal needs a starting region. This is the only way a water-only animal can start on land without the player choosing it, and migration can never move it there.
- **Who:** Claude Code

---

## 2026-10-19 · Step 2: animals, food chain, placement, simulate (Claude Code)

### Growth model: logistic growth scaled by fitness and food, minus hunger, poor fit and predation
- **Decision:** per tick `count × (1 + r·fitness·fed·(1 − count/K) − hunger − 0.5·(1 − fitness)²) − kills` (hunger scaled by foodNeed since the audit), with `r = 0.15 + 0.9·breedingRate`. Capacity `K = 60 / (0.1 + size)`. A population in the wrong medium (fitness 0) loses 70% per tick.
- **Why:** stable (no blow-ups at dt = 10 years), easy to reason about, and each stat has one obvious effect. Because K scales inversely with body space, every species at capacity holds the same biomass per region, so small animals have bigger numbers but no built-in advantage.
- **Alternatives:** Lotka–Volterra (oscillates and blows up at big time steps); individual agents (ruled out in planning).
- **Who:** Claude Code

### Predation: demand split over catchable prey, with a cap per prey
- **Decision:** a predator can catch prey only if the prey is strictly smaller and the predator's hunt power (0.4 attack + 0.35 size + 0.25 speed) beats the prey's escape power (0.4 defense + 0.35 size + 0.25 speed) by more than 0.03. Vulnerability = min(1, 2.5 × gap). Each predator splits its meat demand across prey in proportion to count × meat value × vulnerability. A prey loses at most 50% × vulnerability of its biomass per tick, and that cap is shared between predators.
- **Why:** "smaller and weaker" in one formula, with armor (beetle) and speed (rabbit) mattering. The cap keeps prey from vanishing in a single tick, which made early runs feel random.
- **Who:** Claude Code

### Background "wild meat" in every region
_Amount changed to 8 (×1.3 at sea) in the playtest fixes._
- **Decision:** every region offers 6 meat per tick (fish, insects, small game), shared by all meat-eaters there and never used up.
- **Why:** without it, any predator picked without suitable prey (a shark with only land animals, a wolf with elephants) always starved, so predators were mostly an auto-loss. Wild meat feeds a small predator population; real prey is what lets it grow.
- **Alternatives:** forcing prey in the roster selection (limits players); no background food (predators extinct in most random sets).
- **Who:** Claude Code

### Omnivores swap only part of a meat shortfall for plants
- **Decision:** after meat is shared, an animal with diet > 0 can cover `shortfall × (1 − diet) × 0.5` from leftover plants.
- **Why:** omnivores should be flexible, but at full swap rate bears and humans never went hungry and topped over 55% of the runs they were in.
- **Who:** Claude Code

### Migration rules
- **Decision:** each tick 4% of a population disperses as a baseline, plus more when crowded (above 60% of K) or hungry, capped at 35%. Migrants go to the best two reachable neighbors with fitness ≥ 0.3, weighted by fitness × free room × ±25% noise. A new population needs at least 1 founder. Reachable = neighbors the animal can live in; owls also reach land one water hex away; sharks only reach water (land has habitat 0 for them).
- **Why:** a baseline lets species spread visibly even when comfortable. "Best two" keeps founder groups big enough to survive instead of spreading too thin. Migrants never go somewhere they couldn't survive, so water-only and land-only animals can't end up in the wrong medium.
- **Who:** Claude Code

### Randomness in the run: derived from seed + tick
_The weather model below was superseded by the persistent climate in the audit fixes; the "RNG from seed + tick" part still holds._
- **Decision:** `step` creates `createRng(seed + "|tick|" + tick)` instead of keeping an RNG in the state. Each region's plant regrowth gets a 0.55–1.45 weather factor; migration targets get a little noise.
- **Why:** state stays plain data (cloneable, comparable, worker-friendly), and any tick can be recomputed from the state alone. Without weather, runs settled into a flat equilibrium by year ~500.
- **Who:** Claude Code

### Placements can be partial; the sim fills the gaps
- **Decision:** `createRun` calls `autoPlace` with the world seed for any animal missing from `placements`. The UI always passes complete placements, so its runs reproduce from `RunInput` alone, including after "Re-roll auto".
- **Why:** headless callers (balance script, tests) can pass `{}`.
- **Who:** Claude Code

### Auto placement: within 85% of the best fit, distinct regions
- **Decision:** auto placement prefers livable regions no other animal starts on (sharing only when nothing else is livable), and picks at random among those scoring ≥ 85% of the best. Re-roll uses a new random placement seed from the UI.
- **Why:** sensible but not always the same hex, so re-roll gives real variety.
- **Who:** Claude Code

### Players can drop animals anywhere, including the wrong medium
_Superseded by "Players can only drop animals where they can live" (playtest fixes)._
- **Decision:** dropping a shark on land is allowed; it dies out quickly (70% per tick). The fit label says "Bad fit".
- **Why:** the design says bad placements are valid experiments. Only auto placement and migration are habitat-aware.
- **Who:** Claude Code

### Starting values for animals
_Human values revised in the audit fixes above._
- **Decision:** stats follow each role: rabbit, rat and beetle breed fast with tiny foodNeed; elephant, bear and strong humans are big, tough, hungry and slow to breed; penguin (cold 1, heat 0.05) and lizard (heat 0.95, cold 0.05) are specialists; shark is water-only with the top attack; owl flies. Humans: weak (breed 0.6, weak in fights), strong (attack 0.75, foodNeed 0.9, breed 0.3), smart (heat and cold 0.85, attack 0.2, breed 0.3, mutationLuck 0.3 vs 0.1 for everyone else). Every animal starts at 35% of its capacity.
- **Why:** each animal should feel distinct from its stats alone. Starting at a share of capacity keeps starts fair between tiny and huge animals.
- **Who:** Claude Code

### Balance changes (from `npm run balance`, 500 runs)
_Partly superseded by the audit fixes above (human stats, hunger, competition, climate). Current numbers are in the latest report._
- **Decision:** after the first run, bear (top in 59% of runs it was picked) and weak humans (57%) dominated. Changes: bear breedingRate 0.25 → 0.18, foodNeed 0.7 → 0.9, heat 0.3 → 0.25, cold 0.75 → 0.7; weak humans breedingRate 0.8 → 0.6, foodNeed 0.35 → 0.45; omnivore plant swap halved; weather range widened from 0.8–1.2 to 0.55–1.45; poor-fit death 0.35 → 0.5; prey kill cap 0.4 → 0.5. Result: top-when-picked ≤ 52% for everyone across two seeds, ≤ 14% of all runs, wipeouts ~1%.
- **Why:** goals for this step: nobody wins most runs, wipeouts are rare, everyone survives sometimes.
- **Open:** survival is high (73–100%) because nothing disrupts populations yet. Step 3 events should bring more extinctions; expect to retune then. Specialists (shark, penguin, elephant) rarely top, which is expected because they live on less of the map.
- **Who:** Claude Code

### "Top animal" = largest biomass, not head count
_Superseded: biomass is now population × size (playtest fixes)._
- **Decision:** the balance script ranks species by count × (0.1 + size). Since the audit it also prints head count (`top#`) next to it.
- **Why:** with raw counts, beetles and rats would win nearly every run just for being tiny. Biomass matches how K is defined, so it measures "owns the most of the world".
- **Who:** Claude Code

### Simulation runs on the main thread
- **Decision:** no Web Worker yet. A full 100-tick run takes about 15 ms (500 runs in ~8 s headless), and the UI steps one tick per timer callback.
- **Why:** far below a frame budget. Revisit in step 3 if mutations and species multiply populations.
- **Who:** Claude Code

### Placement tokens are HTML over the canvas
- **Decision:** `MapView` gained `overlay` (HTML in canvas coordinates), `drawExtra` (more canvas drawing) and `highlightId`. Tokens are absolutely positioned divs using pointer events with pointer capture and `touch-action: none`; the drop hex comes from `regionAt`.
- **Why:** dashed/solid token styles are trivial in CSS, and pointer capture makes mouse and touch drag work the same with no library.
- **Alternatives:** drawing tokens on the canvas with manual hit testing.
- **Who:** Claude Code

### Smaller choices
- **`ecology.ts` holds `getAnimal`**, so `data/animals.ts` stays pure data.
- **Purity test now scans subfolders** (`src/sim/data/`).
- **`tsx` added** as a dev dependency to run the TypeScript balance script in Node.
- **Speeds:** 1× = 2 ticks/s (a full run takes ~50 s), 4×, 16×. The screen opens playing at 4×.
- **Status** compares a species total with 3 ticks ago: over +5% Growing, under −5% Shrinking.
- **The mockup's "Risky" fit label** is "Okay fit", as the step 2 brief asks.
- **Who:** Claude Code

---

## 2026-10-18 · Step 1: world generation (Claude Code)

### A test enforces sim purity
- **Decision:** `src/sim/purity.test.ts` scans non-test files in `src/sim` and fails on `Math.random`, `Date`, `performance.now`, `window.`/`document.`, React imports, or imports from `render/`/`ui/`.
- **Why:** Determinism is the foundation of the game, and a rule that only lives in a doc gets broken by accident.
- **Alternatives:** an ESLint rule (needs ESLint setup, which we don't have yet); code review only.
- **Who:** Claude Code

### Climate presets tuned by measuring biome shares
_Values and the theme test superseded by "Presets retuned, with a main biome each" (step 2 playtest fixes)._
- **Decision:** Preset values and biome thresholds were tuned by generating 10 seeds per preset and checking biome percentages. Results: Ice World is about 85% ice/tundra, Desert about 54% desert, Jungle about 40% jungle+swamp, Swamp about 24% swamp (the largest themed share), Volcanic about 17% volcanic. Mixed is varied with almost no swamp. The test "presets lean toward their theme" guards these loosely.
- **Why:** Presets should feel clearly different at a glance. The first version was too cold (Mixed had 20% ice) and Swamp/Jungle were mostly forest.
- **Alternatives:** per-preset biome overrides (more code, less coherent with the sliders).
- **Who:** Claude Code

### Swamps can reach higher ground when very wet
- **Decision:** Swamp needs moisture > 0.8 and temperature > 0.4. The height limit grows with moisture (`landHeight < 0.35 + (moisture − 0.8) × 2.5`).
- **Why:** With a fixed lowland-only rule, the Swamp preset was mostly forest. A plain moisture threshold made swamps appear all over Mixed.
- **Who:** Claude Code

### Volcanic biome is gated by chaos, not a preset flag
- **Decision:** `volcanic` appears only when chaos > 0.7, on land at least 40% up from the shore, with a per-region seeded roll. The Volcanic preset sets chaos to 0.9. Color #8C3B2A (the palette had no volcanic color).
- **Why:** Keeps `WorldSettings` to the four planned sliders plus seed. "Volcanic preset or high chaos" becomes one rule.
- **Alternatives:** a `preset` or `volcanism` field in WorldSettings.
- **Who:** Claude Code

### Frozen seas stay water
- **Decision:** Very cold water regions get biome `ice` but keep `isWater: true`. Water regions have moisture 1.
- **Why:** Ice worlds look frozen, and later swimmers (penguins, crocodiles) can still check `isWater`.
- **Who:** Claude Code

### Sea level is a threshold on normalized elevation
_Superseded by "Sea level is an exact share of the map" (step 2 playtest fixes)._
- **Decision:** Elevation is min-max normalized to 0–1 per world, and `isWater = elevation < seaLevel`.
- **Why:** The slider then behaves predictably (about "share of the map underwater") for every seed, and no seed comes out all ocean or all land by accident.
- **Alternatives:** absolute elevation thresholds (unpredictable per seed); exact rank-based cutoffs (too uniform).
- **Who:** Claude Code

### Terrain from neighbor-blurred random values with edge falloff
- **Decision:** Each field is random per region, blurred over hex neighbors for 2 passes, then re-normalized. Elevation also gets a quadratic falloff toward the map edges and a small chaos-scaled jitter.
- **Why:** On a 48-hex map, real noise functions add nothing. Blurring gives coherent land masses, and the falloff makes a central continent with surrounding sea, like the mockups.
- **Alternatives:** value/Perlin noise on a continuous plane (more code for no visible gain at this resolution).
- **Who:** Claude Code

### Separate RNG streams per field, derived from the seed only
- **Decision:** `createRng(seed + "|elevation")`, `"|moisture"`, `"|jitter"`, `"|volcano"`. Slider values don't feed the RNG.
- **Why:** Moving a slider changes the existing world instead of reshuffling it (the same continent gets wetter, colder or flooded). Adding a new random field later won't change existing worlds.
- **Alternatives:** one stream for everything (any change shifts every later value).
- **Who:** Claude Code

### PRNG: sfc32 seeded by cyrb128
- **Decision:** `cyrb128` hashes the seed string into four 32-bit words for `sfc32`. The first 12 outputs are thrown away.
- **Why:** Tiny, fast, well-tested, and statistically better than mulberry32 for long simulation runs. Four words of state come straight from the hash.
- **Alternatives:** mulberry32 (smaller state, weaker); a library (an unneeded dependency).
- **Who:** Claude Code

### 8 × 6 rectangle, axial coordinates, odd-r layout
- **Decision:** 48 pointy-top regions. Stored as axial `q, r`, laid out as an odd-r offset rectangle. `id = row * cols + col`, so `world.regions[id]` is a direct lookup and iteration order is fixed.
- **Why:** Matches the mockups. Axial coordinates keep neighbor and distance math simple. A rectangle fits the screen.
- **Who:** Claude Code

### World is derived state in React; no state library
- **Decision:** `App` stores only the seed, climate and preset id, and computes `world` with `useMemo`. Changing anything regenerates it right away, with no debounce.
- **Why:** Generation takes under a millisecond, and keeping the world derived means the UI can never mutate it.
- **Alternatives:** Zustand or Redux (nothing needs it yet).
- **Who:** Claude Code

### Tooling versions
- **Decision:** Latest at setup: React 19, Vite 8, Vitest 5, TypeScript 7, with strict mode plus `noUncheckedIndexedAccess`.
- **Why:** A new project should start current. `noUncheckedIndexedAccess` catches out-of-range region lookups, which matter in grid code.
- **Who:** Claude Code

---

## 2026-10-18 · Design revision (Sumit + Claude (planning))

Recorded from the updated docs/DESIGN.md and docs/DISCOVERIES.md.

- **Launch roster grows to 13 animals + 3 humans** (adds elephant, rat, shark, lizard, beetle; weak, strong and smart humans). **Supersedes** "Start with 8 animals". Why: each animal fills a distinct role so every pick changes the run. _Alternatives: the original 8; adding pets, farm animals or dinosaurs (skipped: they overlap existing roles or break the "real animals today" idea)._
- **Humans are animals like any other**, with no tools, farming, buildings or technology, and three versions with clear tradeoffs. Why: adds a relatable pick without turning into a civ game. Humans can't trigger the "Awakening" ending.
- **A placement step between setup and simulation.** Everything is auto-placed by default (seeded, picks a suitable region), and the player can drag animals anywhere, including bad spots on purpose. "Start with auto placement" skips it. Why: the same animals in different starting spots give very different outcomes, which adds replay value. Placements are part of the deterministic input.
- **Discoveries:** special named creatures in three tiers (Re-evolved, Oddity, Legend), with rules in a data file rather than hard-coded logic. Why: rewards experimenting and gives the Bestiary something to collect.
- **Freshness comes from runs actually differing.** The balancing script tracks winners, species counts, wipeouts, discovery rates and run-to-run variety. Daily world and rare events were added for the same reason.
- **Later batches** (monkey, octopus, eagle, camel, bat, tortoise, crab, goat) and an ancient pack unlocked through discoveries. New additions lean toward plant-eaters and prey.

---

## Planning decisions (Sumit + Claude (planning))

- **Name: "Thousand Years Later"**, spelled out instead of "1000", because it reads like a title and is easier to say and search. _Alternatives: "1000 Years Later"._
- **Real animals as the starting point**, because players get attached immediately ("what happened to my wolves?"). _Alternatives: invented starter creatures._
- **1,000 years with a big reveal at the end**, because the reveal is the core payoff and keeps runs short and replayable. _Alternatives: open-ended sandbox._
- **Fun over realism**: cartoon-speed evolution and exaggerated mutations, because the goal is surprise and replayability, not accuracy. _Alternatives: a realistic evolution model._
- **Simulate populations per region, not individual creatures**, because it's cheap, deterministic, and easier to balance. _Alternatives: individual agents._
- **About 30 to 48 hex regions instead of a fine grid**, because it's easier to read and balance. _Alternatives: a fine tile grid._
- **Seeded, deterministic simulation**, because share links, replays, and balancing scripts all depend on it.
- **Static site with no backend for now**, because nothing needs a server yet. Saves go in IndexedDB later.
- **Canvas 2D instead of PixiJS for now**, because the map is simple and fewer dependencies is better at the start. _Alternatives: PixiJS, SVG._
- ~~**Start with 8 animals** (wolf, rabbit, deer, bear, owl, frog, crocodile, penguin) to keep art manageable.~~ _Superseded by the design revision above (13 animals + 3 humans)._
- **Creature portraits built from parts plus mutation overlays later**, because drawing every species by hand doesn't scale.
- **No 3D, no physics, no individual agents, no evolving brains**: dropped to keep scope achievable.
- **Ambient "window into another place" idea and the civilization sandbox idea** were considered and set aside. Their best parts (stories, history, the reveal) were folded into this game.
- **Accessibility is out of scope for the first builds**, by choice.

_All planning decisions: Sumit + Claude (planning), 2026-10-18._
