import type { WorldSettings } from './world';

export type ClimateSettings = Omit<WorldSettings, 'seed'>;

export interface Preset {
  id: string;
  name: string;
  climate: ClimateSettings;
}

export const PRESETS: readonly Preset[] = [
  { id: 'mixed', name: 'Mixed', climate: { temperature: 0.55, rainfall: 0.5, seaLevel: 0.4, chaos: 0.5 } },
  { id: 'ice', name: 'Ice World', climate: { temperature: 0.2, rainfall: 0.4, seaLevel: 0.4, chaos: 0.3 } },
  { id: 'jungle', name: 'Jungle', climate: { temperature: 0.9, rainfall: 0.85, seaLevel: 0.35, chaos: 0.3 } },
  { id: 'desert', name: 'Desert', climate: { temperature: 0.85, rainfall: 0.05, seaLevel: 0.2, chaos: 0.3 } },
  { id: 'archipelago', name: 'Archipelago', climate: { temperature: 0.6, rainfall: 0.6, seaLevel: 0.6, chaos: 0.5 } },
  { id: 'volcanic', name: 'Volcanic', climate: { temperature: 0.6, rainfall: 0.4, seaLevel: 0.35, chaos: 0.9 } },
  { id: 'swamp', name: 'Swamp', climate: { temperature: 0.65, rainfall: 1, seaLevel: 0.4, chaos: 0.3 } },
];

export const DEFAULT_PRESET: Preset = PRESETS[0]!;
