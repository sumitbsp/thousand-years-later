import type { Biome } from './biomes';
import type { WorldSettings } from './world';

export type ClimateSettings = Omit<WorldSettings, 'seed'>;

export interface Preset {
  id: string;
  name: string;
  climate: ClimateSettings;
  /** The biome this preset is known for; a test checks it is common. */
  mainBiome: Biome;
}

export const PRESETS: readonly Preset[] = [
  { id: 'mixed', name: 'Mixed', climate: { temperature: 0.62, rainfall: 0.38, seaLevel: 0.4, chaos: 0.5 }, mainBiome: 'grassland' },
  { id: 'ice', name: 'Ice World', climate: { temperature: 0.2, rainfall: 0.4, seaLevel: 0.4, chaos: 0.3 }, mainBiome: 'ice' },
  { id: 'jungle', name: 'Jungle', climate: { temperature: 0.95, rainfall: 0.8, seaLevel: 0.3, chaos: 0.3 }, mainBiome: 'jungle' },
  { id: 'desert', name: 'Desert', climate: { temperature: 0.85, rainfall: 0.05, seaLevel: 0.2, chaos: 0.3 }, mainBiome: 'desert' },
  { id: 'archipelago', name: 'Archipelago', climate: { temperature: 0.6, rainfall: 0.6, seaLevel: 0.5, chaos: 0.5 }, mainBiome: 'ocean' },
  { id: 'volcanic', name: 'Volcanic', climate: { temperature: 0.6, rainfall: 0.4, seaLevel: 0.35, chaos: 0.9 }, mainBiome: 'volcanic' },
  { id: 'swamp', name: 'Swamp', climate: { temperature: 0.65, rainfall: 1, seaLevel: 0.4, chaos: 0.3 }, mainBiome: 'swamp' },
];

export const DEFAULT_PRESET: Preset = PRESETS[0]!;
