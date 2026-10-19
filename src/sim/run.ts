// The 1,000-year run. Populations are numbers per species per region.
// step() is a pure function of the state: all randomness comes from an RNG
// derived from the seed and the tick number, so the state stays plain data.

import type { AnimalId } from './data/animals';
import { getAnimal, habitatFit, huntVulnerability, reachableRegions, regionFitness } from './ecology';
import { autoPlace, type Placements } from './placement';
import { createRng } from './rng';
import { generateWorld, type World, type WorldSettings } from './world';

export interface RunInput {
  worldSettings: WorldSettings;
  chosenAnimals: AnimalId[];
  /** animalId → regionId. Missing animals are auto-placed with the world seed. */
  placements: Placements;
}

export interface Population {
  animalId: AnimalId;
  regionId: number;
  count: number;
}

export type RunEventType = 'spread' | 'regionLost' | 'extinct' | 'peak';

export interface RunEvent {
  year: number;
  type: RunEventType;
  animalId: AnimalId;
  regionId: number | null;
  /** Species total at the time (for "peak"). */
  count?: number;
}

/** Per-species bookkeeping for events, in chosenAnimals order. */
export interface SpeciesTrack {
  animalId: AnimalId;
  total: number;
  extinct: boolean;
  /** Highest total since the last reported peak. */
  high: number;
  highYear: number;
  /** Lowest total since the last reported peak. */
  trough: number;
  /** The trough when the current high was set: the rise is measured from here. */
  base: number;
}

export interface RunState {
  input: RunInput;
  world: World;
  tick: number;
  year: number;
  /** Plant food per region, indexed by region id. */
  plants: number[];
  /** World-wide climate drift (0 = normal). Slow, so good and bad spells last decades. */
  climate: number;
  /** Per-region weather drift on top of the climate, indexed by region id. */
  weather: number[];
  /** Sorted by region id, then chosenAnimals order. */
  populations: Population[];
  species: SpeciesTrack[];
}

export interface Snapshot {
  tick: number;
  year: number;
  populations: Population[];
  plants: number[];
}

export const TICKS = 100;
export const YEARS_PER_TICK = 10;

// Tuning knobs. See DECISIONS.md (step 2) for why each is what it is.
/** Room in one region, divided by body space (0.1 + size). */
const REGION_SPACE = 60;
/** Plant food at plantFood = 1. */
const PLANT_SCALE = 100;
const PLANT_REGROW = 0.5;
/** Climate and weather are AR(1) drifts: next = old × persistence + noise × swing. */
const CLIMATE_PERSISTENCE = 0.85;
const CLIMATE_SWING = 0.6;
const WEATHER_PERSISTENCE = 0.6;
const WEATHER_SWING = 0.5;
/** Plant ceiling multiplier stays within these bounds. */
const MIN_PLANT_FACTOR = 0.2;
const MAX_PLANT_FACTOR = 1.6;
/** Most of the plants a region can lose to grazing in one tick. */
const PLANT_GRAZE_CAP = 0.8;
/** Background meat (fish, insects, small game) per region per tick. */
const WILD_MEAT = 8;
/** Seas teem with fish: wild meat at sea is this many times the land amount. */
const SEA_MEAT = 1.3;
/** Share of an omnivore's (1 − diet) it can swap from meat to plants. */
const OMNIVORE_TOP_UP = 0.5;
const MAX_KILL_SHARE = 0.8;
const START_SHARE = 0.35;
const HUNGER_DEATH = 0.8;
const UNFIT_DEATH = 1.5;
const HOMELESS_DEATH = 0.7;
const BASE_DISPERSAL = 0.04;
const MAX_EMIGRATION = 0.35;
/** How hard species with the same diet crowd each other out (Lotka–Volterra α at equal strength). */
const COMPETITION = 1;
/** Strength ratio raised to this power: higher means stronger species win more decisively. */
const COMPETITION_EDGE = 3;
/** α is capped here so one species can't wipe another out in a single tick. */
const MAX_COMPETITION = 3;
/** Below this share of capacity, a population struggles to find mates and grows slower. */
const ALLEE_SHARE = 0.3;
/** How much lower the Allee line is for a pure meat-eater. */
const HUNTER_SPARSENESS = 0.4;
/** Extra death per tick for a population far below its Allee line. */
const ALLEE_DEATH = 0.4;
/** Below this a population is removed. */
export const EXTINCTION_THRESHOLD = 0.5;
/** Migrants must number at least this to found a new population. */
const MIN_FOUNDERS = 1;
/** Livable means fitness at least this; migrants only go where they could survive. */
const MIN_TARGET_FITNESS = 0.45;
/** A peak is reported when the total falls this far below its high. */
const PEAK_DROP = 0.75;
/** …and only if the high was this far above the lowest point before it. */
const PEAK_RISE = 1.5;

