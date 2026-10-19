// Earth geometry: land outlines, region shapes, adjacency and "which region is
// here". Pure and deterministic, but heavy, so the tick never imports it: the
// simulation only needs the precomputed adjacency in data/earthAdjacency.ts.
// Used by `npm run earth` (to build that file), its test, and the renderer.
//
// All shapes live in a flat lon/lat plane (equirectangular), which wraps at
// ±180°. Each region owns the land (or sea) closer to one of its sites than to
// any other land (or sea) region's site, so a land region's shape is its
// Voronoi cell clipped to land and a sea region's is its cell clipped to sea.

import { Delaunay } from 'd3-delaunay';
import type { Feature, MultiPolygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json' with { type: 'json' };
import type { EarthRegionData, LonLat } from '../data/earthRegions';

type Ring = [number, number][];

let landCache: { feature: Feature<MultiPolygon>; rings: Ring[] } | null = null;

function loadLand() {
  if (landCache) return landCache;
  const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
  const collection = feature(topology, topology.objects.land);
  const geometry = collection.features[0]!.geometry as MultiPolygon;
  // Rings that cross the antimeridian jump from +180 to −180; unwrap them so
  // every edge is short, and let callers shift by ±360 to wrap.
  const rings: Ring[] = [];
  for (const polygon of geometry.coordinates) {
    for (const ring of polygon) {
      let offset = 0;
      let prev = ring[0]![0]!;
      rings.push(
        ring.map(([lon, lat]) => {
          if (lon! - prev > 180) offset -= 360;
          else if (prev - lon! > 180) offset += 360;
          prev = lon!;
          return [lon! + offset, lat!];
        }),
      );
    }
  }
  landCache = { feature: { type: 'Feature', properties: {}, geometry }, rings };
  return landCache;
}

/** Natural Earth 1:110m land as GeoJSON (for drawing with d3-geo). */
export function landFeature(): Feature<MultiPolygon> {
  return loadLand().feature;
}

/** True if the point is on land (even-odd rule over all land rings, holes included). */
export function isLand(lon: number, lat: number): boolean {
  let inside = false;
  for (const ring of loadLand().rings) {
    for (const shift of [-360, 0, 360]) {
      const x = lon + shift;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!;
        const [xj, yj] = ring[j]!;
        if (yi > lat !== yj > lat && x < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * Land mask on a grid of `step`-degree cells covering the globe. Cell (i, j)
 * is centered at lon −180 + (i + ½)·step, lat 90 − (j + ½)·step.
 */
export function landMask(step: number): { cols: number; rows: number; land: Uint8Array } {
  const cols = Math.round(360 / step);
  const rows = Math.round(180 / step);
  const land = new Uint8Array(cols * rows);
  const rings = loadLand().rings;
  for (let j = 0; j < rows; j++) {
    const lat = 90 - (j + 0.5) * step;
    for (const ring of rings) {
      // Where this ring crosses the row; between pairs of crossings is inside.
      const xs: number[] = [];
      for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
        const [xi, yi] = ring[i]!;
        const [xk, yk] = ring[k]!;
        if (yi > lat !== yk > lat) xs.push(((xk - xi) * (lat - yi)) / (yk - yi) + xi);
      }
      xs.sort((a, b) => a - b);
      for (let p = 0; p + 1 < xs.length; p += 2) {
        for (const shift of [-720, -360, 0, 360, 720]) {
          const from = Math.max(0, Math.ceil((xs[p]! + shift + 180) / step - 0.5));
          const to = Math.min(cols - 1, Math.floor((xs[p + 1]! + shift + 180) / step - 0.5));
          // XOR, so a lake ring inside a continent ring cuts a hole.
          for (let i = from; i <= to; i++) land[j * cols + i]! ^= 1;
        }
      }
    }
  }
  return { cols, rows, land };
}

export interface Site {
  /** Index into the regions list. */
  region: number;
  lon: number;
  lat: number;
}

/** Every Voronoi site, in region order (center first, then extra sites). */
export function regionSites(regions: readonly EarthRegionData[]): Site[] {
  return regions.flatMap((r, region) =>
    [r.center, ...(r.sites ?? [])].map(([lon, lat]: LonLat) => ({ region, lon, lat })),
  );
}

/** Squared distance in the flat lon/lat plane, wrapping at ±180°. */
function distance2(lon: number, lat: number, site: Site): number {
  const dx = Math.abs(lon - site.lon);
  const wrapped = Math.min(dx, 360 - dx);
  const dy = lat - site.lat;
  return wrapped * wrapped + dy * dy;
}

/** The region of the nearest site; ties go to the earlier site. */
export function nearestSite(sites: readonly Site[], lon: number, lat: number): number {
  let best = -1;
  let bestD = Infinity;
  for (const site of sites) {
    const d = distance2(lon, lat, site);
    if (d < bestD) {
      bestD = d;
      best = site.region;
    }
  }
  return best;
}

/** Grid resolution (degrees) for adjacency. Fine enough for narrow land links like Panama. */
export const ADJACENCY_STEP = 0.25;

/** Shapes must share at least this many grid edges to count as touching, so a speck of island doesn't link two regions. */
export const MIN_CONTACT = 4;

export interface Contact {
  /** Region ids, the earlier region first. */
  between: [string, string];
  /** Shared grid edges (about ADJACENCY_STEP degrees each). */
  length: number;
  /** One place where they touch, [lon, lat]. */
  at: [number, number];
}

/**
 * Every pair of regions whose shapes touch, in region order. Land touching
 * land, land touching sea and sea touching sea all count; continents and
 * straits are applied later (earth.ts).
 */
export function computeContacts(regions: readonly EarthRegionData[], step = ADJACENCY_STEP): Contact[] {
  const { cols, rows, land } = landMask(step);
  const sites = regionSites(regions);
  const landSites = sites.filter((s) => !regions[s.region]!.isWater);
  const seaSites = sites.filter((s) => regions[s.region]!.isWater);
  const owner = new Int16Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    const lat = 90 - (j + 0.5) * step;
    for (let i = 0; i < cols; i++) {
      const lon = -180 + (i + 0.5) * step;
      owner[j * cols + i] = nearestSite(land[j * cols + i] ? landSites : seaSites, lon, lat);
    }
  }
  const n = regions.length;
  const length = new Int32Array(n * n);
  const at: ([number, number] | undefined)[] = [];
  const mark = (a: number, b: number, i: number, j: number) => {
    if (a === b) return;
    const k = Math.min(a, b) * n + Math.max(a, b);
    length[k]!++;
    at[k] ??= [-180 + (i + 0.5) * step, 90 - (j + 0.5) * step];
  };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const here = owner[j * cols + i]!;
      mark(here, owner[j * cols + ((i + 1) % cols)]!, i, j);
      if (j + 1 < rows) mark(here, owner[(j + 1) * cols + i]!, i, j);
    }
  }
  const contacts: Contact[] = [];
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const k = a * n + b;
      if (length[k]! > 0) contacts.push({ between: [regions[a]!.id, regions[b]!.id], length: length[k]!, at: at[k]! });
    }
  }
  return contacts;
}

