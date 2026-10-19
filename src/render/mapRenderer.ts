// Draws a World onto a canvas. Reads world state only; never modifies it.

import { hexCorners, hexToPixel, pixelToHex } from '../sim/hex';
import { regionIdAt, type World } from '../sim/world';
import { BIOME_COLORS, THEME } from './colors';

/** How the hex grid maps onto the canvas, in CSS pixels. */
export interface MapLayout {
  /** Hex size (center to corner). */
  size: number;
  originX: number;
  originY: number;
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
}

/** Fraction of the hex size that is filled; the rest is the gap between hexes. */
const HEX_FILL = 0.955;

/** Fits the whole grid inside width × height, centered. */
export function computeLayout(world: World, width: number, height: number, padding = 12): MapLayout {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const halfWidth = Math.sqrt(3) / 2;
  for (const region of world.regions) {
    const p = hexToPixel(region.q, region.r, 1);
    minX = Math.min(minX, p.x - halfWidth);
    maxX = Math.max(maxX, p.x + halfWidth);
    minY = Math.min(minY, p.y - 1);
    maxY = Math.max(maxY, p.y + 1);
  }
  const size = Math.max(
    1,
    Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY)),
  );
  return {
    size,
    originX: (width - (maxX - minX) * size) / 2 - minX * size,
    originY: (height - (maxY - minY) * size) / 2 - minY * size,
    width,
    height,
  };
}

/** Canvas-space center of a region. */
export function regionCenter(world: World, layout: MapLayout, id: number): { x: number; y: number } {
  const region = world.regions[id]!;
  const p = hexToPixel(region.q, region.r, layout.size);
  return { x: p.x + layout.originX, y: p.y + layout.originY };
}

/** Region under a canvas-space point, or null. */
export function regionAt(world: World, layout: MapLayout, x: number, y: number): number | null {
  const { q, r } = pixelToHex(x - layout.originX, y - layout.originY, layout.size);
  return regionIdAt(world, q, r);
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  world: World,
  layout: MapLayout,
  hoveredId: number | null,
  outlineColor: string = THEME.accent,
): void {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.restore();

  for (const region of world.regions) {
    const center = regionCenter(world, layout, region.id);
    tracePath(ctx, center.x, center.y, layout.size * HEX_FILL);
    ctx.fillStyle = BIOME_COLORS[region.biome];
    ctx.fill();
  }

  if (hoveredId !== null) {
    const center = regionCenter(world, layout, hoveredId);
    tracePath(ctx, center.x, center.y, layout.size * HEX_FILL);
    ctx.lineWidth = Math.max(2, layout.size * 0.06);
    ctx.strokeStyle = outlineColor;
    ctx.stroke();
  }
}

function tracePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const corners = hexCorners(cx, cy, size);
  ctx.beginPath();
  corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
  ctx.closePath();
}