/** Carrying capacity of one region for an animal, before food. */
export function capacity(animalId: AnimalId): number {
  return REGION_SPACE / (0.1 + getAnimal(animalId).size);
}

export function createRun(input: RunInput): RunState {
  const world = generateWorld(input.worldSettings);
  const placements = autoPlace(world, input.chosenAnimals, input.placements, input.worldSettings.seed);
  const populations: Population[] = input.chosenAnimals.map((animalId) => ({
    animalId,
    regionId: placements[animalId]!,
    count: capacity(animalId) * START_SHARE,
  }));
  const state: RunState = {
    input,
    world,
    tick: 0,
    year: 0,
    plants: world.regions.map((r) => r.plantFood * PLANT_SCALE),
    climate: 0,
    weather: world.regions.map(() => 0),
    populations: sortPopulations(populations, input.chosenAnimals),
    species: [],
  };
  state.species = input.chosenAnimals.map((animalId) => {
    const total = speciesTotal(state.populations, animalId);
    return { animalId, total, extinct: false, high: total, highYear: 0, base: total, trough: total };
  });
  return state;
}

export function isFinished(state: RunState): boolean {
  return state.tick >= TICKS;
}

export function step(state: RunState): { state: RunState; events: RunEvent[] } {
  if (isFinished(state)) return { state, events: [] };
  const { world, input } = state;
  const tick = state.tick + 1;
  const year = tick * YEARS_PER_TICK;
  const rng = createRng(`${input.worldSettings.seed}|tick|${tick}`);
  const events: RunEvent[] = [];

  // 1. Plants move halfway toward their ceiling: biome plantFood scaled by the
  // slow world climate and the faster regional weather (droughts, good spells).
  const climate = state.climate * CLIMATE_PERSISTENCE + (rng.next() - 0.5) * CLIMATE_SWING;
  const weather = world.regions.map(
    (r) => state.weather[r.id]! * WEATHER_PERSISTENCE + (rng.next() - 0.5) * WEATHER_SWING,
  );
  const plants = world.regions.map((region) => {
    const factor = Math.min(MAX_PLANT_FACTOR, Math.max(MIN_PLANT_FACTOR, 1 + climate + weather[region.id]!));
    const ceiling = region.plantFood * PLANT_SCALE * factor;
    const current = state.plants[region.id]!;
    return current + (ceiling - current) * PLANT_REGROW;
  });

  // Work on mutable copies, grouped by region.
  const pops = state.populations.map((p) => ({ ...p }));
  const byRegion: Population[][] = world.regions.map(() => []);
  for (const p of pops) byRegion[p.regionId]!.push(p);

  const fed = new Map<Population, number>();
  const kills = new Map<Population, number>();
  const fitnessOf = new Map<Population, number>();

  for (const region of world.regions) {
    const here = byRegion[region.id]!;
    if (here.length === 0) continue;

    // 2. Fitness.
    for (const p of here) fitnessOf.set(p, regionFitness(world, getAnimal(p.animalId), region.id));

    // 3. Feeding. Demand is split by diet.
    const need = here.map((p) => p.count * getAnimal(p.animalId).foodNeed);
    const got = here.map(() => 0);

    // 3a. Plants, shared by demand and competitive weight.
    const plantDemand = here.map((p, i) => need[i]! * (1 - getAnimal(p.animalId).diet));
    const weight = here.map((p) => competitiveWeight(p.animalId));
    let available = plants[region.id]!;
    available -= sharePlants(plantDemand, weight, got, available);

    // 3b. Meat: each predator splits its demand over the prey it can catch,
    // weighted by how catchable each is. Wild meat is always catchable.
    const meatDemand = here.map((p, i) => need[i]! * getAnimal(p.animalId).diet);
    const vuln = here.map((pred) => here.map((prey) => huntVulnerability(getAnimal(pred.animalId), getAnimal(prey.animalId))));
    const meatValue = here.map((p) => 0.3 + getAnimal(p.animalId).size);
    const wildMeat = region.isWater ? WILD_MEAT * SEA_MEAT : WILD_MEAT;
    // Requests per predator i on prey j (index here.length = wild meat).
    const requested = here.map(() => 0).concat([0]);
    const shares = here.map((_, i) => {
      const offers = here.map((prey, j) => prey.count * meatValue[j]! * vuln[i]![j]!);
      offers.push(wildMeat);
      const total = offers.reduce((a, b) => a + b, 0);
      const s = offers.map((o) => (total > 0 ? o / total : 0));
      s.forEach((w, j) => (requested[j]! += meatDemand[i]! * w));
      return s;
    });
    const caps = here.map((prey, j) => {
      const best = Math.max(0, ...here.map((_, i) => vuln[i]![j]!));
      return prey.count * meatValue[j]! * MAX_KILL_SHARE * best;
    });
    caps.push(wildMeat);
    const ratio = requested.map((r, j) => (r > 0 ? Math.min(1, caps[j]! / r) : 0));
    here.forEach((_, i) => {
      shares[i]!.forEach((w, j) => {
        const gain = meatDemand[i]! * w * ratio[j]!;
        got[i]! += gain;
        if (j < here.length && gain > 0) {
          const prey = here[j]!;
          kills.set(prey, (kills.get(prey) ?? 0) + gain / meatValue[j]!);
        }
      });
    });

    // 3c. Omnivores make up part of a meat shortfall from leftover plants.
    const topUp = here.map((p, i) => {
      const diet = getAnimal(p.animalId).diet;
      return diet > 0 ? Math.max(0, need[i]! - got[i]!) * (1 - diet) * OMNIVORE_TOP_UP : 0;
    });
    available -= sharePlants(topUp, weight, got, available);
    plants[region.id] = Math.max(0, available);

    here.forEach((p, i) => fed.set(p, need[i]! > 0 ? Math.min(1, got[i]! / need[i]!) : 1));
  }

  // 4. Growth: logistic growth scaled by fitness and food, minus hunger,
  // poor fit and predation. Room is shared: species with similar diets crowd
  // each other, and the stronger, better-fitted one takes the region.
  const load = new Map<Population, number>();
  for (const here of byRegion) {
    for (const p of here) {
      let l = 0;
      for (const q of here) l += (q.count / capacity(q.animalId)) * (q === p ? 1 : competition(p, q, fitnessOf));
      load.set(p, l);
    }
  }
  for (const p of pops) {
    const animal = getAnimal(p.animalId);
    const fitness = fitnessOf.get(p) ?? 0;
    const food = fed.get(p) ?? 0;
    const k = capacity(p.animalId);
    const r = 0.15 + animal.breedingRate * 0.9;
    // Allee effect: a handful of survivors breeds slowly. Hunters always live
    // spread thin, so their line sits lower.
    const mates = Math.min(1, p.count / (ALLEE_SHARE * k * (1 - HUNTER_SPARSENESS * animal.diet)));
    const room = 1 - (load.get(p) ?? 0);
    const growth = r * fitness * food * room * (room > 0 ? mates : 1);
    // Big eaters starve faster: hunger hurts in proportion to foodNeed.
    const hunger = HUNGER_DEATH * (1 - food) * (0.5 + animal.foodNeed);
    // Too few to hold on: scattered survivors slowly die out (strong Allee effect).
    const lonely = ALLEE_DEATH * (1 - mates);
    const death = fitness === 0 ? HOMELESS_DEATH : hunger + UNFIT_DEATH * (1 - fitness) ** 2 + lonely;
    p.count = Math.max(0, p.count * (1 + growth - death) - (kills.get(p) ?? 0));
  }

  // 5. Migration, computed from post-growth numbers and applied together.
  const arrivals: Population[] = [];
  const index = new Map<string, Population>();
  for (const p of pops) index.set(`${p.animalId}@${p.regionId}`, p);
  const moves: { from: Population; to: number; amount: number }[] = [];
  for (const p of pops) {
    if (p.count < EXTINCTION_THRESHOLD) continue;
    // Stranded in the wrong medium (a shark dropped on land): it can't swim or
    // walk out, it just dies there.
    if ((fitnessOf.get(p) ?? 0) === 0 && habitatFit(world, getAnimal(p.animalId), world.regions[p.regionId]!) === 0) continue;
    const animal = getAnimal(p.animalId);
    const k = capacity(p.animalId);
    const crowding = Math.max(0, p.count / k - 0.6);
    const hunger = 1 - (fed.get(p) ?? 0);
    const share = Math.min(MAX_EMIGRATION, BASE_DISPERSAL + crowding * 0.5 + hunger * 0.3);
    const targets = reachableRegions(world, animal, p.regionId)
      .map((id) => {
        const fitness = regionFitness(world, animal, id);
        const there = index.get(`${p.animalId}@${id}`)?.count ?? 0;
        return { id, weight: fitness >= MIN_TARGET_FITNESS ? fitness * Math.max(0, 1 - there / k) * (0.75 + rng.next() * 0.5) : 0 };
      })
      .filter((t) => t.weight > 0)
      .sort((a, b) => b.weight - a.weight || a.id - b.id)
      .slice(0, 2);
    const totalWeight = targets.reduce((a, t) => a + t.weight, 0);
    if (totalWeight === 0) continue;
    const leaving = p.count * share;
    for (const t of targets) {
      const amount = (leaving * t.weight) / totalWeight;
      const existing = index.has(`${p.animalId}@${t.id}`);
      if (!existing && amount < MIN_FOUNDERS) continue;
      moves.push({ from: p, to: t.id, amount });
    }
  }
  for (const m of moves) m.from.count -= m.amount;
  for (const m of moves) {
    const key = `${m.from.animalId}@${m.to}`;
    let target = index.get(key);
    if (!target) {
      target = { animalId: m.from.animalId, regionId: m.to, count: 0 };
      index.set(key, target);
      arrivals.push(target);
      events.push({ year, type: 'spread', animalId: m.from.animalId, regionId: m.to });
    }
    target.count += m.amount;
  }

  // 6. Extinction: remove tiny populations; a species with none left is extinct.
  const survivors = sortPopulations(
    pops.concat(arrivals).filter((p) => {
      if (p.count >= EXTINCTION_THRESHOLD) return true;
      if (pops.includes(p)) events.push({ year, type: 'regionLost', animalId: p.animalId, regionId: p.regionId });
      return false;
    }),
    input.chosenAnimals,
  );

  const species = state.species.map((s) => {
    if (s.extinct) return s;
    const total = speciesTotal(survivors, s.animalId);
    const next = { ...s, total };
    if (total === 0) {
      next.extinct = true;
      // The last regionLost for this species is really the extinction.
      let lastLost = -1;
      events.forEach((e, i) => {
        if (e.type === 'regionLost' && e.animalId === s.animalId) lastLost = i;
      });
      const regionId = lastLost >= 0 ? events[lastLost]!.regionId : null;
      if (lastLost >= 0) events.splice(lastLost, 1);
      events.push({ year, type: 'extinct', animalId: s.animalId, regionId });
      return next;
    }
    next.trough = Math.min(next.trough, total);
    if (total > next.high) {
      next.high = total;
      next.highYear = year;
      next.base = next.trough;
    } else if (total < next.high * PEAK_DROP && next.high > next.base * PEAK_RISE) {
      // Reported when the fall is clear, dated to the year of the high.
      events.push({ year: next.highYear, type: 'peak', animalId: s.animalId, regionId: null, count: next.high });
      next.high = total;
      next.highYear = year;
      next.base = total;
      next.trough = total;
    }
    return next;
  });

  return { state: { input, world, tick, year, plants, climate, weather, populations: survivors, species }, events };
}

