// The starting roster as plain data. No logic here, so animals are easy to
// tune and add. All stats are 0–1. Reasoning for the numbers: DECISIONS.md.

import type { Biome } from '../biomes';

export type AnimalId =
  | 'wolf'
  | 'rabbit'
  | 'deer'
  | 'bear'
  | 'owl'
  | 'frog'
  | 'crocodile'
  | 'penguin'
  | 'elephant'
  | 'rat'
  | 'shark'
  | 'lizard'
  | 'beetle'
  | 'humanWeak'
  | 'humanStrong'
  | 'humanSmart';

export type Habitat = 'land' | 'water' | 'both';

export interface Animal {
  id: AnimalId;
  name: string;
  /** Short label for tokens and cards ("Wo", "H·s"). */
  short: string;
  /** Short role tag shown on the card. */
  role: string;
  size: number;
  speed: number;
  attack: number;
  defense: number;
  /** 0 = plants only, 1 = meat only. */
  diet: number;
  heatTolerance: number;
  coldTolerance: number;
  habitat: Habitat;
  /** Flyers can cross one water hex when spreading. */
  flies: boolean;
  breedingRate: number;
  /** Food each unit of population needs per tick. */
  foodNeed: number;
  /** Best first. Used by auto placement and fitness. */
  preferredBiomes: readonly Biome[];
  /** Chance bonus for helpful mutations (used from step 3). */
  mutationLuck: number;
  isHuman: boolean;
}

const BASE_LUCK = 0.1;

