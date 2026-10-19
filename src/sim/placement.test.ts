import { describe, expect, it } from 'vitest';
import { ANIMALS, ANIMAL_IDS } from './data/animals';
import { getAnimal, regionFitness } from './ecology';
import { autoPlace, withFixed } from './placement';
import { PRESETS } from './presets';
import { generateWorld } from './world';

const world = generateWorld({ seed: 'place-test', ...PRESETS[0]!.climate });

describe('autoPlace', () => {
  it('is deterministic', () => {
    const chosen = ['wolf', 'rabbit', 'owl', 'frog', 'shark'] as const;
    expect(autoPlace(world, chosen, {}, 's1')).toEqual(autoPlace(world, chosen, {}, 's1'));
  });

  it('respects fixed placements, even bad ones', () => {
    const sea = world.regions.find((r) => r.isWater)!.id;
    const result = autoPlace(world, ['wolf', 'penguin', 'deer'], { wolf: sea }, 's1');
    expect(result.wolf).toBe(sea);
    expect(result.penguin).not.toBe(sea);
    expect(result.deer).not.toBe(sea);
  });

  it('a new seed re-rolls only the auto animals', () => {
    const chosen = ['wolf', 'rabbit', 'deer', 'bear'] as const;
    const fixed = { wolf: world.regions.find((r) => !r.isWater)!.id };
    for (const seed of ['r1', 'r2', 'r3']) expect(autoPlace(world, chosen, fixed, seed).wolf).toBe(fixed.wolf);
  });

  it('shares a region only when the player did that', () => {
    const land = world.regions.find((r) => !r.isWater)!.id;
    const result = autoPlace(world, ['wolf', 'rabbit', 'deer', 'bear'], { wolf: land, rabbit: land }, 's');
    expect(result.wolf).toBe(land);
    expect(result.rabbit).toBe(land);
    expect(result.deer).not.toBe(land);
    expect(result.bear).not.toBe(land);
    expect(result.deer).not.toBe(result.bear);
  });

  it('places everyone on distinct, livable regions', () => {
    for (const preset of PRESETS) {
      for (let i = 0; i < 5; i++) {
        const w = generateWorld({ seed: `p-${i}`, ...preset.climate });
        const chosen = ANIMAL_IDS.slice(i, i + 5);
        const result = autoPlace(w, chosen, {}, `seed-${i}`);
        chosen.forEach((id, k) => {
          // Shares a region only when every livable region was already taken.
          const earlier = new Set(chosen.slice(0, k).map((e) => result[e]!));
          if (earlier.has(result[id]!)) {
            const livable = w.regions.filter((r) => regionFitness(w, getAnimal(id), r.id) > 0);
            expect(livable.every((r) => earlier.has(r.id)), `${preset.name}: ${id}`).toBe(true);
          }
        });
        chosen.forEach((id) => {
          const region = w.regions[result[id]!]!;
          const habitat = getAnimal(id).habitat;
          if (habitat === 'water') expect(region.isWater).toBe(true);
          if (habitat === 'land') expect(region.isWater).toBe(false);
        });
      }
    }
  });

  it('picks good regions', () => {
    for (const animal of ANIMALS) {
      const result = autoPlace(world, [animal.id], {}, 'fit');
      const best = Math.max(...world.regions.map((r) => regionFitness(world, animal, r.id)));
      expect(regionFitness(world, animal, result[animal.id]!)).toBeGreaterThanOrEqual(best * 0.85);
    }
  });

  it('a different seed can change auto placements', () => {
    const chosen = ['rabbit', 'deer', 'wolf'] as const;
    const seeds = ['a', 'b', 'c', 'd', 'e'].map((s) => JSON.stringify(autoPlace(world, chosen, {}, s)));
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it('placing an animal never moves the auto-placed ones', () => {
    const chosen = ['wolf', 'rabbit', 'owl', 'frog'] as const;
    const auto = autoPlace(world, chosen, {}, 'stable');
    // Drop the wolf on every land region in turn, including the others' spots.
    for (const region of world.regions.filter((r) => !r.isWater)) {
      const placed = withFixed(chosen, auto, { wolf: region.id });
      expect(placed.wolf).toBe(region.id);
      for (const id of chosen.slice(1)) expect(placed[id]).toBe(auto[id]);
    }
  });
});
