import { describe, expect, it } from 'vitest';
import { EARTH_REGIONS, STRAITS, WATER_GAPS } from './data/earthRegions';
import { EARTH_VARIANTS, buildEarthWorld, createEarthWorld, earthRegionIndex, type EarthWorld } from './earth';
import { BIOMES } from './biomes';

const today = buildEarthWorld('today');
const ix = earthRegionIndex;

function linked(world: EarthWorld, a: string, b: string): boolean {
  return world.neighbors[ix(a)]!.includes(ix(b));
}

/** Regions reachable from `start` moving only through regions that pass `allowed`. */
function reachable(world: EarthWorld, start: number, allowed: (id: number) => boolean): Set<number> {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length > 0) {
    for (const n of world.neighbors[stack.pop()!]!) {
      if (!seen.has(n) && allowed(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen;
}

describe('Earth regions (data)', () => {
  it('has 40–55 regions with unique ids, valid values and land and sea', () => {
    expect(EARTH_REGIONS.length).toBeGreaterThanOrEqual(40);
    expect(EARTH_REGIONS.length).toBeLessThanOrEqual(55);
    expect(new Set(EARTH_REGIONS.map((r) => r.id)).size).toBe(EARTH_REGIONS.length);
    for (const r of EARTH_REGIONS) {
      for (const v of [r.temperature, r.elevation, r.plantFood]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(BIOMES).toContain(r.biome);
      expect(r.continent === null).toBe(r.isWater);
    }
    expect(EARTH_REGIONS.filter((r) => r.isWater).length).toBeGreaterThanOrEqual(10);
  });

  it('includes the regions named in the design', () => {
    const names = EARTH_REGIONS.map((r) => r.name);
    for (const name of ['Sahara', 'Amazonia', 'Congo', 'Siberia', 'The Outback', 'Great Plains', 'The Himalaya', 'The Steppe',
      'Greenland', 'The Arctic', 'Patagonia', 'Arabia', 'Europe', 'India', 'Southeast Asia',
      'North Pacific', 'South Atlantic', 'Indian Ocean', 'Arctic Ocean', 'Southern Ocean']) {
      expect(names).toContain(name);
    }
    // Every continent has land regions.
    for (const c of ['americas', 'eurasia', 'africa', 'australia', 'antarctica']) {
      expect(EARTH_REGIONS.some((r) => r.continent === c), c).toBe(true);
    }
  });

  it('straits and gaps name real regions', () => {
    for (const s of [...STRAITS, ...WATER_GAPS, ...EARTH_VARIANTS.flatMap((v) => v.landBridges)]) {
      for (const id of s.between) expect(() => ix(id), `${s.name}: ${id}`).not.toThrow();
    }
  });
});

describe('buildEarthWorld', () => {
  it('is deterministic and the same every time (deep equal)', () => {
    for (const v of EARTH_VARIANTS) expect(createEarthWorld(v.id)).toEqual(createEarthWorld(v.id));
    expect(buildEarthWorld('today')).toBe(today);
    expect(Object.isFrozen(today.regions[0])).toBe(true);
  });

  it('every region has neighbors; neighbor lists are sorted, symmetric and valid', () => {
    for (const v of EARTH_VARIANTS) {
      const world = buildEarthWorld(v.id);
      world.regions.forEach((r) => {
        const ns = world.neighbors[r.id]!;
        expect(ns.length, `${v.id}: ${r.key}`).toBeGreaterThan(0);
        expect(ns).toEqual([...ns].sort((a, b) => a - b));
        expect(new Set(ns).size).toBe(ns.length);
        for (const n of ns) {
          expect(n).not.toBe(r.id);
          expect(world.neighbors[n]).toContain(r.id);
        }
      });
    }
  });

  it('land and sea neighbors make sense', () => {
    // Coasts.
    for (const [land, sea] of [
      ['sahara', 'mediterranean'], ['amazonia', 'southAtlantic'], ['india', 'arabianSea'], ['siberia', 'arcticOcean'],
      ['greenland', 'arcticOcean'], ['madagascar', 'indianOcean'], ['antarctica', 'southernOcean'],
      ['southeastAsia', 'southChinaSea'], ['patagonia', 'southernOcean'], ['japan', 'northPacific'],
    ]) expect(linked(today, land!, sea!), `${land}–${sea}`).toBe(true);
    // Land borders on one continent.
    for (const [a, b] of [
      ['sahara', 'sahel'], ['sahel', 'congo'], ['congo', 'kalahari'], ['europe', 'southernEurope'], ['steppe', 'siberia'],
      ['india', 'himalaya'], ['greatPlains', 'rockies'], ['centralAmerica', 'andes'], ['amazonia', 'pampas'], ['outback', 'easternAustralia'],
    ]) expect(linked(today, a!, b!), `${a}–${b}`).toBe(true);
    // Seas joined to each other.
    for (const [a, b] of [
      ['northAtlantic', 'mediterranean'], ['northAtlantic', 'southAtlantic'], ['arcticOcean', 'northAtlantic'],
      ['arcticOcean', 'northPacific'], ['northPacific', 'southPacific'], ['indianOcean', 'southernOcean'], ['arabianSea', 'indianOcean'],
    ]) expect(linked(today, a!, b!), `${a}–${b}`).toBe(true);
    // Things that must not touch.
    for (const [a, b] of [
      ['siberia', 'outback'], ['sahara', 'amazonia'], ['greatPlains', 'northAtlantic'], ['gobi', 'northPacific'],
      ['antarctica', 'patagonia'], ['mediterranean', 'indianOcean'], ['madagascar', 'eastAfrica'], ['newZealand', 'easternAustralia'],
    ]) expect(linked(today, a!, b!), `${a}–${b}`).toBe(false);
  });

  it('every sea connects to every other sea through water', () => {
    const seas = today.regions.filter((r) => r.isWater).map((r) => r.id);
    const connected = reachable(today, seas[0]!, (id) => today.regions[id]!.isWater);
    expect([...connected].sort((a, b) => a - b)).toEqual(seas);
  });

  it('land on different continents meets only across listed straits and bridges', () => {
    for (const v of EARTH_VARIANTS) {
      const world = buildEarthWorld(v.id);
      const allowed = new Set([...STRAITS, ...v.landBridges].map((s) => [ix(s.between[0]), ix(s.between[1])].sort().join('-')));
      for (const r of world.regions) {
        for (const n of world.neighbors[r.id]!) {
          const a = EARTH_REGIONS[r.id]!.continent;
          const b = EARTH_REGIONS[n]!.continent;
          if (a && b && a !== b) expect(allowed.has([r.id, n].sort().join('-')), `${v.id}: ${r.key}–${world.regions[n]!.key}`).toBe(true);
        }
      }
    }
  });

  it('straits connect the right continents', () => {
    expect(linked(today, 'siberia', 'alaska')).toBe(true); // Bering: Asia–Americas
    expect(linked(today, 'southernEurope', 'sahara')).toBe(true); // Gibraltar: Europe–Africa
    expect(linked(today, 'middleEast', 'sahara')).toBe(true); // Sinai: Asia–Africa
    // Southeast Asia–Australia island chain.
    expect(linked(today, 'southeastAsia', 'indonesia')).toBe(true);
    expect(linked(today, 'indonesia', 'newGuinea')).toBe(true);
    expect(linked(today, 'indonesia', 'outback')).toBe(true);
    // Walking over land (no water regions), every continent but Antarctica is one network.
    const walk = reachable(today, ix('europe'), (id) => !today.regions[id]!.isWater);
    for (const key of ['alaska', 'patagonia', 'kalahari', 'outback', 'newGuinea', 'india']) expect(walk.has(ix(key)), key).toBe(true);
    for (const key of ['antarctica', 'madagascar', 'newZealand', 'japan', 'britishIsles']) expect(walk.has(ix(key)), key).toBe(false);
  });

  it('Ice Age opens land bridges to the islands on the shelf', () => {
    const ice = buildEarthWorld('iceAge');
    for (const [a, b] of [['newGuinea', 'easternAustralia'], ['britishIsles', 'europe'], ['japan', 'eastAsia']]) {
      expect(linked(today, a!, b!), `today ${a}–${b}`).toBe(false);
      expect(linked(ice, a!, b!), `ice age ${a}–${b}`).toBe(true);
    }
  });

  it('variants change biomes, temperature and sea level as described', () => {
    const at = (world: EarthWorld, key: string) => world.regions[ix(key)]!;
    const count = (world: EarthWorld, biome: string) => world.regions.filter((r) => r.biome === biome).length;

    const ice = buildEarthWorld('iceAge');
    for (const key of ['canada', 'scandinavia']) expect(at(ice, key).biome).toBe('ice');
    expect(count(ice, 'ice')).toBeGreaterThan(count(today, 'ice') + 3);
    expect(at(ice, 'europe').temperature).toBeLessThan(at(today, 'europe').temperature);

    const hot = buildEarthWorld('hot');
    expect(count(hot, 'desert')).toBeGreaterThan(count(today, 'desert') + 2);
    expect(count(hot, 'jungle')).toBeLessThan(count(today, 'jungle'));
    for (const key of ['greenland', 'antarctica']) expect(at(hot, key).biome).not.toBe('ice');
    expect(at(hot, 'arcticOcean').biome).toBe('ocean'); // the sea ice melts
    expect(at(today, 'arcticOcean').biome).toBe('ice');

    const drowned = buildEarthWorld('drowned');
    const flooded = drowned.regions.filter((r) => r.flooded);
    expect(flooded.length).toBeGreaterThanOrEqual(2);
    for (const r of flooded) {
      expect(r.isWater).toBe(true);
      expect(r.continent).toBeNull();
      expect(EARTH_REGIONS[r.id]!.isWater).toBe(false);
      expect(today.neighbors[r.id]!.some((n) => today.regions[n]!.isWater)).toBe(true); // coastal
    }
    expect(at(drowned, 'amazonia').isWater).toBe(true);
    expect(at(drowned, 'himalaya').isWater).toBe(false);

    const wild = buildEarthWorld('wild');
    expect(count(wild, 'volcanic')).toBeGreaterThanOrEqual(3);
    expect(count(today, 'volcanic')).toBe(0);
    expect(EARTH_VARIANTS.find((v) => v.id === 'wild')!.defaultChaos).toBeGreaterThan(0.8);
  });

  it('a changed biome brings its own plant food', () => {
    const hot = buildEarthWorld('hot');
    const sahel = ix('sahel');
    expect(hot.regions[sahel]!.biome).toBe('desert');
    expect(hot.regions[sahel]!.plantFood).toBeLessThan(today.regions[sahel]!.plantFood);
  });

  it('flyers hop one sea to nearby land only', () => {
    expect(today.flightHops[ix('eastAfrica')]).toContain(ix('madagascar'));
    expect(today.flightHops[ix('easternAustralia')]).toContain(ix('newZealand'));
    // Never across an ocean.
    expect(today.flightHops[ix('japan')]).not.toContain(ix('alaska'));
    expect(today.flightHops[ix('europe')]).not.toContain(ix('easternForests'));
    for (const r of today.regions) {
      for (const h of today.flightHops[r.id]!) {
        expect(today.regions[h]!.isWater).toBe(false);
        expect(today.neighbors[r.id]).not.toContain(h);
      }
    }
  });
});
