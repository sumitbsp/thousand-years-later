// Headless balance check: runs many random simulations on the Earth variants
// and prints survival and "top animal" rates, overall and per variant.
// Usage: npm run balance [-- --runs 500 --seed balance]
// Uses the sim's seeded RNG so a report can be reproduced exactly.

import { ANIMALS, type AnimalId } from '../src/sim/data/animals';
import { EARTH_VARIANTS, type EarthVariantId } from '../src/sim/earth';
import { createRng, type Rng } from '../src/sim/rng';
import { runToEnd, speciesBiomass, speciesRegions, speciesTotal, type RunInput } from '../src/sim/run';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const runs = Number(arg('runs', '500'));
const masterSeed = arg('seed', 'balance');
const rng = createRng(masterSeed);
const HUMANS = ANIMALS.filter((a) => a.isHuman).map((a) => a.id);

interface Tally {
  picked: number;
  survived: number;
  /** Largest biomass (population × size) at year 1000. */
  top: number;
  /** Sum of regions occupied at year 1000, over runs it survived. */
  regions: number;
  /** Largest head count at year 1000. */
  topCount: number;
  /** Largest biomass at year 200. */
  topEarly: number;
  /** Sum of each run's worst fall from a high, as a share (0–1). */
  worstDrop: number;
}

function newTallies(): Map<AnimalId, Tally> {
  return new Map(ANIMALS.map((a) => [a.id, { picked: 0, survived: 0, top: 0, regions: 0, topCount: 0, topEarly: 0, worstDrop: 0 }]));
}

/** A random variant (each equally likely) with its default chaos. The seed only moves auto placement and weather. */
function randomSetup(r: Rng, seed: string): Omit<RunInput, 'chosenAnimals' | 'placements'> {
  const variant = r.pick(EARTH_VARIANTS);
  return { earthVariant: variant.id, chaos: variant.defaultChaos, seed };
}

function pickAnimals(r: Rng, pool: AnimalId[], count: number): AnimalId[] {
  const left = pool.slice();
  const out: AnimalId[] = [];
  for (let i = 0; i < count && left.length > 0; i++) out.push(left.splice(r.int(0, left.length), 1)[0]!);
  return out;
}

/** Id with the highest score, or null when all are zero. */
function best(ids: readonly AnimalId[], score: (id: AnimalId) => number): AnimalId | null {
  let top: AnimalId | null = null;
  let topScore = 0;
  for (const id of ids) {
    const s = score(id);
    if (s > topScore) {
      topScore = s;
      top = id;
    }
  }
  return top;
}

/** Runs one simulation and records it. Returns how many chosen animals survived. */
function record(tally: Map<AnimalId, Tally>, setup: Omit<RunInput, 'chosenAnimals' | 'placements'>, chosenAnimals: AnimalId[]): number {
  const { history } = runToEnd({ ...setup, chosenAnimals, placements: {} });
  const final = history[history.length - 1]!;
  const early = history[2]!; // year 200
  let alive = 0;
  for (const id of chosenAnimals) {
    const t = tally.get(id)!;
    t.picked++;
    if (speciesTotal(final.populations, id) > 0) {
      t.survived++;
      t.regions += speciesRegions(final.populations, id);
      alive++;
    }
    let high = 0;
    let drop = 0;
    for (const snap of history) {
      const total = speciesTotal(snap.populations, id);
      high = Math.max(high, total);
      if (high > 0) drop = Math.max(drop, 1 - total / high);
    }
    t.worstDrop += drop;
  }
  const top = best(chosenAnimals, (id) => speciesBiomass(final.populations, id));
  const topCount = best(chosenAnimals, (id) => speciesTotal(final.populations, id));
  const topEarly = best(chosenAnimals, (id) => speciesBiomass(early.populations, id));
  if (top) tally.get(top)!.top++;
  if (topCount) tally.get(topCount)!.topCount++;
  if (topEarly) tally.get(topEarly)!.topEarly++;
  return alive;
}

const start = performance.now();

