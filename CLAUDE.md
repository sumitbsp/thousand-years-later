# Thousand Years Later

A browser game: the player picks a version of the real Earth and a few real animals (or one of three human versions), chooses where on the world map they start or lets the game decide, simulates 1,000 years of cartoonish evolution, and watches what the world and its creatures become. Fun and replayability over realism. Full design: [docs/DESIGN.md](docs/DESIGN.md), discoverable creatures in [docs/DISCOVERIES.md](docs/DISCOVERIES.md), mockups in [docs/screens/](docs/screens/) (the map style is `map-concept.png`, the creature style is `creatures.png`).

**Core principle: show the chaos, don't tell it.** Mutations, events, territory changes and big moments must be visible on screen (creatures change shape, events animate on the map). Text supports what the player sees; it never replaces it.

> **In transition:** the code still uses the generated hex world from steps 1–2. Step 2.5 moves to the real Earth (storybook atlas) and our own animated, parts-based creature art. See "Next: step 2.5" in FLOW.md. Keep the hex generator; it may become an "Alien worlds" mode.

## Every session

1. **At the start:** read [FLOW.md](FLOW.md) (how the project works end to end) and [DECISIONS.md](DECISIONS.md) (what was decided and why).
2. **At the end of every step:** update FLOW.md so it matches the code, and add a DECISIONS.md entry (newest first) for every non-obvious choice you made.
3. Build only what the current step asks for.

## Stack

- Vite + TypeScript (strict) + React
- Canvas 2D for the map (no PixiJS yet); SVG for creatures (our own parts-based art, no icon library)
- From step 2.5: world-atlas + topojson-client (Earth outlines), d3-geo (projection), d3-delaunay (Voronoi regions). Pin exact versions.
- Vitest for tests
- Static site, no backend

Commands: `npm run dev`, `npm test`, `npm run build`, `npm run typecheck`, `npm run balance`.

## Folder structure

- `src/sim/` — pure TypeScript game logic (animal data in `src/sim/data/`). **No DOM, no React, no imports from render/ui.** Must be able to run in a Web Worker or headless Node.
- `src/render/` — canvas drawing. Reads world state, never modifies it.
- `src/ui/` — React components (setup panel, map view, controls).
- `src/art/` — (from step 2.5) creature SVG definitions: named parts with pivot points, body plans with anchor points for mutation overlays. Pure data + render helpers; the sim never imports it.
- `docs/` — design doc and mockups.
- `scripts/` — headless Node scripts (balance check). May import from `src/sim` only.

## Determinism rules

The whole game (share links, replays, balancing scripts) depends on these.

- All randomness in `src/sim` comes from the seeded PRNG in `src/sim/rng.ts` (`createRng(seed)`).
- Never use `Math.random()`, `Date`, `performance.now()` or anything else non-deterministic in `src/sim`. `src/sim/purity.test.ts` enforces this.
- Same seed + same settings must produce the exact same world (deep equal). Placements are part of the input too: same seed + settings + placements = same history. After step 2.5 the input is Earth variant + chaos + seed + animals + placements.
- Iterate arrays in a fixed order. Don't iterate object keys for logic.
- The UI may use `Math.random()` (e.g. picking a random seed), since it is outside the sim.
