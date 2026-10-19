import { describe, expect, it } from 'vitest';
import { ANIMALS, type AnimalId } from './data/animals';
import { EARTH_VARIANTS, buildEarthWorld, earthRegionIndex, type EarthVariantId, type EarthWorld } from './earth';
import { getAnimal, reachableRegions } from './ecology';
import { autoPlace } from './placement';
import { createRun, runToEnd, step, speciesTotal, type RunInput, type RunState } from './run';
import { regionNeighbors } from './worldMap';

const SEED = 'test-seed';
const world = buildEarthWorld('today');

function input(chosenAnimals: AnimalId[], earthVariant: EarthVariantId = 'today', seed = SEED): RunInput {
  return { earthVariant, chaos: 0.5, seed, chosenAnimals, placements: {} };
}

/** A run whose populations are set by hand, for small controlled scenarios. */
function scenario(world: EarthWorld, regionId: number, pops: [AnimalId, number][]): RunState {
  const ids = pops.map(([id]) => id);
  const placements = Object.fromEntries(ids.map((id) => [id, regionId]));
  const state = createRun({ ...input(ids), placements });
  state.world = world;
  state.populations = pops.map(([animalId, count]) => ({ animalId, regionId, count }));
  return state;
}

/** One species' count in one region. */
function countIn(state: RunState, id: AnimalId, regionId: number): number {
  return state.populations.find((p) => p.animalId === id && p.regionId === regionId)?.count ?? 0;
}