// Main survey: random variants, random 3–5 animals, auto placement.
const main = newTallies();
const byVariant = new Map<EarthVariantId, { runs: number; picked: number; survived: number }>(
  EARTH_VARIANTS.map((v) => [v.id, { runs: 0, picked: 0, survived: 0 }]),
);
let wipeouts = 0;
let runsWithLoser = 0;
let survivorsTotal = 0;
for (let run = 0; run < runs; run++) {
  const setup = randomSetup(rng, `${masterSeed}-${run}`);
  const chosen = pickAnimals(rng, ANIMALS.map((a) => a.id), rng.int(3, 6));
  const alive = record(main, setup, chosen);
  const v = byVariant.get(setup.earthVariant)!;
  v.runs++;
  v.picked += chosen.length;
  v.survived += alive;
  if (alive === 0) wipeouts++;
  if (alive < chosen.length) runsWithLoser++;
  survivorsTotal += alive;
}

// Human league: all three human versions together, plus 0–2 random animals,
// so the versions are compared head to head in the same worlds.
const leagueRuns = Math.max(50, Math.round(runs / 2));
const league = newTallies();
const nonHumans = ANIMALS.filter((a) => !a.isHuman).map((a) => a.id);
for (let run = 0; run < leagueRuns; run++) {
  const setup = randomSetup(rng, `${masterSeed}-league-${run}`);
  record(league, setup, [...HUMANS, ...pickAnimals(rng, nonHumans, rng.int(0, 3))]);
}

const seconds = ((performance.now() - start) / 1000).toFixed(1);
const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(0)}%`);
const cols = ['picked', 'survived', 'top', 'regions', 'top#', 'top@200', 'worst drop'];
const header = `${'Animal'.padEnd(15)}${cols.map((c) => c.padStart(11)).join('')}`;
function row(tally: Map<AnimalId, Tally>, id: AnimalId): string {
  const t = tally.get(id)!;
  const cells = [
    String(t.picked),
    pct(t.survived, t.picked),
    pct(t.top, t.picked),
    t.survived === 0 ? '-' : (t.regions / t.survived).toFixed(1),
    pct(t.topCount, t.picked),
    pct(t.topEarly, t.picked),
    pct(t.worstDrop, t.picked),
  ];
  return `${ANIMALS.find((a) => a.id === id)!.name.padEnd(15)}${cells.map((c) => c.padStart(11)).join('')}`;
}

console.log(`\nThousand Years Later balance report: ${runs} runs + ${leagueRuns} human-league runs, seed "${masterSeed}" (${seconds}s)\n`);
console.log(header);
for (const id of nonHumans) console.log(row(main, id));
console.log(`\nHumans (same random runs)`);
console.log(header);
for (const id of HUMANS) console.log(row(main, id));
console.log(`\nHuman league: all three versions in every run (${leagueRuns} runs)`);
console.log(header);
for (const id of HUMANS) console.log(row(league, id));
let picked = 0;
let survived = 0;
let maxTop = { id: nonHumans[0]!, share: 0 };
for (const a of ANIMALS) {
  const t = main.get(a.id)!;
  picked += t.picked;
  survived += t.survived;
  if (t.picked > 0 && t.top / t.picked > maxTop.share) maxTop = { id: a.id, share: t.top / t.picked };
}
console.log(`\nSurvival by Earth variant`);
for (const v of EARTH_VARIANTS) {
  const t = byVariant.get(v.id)!;
  console.log(`  ${v.name.padEnd(15)} ${pct(t.survived, t.picked).padStart(5)}  (${t.runs} runs)`);
}
console.log(`\nAverage survival: ${pct(survived, picked)}`);
console.log(`Runs with at least one extinction: ${runsWithLoser} (${pct(runsWithLoser, runs)})`);
console.log(`Highest top share: ${ANIMALS.find((a) => a.id === maxTop.id)!.name} ${pct(maxTop.share, 1)}`);
console.log(`Total wipeouts: ${wipeouts} (${pct(wipeouts, runs)})`);
console.log(`Average survivors per run: ${(survivorsTotal / runs).toFixed(2)}`);
console.log(`
top        = share of runs it was in where it ended with the largest biomass (population × size)
regions    = average regions occupied at year 1000, when it survived
top#       = same, by raw head count (favors tiny animals)
top@200    = largest biomass at year 200 (early dominance)
worst drop = average biggest fall from a high during the run (how hard it crashes)
`);
