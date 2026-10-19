import { EARTH_VARIANTS, type EarthVariantId } from '../sim/earth';
import { describeChaos, randomSeed } from './labels';

interface Props {
  variantId: EarthVariantId;
  chaos: number;
  seed: string;
  onVariant: (id: EarthVariantId) => void;
  onChaosChange: (chaos: number) => void;
  onSeedChange: (seed: string) => void;
}

export function SetupPanel({ variantId, chaos, seed, onVariant, onChaosChange, onSeedChange }: Props) {
  const variant = EARTH_VARIANTS.find((v) => v.id === variantId)!;
  return (
    <aside className="setup">
      <h2>
        <span className="step">1</span> · Choose an Earth
      </h2>
      <div className="chips">
        {EARTH_VARIANTS.map((v) => (
          <button key={v.id} className={`chip ${v.id === variantId ? 'active' : ''}`} onClick={() => onVariant(v.id)}>
            {v.name}
          </button>
        ))}
      </div>
      <p className="muted variant-blurb">{variant.blurb}</p>

      <div className="panel controls">
        <label className="slider">
          <div className="slider-row">
            <span>Chaos</span>
            <span className="mono">{describeChaos(chaos)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={chaos}
            style={{ '--fill': `${chaos * 100}%` } as React.CSSProperties}
            onChange={(e) => onChaosChange(Number(e.target.value))}
          />
        </label>

        <div className="seed">
          <span>Run seed</span>
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
          <span className="muted small-text">Shapes auto placement and the run. The map stays the same.</span>
        </div>
      </div>
    </aside>
  );
}
