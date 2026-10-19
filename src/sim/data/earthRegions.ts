// The real Earth as plain data: named regions, their climate, and the straits
// that join continents. Shapes come from Voronoi cells around each region's
// sites, clipped to land (land regions) or sea (sea regions); see
// src/sim/geo/earthGeometry.ts. Which regions touch is precomputed into
// earthAdjacency.ts by `npm run earth`.
//
// Temperature is 0–1 on the same scale the animals' tolerances use: about
// (mean °C + 25) / 55, so 0.5 is a mild 2–3 °C average and 1 is the Sahara.

import type { Biome } from '../biomes';

export type Continent = 'americas' | 'eurasia' | 'africa' | 'australia' | 'antarctica';

/** [longitude, latitude] in degrees. */
export type LonLat = readonly [number, number];

export interface EarthRegionData {
  id: string;
  name: string;
  /** Where the label and tokens go. Also the region's first Voronoi site. Must be inside the region. */
  center: LonLat;
  /** More Voronoi sites, for regions whose shape one point can't describe (long coasts, oceans). */
  sites?: readonly LonLat[];
  /** Sea regions own the sea, land regions the land. Variants can still flood a land region. */
  isWater: boolean;
  /** Land regions on different continents only meet across STRAITS. Null at sea. */
  continent: Continent | null;
  biome: Biome;
  temperature: number;
  /** 0 = sea level, 1 = the Himalaya. Drowned Earth floods the lowest coastal land. */
  elevation: number;
  plantFood: number;
}

const land = (
  id: string,
  name: string,
  continent: Continent,
  center: LonLat,
  biome: Biome,
  temperature: number,
  elevation: number,
  plantFood: number,
  sites?: LonLat[],
): EarthRegionData => ({ id, name, center, sites, isWater: false, continent, biome, temperature, elevation, plantFood });

const sea = (id: string, name: string, center: LonLat, temperature: number, plantFood: number, sites?: LonLat[]): EarthRegionData => ({
  id,
  name,
  center,
  sites,
  isWater: true,
  continent: null,
  biome: temperature < WATER_ICE_LINE ? 'ice' : 'ocean',
  temperature,
  elevation: 0,
  plantFood,
});

/** Water colder than this freezes over (biome ice, still water). Same line as the hex generator. */
export const WATER_ICE_LINE = 0.08;

