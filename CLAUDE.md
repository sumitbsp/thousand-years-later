# Thousand Years Later

A browser game: the player picks a climate and a few real animals (or one of three human versions), chooses where they start or lets the game decide, simulates 1,000 years of cartoonish evolution, and gets a big reveal of what the world and its creatures became. Fun and replayability over realism. Full design: [docs/DESIGN.md](docs/DESIGN.md), discoverable creatures in [docs/DISCOVERIES.md](docs/DISCOVERIES.md), mockups in [docs/screens/](docs/screens/).

## Every session

1. **At the start:** read [FLOW.md](FLOW.md) (how the project works end to end) and [DECISIONS.md](DECISIONS.md) (what was decided and why).
2. **At the end of every step:** update FLOW.md so it matches the code, and add a DECISIONS.md entry (newest first) for every non-obvious choice you made.
3. Build only what the current step asks for.

## Stack

- Vite + TypeScript (strict) + React
- Canvas 2D for the map (no PixiJS yet)
- Vitest for tests
- Static site, no backend

Commands: `npm run dev`, `npm test`, `npm run build`, `npm run typecheck`.

## Folder structure

- `src/sim/` — pure TypeScript game logic. **No DOM, no React, no imports from render/ui.** Must be able to run in a Web Worker or headless Node.
- `src/render/` — canvas drawing. Reads world state, never modifies it.
- `src/ui/` — React components (setup panel, map view, controls).
- `docs/` — design doc and mockups.

## Determinism rules

The whole game (share links, replays, balancing scripts) depends on these.

- All randomness in `src/sim` comes from the seeded PRNG in `src/sim/rng.ts` (`createRng(seed)`).
- Never use `Math.random()`, `Date`, `performance.now()` or anything else non-deterministic in `src/sim`. `src/sim/purity.test.ts` enforces this.
- Same seed + same settings must produce the exact same world (deep equal). Once animals exist, placements are part of the input too: same seed + settings + placements = same history.
- Iterate arrays in a fixed order. Don't iterate object keys for logic.
- The UI may use `Math.random()` (e.g. picking a random seed), since it is outside the sim.
