// Precomputes which Earth regions touch and writes src/sim/data/earthAdjacency.ts,
// so the simulation never needs the geometry code. Run after editing
// earthRegions.ts: npm run earth. A test fails if the file is out of date.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EARTH_REGIONS } from '../src/sim/data/earthRegions';
import { computeTouching, isLand, nearestSite, regionSites } from '../src/sim/geo/earthGeometry';
import { formatAdjacency } from '../src/sim/geo/adjacencyFile';

const start = performance.now();

// Every center must be inside its own region, or labels and tokens land elsewhere.
const sites = regionSites(EARTH_REGIONS);
let problems = 0;
EARTH_REGIONS.forEach((r, i) => {
  const [lon, lat] = r.center;
  const onLand = isLand(lon, lat);
  if (onLand === r.isWater) {
    console.error(`✗ ${r.id}: center is on ${onLand ? 'land' : 'sea'}`);
    problems++;
    return;
  }
  const owner = nearestSite(sites.filter((s) => EARTH_REGIONS[s.region]!.isWater === r.isWater), lon, lat);
  if (owner !== i) {
    console.error(`✗ ${r.id}: center belongs to ${EARTH_REGIONS[owner]!.id}`);
    problems++;
  }
});

const pairs = computeTouching(EARTH_REGIONS);
const out = join(import.meta.dirname, '../src/sim/data/earthAdjacency.ts');
writeFileSync(out, formatAdjacency(pairs));

console.log(`${EARTH_REGIONS.length} regions, ${pairs.length} touching pairs → ${out} (${((performance.now() - start) / 1000).toFixed(1)}s)`);
for (const r of EARTH_REGIONS) {
  const ns = pairs.filter((p) => p.includes(r.id)).map((p) => (p[0] === r.id ? p[1] : p[0]));
  console.log(`  ${r.id.padEnd(16)} ${ns.join(', ')}`);
}
if (problems > 0) process.exit(1);
