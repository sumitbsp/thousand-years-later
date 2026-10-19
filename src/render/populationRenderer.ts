// Draws population dots on top of the map. Reads state only.

import type { Population } from '../sim/run';
import { regionCenter, type MapLayout } from './mapRenderer';
import type { World } from '../sim/world';
import { ANIMAL_COLORS, THEME } from './colors';

/**
 * One dot per species per region, arranged in a small ring around the hex
 * center. Dot radius grows with how full the region is for that species.
 */
export function drawPopulations(
  ctx: CanvasRenderingContext2D,
  world: World,
  layout: MapLayout,
  populations: readonly Population[],
  capacityOf: (p: Population) => number,
): void {
  const byRegion = new Map<number, Population[]>();
  for (const p of populations) {
    const list = byRegion.get(p.regionId) ?? [];
    list.push(p);
    byRegion.set(p.regionId, list);
  }
  const maxR = layout.size * 0.24;
  const minR = Math.max(2.5, layout.size * 0.07);
  for (const [regionId, list] of byRegion) {
    const center = regionCenter(world, layout, regionId);
    const ring = list.length === 1 ? 0 : layout.size * 0.42;
    list.forEach((p, i) => {
      const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      const x = center.x + Math.cos(angle) * ring;
      const y = center.y + Math.sin(angle) * ring;
      const fill = Math.min(1, p.count / capacityOf(p));
      const r = minR + (maxR - minR) * Math.sqrt(fill);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = ANIMAL_COLORS[p.animalId];
      ctx.fill();
      // Light outline keeps dots readable on dark ocean and pale ice alike.
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = THEME.text;
      ctx.stroke();
    });
  }
}