export const EARTH_REGIONS: readonly EarthRegionData[] = [
  // North and Central America
  land('alaska', 'Alaska', 'americas', [-152, 64], 'tundra', 0.25, 0.45, 0.22, [[-135, 66]]),
  land('arctic', 'The Arctic', 'americas', [-110, 71], 'ice', 0.08, 0.25, 0.03, [[-80, 78]]),
  land('canada', 'Canadian Forest', 'americas', [-100, 56], 'forest', 0.33, 0.3, 0.55, [[-72, 53]]),
  land('greenland', 'Greenland', 'americas', [-41, 73], 'ice', 0.04, 0.7, 0.02, [[-19, 65]]),
  land('rockies', 'The Rockies', 'americas', [-114, 45], 'mountains', 0.42, 0.8, 0.2, [[-123, 55]]),
  land('greatPlains', 'Great Plains', 'americas', [-99, 40], 'grassland', 0.58, 0.35, 0.6),
  land('easternForests', 'Eastern Forests', 'americas', [-81, 39], 'forest', 0.62, 0.25, 0.7),
  land('gulfCoast', 'Gulf Coast', 'americas', [-88, 31], 'swamp', 0.75, 0.05, 0.75, [[-81, 28]]),
  land('mexico', 'Mexico', 'americas', [-102, 23], 'grassland', 0.8, 0.45, 0.45),
  land('centralAmerica', 'Central America', 'americas', [-87, 15], 'jungle', 0.9, 0.3, 0.9),
  // South America
  land('amazonia', 'Amazonia', 'americas', [-62, -4], 'jungle', 0.93, 0.1, 1, [[-48, -9]]),
  land('andes', 'The Andes', 'americas', [-71, -16], 'mountains', 0.35, 0.9, 0.18, [[-76, 3]]),
  land('pampas', 'The Pampas', 'americas', [-62, -33], 'grassland', 0.62, 0.12, 0.65),
  land('patagonia', 'Patagonia', 'americas', [-69, -46], 'grassland', 0.36, 0.3, 0.35),
  // Europe
  land('britishIsles', 'British Isles', 'eurasia', [-2, 53], 'forest', 0.57, 0.2, 0.65, [[-1, 52]]),
  land('scandinavia', 'Scandinavia', 'eurasia', [16, 64], 'forest', 0.36, 0.4, 0.5, [[9, 61]]),
  land('europe', 'Europe', 'eurasia', [8, 48], 'forest', 0.6, 0.3, 0.7, [[23, 51], [2.5, 49]]),
  land('southernEurope', 'Southern Europe', 'eurasia', [14, 42], 'coast', 0.7, 0.4, 0.5, [[-4, 40]]),
  // Asia
  land('steppe', 'The Steppe', 'eurasia', [58, 47], 'grassland', 0.45, 0.3, 0.5, [[38, 51]]),
  land('siberia', 'Siberia', 'eurasia', [100, 63], 'tundra', 0.2, 0.3, 0.25, [[65, 63], [48, 66], [135, 64], [172, 66], [142, 49]]),
  land('middleEast', 'Middle East', 'eurasia', [41, 34], 'grassland', 0.75, 0.35, 0.4, [[33, 39]]),
  land('arabia', 'Arabia', 'eurasia', [47, 22], 'desert', 0.97, 0.3, 0.06, [[44, 18]]),
  land('himalaya', 'The Himalaya', 'eurasia', [86, 32], 'mountains', 0.15, 1, 0.12),
  land('gobi', 'The Gobi', 'eurasia', [103, 44], 'desert', 0.35, 0.5, 0.1),
  land('india', 'India', 'eurasia', [78, 21], 'grassland', 0.9, 0.2, 0.8, [[89, 23]]),
  land('eastAsia', 'East Asia', 'eurasia', [113, 30], 'forest', 0.66, 0.3, 0.75, [[128, 45]]),
  land('japan', 'Japan', 'eurasia', [139, 36], 'forest', 0.6, 0.4, 0.7),
  land('southeastAsia', 'Southeast Asia', 'eurasia', [102, 16], 'jungle', 0.9, 0.2, 0.95),
  land('indonesia', 'Indonesia', 'eurasia', [114, -1], 'jungle', 0.93, 0.2, 0.95, [[123, -4], [122, 11]]),
  // Africa
  land('sahara', 'Sahara', 'africa', [8, 24], 'desert', 0.98, 0.25, 0.05, [[26, 25], [-8, 28]]),
  land('sahel', 'The Sahel', 'africa', [5, 13], 'grassland', 0.93, 0.25, 0.4, [[33, 16]]),
  land('congo', 'Congo', 'africa', [21, 0], 'jungle', 0.92, 0.25, 1, [[11, 4]]),
  land('eastAfrica', 'East Africa', 'africa', [37, 1], 'grassland', 0.85, 0.55, 0.7, [[39, 12]]),
  land('kalahari', 'Kalahari', 'africa', [22, -23], 'desert', 0.82, 0.4, 0.12, [[34, -18]]),
  land('madagascar', 'Madagascar', 'africa', [46.5, -19], 'jungle', 0.85, 0.3, 0.85),
  // Australia and the Pacific
  land('outback', 'The Outback', 'australia', [132, -24], 'desert', 0.9, 0.25, 0.1, [[128, -17]]),
  land('easternAustralia', 'Eastern Australia', 'australia', [147, -30], 'forest', 0.72, 0.3, 0.6, [[143, -14]]),
  land('newGuinea', 'New Guinea', 'australia', [144, -5.5], 'jungle', 0.92, 0.4, 0.95),
  land('newZealand', 'New Zealand', 'australia', [172, -42], 'forest', 0.55, 0.35, 0.7),
  // Antarctica
  land('antarctica', 'Antarctica', 'antarctica', [40, -76], 'ice', 0, 0.8, 0.01, [
    [-150, -78], [-90, -78], [-30, -78], [90, -78], [150, -78], [-63, -68],
  ]),

  // Oceans and seas
  sea('arcticOcean', 'Arctic Ocean', [40, 80], 0.05, 0.12, [[-150, 78], [-118, 75], [-85, 75], [0, 80], [100, 80], [150, 77]]),
  sea('northAtlantic', 'North Atlantic', [-40, 40], 0.45, 0.3, [[-65, 37], [-25, 58], [2, 57], [18, 58], [-25, 18], [-8, 45]]),
  sea('southAtlantic', 'South Atlantic', [-15, -30], 0.55, 0.3, [[3, -2], [-50, -40], [8, -30]]),
  sea('caribbean', 'Caribbean Sea', [-75, 15], 0.88, 0.35, [[-90, 25]]),
  sea('mediterranean', 'Mediterranean Sea', [18, 35], 0.7, 0.3, [[3, 39], [35, 43]]),
  sea('northPacific', 'North Pacific', [-155, 30], 0.45, 0.3, [[165, 40], [-135, 48], [-120, 20], [-105, 15], [-97, 12]]),
  sea('southPacific', 'South Pacific', [-120, -30], 0.6, 0.25, [[-90, 2], [-160, -15], [-80, -30]]),
  sea('coralSea', 'Coral Sea', [158, -20], 0.8, 0.4),
  sea('indianOcean', 'Indian Ocean', [75, -25], 0.75, 0.3, [[88, 5], [110, -30], [130, -38], [42, -20]]),
  sea('arabianSea', 'Arabian Sea', [64, 14], 0.88, 0.3, [[39, 19]]),
  sea('southChinaSea', 'South China Sea', [114, 13], 0.9, 0.35, [[125, 0]]),
  sea('southernOcean', 'Southern Ocean', [0, -58], 0.12, 0.35, [
    [-150, -62], [-90, -62], [-30, -60], [30, -58], [90, -58], [150, -60],
  ]),
];