export const ANIMALS: readonly Animal[] = [
  {
    id: 'wolf', name: 'Wolf', short: 'Wo', role: 'Pack hunter',
    size: 0.45, speed: 0.7, attack: 0.7, defense: 0.4, diet: 0.9,
    heatTolerance: 0.4, coldTolerance: 0.75, habitat: 'land', flies: false,
    breedingRate: 0.4, foodNeed: 0.5,
    preferredBiomes: ['forest', 'grassland', 'tundra', 'mountains'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'rabbit', name: 'Rabbit', short: 'Ra', role: 'Fast breeder',
    size: 0.12, speed: 0.8, attack: 0.05, defense: 0.1, diet: 0,
    heatTolerance: 0.45, coldTolerance: 0.55, habitat: 'land', flies: false,
    breedingRate: 0.7, foodNeed: 0.12,
    preferredBiomes: ['grassland', 'forest', 'tundra', 'coast'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'deer', name: 'Deer', short: 'De', role: 'Grazer',
    size: 0.4, speed: 0.75, attack: 0.15, defense: 0.25, diet: 0,
    heatTolerance: 0.45, coldTolerance: 0.55, habitat: 'land', flies: false,
    breedingRate: 0.3, foodNeed: 0.4,
    preferredBiomes: ['forest', 'grassland', 'jungle'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'bear', name: 'Bear', short: 'Be', role: 'Omnivore',
    size: 0.75, speed: 0.45, attack: 0.8, defense: 0.7, diet: 0.5,
    heatTolerance: 0.25, coldTolerance: 0.7, habitat: 'land', flies: false,
    breedingRate: 0.18, foodNeed: 0.75,
    preferredBiomes: ['forest', 'tundra', 'mountains', 'grassland'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'owl', name: 'Owl', short: 'Ow', role: 'Flyer',
    size: 0.18, speed: 0.85, attack: 0.55, defense: 0.2, diet: 1,
    heatTolerance: 0.45, coldTolerance: 0.55, habitat: 'land', flies: true,
    breedingRate: 0.45, foodNeed: 0.25,
    preferredBiomes: ['forest', 'jungle', 'grassland', 'tundra'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'frog', name: 'Frog', short: 'Fr', role: 'Amphibian',
    size: 0.08, speed: 0.4, attack: 0.1, defense: 0.1, diet: 0.6,
    heatTolerance: 0.65, coldTolerance: 0.3, habitat: 'both', flies: false,
    breedingRate: 0.8, foodNeed: 0.1,
    preferredBiomes: ['swamp', 'jungle', 'coast', 'forest'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'crocodile', name: 'Crocodile', short: 'Cr', role: 'Ambusher',
    size: 0.7, speed: 0.35, attack: 0.85, defense: 0.8, diet: 1,
    heatTolerance: 0.8, coldTolerance: 0.1, habitat: 'both', flies: false,
    breedingRate: 0.25, foodNeed: 0.5,
    preferredBiomes: ['swamp', 'coast', 'jungle', 'ocean'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'penguin', name: 'Penguin', short: 'Pe', role: 'Cold swimmer',
    size: 0.3, speed: 0.5, attack: 0.2, defense: 0.3, diet: 0.9,
    heatTolerance: 0.05, coldTolerance: 1, habitat: 'both', flies: false,
    breedingRate: 0.4, foodNeed: 0.3,
    preferredBiomes: ['ice', 'coast', 'tundra', 'ocean'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'elephant', name: 'Elephant', short: 'El', role: 'Giant grazer',
    size: 1, speed: 0.3, attack: 0.5, defense: 0.95, diet: 0,
    heatTolerance: 0.7, coldTolerance: 0.3, habitat: 'land', flies: false,
    breedingRate: 0.14, foodNeed: 0.7,
    preferredBiomes: ['grassland', 'jungle', 'forest'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'rat', name: 'Rat', short: 'Rt', role: 'Survivor',
    size: 0.06, speed: 0.6, attack: 0.1, defense: 0.05, diet: 0.5,
    heatTolerance: 0.6, coldTolerance: 0.55, habitat: 'land', flies: false,
    breedingRate: 0.68, foodNeed: 0.08,
    preferredBiomes: ['grassland', 'forest', 'coast', 'swamp', 'jungle', 'desert'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'shark', name: 'Shark', short: 'Sk', role: 'Ocean hunter',
    size: 0.85, speed: 0.8, attack: 0.95, defense: 0.6, diet: 1,
    heatTolerance: 0.6, coldTolerance: 0.4, habitat: 'water', flies: false,
    breedingRate: 0.2, foodNeed: 0.6,
    preferredBiomes: ['ocean', 'ice'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'lizard', name: 'Lizard', short: 'Li', role: 'Heat lover',
    size: 0.1, speed: 0.6, attack: 0.2, defense: 0.25, diet: 0.4,
    heatTolerance: 0.95, coldTolerance: 0.05, habitat: 'land', flies: false,
    breedingRate: 0.6, foodNeed: 0.1,
    preferredBiomes: ['desert', 'jungle', 'grassland', 'volcanic', 'coast'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'beetle', name: 'Beetle', short: 'Bt', role: 'Armored swarm',
    size: 0.03, speed: 0.25, attack: 0.05, defense: 0.6, diet: 0,
    heatTolerance: 0.65, coldTolerance: 0.35, habitat: 'land', flies: false,
    breedingRate: 0.9, foodNeed: 0.05,
    preferredBiomes: ['jungle', 'forest', 'grassland', 'swamp', 'desert'],
    mutationLuck: BASE_LUCK, isHuman: false,
  },
  {
    id: 'humanWeak', name: 'Weak humans', short: 'H·w', role: 'Many, small',
    size: 0.35, speed: 0.45, attack: 0.25, defense: 0.2, diet: 0.5,
    heatTolerance: 0.5, coldTolerance: 0.45, habitat: 'land', flies: false,
    breedingRate: 0.42, foodNeed: 0.5,
    preferredBiomes: ['grassland', 'coast', 'forest', 'jungle'],
    mutationLuck: BASE_LUCK, isHuman: true,
  },
  {
    id: 'humanStrong', name: 'Strong humans', short: 'H·s', role: 'Big, hungry',
    size: 0.6, speed: 0.5, attack: 0.75, defense: 0.65, diet: 0.4,
    heatTolerance: 0.45, coldTolerance: 0.45, habitat: 'land', flies: false,
    breedingRate: 0.32, foodNeed: 0.85,
    preferredBiomes: ['grassland', 'forest', 'coast'],
    mutationLuck: BASE_LUCK, isHuman: true,
  },
  {
    id: 'humanSmart', name: 'Smart humans', short: 'H·i', role: 'Adaptable',
    size: 0.45, speed: 0.4, attack: 0.2, defense: 0.2, diet: 0.5,
    heatTolerance: 0.85, coldTolerance: 0.85, habitat: 'land', flies: false,
    breedingRate: 0.25, foodNeed: 0.4,
    preferredBiomes: ['grassland', 'coast', 'forest', 'tundra', 'desert'],
    mutationLuck: 0.3, isHuman: true,
  },
];

export const ANIMAL_IDS: readonly AnimalId[] = ANIMALS.map((a) => a.id);
