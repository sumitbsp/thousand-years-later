// Draws the Earth map onto a canvas: flat biome colors, region outlines and
// the coastline (the storybook style comes in step 2.5b). Reads world state
// only; never modifies it.
//
// The projection is equirectangular (x = longitude, y = latitude), the same
// flat plane the region shapes are built in, so cells drawn here match the
// regions the sim uses.

import { geoEquirectangular, geoPath } from 'd3-geo';
import { EARTH_REGIONS, type LonLat } from '../sim/data/earthRegions';
import type { EarthWorld } from '../sim/earth';
import { createRegionLocator, landFeature, regionCells } from '../sim/geo/earthGeometry';
import { BIOME_COLORS, SEA_ICE_COLOR, THEME } from './colors';

/** Visible latitudes: the far north and the Antarctic interior are cropped. */
const LAT_TOP = 84;
const LAT_BOTTOM = -80;

/** How the map fits onto the canvas, in CSS pixels. */
export interface MapLayout {
  /** Pixels per degree. */
  scale: number;
  /** Canvas position of lon −180, lat LAT_TOP. */
  originX: number;
  originY: number;
  /** A typical region's size in pixels (token and dot sizes scale with it). */
  size: number;
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
}

// Shapes and lookups depend only on the fixed region list, so build them once.
let geometry: { cells: LonLat[][][]; locate: (lon: number, lat: number) => number } | null = null;
function earthGeometry() {
  geometry ??= { cells: regionCells(EARTH_REGIONS), locate: createRegionLocator(EARTH_REGIONS) };
  return geometry;
}

/** Fits the whole map inside width × height, centered. */
export function computeLayout(width: number, height: number, padding = 4): MapLayout {
  const scale = Math.max(0.1, Math.min((width - padding * 2) / 360, (height - padding * 2) / (LAT_TOP - LAT_BOTTOM)));
  return {
    scale,
    originX: (width - 360 * scale) / 2,
    originY: (height - (LAT_TOP - LAT_BOTTOM) * scale) / 2,
    size: scale * 9,
    width,
    height,
  };
}

export function project(layout: MapLayout, lon: number, lat: number): { x: number; y: number } {
  return { x: layout.originX + (lon + 180) * layout.scale, y: layout.originY + (LAT_TOP - lat) * layout.scale };
}

/** Canvas-space center of a region (where its label, token and dots go). */
export function regionCenter(world: EarthWorld, layout: MapLayout, id: number): { x: number; y: number } {
  const region = world.regions[id]!;
  return project(layout, region.lon, region.lat);
}

/** Region under a canvas-space point (nearest region of the right medium), or null off the map. */
export function regionAt(layout: MapLayout, x: number, y: number): number | null {
  const lon = (x - layout.originX) / layout.scale - 180;
  const lat = LAT_TOP - (y - layout.originY) / layout.scale;
  if (lon < -180 || lon > 180 || lat < LAT_BOTTOM || lat > LAT_TOP) return null;
  return earthGeometry().locate(lon, lat);
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  world: EarthWorld,
  layout: MapLayout,
  hoveredId: number | null,
  outlineColor: string = THEME.accent,
): void {
  const { cells } = earthGeometry();
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.restore();

  const mapW = 360 * layout.scale;
  const mapH = (LAT_TOP - LAT_BOTTOM) * layout.scale;
  const land = landPath(layout);
  const border = Math.max(0.6, layout.scale * 0.22);

  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.originX, layout.originY, mapW, mapH);
  ctx.clip();

  // Sea regions first, over the whole map; land covers them where it is.
  for (const region of world.regions) {
    if (EARTH_REGIONS[region.id]!.isWater) fillCells(ctx, layout, cells[region.id]!, colorOf(world, region.id));
  }
  strokeCells(ctx, layout, world, true, 'rgba(15, 26, 23, 0.35)', border);

  // Land regions, clipped to the coastline. Flooded land shows as sea.
  ctx.save();
  ctx.clip(land, 'evenodd');
  for (const region of world.regions) {
    if (!EARTH_REGIONS[region.id]!.isWater) fillCells(ctx, layout, cells[region.id]!, colorOf(world, region.id));
  }
  strokeCells(ctx, layout, world, false, 'rgba(15, 26, 23, 0.45)', border);
  ctx.restore();

  ctx.lineWidth = Math.max(0.8, layout.scale * 0.3);
  ctx.strokeStyle = 'rgba(15, 26, 23, 0.8)';
  ctx.stroke(land);

  if (hoveredId !== null) highlight(ctx, layout, hoveredId, land, outlineColor);
  ctx.restore();
}

function colorOf(world: EarthWorld, id: number): string {
  const region = world.regions[id]!;
  return region.isWater && region.biome === 'ice' ? SEA_ICE_COLOR : BIOME_COLORS[region.biome];
}

function landPath(layout: MapLayout): Path2D {
  // d3's equirectangular: x = k·λ + tx with λ in radians. Match our linear projection.
  const k = (layout.scale * 180) / Math.PI;
  const zero = project(layout, 0, 0);
  const projection = geoEquirectangular().scale(k).translate([zero.x, zero.y]).precision(0.5);
  const path = new Path2D();
  geoPath(projection, path as unknown as CanvasRenderingContext2D)(landFeature());
  return path;
}

function tracePolygons(ctx: CanvasRenderingContext2D, layout: MapLayout, polygons: readonly (readonly LonLat[])[]): void {
  for (const polygon of polygons) {
    polygon.forEach(([lon, lat], i) => {
      const p = project(layout, lon, lat);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
  }
}

function fillCells(ctx: CanvasRenderingContext2D, layout: MapLayout, polygons: readonly (readonly LonLat[])[], color: string): void {
  ctx.beginPath();
  tracePolygons(ctx, layout, polygons);
  ctx.fillStyle = color;
  ctx.fill();
}

function strokeCells(ctx: CanvasRenderingContext2D, layout: MapLayout, world: EarthWorld, water: boolean, color: string, width: number): void {
  const { cells } = earthGeometry();
  ctx.beginPath();
  for (const region of world.regions) {
    if (EARTH_REGIONS[region.id]!.isWater === water) tracePolygons(ctx, layout, cells[region.id]!);
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** Outline and tint one region: its cells clipped to land or sea, plus its stretch of coast. */
function highlight(ctx: CanvasRenderingContext2D, layout: MapLayout, id: number, land: Path2D, color: string): void {
  const { cells } = earthGeometry();
  const cell = new Path2D();
  tracePolygons(cell as unknown as CanvasRenderingContext2D, layout, cells[id]!);
  const medium = new Path2D();
  if (EARTH_REGIONS[id]!.isWater) {
    // Sea = the map minus land.
    medium.rect(layout.originX, layout.originY, 360 * layout.scale, 400 * layout.scale);
    medium.addPath(land);
  } else {
    medium.addPath(land);
  }
  const width = Math.max(2, layout.scale * 0.7);
  ctx.save();
  ctx.clip(medium, 'evenodd');
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = color;
  ctx.fill(cell);
  ctx.globalAlpha = 1;
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke(cell);
  ctx.restore();
  // The coast along this region.
  ctx.save();
  ctx.clip(cell);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke(land);
  ctx.restore();
}
