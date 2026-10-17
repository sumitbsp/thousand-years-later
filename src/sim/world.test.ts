import { describe, expect, it } from 'vitest';
import { BIOMES } from './biomes';
import { PRESETS } from './presets';
import { generateWorld, regionNeighbors, type WorldSettings } from './world';

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

  it('presets lean toward their theme', () => {
    const share = (presetId: string, biomes: string[]) => {
      const preset = PRESETS.find((p) => p.id === presetId)!;
      let hits = 0;
      let land = 0;
      for (const seed of SEEDS) {
        for (const r of generateWorld({ seed, ...preset.climate }).regions) {
          if (r.isWater) continue;
          land++;
          if (biomes.includes(r.biome)) hits++;
        }
      }
      return hits / land;
    };
    expect(share('ice', ['ice', 'tundra'])).toBeGreaterThan(0.5);
    expect(share('desert', ['desert'])).toBeGreaterThan(0.4);
    expect(share('jungle', ['jungle', 'swamp'])).toBeGreaterThan(0.4);
    expect(share('swamp', ['swamp'])).toBeGreaterThan(0.3);
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