export function runToEnd(input: RunInput): { finalState: RunState; history: Snapshot[]; events: RunEvent[] } {
  let state = createRun(input);
  const history: Snapshot[] = [snapshot(state)];
  const events: RunEvent[] = [];
  while (!isFinished(state)) {
    const result = step(state);
    state = result.state;
    events.push(...result.events);
    if (state.tick % 10 === 0) history.push(snapshot(state));
  }
  return { finalState: state, history, events };
}

export function snapshot(state: RunState): Snapshot {
  return {
    tick: state.tick,
    year: state.year,
    populations: state.populations.map((p) => ({ ...p })),
    plants: state.plants.slice(),
  };
}

export function speciesTotal(populations: readonly Population[], animalId: AnimalId): number {
  let total = 0;
  for (const p of populations) if (p.animalId === animalId) total += p.count;
  return total;
}

/** Population × body size: how much of the world a species is. Ranks the "top animal". */
export function speciesBiomass(populations: readonly Population[], animalId: AnimalId): number {
  return speciesTotal(populations, animalId) * getAnimal(animalId).size;
}

/** Number of regions a species lives in. */
export function speciesRegions(populations: readonly Population[], animalId: AnimalId): number {
  let regions = 0;
  for (const p of populations) if (p.animalId === animalId) regions++;
  return regions;
}

