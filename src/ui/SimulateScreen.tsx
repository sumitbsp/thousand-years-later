import { useCallback, useEffect, useState } from 'react';
import { getAnimal } from '../sim/ecology';
import { capacity, createRun, isFinished, speciesBiomass, speciesRegions, speciesTotal, step, type RunEvent, type RunInput, type RunState } from '../sim/run';
import { ANIMAL_COLORS } from '../render/colors';
import type { MapLayout } from '../render/mapRenderer';
import { drawPopulations } from '../render/populationRenderer';
import { MapView } from './MapView';

interface Props {
  input: RunInput;
  onRunAgain: () => void;
  onNewSetup: () => void;
}

const SPEEDS = [1, 4, 16] as const;
/** Ticks per second at 1×. A full run takes about 50 seconds at 1×. */
const BASE_TICKS_PER_SECOND = 2;
/** Status compares the total now with this many ticks ago. */
const STATUS_WINDOW = 3;

type Status = 'Growing' | 'Steady' | 'Shrinking' | 'Extinct';

interface Run {
  state: RunState;
  /** Newest first. */
  events: RunEvent[];
  /** Species totals per tick, in chosenAnimals order. */
  totals: number[][];
  /** Highest biomass any species reached so far (scales the bars). */
  maxBiomass: number;
}

function startRun(input: RunInput): Run {
  const state = createRun(input);
  return { state, events: [], totals: [totalsOf(state)], maxBiomass: maxBiomassOf(state) };
}

function maxBiomassOf(state: RunState): number {
  return Math.max(0, ...state.input.chosenAnimals.map((id) => speciesBiomass(state.populations, id)));
}

function totalsOf(state: RunState): number[] {
  return state.input.chosenAnimals.map((id) => speciesTotal(state.populations, id));
}

function advance(run: Run, ticks: number): Run {
  let { state, maxBiomass } = run;
  const events: RunEvent[] = [];
  const totals = run.totals.slice();
  for (let i = 0; i < ticks && !isFinished(state); i++) {
    const result = step(state);
    state = result.state;
    events.push(...result.events);
    totals.push(totalsOf(state));
    maxBiomass = Math.max(maxBiomass, maxBiomassOf(state));
  }
  // Newest first. Peaks are dated to their high, which is in the past when they
  // are reported, so sort by year (stable, so same-year order is kept).
  const all = events.reverse().concat(run.events);
  all.sort((a, b) => b.year - a.year);
  return { state, events: all, totals, maxBiomass };
}

