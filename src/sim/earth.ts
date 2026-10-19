// The real Earth as a simulation map: the base regions from data/earthRegions.ts
// with an Earth variant applied (temperature, biomes, sea level, land bridges).
// buildEarthWorld() is a pure function of the variant: the map never depends
// on the seed. It uses only plain data, never the geometry code.

import { BASE_PLANT_FOOD, type Biome } from './biomes';
import { EARTH_TOUCHING } from './data/earthAdjacency';
import { EARTH_REGIONS, STRAITS, WATER_GAPS, WATER_ICE_LINE, type Continent, type Strait } from './data/earthRegions';
import { clamp01 } from './world';
import { computeFlightHops, type Region, type World } from './worldMap';

export type EarthVariantId = 'today' | 'iceAge' | 'hot' | 'drowned' | 'wild';

export interface EarthVariant {
  id: EarthVariantId;
  name: string;
  /** One line for the setup screen. */
  blurb: string;
  /** Added to every region's temperature. */
  temperatureShift: number;
  /** Where the chaos slider starts when the variant is picked. */
  defaultChaos: number;
  /** [region id, new biome], applied in order. Plant food follows the new biome. */
  biomeChanges: readonly (readonly [string, Biome])[];
  /** Land below this elevation that touches the sea floods (becomes sea). */
  floodBelow: number | null;
  /** Extra links on top of the straits, opened by low seas. */
  landBridges: readonly Strait[];
}

export const EARTH_VARIANTS: readonly EarthVariant[] = [
  {
    id: 'today',
    name: "Today's Earth",
    blurb: 'The world as it is',
    temperatureShift: 0,
    defaultChaos: 0.5,
    biomeChanges: [],
    floodBelow: null,
    landBridges: [],
  },
  {
    id: 'iceAge',
    name: 'Ice Age Earth',
    blurb: 'Ice sheets over the north, low seas, land bridges',
    temperatureShift: -0.12,
    defaultChaos: 0.5,
    biomeChanges: [
      ['canada', 'ice'],
      ['scandinavia', 'ice'],
      ['britishIsles', 'ice'],
      ['alaska', 'ice'],
      ['europe', 'tundra'],
      ['easternForests', 'tundra'],
      ['steppe', 'tundra'],
      ['rockies', 'ice'],
    ],
    floodBelow: null,
    landBridges: [
      { name: 'Sahul', between: ['newGuinea', 'easternAustralia'] },
      { name: 'Doggerland', between: ['britishIsles', 'europe'] },
      { name: 'Korea land bridge', between: ['japan', 'eastAsia'] },
    ],
  },
  {
    id: 'hot',
    name: 'Hot Earth',
    blurb: 'Deserts spread, rainforests shrink, the poles melt',
    temperatureShift: 0.12,
    defaultChaos: 0.5,
    biomeChanges: [
      ['sahel', 'desert'],
      ['mexico', 'desert'],
      ['middleEast', 'desert'],
      ['steppe', 'desert'],
      ['greatPlains', 'desert'],
      ['amazonia', 'grassland'],
      ['congo', 'grassland'],
      ['greenland', 'tundra'],
      ['arctic', 'tundra'],
      ['antarctica', 'tundra'],
      ['siberia', 'forest'],
      ['alaska', 'forest'],
    ],
    floodBelow: null,
    landBridges: [],
  },
  {
    id: 'drowned',
    name: 'Drowned Earth',
    blurb: 'High seas: the lowlands are under water',
    temperatureShift: 0.04,
    defaultChaos: 0.5,
    biomeChanges: [
      ['india', 'swamp'],
      ['southeastAsia', 'swamp'],
      ['britishIsles', 'coast'],
    ],
    floodBelow: 0.15,
    landBridges: [],
  },
  {
    id: 'wild',
    name: 'Wild Earth',
    blurb: 'Volcanoes wake up, chaos runs high',
    temperatureShift: 0,
    defaultChaos: 0.9,
    biomeChanges: [
      ['japan', 'volcanic'],
      ['indonesia', 'volcanic'],
      ['andes', 'volcanic'],
      ['newZealand', 'volcanic'],
      ['eastAfrica', 'volcanic'],
    ],
    floodBelow: null,
    landBridges: [],
  },
];

export const DEFAULT_VARIANT: EarthVariant = EARTH_VARIANTS[0]!;