/**
 * Shares `available` plants between demands, in proportion to demand ×
 * competitive weight, never giving anyone more than it asked for. Whatever a
 * satisfied population leaves goes back into the pool for the rest. Adds to
 * `got` and returns plants eaten.
 */
function sharePlants(demand: number[], weight: number[], got: number[], available: number): number {
  let pool = Math.min(demand.reduce((a, b) => a + b, 0), Math.max(0, available) * PLANT_GRAZE_CAP);
  const eaten = pool;
  const left = demand.slice();
  // Each pass either uses up the pool or fully satisfies at least one population.
  for (let pass = 0; pass < demand.length && pool > 1e-9; pass++) {
    const claim = left.reduce((a, d, i) => a + d * weight[i]!, 0);
    if (claim <= 0) break;
    let given = 0;
    left.forEach((d, i) => {
      const share = Math.min(d, (pool * d * weight[i]!) / claim);
      got[i]! += share;
      left[i] = d - share;
      given += share;
    });
    pool -= given;
  }
  return eaten - pool;
}

/**
 * Lotka–Volterra α: how much `other` crowds `p` in their shared region.
 * Zero for species that eat different things; above 1 when `other` is the
 * stronger competitor there (competitive weight × local fitness).
 */
function competition(p: Population, other: Population, fitnessOf: Map<Population, number>): number {
  const a = getAnimal(p.animalId);
  const b = getAnimal(other.animalId);
  const overlap = 1 - Math.abs(a.diet - b.diet);
  if (overlap <= 0) return 0;
  const mine = competitiveWeight(p.animalId) * Math.max(0.05, fitnessOf.get(p) ?? 0);
  const theirs = competitiveWeight(other.animalId) * Math.max(0.05, fitnessOf.get(other) ?? 0);
  return Math.min(MAX_COMPETITION, COMPETITION * overlap * (theirs / mine) ** COMPETITION_EDGE);
}

/** Bigger, fiercer animals push others off the best grazing: 0.6 (tiny, harmless) to 1.4. */
function competitiveWeight(animalId: AnimalId): number {
  const a = getAnimal(animalId);
  return 0.6 + 0.4 * a.attack + 0.4 * a.size;
}

function sortPopulations(pops: Population[], order: readonly AnimalId[]): Population[] {
  return pops.slice().sort((a, b) => a.regionId - b.regionId || order.indexOf(a.animalId) - order.indexOf(b.animalId));
}