export function SimulateScreen({ input, onRunAgain, onNewSetup }: Props) {
  const [run, setRun] = useState(() => startRun(input));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4);
  const { state } = run;
  const finished = isFinished(state);

  useEffect(() => {
    if (!playing || finished) return;
    const timer = setInterval(() => setRun((r) => advance(r, 1)), 1000 / (BASE_TICKS_PER_SECOND * speed));
    return () => clearInterval(timer);
  }, [playing, speed, finished]);

  const drawExtra = useCallback(
    (ctx: CanvasRenderingContext2D, layout: MapLayout) =>
      drawPopulations(ctx, state.world, layout, state.populations, (p) => capacity(p.animalId)),
    [state],
  );

  const current = run.totals[run.totals.length - 1]!;
  const earlier = run.totals[Math.max(0, run.totals.length - 1 - STATUS_WINDOW)]!;
  const maxBiomass = Math.max(1, run.maxBiomass);
  // Ranked by biomass (population × size), so a herd of elephants can beat a swarm of beetles.
  const species = input.chosenAnimals
    .map((id, i) => {
      const total = current[i]!;
      const before = earlier[i]!;
      const status: Status =
        total === 0 ? 'Extinct' : total > before * 1.05 ? 'Growing' : total < before * 0.95 ? 'Shrinking' : 'Steady';
      return {
        id,
        total,
        biomass: speciesBiomass(state.populations, id),
        status,
        regions: speciesRegions(state.populations, id),
      };
    })
    .sort((a, b) => b.biomass - a.biomass || b.total - a.total);
  const top = species[0] && species[0].biomass > 0 ? species[0] : null;

  return (
    <main className="layout simulate">
      <section className="placement-main">
        <div className="sim-header">
          <h1 className="year">Year {state.year}</h1>
          <div className="sim-controls">
            <button className="play" onClick={() => setPlaying((p) => !p)} disabled={finished} aria-label={playing ? 'Pause' : 'Play'}>
              {playing && !finished ? '❚❚' : '▶'}
            </button>
            <div className="segmented">
              {SPEEDS.map((s) => (
                <button key={s} className={s === speed ? 'active' : ''} onClick={() => setSpeed(s)}>
                  {s}×
                </button>
              ))}
            </div>
            <button className="button pill-button" disabled={finished} onClick={() => setRun((r) => advance(r, Infinity))}>
              Skip to the end
            </button>
          </div>
        </div>
        <div className="panel map-panel">
          <MapView world={state.world} drawExtra={drawExtra} />
          <div className="timeline">
            <div className="timeline-fill" style={{ width: `${state.tick}%` }} />
          </div>
        </div>
        {finished && (
          <div className="panel finished">
            <h2>Run finished</h2>
            <p>
              <strong>Top animal:</strong>{' '}
              {top
                ? `${getAnimal(top.id).name} (biomass ${Math.round(top.biomass)}, ${top.regions} ${top.regions === 1 ? 'region' : 'regions'})`
                : 'none'}
            </p>
            <p>
              <strong>Survivors:</strong>{' '}
              {species.filter((s) => s.total > 0).map((s) => getAnimal(s.id).name).join(', ') || 'none'}
            </p>
            <p>
              <strong>Extinct:</strong>{' '}
              {run.events
                .filter((e) => e.type === 'extinct')
                .reverse()
                .map((e) => `${getAnimal(e.animalId).name} (year ${e.year})`)
                .join(', ') || 'none'}
            </p>
            <div className="button-row">
              <button className="primary" onClick={onRunAgain}>Run again</button>
              <button className="button" onClick={onNewSetup}>New setup</button>
            </div>
          </div>
        )}
      </section>
      <aside className="sidebar">
        <div className="panel side-panel">
          <div className="side-header">
            <h2>Living species</h2>
            <span className="muted">{species.filter((s) => s.total > 0).length}</span>
          </div>
          {species.map((s) => (
            <div key={s.id} className="species-row">
              <div className="species-line">
                <span>
                  <span className="dot" style={{ background: ANIMAL_COLORS[s.id] }} />
                  {getAnimal(s.id).name}
                  <span className="muted small-text">
                    {' '}
                    · {Math.round(s.total)} in {s.regions} {s.regions === 1 ? 'region' : 'regions'}
                  </span>
                </span>
                <span className={`status status-${s.status.toLowerCase()}`}>{s.status}</span>
              </div>
              <div className="bar">
                <div style={{ width: `${(100 * s.biomass) / maxBiomass}%`, background: ANIMAL_COLORS[s.id] }} />
              </div>
            </div>
          ))}
        </div>
        <div className="panel side-panel events">
          <h2>Events</h2>
          <ol>
            {run.events.slice(0, 60).map((e, i) => (
              <li key={`${run.events.length - i}`}>
                <span className="mono muted">{e.year}</span> {describeEvent(e, state)}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </main>
  );
}

function describeEvent(e: RunEvent, state: RunState): string {
  const name = getAnimal(e.animalId).name;
  const where = e.regionId === null ? '' : state.world.regions[e.regionId]!.name;
  switch (e.type) {
    case 'spread':
      return `${name} spread to ${where}`;
    case 'regionLost':
      return `${name} died out in ${where}`;
    case 'extinct':
      return `${name} went extinct${where ? ` (last seen in ${where})` : ''}`;
    case 'peak':
      return `${name} peaked at ${Math.round(e.count ?? 0)}`;
  }
}
