import { useMemo, useState } from 'react';
import type { AnimalId } from '../sim/data/animals';
import { autoPlace, withFixed, type Placements } from '../sim/placement';
import { DEFAULT_PRESET, PRESETS, type ClimateSettings, type Preset } from '../sim/presets';
import type { RunInput } from '../sim/run';
import { generateWorld } from '../sim/world';
import { AnimalRoster } from './AnimalRoster';
import { describe } from './labels';
import { Legend } from './Legend';
import { MapView } from './MapView';
import { PlacementScreen } from './PlacementScreen';
import { SetupPanel } from './SetupPanel';
import { SimulateScreen } from './SimulateScreen';

type Screen = 'setup' | 'placement' | 'simulate';

export const MIN_ANIMALS = 3;
export const MAX_ANIMALS = 5;

export function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [seed, setSeed] = useState('mossy-river-42');
  const [climate, setClimate] = useState<ClimateSettings>(DEFAULT_PRESET.climate);
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_PRESET.id);
  const [chosen, setChosen] = useState<AnimalId[]>(['wolf', 'rabbit', 'owl', 'frog']);
  // Placement: animals the player dragged, plus auto spots for the rest. Auto
  // spots only change on entering placement, Re-roll or Reset, never on a drop.
  const [fixed, setFixed] = useState<Placements>({});
  const [auto, setAuto] = useState<Placements>({});
  const [runInput, setRunInput] = useState<RunInput | null>(null);
  // Bumped to restart the simulate screen even when the input is unchanged.
  const [runKey, setRunKey] = useState(0);

  // The world is derived from settings; every change regenerates it.
  const world = useMemo(() => generateWorld({ seed, ...climate }), [seed, climate]);

  const preset = PRESETS.find((p) => p.id === presetId);
  const presetName = preset?.name ?? 'Custom';
  const title = `${presetName}, ${describe('temperature', climate.temperature).toLowerCase()} and ${describe('rainfall', climate.rainfall).toLowerCase()}`;
  const canContinue = chosen.length >= MIN_ANIMALS && chosen.length <= MAX_ANIMALS;

  function choosePreset(p: Preset) {
    setPresetId(p.id);
    setClimate(p.climate);
  }

  function changeClimate(key: keyof ClimateSettings, value: number) {
    setPresetId(null);
    setClimate((c) => ({ ...c, [key]: value }));
  }

  function toggleAnimal(id: AnimalId) {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MAX_ANIMALS ? [...c, id] : c));
  }

  function goToPlacement() {
    setFixed({});
    setAuto(autoPlace(world, chosen, {}, seed));
    setScreen('placement');
  }

  function startRun(placements: Placements) {
    setRunInput({ worldSettings: world.settings, chosenAnimals: chosen, placements });
    setRunKey((k) => k + 1);
    setScreen('simulate');
  }

  function startWithAuto() {
    const placements = autoPlace(world, chosen, {}, seed);
    setFixed({});
    setAuto(placements);
    startRun(placements);
  }

  function reroll() {
    // Fixed animals stay put; the rest get new spots, avoiding the fixed ones.
    setAuto(autoPlace(world, chosen, fixed, `${seed}|reroll|${Math.floor(Math.random() * 1e9)}`));
  }

  function reset() {
    setFixed({});
    setAuto(autoPlace(world, chosen, {}, seed));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
            <polygon points="14,2 24.4,8 24.4,20 14,26 3.6,20 3.6,8" fill="none" stroke="#E8A33D" strokeWidth="2" />
            <polygon points="14,8 19.2,11 19.2,17 14,20 8.8,17 8.8,11" fill="#E8A33D" />
          </svg>
          <span>Thousand Years Later</span>
        </div>
        {screen === 'placement' && (
          <button className="link topbar-link" onClick={() => setScreen('setup')}>
            Back to setup
          </button>
        )}
        {screen === 'simulate' && runInput && (
          <span className="mono muted topbar-link">
            {presetName} · seed {seed}
          </span>
        )}
      </header>

      {screen === 'setup' && (
        <main className="layout">
          <div className="setup-column">
            <SetupPanel
              seed={seed}
              climate={climate}
              presetId={presetId}
              onSeedChange={setSeed}
              onPreset={choosePreset}
              onClimateChange={changeClimate}
            />
            <AnimalRoster chosen={chosen} onToggle={toggleAnimal} />
            <button className="primary" disabled={!canContinue} onClick={goToPlacement}>
              Choose starting spots
            </button>
            <button className="link center" disabled={!canContinue} onClick={startWithAuto}>
              Or start now with auto placement
            </button>
          </div>
          <section className="panel map-panel">
            <div className="map-header">
              <div>
                <div className="eyebrow">Year 0 · Your world</div>
                <h1>{title}</h1>
              </div>
              <div className="mono muted">
                {world.regions.length} regions · seed {seed || '(empty)'}
              </div>
            </div>
            <MapView world={world} />
            <Legend world={world} />
          </section>
        </main>
      )}

      {screen === 'placement' && (
        <PlacementScreen
          world={world}
          chosen={chosen}
          fixed={fixed}
          placements={withFixed(chosen, auto, fixed)}
          subtitle={`${presetName} · seed ${seed}`}
          onFixedChange={setFixed}
          onReroll={reroll}
          onReset={reset}
          onStart={startRun}
        />
      )}

      {screen === 'simulate' && runInput && (
        <SimulateScreen
          key={runKey}
          input={runInput}
          onRunAgain={() => setScreen('placement')}
          onNewSetup={() => setScreen('setup')}
        />
      )}
    </div>
  );
}
