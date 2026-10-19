import { describe, expect, it } from 'vitest';
import { ANIMALS } from './data/animals';
import { getAnimal, habitatFit, huntVulnerability, reachableRegions, regionFitness } from './ecology';
import { PRESETS } from './presets';
import { generateWorld, regionNeighbors } from './world';

const worlds = PRESETS.flatMap((p) => [0, 1, 2].map((i) => generateWorld({ seed: `eco-${p.id}-${i}`, ...p.climate })));

describe('ecology', () => {
  it('sharks only reach water, land animals only reach land', () => {
    for (const world of worlds) {
      for (const region of world.regions) {
        for (const id of reachableRegions(world, getAnimal('shark'), region.id)) expect(world.regions[id]!.isWater).toBe(true);
        for (const id of reachableRegions(world, getAnimal('wolf'), region.id)) expect(world.regions[id]!.isWater).toBe(false);
      }
    }
  });

  it('owls cross exactly one water hex', () => {
    let crossings = 0;
    for (const world of worlds) {
      for (const region of world.regions.filter((r) => !r.isWater)) {
        const near = new Set([region.id, ...regionNeighbors(world, region.id)]);
        for (const id of reachableRegions(world, getAnimal('owl'), region.id)) {
          expect(world.regions[id]!.isWater).toBe(false);
          if (near.has(id)) continue;
          // Not a neighbor: there must be a water hex between the two.
          crossings++;
          const bridge = regionNeighbors(world, region.id).filter(
            (n) => world.regions[n]!.isWater && regionNeighbors(world, n).includes(id),
          );
          expect(bridge.length).toBeGreaterThan(0);
        }
        // A wolf never gets those extra regions.
        for (const id of reachableRegions(world, getAnimal('wolf'), region.id)) expect(near.has(id)).toBe(true);
      }
    }
    expect(crossings).toBeGreaterThan(0);
  });

  it('habitat rules: fitness is 0 in the wrong medium', () => {
    for (const world of worlds) {
      for (const animal of ANIMALS) {
        for (const region of world.regions) {
          const f = regionFitness(world, animal, region.id);
          const shore = region.biome === 'coast' || region.biome === 'swamp' || regionNeighbors(world, region.id).some((n) => world.regions[n]!.isWater);
          if (animal.habitat === 'water' && !region.isWater) expect(f).toBe(0);
          if (animal.habitat === 'land' && region.isWater) expect(f).toBe(0);
          if (animal.habitat === 'both' && (region.isWater || !shore)) expect(habitatFit(world, animal, region)).toBe(0);
          if (animal.habitat === 'both' && !region.isWater && shore) expect(habitatFit(world, animal, region)).toBeGreaterThan(0);
          expect(f).toBeGreaterThanOrEqual(0);
          expect(f).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('shore animals never reach open water', () => {
    for (const world of worlds) {
      for (const region of world.regions) {
        for (const id of reachableRegions(world, getAnimal('frog'), region.id)) expect(world.regions[id]!.isWater).toBe(false);
      }
    }
  });

  it('predators catch only smaller, weaker prey', () => {
    expect(huntVulnerability(getAnimal('wolf'), getAnimal('rabbit'))).toBeGreaterThan(0);
    expect(huntVulnerability(getAnimal('shark'), getAnimal('penguin'))).toBeGreaterThan(0);
    expect(huntVulnerability(getAnimal('wolf'), getAnimal('elephant'))).toBe(0);
    expect(huntVulnerability(getAnimal('rabbit'), getAnimal('beetle'))).toBe(0); // plant-eater
    expect(huntVulnerability(getAnimal('lizard'), getAnimal('beetle'))).toBe(0); // armored
    expect(huntVulnerability(getAnimal('wolf'), getAnimal('wolf'))).toBe(0);
    expect(huntVulnerability(getAnimal('humanStrong'), getAnimal('humanWeak'))).toBe(0);
  });

  it('every animal has valid 0–1 stats and known preferred biomes', () => {
    expect(ANIMALS).toHaveLength(16);
    for (const a of ANIMALS) {
      for (const v of [a.size, a.speed, a.attack, a.defense, a.diet, a.heatTolerance, a.coldTolerance, a.breedingRate, a.foodNeed, a.mutationLuck]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(a.preferredBiomes.length).toBeGreaterThan(0);
    }
    const smart = getAnimal('humanSmart');
    for (const a of ANIMALS.filter((x) => x.id !== 'humanSmart')) expect(smart.mutationLuck).toBeGreaterThan(a.mutationLuck);
  });
});
