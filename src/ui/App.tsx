import { useMemo, useState } from 'react';
import { DEFAULT_PRESET, PRESETS, type ClimateSettings, type Preset } from '../sim/presets';
import { generateWorld } from '../sim/world';
import { describe } from './labels';
import { Legend } from './Legend';
import { MapView } from './MapView';
import { SetupPanel } from './SetupPanel';

export function App() {
  const [seed, setSeed] = useState('mossy-river-42');
  const [climate, setClimate] = useState<ClimateSettings>(DEFAULT_PRESET.climate);
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_PRESET.id);

  // The world is derived from settings; every change regenerates it.
  const world = useMemo(() => generateWorld({ seed, ...climate }), [seed, climate]);

  const preset = PRESETS.find((p) => p.id === presetId);
  const title = `${preset?.name ?? 'Custom'}, ${describe('temperature', climate.temperature).toLowerCase()} and ${describe('rainfall', climate.rainfall).toLowerCase()}`;

  function choosePreset(p: Preset) {
    setPresetId(p.id);
    setClimate(p.climate);
  }

  function changeClimate(key: keyof ClimateSettings, value: number) {
    setPresetId(null);
    setClimate((c) => ({ ...c, [key]: value }));
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
      </header>
      <main className="layout">
        <SetupPanel
          seed={seed}
          climate={climate}
          presetId={presetId}
          onSeedChange={setSeed}
          onPreset={choosePreset}
          onClimateChange={changeClimate}
        />
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
    </div>
  );
}
