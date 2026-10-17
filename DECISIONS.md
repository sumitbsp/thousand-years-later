# Decisions

Every meaningful decision and why, newest first. Add an entry whenever a non-obvious choice is made.

---

## 2026-10-18 · Step 1: world generation (Claude Code)

### A test enforces sim purity
- **Decision:** `src/sim/purity.test.ts` scans non-test files in `src/sim` and fails on `Math.random`, `Date`, `performance.now`, `window.`/`document.`, React imports, or imports from `render/`/`ui/`.
- **Why:** Determinism is the foundation of the game, and a rule that only lives in a doc gets broken by accident.
- **Alternatives:** an ESLint rule (needs ESLint setup, which we don't have yet); code review only.
- **Who:** Claude Code

### Climate presets tuned by measuring biome shares
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
- **Start with 8 animals** (wolf, rabbit, deer, bear, owl, frog, crocodile, penguin) to keep art manageable.
- **Creature portraits built from parts plus mutation overlays later**, because drawing every species by hand doesn't scale.
- **No 3D, no physics, no individual agents, no evolving brains**: dropped to keep scope achievable.
- **Ambient "window into another place" idea and the civilization sandbox idea** were considered and set aside. Their best parts (stories, history, the reveal) were folded into this game.
- **Accessibility is out of scope for the first builds**, by choice.

_All planning decisions: Sumit + Claude (planning), 2026-10-18._
