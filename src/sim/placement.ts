// Auto placement: picks a sensible starting region for every animal the
// player hasn't placed. Seeded, so the same inputs give the same placements.

import type { AnimalId } from './data/animals';
import { getAnimal, habitatFit, regionFitness } from './ecology';
import { createRng } from './rng';
import type { World } from './world';

/** animalId → regionId. Objects are only read by key, never iterated for logic. */
export type Placements = Partial<Record<AnimalId, number>>;

/** Candidates within this share of the best score are picked at random. */
const GOOD_ENOUGH = 0.85;

export function autoPlace(
  world: World,
  chosenAnimals: readonly AnimalId[],
  fixedPlacements: Placements,
  seed: string,
): Placements {
  const rng = createRng(`${seed}|place`);
  const result: Placements = {};
  const taken = new Set<number>();

  for (const id of chosenAnimals) {
    const fixed = fixedPlacements[id];
    if (fixed !== undefined) {
      result[id] = fixed;
      taken.add(fixed);
    }
  }

  for (const id of chosenAnimals) {
    if (result[id] !== undefined) continue;
    const animal = getAnimal(id);
    const scored = world.regions
      .map((r) => ({ id: r.id, score: regionFitness(world, animal, r.id) }))
      .filter((c) => c.score > 0);
    // Prefer free regions; share only when nothing else is livable.
    const free = scored.filter((c) => !taken.has(c.id));
    const pool = free.length > 0 ? free : scored;
    let regionId: number;
    if (pool.length === 0) {
      // Nowhere livable (a shark in a world with no sea, a penguin in a desert):
      // a free region in its own medium if there is one, else any free region.
      const free = world.regions.filter((r) => !taken.has(r.id));
      const medium = free.filter((r) => habitatFit(world, animal, r) > 0);
      regionId = rng.pick(medium.length > 0 ? medium : free.length > 0 ? free : world.regions).id;
    } else {
      const best = Math.max(...pool.map((c) => c.score));
      const good = pool.filter((c) => c.score >= best * GOOD_ENOUGH);
      regionId = rng.pick(good).id;
    }
    result[id] = regionId;
    taken.add(regionId);
  }
  return result;
}

/**
 * The placements a run starts with: the player's choice where there is one,
 * otherwise the auto placement. Auto placements are computed once (on entering
 * the placement screen, Re-roll or Reset) and kept, so placing one animal never
 * moves the others.
 */
export function withFixed(chosenAnimals: readonly AnimalId[], auto: Placements, fixed: Placements): Placements {
  const result: Placements = {};
  for (const id of chosenAnimals) result[id] = fixed[id] ?? auto[id];
  return result;
}
