import { useState } from 'react';
import type { AnimalId } from '../sim/data/animals';
import { DEFAULT_VARIANT, buildEarthWorld, getVariant, type EarthVariantId } from '../sim/earth';
import { autoPlace, withFixed, type Placements } from '../sim/placement';
import type { RunInput } from '../sim/run';
import { AnimalRoster } from './AnimalRoster';
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
  const [variantId, setVariantId] = useState<EarthVariantId>(DEFAULT_VARIANT.id);
  const [chaos, setChaos] = useState(DEFAULT_VARIANT.defaultChaos);
  const [chosen, setChosen] = useState<AnimalId[]>(['wolf', 'rabbit', 'owl', 'frog']);
  // Placement: animals the player dragged, plus auto spots for the rest. Auto
  // spots only change on entering placement, Re-roll or Reset, never on a drop.
  const [fixed, setFixed] = useState<Placements>({});
  const [auto, setAuto] = useState<Placements>({});
  const [runInput, setRunInput] = useState<RunInput | null>(null);
  // Bumped to restart the simulate screen even when the input is unchanged.
  const [runKey, setRunKey] = useState(0);

  // The map depends only on the Earth variant (built once per variant and cached).
  const world = buildEarthWorld(variantId);
  const variant = getVariant(variantId);
  const canContinue = chosen.length >= MIN_ANIMALS && chosen.length <= MAX_ANIMALS;

  function chooseVariant(id: EarthVariantId) {
    setVariantId(id);
    setChaos(getVariant(id).defaultChaos);
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
    setRunInput({ earthVariant: variantId, chaos, seed, chosenAnimals: chosen, placements });
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
            {variant.name} · seed {seed}
          </span>
        )}
      </header>

      {screen === 'setup' && (
        <main className="layout">
          <div className="setup-column">
            <SetupPanel
              variantId={variantId}
              chaos={chaos}
              seed={seed}
              onVariant={chooseVariant}
              onChaosChange={setChaos}
              onSeedChange={setSeed}
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
                <h1>{variant.name}</h1>
              </div>
              <div className="mono muted">
                {world.regions.filter((r) => !r.isWater).length} land · {world.regions.filter((r) => r.isWater).length} sea regions
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
          subtitle={`${variant.name} · seed ${seed}`}
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