export function getVariant(id: EarthVariantId): EarthVariant {
  const variant = EARTH_VARIANTS.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown Earth variant: ${id}`);
  return variant;
}

export interface EarthRegion extends Region {
  /** Region id from the data ("sahara"). `id` is the numeric index. */
  key: string;
  lon: number;
  lat: number;
  /** Null at sea (including flooded land). */
  continent: Continent | null;
  /** True for land the variant put under water. */
  flooded: boolean;
}

export interface EarthWorld extends World {
  variant: EarthVariantId;
  regions: EarthRegion[];
}

/** Flyers cross one water region only between regions whose centers are this close (km). */
export const FLIGHT_RANGE_KM = 3000;

const INDEX = new Map(EARTH_REGIONS.map((r, i) => [r.id, i]));

/** Numeric region id for a data id ("sahara" → 29). */
export function earthRegionIndex(key: string): number {
  const index = INDEX.get(key);
  if (index === undefined) throw new Error(`Unknown Earth region: ${key}`);
  return index;
}

const cache = new Map<EarthVariantId, EarthWorld>();

/** The map for one Earth variant, built once and frozen (so nobody can change a shared copy). */
export function buildEarthWorld(variantId: EarthVariantId): EarthWorld {
  let world = cache.get(variantId);
  if (!world) {
    world = deepFreeze(createEarthWorld(variantId));
    cache.set(variantId, world);
  }
  return world;
}

/** A fresh, unfrozen map for one Earth variant. */
export function createEarthWorld(variantId: EarthVariantId): EarthWorld {
  const variant = getVariant(variantId);
  const biomeChange = new Map(variant.biomeChanges);
  const touchingSea = new Set<number>();
  for (const [a, b] of EARTH_TOUCHING) {
    const ia = earthRegionIndex(a);
    const ib = earthRegionIndex(b);
    if (EARTH_REGIONS[ia]!.isWater) touchingSea.add(ib);
    if (EARTH_REGIONS[ib]!.isWater) touchingSea.add(ia);
  }

  const regions: EarthRegion[] = EARTH_REGIONS.map((data, id) => {
    const temperature = clamp01(data.temperature + variant.temperatureShift);
    const flooded =
      !data.isWater && variant.floodBelow !== null && data.elevation < variant.floodBelow && touchingSea.has(id);
    const isWater = data.isWater || flooded;
    const changed = biomeChange.get(data.id);
    let biome: Biome = data.biome;
    let plantFood = data.plantFood;
    if (isWater) {
      // Sea freezes or thaws with the temperature; flooded land becomes plain sea.
      biome = temperature < WATER_ICE_LINE ? 'ice' : 'ocean';
      if (flooded || biome !== data.biome) plantFood = BASE_PLANT_FOOD.ocean;
    } else if (changed && changed !== data.biome) {
      biome = changed;
      plantFood = BASE_PLANT_FOOD[changed];
    }
    return {
      id,
      key: data.id,
      name: data.name,
      lon: data.center[0],
      lat: data.center[1],
      continent: isWater ? null : data.continent,
      flooded,
      elevation: data.elevation,
      temperature,
      biome,
      plantFood,
      isWater,
    };
  });

  // Land touching land on another continent doesn't count, nor across a
  // water gap; straits and bridges are the only crossings.
  const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const gaps = new Set(WATER_GAPS.map((g) => pairKey(earthRegionIndex(g.between[0]), earthRegionIndex(g.between[1]))));
  const links = new Set<string>();
  const link = (a: number, b: number) => links.add(pairKey(a, b));
  for (const [a, b] of EARTH_TOUCHING) {
    const ra = EARTH_REGIONS[earthRegionIndex(a)]!;
    const rb = EARTH_REGIONS[earthRegionIndex(b)]!;
    if (ra.continent && rb.continent && ra.continent !== rb.continent) continue;
    if (gaps.has(pairKey(earthRegionIndex(a), earthRegionIndex(b)))) continue;
    link(earthRegionIndex(a), earthRegionIndex(b));
  }
  for (const strait of [...STRAITS, ...variant.landBridges]) {
    link(earthRegionIndex(strait.between[0]), earthRegionIndex(strait.between[1]));
  }
  const neighbors: number[][] = regions.map(() => []);
  for (const key of [...links].sort()) {
    const [a, b] = key.split('-').map(Number) as [number, number];
    neighbors[a]!.push(b);
    neighbors[b]!.push(a);
  }
  for (const list of neighbors) list.sort((x, y) => x - y);

  const flightHops = computeFlightHops(
    regions,
    neighbors,
    (from, to) => greatCircleKm(regions[from]!, regions[to]!) <= FLIGHT_RANGE_KM,
  );
  return { variant: variantId, regions, neighbors, flightHops };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const EARTH_RADIUS_KM = 6371;

/** Distance between two region centers along the Earth's surface. */
export function greatCircleKm(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
