import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EARTH_REGIONS } from '../data/earthRegions';
import { formatAdjacency } from './adjacencyFile';
import { computeTouching, createRegionLocator, isLand, landMask, regionCells } from './earthGeometry';

describe('Earth geometry', () => {
  it('the committed adjacency file is up to date (run `npm run earth`)', () => {
    const committed = readFileSync(join(__dirname, '../data/earthAdjacency.ts'), 'utf8');
    expect(committed).toBe(formatAdjacency(computeTouching(EARTH_REGIONS)));
  });

  it('knows land from sea', () => {
    for (const [lon, lat] of [[10, 25], [-60, -5], [100, 60], [134, -25], [0, -80]]) expect(isLand(lon!, lat!), `${lon},${lat}`).toBe(true);
    for (const [lon, lat] of [[-40, 30], [-150, 0], [80, -30], [18, 35], [50, 41]]) expect(isLand(lon!, lat!), `${lon},${lat}`).toBe(false); // Caspian is water
    // Chukotka sits across the antimeridian.
    expect(isLand(-175, 66)).toBe(true);
    expect(isLand(178, 66)).toBe(true);
  });

  it('the land mask agrees with isLand', () => {
    const step = 2;
    const { cols, land } = landMask(step);
    let checked = 0;
    let agree = 0;
    for (let j = 10; j < 80; j += 3) {
      for (let i = 0; i < cols; i += 3) {
        checked++;
        if (Boolean(land[j * cols + i]) === isLand(-180 + (i + 0.5) * step, 90 - (j + 0.5) * step)) agree++;
      }
    }
    expect(agree).toBe(checked);
  });

  it('every region center is in its own region', () => {
    const locate = createRegionLocator(EARTH_REGIONS);
    EARTH_REGIONS.forEach((r) => expect(EARTH_REGIONS[locate(r.center[0], r.center[1])]!.id).toBe(r.id));
  });

  it('every region has a cell, and cells stay on the map', () => {
    const cells = regionCells(EARTH_REGIONS);
    cells.forEach((polygons, i) => {
      expect(polygons.length, EARTH_REGIONS[i]!.id).toBeGreaterThan(0);
      for (const polygon of polygons) {
        for (const [lon, lat] of polygon) {
          expect(Math.abs(lon)).toBeLessThanOrEqual(180 + 1e-9);
          expect(Math.abs(lat)).toBeLessThanOrEqual(90 + 1e-9);
        }
      }
    });
  });

  it('the locator wraps at the antimeridian', () => {
    const locate = createRegionLocator(EARTH_REGIONS);
    expect(EARTH_REGIONS[locate(179.9, 30)]!.id).toBe(EARTH_REGIONS[locate(-179.9, 30)]!.id);
  });
});