export interface Strait {
  name: string;
  /** Region ids. */
  between: readonly [string, string];
}

/**
 * Links that exist on every Earth variant even though the shapes don't touch
 * (or touch on another continent). Land straits are the only places land
 * animals cross between continents; the Southeast Asia–Australia chain is
 * three hops. The one sea link is a passage narrower than the adjacency grid.
 */
export const STRAITS: readonly Strait[] = [
  { name: 'Bering Strait', between: ['siberia', 'alaska'] },
  { name: 'Strait of Gibraltar', between: ['southernEurope', 'sahara'] },
  { name: 'Sinai', between: ['middleEast', 'sahara'] },
  { name: 'Strait of Malacca', between: ['southeastAsia', 'indonesia'] },
  { name: 'Wallace Line', between: ['indonesia', 'newGuinea'] },
  { name: 'Timor Sea', between: ['indonesia', 'outback'] },
  { name: 'Strait of Gibraltar', between: ['northAtlantic', 'mediterranean'] },
];

/**
 * Islands that never touch the mainland by land, even where their shapes
 * spill across a narrow sea onto the far shore. Ice Age bridges can still
 * join them.
 */
export const WATER_GAPS: readonly Strait[] = [
  { name: 'English Channel', between: ['britishIsles', 'europe'] },
  { name: 'Sea of Japan', between: ['japan', 'eastAsia'] },
  { name: 'La Pérouse Strait', between: ['japan', 'siberia'] },
];
