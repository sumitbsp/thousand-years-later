// The shape every map has, whatever made it (the real Earth, or the old hex
// generator). The simulation only ever needs regions and who touches whom.

import type { Biome } from './biomes';

export interface Region {
  /** Index in World.regions. */
  id: number;
  name: string;
  /** 0–1. */
  elevation: number;
  /** 0–1. */
  temperature: number;
  biome: Biome;
  /** 0–1. */
  plantFood: number;
  isWater: boolean;
}

export interface World {
  /** Indexed by id. */
  regions: Region[];
  /** Neighbor ids per region, sorted ascending. Symmetric. */
  neighbors: number[][];
  /**
   * Land regions a flyer can reach by crossing one water region, per region
   * (sorted ascending). Empty for water regions.
   */
  flightHops: number[][];
}

/** Ids of a region's neighbors. */
export function regionNeighbors(world: World, id: number): number[] {
  return world.neighbors[id]!;
}

/**
 * Land regions one water region away, for flyers. `near` can veto a hop (on
 * Earth, a flyer doesn't cross a whole ocean in one go).
 */
export function computeFlightHops(
  regions: readonly Region[],
  neighbors: readonly (readonly number[])[],
  near: (from: number, to: number) => boolean = () => true,
): number[][] {
  return regions.map((region) => {
    if (region.isWater) return [];
    const direct = new Set(neighbors[region.id]!);
    const out = new Set<number>();
    for (const n of neighbors[region.id]!) {
      if (!regions[n]!.isWater) continue;
      for (const m of neighbors[n]!) {
        if (m === region.id || direct.has(m) || regions[m]!.isWater) continue;
        if (near(region.id, m)) out.add(m);
      }
    }
    return [...out].sort((a, b) => a - b);
  });
}
