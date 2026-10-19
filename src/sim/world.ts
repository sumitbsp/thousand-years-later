// World generation. generateWorld() is a pure function of its settings:
// same settings (including seed) always produce the exact same world.

import { BASE_PLANT_FOOD, classifyBiome, type Biome } from './biomes';
import { gridNeighbors, isInGrid, axialToOffset, offsetToAxial } from './hex';
import { createRng, type Rng } from './rng';

export interface WorldSettings {
  seed: string;
  /** All 0–1. */
  temperature: number;
  rainfall: number;
  seaLevel: number;
  chaos: number;
}

export interface Region {
  id: number;
  q: number;
  r: number;
  elevation: number;
  moisture: number;
  temperature: number;
  biome: Biome;
  plantFood: number;
  isWater: boolean;
}

export interface World {
  settings: WorldSettings;
  cols: number;
  rows: number;
  /** Indexed by id. id = row * cols + col. */
  regions: Region[];
}

export const GRID_COLS = 8;
export const GRID_ROWS = 6;

/** Volcanoes only appear above this chaos level. */
const VOLCANO_CHAOS_THRESHOLD = 0.7;
/** Land starts breaking into islands above this sea level, fully at ISLAND_FULL. */
const ISLAND_START = 0.42;
const ISLAND_FULL = 0.5;
const EDGE_PULL_DROP = 0.8;
const ISLAND_ROUGHNESS = 0.8;

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Region id for axial coordinates, or null if outside the grid. */
export function regionIdAt(world: World, q: number, r: number): number | null {
  if (!isInGrid(q, r, world.cols, world.rows)) return null;
  const { col, row } = axialToOffset(q, r);
  return row * world.cols + col;
}

/** Ids of a region's neighbors, in fixed direction order. */
export function regionNeighbors(world: World, id: number): number[] {
  const region = world.regions[id]!;
  return gridNeighbors(region.q, region.r, world.cols, world.rows).map(
    (n) => regionIdAt(world, n.q, n.r)!,
  );
}

export function generateWorld(input: WorldSettings): World {
  const settings: WorldSettings = {
    seed: input.seed,
    temperature: clamp01(input.temperature),
    rainfall: clamp01(input.rainfall),
    seaLevel: clamp01(input.seaLevel),
    chaos: clamp01(input.chaos),
  };
  const cols = GRID_COLS;
  const rows = GRID_ROWS;
  const count = cols * rows;

  // Grid layout and neighbor lists, all indexed by region id.
  const coords = Array.from({ length: count }, (_, id) => offsetToAxial(id % cols, Math.floor(id / cols)));
  const neighbors = coords.map(({ q, r }) =>
    gridNeighbors(q, r, cols, rows).map((n) => {
      const { col, row } = axialToOffset(n.q, n.r);
      return row * cols + col;
    }),
  );

  // Each field gets its own stream from the seed, so the same seed keeps the
  // same underlying terrain while sliders move.
  const rngFor = (name: string): Rng => createRng(`${settings.seed}|${name}`);
  const elevationNoise = smoothField(rngFor('elevation'), neighbors, 2);
  const jitter = randomField(rngFor('jitter'), count);
  const moistureNoise = smoothField(rngFor('moisture'), neighbors, 2);
  const volcanoRolls = randomField(rngFor('volcano'), count);

  // Elevation: smoothed noise, lowered toward the map edges so land gathers
  // in the middle, plus a little chaos-driven roughness. High seas break the
  // land up: a weaker edge pull and rougher terrain leave several islands
  // instead of one continent.
  const islands = clamp01((settings.seaLevel - ISLAND_START) / (ISLAND_FULL - ISLAND_START));
  const edgePull = 0.35 * (1 - EDGE_PULL_DROP * islands);
  const roughness = 0.15 + settings.chaos * 0.25 + ISLAND_ROUGHNESS * islands;
  const rawElevation = coords.map((_, id) => {
    const col = id % cols;
    const row = Math.floor(id / cols);
    const dx = Math.abs(col - (cols - 1) / 2) / ((cols - 1) / 2);
    const dy = Math.abs(row - (rows - 1) / 2) / ((rows - 1) / 2);
    const edge = Math.max(dx, dy);
    return elevationNoise[id]! - edgePull * edge * edge + (jitter[id]! - 0.5) * roughness;
  });
  const elevation = normalize(rawElevation);
  // Sea level is the share of the map under water: the lowest regions flood
  // (ties broken by id), so a preset gets the same land share on every seed.
  const waterCount = Math.round(settings.seaLevel * count);
  const byHeight = elevation.map((e, id) => ({ e, id })).sort((a, b) => a.e - b.e || a.id - b.id);
  const isWater = elevation.map(() => false);
  for (const { id } of byHeight.slice(0, waterCount)) isWater[id] = true;
  // Elevation of the shoreline: the highest flooded region (0 when nothing is).
  const shore = waterCount > 0 ? byHeight[waterCount - 1]!.e : 0;

  const regions: Region[] = coords.map(({ q, r }, id) => {
    const water = isWater[id]!;
    const elev = elevation[id]!;
    const landHeight = water ? 0 : (elev - shore) / Math.max(1e-6, 1 - shore);
    const waterNeighbors = neighbors[id]!.filter((n) => isWater[n]).length;

    const moisture = water
      ? 1
      : clamp01(0.15 + settings.rainfall * 0.7 + (moistureNoise[id]! - 0.5) * 0.7 + (waterNeighbors / 6) * 0.15);

    // Cooler toward the top and bottom rows, and cooler when high.
    const latitude = Math.abs(r - (rows - 1) / 2) / ((rows - 1) / 2);
    const temperature = clamp01(0.1 + settings.temperature * 0.9 - latitude * 0.25 - landHeight * 0.25);

    const volcanoChance = (settings.chaos - VOLCANO_CHAOS_THRESHOLD) * 3.5;
    const volcano = !water && landHeight > 0.4 && volcanoRolls[id]! < volcanoChance;

    const biome = classifyBiome({
      isWater: water,
      temperature,
      moisture,
      landHeight,
      touchesWater: waterNeighbors > 0,
      volcano,
    });
    const base = BASE_PLANT_FOOD[biome];
    const plantFood = water ? base : clamp01(base * (0.85 + 0.3 * moisture));

    return { id, q, r, elevation: elev, moisture, temperature, biome, plantFood, isWater: water };
  });

  return { settings, cols, rows, regions };
}

function randomField(rng: Rng, count: number): number[] {
  return Array.from({ length: count }, () => rng.next());
}

/** Random values blurred across neighbors so they form coherent blobs, then stretched back to 0–1. */
function smoothField(rng: Rng, neighbors: number[][], passes: number): number[] {
  let values = randomField(rng, neighbors.length);
  for (let p = 0; p < passes; p++) {
    values = values.map((v, id) => {
      const ns = neighbors[id]!;
      let sum = v * 2;
      for (const n of ns) sum += values[n]!;
      return sum / (2 + ns.length);
    });
  }
  return normalize(values);
}

function normalize(values: number[]): number[] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min;
  return values.map((v) => (span === 0 ? 0.5 : (v - min) / span));
}
