// How well an animal suits a region, and who can hunt whom. Shared by the
// tick, auto placement and the placement screen's fit labels.

import { ANIMALS, type Animal, type AnimalId } from './data/animals';
import { regionNeighbors, type Region, type World } from './world';

const BY_ID = new Map<AnimalId, Animal>(ANIMALS.map((a) => [a.id, a]));

export function getAnimal(id: AnimalId): Animal {
  const animal = BY_ID.get(id);
  if (!animal) throw new Error(`Unknown animal: ${id}`);
  return animal;
}

/** Temperature range is widened by tolerance; fitness falls to 0 this far outside it. */
const TEMP_FALLOFF = 0.25;
/** Biome score for a biome not in the animal's preferred list. */
const UNLISTED_BIOME = 0.5;

export function temperatureFit(animal: Animal, temperature: number): number {
  const low = 0.55 - 0.6 * animal.coldTolerance;
  const high = 0.45 + 0.6 * animal.heatTolerance;
  const outside = temperature < low ? low - temperature : temperature > high ? temperature - high : 0;
  return Math.max(0, 1 - outside / TEMP_FALLOFF);
}

/**
 * 0 means the animal cannot live there at all (land animal at sea, or the
 * reverse). Shore animals ("both") live on coast, swamp and land next to
 * water, never in open ocean or deep inland.
 */
export function habitatFit(world: World, animal: Animal, region: Region): number {
  if (animal.habitat === 'water') return region.isWater ? 1 : 0;
  if (region.isWater) return 0;
  if (animal.habitat === 'land') return 1;
  if (region.biome === 'coast' || region.biome === 'swamp') return 1;
  return regionNeighbors(world, region.id).some((n) => world.regions[n]!.isWater) ? 0.9 : 0;
}

export function biomeFit(animal: Animal, region: Region): number {
  const index = animal.preferredBiomes.indexOf(region.biome);
  return index < 0 ? UNLISTED_BIOME : 1 - 0.08 * index;
}

/** 0–1: habitat × temperature × biome. */
export function regionFitness(world: World, animal: Animal, regionId: number): number {
  const region = world.regions[regionId]!;
  return habitatFit(world, animal, region) * temperatureFit(animal, region.temperature) * biomeFit(animal, region);
}

export type FitLabel = 'Good fit' | 'Okay fit' | 'Bad fit';

export function fitLabel(fitness: number): FitLabel {
  if (fitness >= 0.65) return 'Good fit';
  if (fitness >= 0.35) return 'Okay fit';
  return 'Bad fit';
}

function huntPower(a: Animal): number {
  return 0.4 * a.attack + 0.35 * a.size + 0.25 * a.speed;
}

function escapePower(a: Animal): number {
  return 0.4 * a.defense + 0.35 * a.size + 0.25 * a.speed;
}

/**
 * How easily `predator` catches `prey`, 0 (can't) to 1. Prey must be smaller
 * and its defense (armor, size, speed) must lose to the predator's attack.
 * Nothing hunts its own species, and human versions don't hunt each other.
 */
export function huntVulnerability(predator: Animal, prey: Animal): number {
  if (predator.diet <= 0 || predator.id === prey.id || prey.size >= predator.size) return 0;
  // The three human versions are one kind of animal: they compete, but don't eat each other.
  if (predator.isHuman && prey.isHuman) return 0;
  const edge = huntPower(predator) - escapePower(prey);
  if (edge <= 0.03) return 0;
  return Math.min(1, edge * 2.5);
}

/**
 * Regions this animal can spread into from `regionId`. Everyone moves to
 * neighbors it can live in; flyers can also hop over one water hex.
 */
export function reachableRegions(world: World, animal: Animal, regionId: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>([regionId]);
  for (const n of regionNeighbors(world, regionId)) {
    seen.add(n);
    if (habitatFit(world, animal, world.regions[n]!) > 0) out.push(n);
  }
  if (animal.flies) {
    for (const n of regionNeighbors(world, regionId)) {
      if (!world.regions[n]!.isWater) continue;
      for (const m of regionNeighbors(world, n)) {
        if (seen.has(m)) continue;
        seen.add(m);
        if (habitatFit(world, animal, world.regions[m]!) > 0) out.push(m);
      }
    }
  }
  return out;
}