describe('runs', () => {
  it('same RunInput gives identical final state, history and events', () => {
    const a = runToEnd(input(['wolf', 'rabbit', 'owl', 'frog']));
    const b = runToEnd(input(['wolf', 'rabbit', 'owl', 'frog']));
    expect(a).toEqual(b);
    expect(a.finalState.year).toBe(1000);
    expect(a.history).toHaveLength(11);
  });

  it('the seed and the variant change the history; the map depends only on the variant', () => {
    const a = runToEnd(input(['wolf', 'rabbit', 'owl', 'frog']));
    const b = runToEnd(input(['wolf', 'rabbit', 'owl', 'frog'], 'today', 'another-seed'));
    const c = runToEnd(input(['wolf', 'rabbit', 'owl', 'frog'], 'iceAge'));
    expect(a.finalState.world).toEqual(b.finalState.world);
    expect(a.finalState.populations).not.toEqual(b.finalState.populations);
    expect(a.finalState.populations).not.toEqual(c.finalState.populations);
  });

  it('different placements change the history', () => {
    const auto = autoPlace(world, ['wolf', 'rabbit', 'deer'], {}, SEED);
    const moved = { ...auto, rabbit: world.regions.find((r) => !r.isWater && r.id !== auto.rabbit)!.id };
    const a = runToEnd({ ...input(['wolf', 'rabbit', 'deer']), placements: auto });
    const b = runToEnd({ ...input(['wolf', 'rabbit', 'deer']), placements: moved });
    expect(a.finalState.populations).not.toEqual(b.finalState.populations);
  });

  it('step does not mutate its input state', () => {
    const state = createRun(input(['rabbit', 'wolf', 'bear']));
    const copy = structuredClone(state);
    step(state);
    expect(state).toEqual(copy);
  });

  it('water-only animals never live on land, land-only and shore animals never at sea', () => {
    for (const variant of EARTH_VARIANTS) {
      for (const chosen of [['shark', 'wolf', 'rabbit', 'elephant', 'penguin'], ['frog', 'crocodile', 'penguin', 'deer', 'lizard'], ['owl', 'beetle', 'humanSmart']] as AnimalId[][]) {
        const { history, finalState } = runToEnd(input(chosen, variant.id, `habitat-${variant.id}`));
        const world = finalState.world;
        for (const snap of history) {
          for (const p of snap.populations) {
            const habitat = ANIMALS.find((a) => a.id === p.animalId)!.habitat;
            const region = world.regions[p.regionId]!;
            if (habitat === 'water') expect(region.isWater).toBe(true);
            if (habitat === 'land') expect(region.isWater).toBe(false);
            if (habitat === 'both') {
              expect(region.isWater).toBe(false);
              const shore = ['coast', 'swamp'].includes(region.biome) || regionNeighbors(world, region.id).some((n) => world.regions[n]!.isWater);
              expect(shore, `${p.animalId} in ${region.biome} #${region.id}`).toBe(true);
            }
          }
        }
      }
    }
  });

  it('every new population is reachable from where its species lived the tick before', () => {
    for (const variant of EARTH_VARIANTS) {
      let state = createRun(input(['elephant', 'rabbit', 'owl', 'frog', 'shark'], variant.id));
      for (let t = 0; t < 60; t++) {
        const next = step(state).state;
        for (const p of next.populations) {
          const before = state.populations.filter((q) => q.animalId === p.animalId).map((q) => q.regionId);
          if (before.includes(p.regionId)) continue;
          const from = before.filter((r) => reachableRegions(state.world, getAnimal(p.animalId), r).includes(p.regionId));
          expect(from.length, `${variant.id} ${p.animalId} → ${state.world.regions[p.regionId]!.name}`).toBeGreaterThan(0);
        }
        state = next;
      }
    }
  });

  it('land animals leave a continent only across a strait or bridge', () => {
    const africa = new Set(world.regions.filter((r) => r.continent === 'africa').map((r) => r.id));
    for (const from of africa) {
      for (const to of reachableRegions(world, getAnimal('elephant'), from)) {
        if (africa.has(to)) continue;
        expect([['middleEast', 'sahara'], ['southernEurope', 'sahara']].some(
          ([a, b]) => [earthRegionIndex(a!), earthRegionIndex(b!)].sort().join() === [from, to].sort().join(),
        ), `${world.regions[from]!.name} → ${world.regions[to]!.name}`).toBe(true);
      }
    }
  });

  it('predators reduce prey in a two-species region', () => {
    const region = world.regions[earthRegionIndex('greatPlains')]!;
    const alone = scenario(world, region.id, [['rabbit', 100]]);
    const hunted = scenario(world, region.id, [['rabbit', 100], ['wolf', 40]]);
    const a = step(alone).state;
    const b = step(hunted).state;
    expect(countIn(b, 'rabbit', region.id)).toBeLessThan(countIn(a, 'rabbit', region.id) * 0.9);
  });

  it('a population with no food declines', () => {
    const region = world.regions[earthRegionIndex('europe')]!;
    // Same well-suited region, once normal and once with every plant gone.
    const fed = scenario(world, region.id, [['rabbit', 50]]);
    const starved = scenario(world, region.id, [['rabbit', 50]]);
    starved.world = structuredClone(world);
    starved.world.regions[region.id]!.plantFood = 0;
    starved.plants[region.id] = 0;
    let a = fed;
    let b = starved;
    for (let i = 0; i < 3; i++) {
      a = step(a).state;
      b = step(b).state;
    }
    // Measured in the region itself: starving rabbits also flee to fed neighbors.
    expect(countIn(a, 'rabbit', region.id)).toBeGreaterThan(50);
    expect(countIn(b, 'rabbit', region.id)).toBeLessThan(50 * 0.5);
  });

  it('a state survives a structured clone and steps identically (plain data)', () => {
    let state = createRun(input(['wolf', 'rabbit', 'shark', 'owl']));
    for (let i = 0; i < 20; i++) state = step(state).state;
    expect(step(structuredClone(state))).toEqual(step(state));
  });

  it('a shark dropped on land cannot swim out; it dies there', () => {
    const coastLand = world.regions.find((r) => !r.isWater && regionNeighbors(world, r.id).some((n) => world.regions[n]!.isWater))!;
    const { events, finalState } = runToEnd({ ...input(['shark', 'rabbit', 'deer']), placements: { shark: coastLand.id } });
    expect(events.some((e) => e.type === 'spread' && e.animalId === 'shark')).toBe(false);
    expect(speciesTotal(finalState.populations, 'shark')).toBe(0);
  });

  it('logs spread and peak events over a full run', () => {
    const { events } = runToEnd(input(['wolf', 'rabbit', 'owl', 'frog']));
    expect(events.some((e) => e.type === 'spread')).toBe(true);
    expect(events.some((e) => e.type === 'peak')).toBe(true);
    for (const peak of events.filter((e) => e.type === 'peak')) expect(peak.year).toBeGreaterThan(0);
  });

  it('logs extinctions once and only for species with no populations left', () => {
    const sea = world.regions.find((r) => r.isWater)!;
    // A rabbit dropped in the ocean cannot survive.
    const { events, finalState } = runToEnd({
      ...input(['rabbit', 'wolf', 'deer']),
      placements: { rabbit: sea.id },
    });
    const extinct = events.filter((e) => e.type === 'extinct' && e.animalId === 'rabbit');
    expect(extinct).toHaveLength(1);
    expect(speciesTotal(finalState.populations, 'rabbit')).toBe(0);
  });
});
