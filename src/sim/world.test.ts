import { describe, expect, it } from 'vitest';
import { BIOMES } from './biomes';
import { PRESETS } from './presets';
import { generateWorld, regionNeighbors, type World, type WorldSettings } from './world';

const base: WorldSettings = { seed: 'mossy-river-42', temperature: 0.55, rainfall: 0.6, seaLevel: 0.4, chaos: 0.5 };
const SEEDS = ['mossy-river-42', 'a', 'b', 'quiet-fern-7', 'thousand', 'xyz-123', 'owl', 'frog-pond'];

describe('generateWorld', () => {
  it('is deterministic: same seed + settings give a deep-equal world', () => {
    expect(generateWorld({ ...base })).toEqual(generateWorld({ ...base }));
  });

  it('gives different worlds for different seeds', () => {
    const a = generateWorld({ ...base, seed: 'seed-one' });
    const b = generateWorld({ ...base, seed: 'seed-two' });
    expect(a).not.toEqual(b);
    expect(a.regions.map((r) => r.elevation)).not.toEqual(b.regions.map((r) => r.elevation));
  });

  it('has 48 regions with values in range', () => {
    const world = generateWorld(base);
    expect(world.regions).toHaveLength(48);
    world.regions.forEach((region, i) => {
      expect(region.id).toBe(i);
      for (const v of [region.elevation, region.moisture, region.temperature, region.plantFood]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(BIOMES).toContain(region.biome);
    });
  });

  it('every preset produces some land and some water across seeds', () => {
    for (const preset of PRESETS) {
      for (const seed of SEEDS) {
        const world = generateWorld({ seed, ...preset.climate });
        const water = world.regions.filter((r) => r.isWater).length;
        expect(water, `${preset.name} / ${seed}`).toBeGreaterThan(0);
        expect(world.regions.length - water, `${preset.name} / ${seed}`).toBeGreaterThan(0);
      }
    }
  });

  it('volcanic biomes only appear with high chaos', () => {
    for (const seed of SEEDS) {
      for (const preset of PRESETS.filter((p) => p.id !== 'volcanic')) {
        const world = generateWorld({ seed, ...preset.climate });
        expect(world.regions.some((r) => r.biome === 'volcanic')).toBe(false);
      }
    }
    const volcanic = PRESETS.find((p) => p.id === 'volcanic')!;
    const anyVolcano = SEEDS.some((seed) =>
      generateWorld({ seed, ...volcanic.climate }).regions.some((r) => r.biome === 'volcanic'),
    );
    expect(anyVolcano).toBe(true);
  });

  it("each preset's main biome is common", () => {
    const seeds = Array.from({ length: 30 }, (_, i) => `theme-${i}`);
    for (const preset of PRESETS) {
      const counts = new Map<string, number>();
      let land = 0;
      for (const seed of seeds) {
        for (const r of generateWorld({ seed, ...preset.climate }).regions) {
          counts.set(r.biome, (counts.get(r.biome) ?? 0) + 1);
          if (!r.isWater) land++;
        }
      }
      const total = seeds.length * 48;
      // At least 15% of the whole map, and never rarer than 3 other biomes.
      const main = counts.get(preset.mainBiome) ?? 0;
      expect(main / total, preset.name).toBeGreaterThan(0.15);
      const moreCommon = [...counts.entries()].filter(([b, n]) => b !== preset.mainBiome && n > main).length;
      expect(moreCommon, preset.name).toBeLessThanOrEqual(2);
      if (preset.id === 'jungle') expect(main / land, 'jungle share of land').toBeGreaterThan(0.4);
      if (preset.id === 'mixed') {
        expect(counts.get('desert') ?? 0, 'mixed has some desert').toBeGreaterThan(total * 0.02);
        expect(counts.get('forest') ?? 0, 'mixed has forest').toBeGreaterThan(total * 0.08);
      }
    }
  });

  it('sea level is the share of the map under water', () => {
    for (const preset of PRESETS) {
      const world = generateWorld({ seed: 'sea', ...preset.climate });
      expect(world.regions.filter((r) => r.isWater).length).toBe(Math.round(preset.climate.seaLevel * 48));
    }
  });

  it('archipelago is about half land, split into several islands', () => {
    const archipelago = PRESETS.find((p) => p.id === 'archipelago')!;
    let several = 0;
    for (const seed of SEEDS.concat(Array.from({ length: 22 }, (_, i) => `isle-${i}`))) {
      const world = generateWorld({ seed, ...archipelago.climate });
      const land = world.regions.filter((r) => !r.isWater).length / world.regions.length;
      expect(land).toBeGreaterThanOrEqual(0.45);
      expect(land).toBeLessThanOrEqual(0.55);
      if (countIslands(world) >= 2) several++;
    }
    expect(several / 30).toBeGreaterThan(0.75);
  });

  it('regionNeighbors returns valid, symmetric ids', () => {
    const world = generateWorld(base);
    for (const region of world.regions) {
      for (const n of regionNeighbors(world, region.id)) {
        expect(regionNeighbors(world, n)).toContain(region.id);
      }
    }
  });
});

/** Connected groups of land regions. */
function countIslands(world: World): number {
  const seen = new Set<number>();
  let islands = 0;
  for (const region of world.regions) {
    if (region.isWater || seen.has(region.id)) continue;
    islands++;
    const stack = [region.id];
    seen.add(region.id);
    while (stack.length > 0) {
      for (const n of regionNeighbors(world, stack.pop()!)) {
        if (world.regions[n]!.isWater || seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return islands;
}
