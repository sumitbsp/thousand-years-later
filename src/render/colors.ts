import type { Biome } from '../sim/biomes';
import type { AnimalId } from '../sim/data/animals';

export const BIOME_COLORS: Record<Biome, string> = {
  ocean: '#1E4E5F',
  coast: '#D8C58E',
  grassland: '#8AA650',
  forest: '#3F6B3A',
  jungle: '#2E7D4F',
  desert: '#D9A95F',
  tundra: '#B9C8C2',
  ice: '#EEF3F2',
  mountains: '#8A8378',
  swamp: '#5E6E3A',
  volcanic: '#8C3B2A',
};

/** Frozen sea (ice biome on a water region), a little bluer than land ice. */
export const SEA_ICE_COLOR = '#C9DCDF';

export const THEME = {
  background: '#0F1A17',
  panel: '#16241F',
  border: '#24352F',
  text: '#EDE6D6',
  accent: '#E8A33D',
  danger: '#F07A5A',
};

/** One distinct color per starting animal, for map dots and population bars. */
export const ANIMAL_COLORS: Record<AnimalId, string> = {
  wolf: '#C9CDD2',
  rabbit: '#E8A33D',
  deer: '#C98B5A',
  bear: '#8E5B3A',
  owl: '#9C8CE0',
  frog: '#A8E05F',
  crocodile: '#4F9A6B',
  penguin: '#6FB7E0',
  elephant: '#B5A79A',
  rat: '#E0C9A0',
  shark: '#4A7FC1',
  lizard: '#F07A5A',
  beetle: '#D45FA0',
  humanWeak: '#F2D16B',
  humanStrong: '#E05F5F',
  humanSmart: '#5FD4C9',
};
