export type Biome =
  | 'ocean'
  | 'coast'
  | 'ice'
  | 'tundra'
  | 'forest'
  | 'grassland'
  | 'jungle'
  | 'desert'
  | 'swamp'
  | 'mountains'
  | 'volcanic';

/** Fixed display order (legend, iteration). */
export const BIOMES: readonly Biome[] = [
  'ocean',
  'coast',
  'grassland',
  'forest',
  'jungle',
  'swamp',
  'desert',
  'tundra',
  'ice',
  'mountains',
  'volcanic',
];

export const BIOME_NAMES: Record<Biome, string> = {
  ocean: 'Ocean',
  coast: 'Coast',
  ice: 'Ice',
  tundra: 'Tundra',
  forest: 'Forest',
  grassland: 'Grassland',
  jungle: 'Jungle',
  desert: 'Desert',
  swamp: 'Swamp',
  mountains: 'Mountains',
  volcanic: 'Volcanic',
};

/** Base plant food (0–1) for each biome, before moisture adjusts it. */
export const BASE_PLANT_FOOD: Record<Biome, number> = {
  ocean: 0.3,
  coast: 0.4,
  ice: 0.02,
  tundra: 0.2,
  forest: 0.7,
  grassland: 0.6,
  jungle: 0.95,
  desert: 0.08,
  swamp: 0.75,
  mountains: 0.15,
  volcanic: 0.1,
};

export interface BiomeInputs {
  isWater: boolean;
  temperature: number;
  moisture: number;
  /** Height above sea level, 0 at the shoreline and 1 at the highest peak. */
  landHeight: number;
  touchesWater: boolean;
  /** True when this region rolled a volcano (only possible with high chaos). */
  volcano: boolean;
}

export function classifyBiome(b: BiomeInputs): Biome {
  if (b.isWater) return b.temperature < 0.08 ? 'ice' : 'ocean';
  if (b.volcano) return 'volcanic';
  if (b.landHeight > 0.75) return b.temperature < 0.15 ? 'ice' : 'mountains';
  if (b.temperature < 0.12) return 'ice';
  if (b.temperature < 0.3) return 'tundra';
  // Wet, warm lowland is swamp; the wetter it is, the higher the swamp can reach.
  if (b.moisture > 0.8 && b.temperature > 0.4 && b.landHeight < 0.35 + (b.moisture - 0.8) * 2.5) return 'swamp';
  if (b.touchesWater && b.landHeight < 0.2 && b.moisture < 0.7) return 'coast';
  if (b.temperature > 0.6) {
    if (b.moisture > 0.6) return 'jungle';
    if (b.moisture < 0.4) return 'desert';
    return 'grassland';
  }
  if (b.moisture < 0.25) return 'desert';
  if (b.moisture > 0.5) return 'forest';
  return 'grassland';
}
