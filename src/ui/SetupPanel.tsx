import { PRESETS, type ClimateSettings, type Preset } from '../sim/presets';
import { describe, randomSeed } from './labels';

interface Props {
  seed: string;
  climate: ClimateSettings;
  presetId: string | null;
  onSeedChange: (seed: string) => void;
  onPreset: (preset: Preset) => void;
  onClimateChange: (key: keyof ClimateSettings, value: number) => void;
}

const SLIDERS: { key: keyof ClimateSettings; label: string }[] = [
  { key: 'temperature', label: 'Temperature' },
  { key: 'rainfall', label: 'Rainfall' },
  { key: 'seaLevel', label: 'Sea level' },
  { key: 'chaos', label: 'Chaos' },
];

export function SetupPanel({ seed, climate, presetId, onSeedChange, onPreset, onClimateChange }: Props) {
  return (
    <aside className="setup">
      <h2>
        <span className="step">1</span> · Choose a world
      </h2>
      <div className="chips">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={`chip ${p.id === presetId ? 'active' : ''}`}
            onClick={() => onPreset(p)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="panel controls">
        {SLIDERS.map(({ key, label }) => {
          const value = climate[key];
          return (
            <label key={key} className="slider">
              <div className="slider-row">
                <span>{label}</span>
                <span className="mono">{describe(key, value)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={value}
                style={{ '--fill': `${value * 100}%` } as React.CSSProperties}
                onChange={(e) => onClimateChange(key, Number(e.target.value))}
              />
            </label>
          );
        })}

        <div className="seed">
          <span>Seed</span>
          <div className="seed-row">
            <input
              className="mono"
              type="text"
              value={seed}
              spellCheck={false}
              onChange={(e) => onSeedChange(e.target.value)}
            />
            <button className="button" onClick={() => onSeedChange(randomSeed())}>
              Random seed
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