/** Pairs of regions whose shapes touch along at least MIN_CONTACT grid edges, in region order. */
export function computeTouching(regions: readonly EarthRegionData[], step = ADJACENCY_STEP): [string, string][] {
  return computeContacts(regions, step)
    .filter((c) => c.length >= MIN_CONTACT)
    .map((c) => c.between);
}

/** Sites plus copies one world-width left and right, so cells wrap at ±180°. */
function wrappedPoints(sites: readonly Site[]): number[] {
  const points: number[] = [];
  for (const shift of [0, -360, 360]) for (const s of sites) points.push(s.lon + shift, s.lat);
  return points;
}

/**
 * Each region's Voronoi cells in lon/lat, inside [−180, 180] × [−90, 90].
 * Land and sea regions are separate diagrams: clip land cells to land and sea
 * cells to sea when drawing. A region can have several polygons (extra sites,
 * and cells that wrap around the edge of the map).
 */
export function regionCells(regions: readonly EarthRegionData[]): LonLat[][][] {
  const cells: LonLat[][][] = regions.map(() => []);
  const sites = regionSites(regions);
  for (const water of [false, true]) {
    const group = sites.filter((s) => regions[s.region]!.isWater === water);
    const voronoi = Delaunay.from(chunk(wrappedPoints(group))).voronoi([-180, -90, 180, 90]);
    for (let k = 0; k < group.length * 3; k++) {
      const polygon = voronoi.cellPolygon(k);
      if (polygon) cells[group[k % group.length]!.region]!.push(polygon.map(([x, y]) => [x!, y!] as const));
    }
  }
  return cells;
}

/** Nearest-region lookup: land points go to the nearest land region, sea points to the nearest sea region. */
export function createRegionLocator(regions: readonly EarthRegionData[]): (lon: number, lat: number) => number {
  const sites = regionSites(regions);
  const lookups = [false, true].map((water) => {
    const group = sites.filter((s) => regions[s.region]!.isWater === water);
    return { group, delaunay: Delaunay.from(chunk(wrappedPoints(group))) };
  });
  return (lon, lat) => {
    const { group, delaunay } = lookups[isLand(lon, lat) ? 0 : 1]!;
    return group[delaunay.find(lon, lat) % group.length]!.region;
  };
}

function chunk(flat: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i]!, flat[i + 1]!]);
  return out;
}
