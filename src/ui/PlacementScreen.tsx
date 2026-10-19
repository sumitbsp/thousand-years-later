import { useState } from 'react';
import { BIOME_NAMES } from '../sim/biomes';
import type { AnimalId } from '../sim/data/animals';
import { fitLabel, getAnimal, habitatFit, regionFitness, type FitLabel } from '../sim/ecology';
import type { Placements } from '../sim/placement';
import type { World } from '../sim/world';
import { regionAt, regionCenter, type MapLayout } from '../render/mapRenderer';
import { MapView } from './MapView';

interface Props {
  world: World;
  chosen: readonly AnimalId[];
  fixed: Placements;
  /** Where every chosen animal starts now: fixed ones plus stable auto spots. */
  placements: Placements;
  subtitle: string;
  onFixedChange: (fixed: Placements) => void;
  onReroll: () => void;
  onReset: () => void;
  onStart: (placements: Placements) => void;
}

interface Drag {
  animalId: AnimalId;
  x: number;
  y: number;
  startX: number;
  startY: number;
  /** True once the pointer has moved past DRAG_THRESHOLD; a plain tap places nothing. */
  moved: boolean;
  target: number | null;
}

/** Pixels the pointer must travel before a press counts as a drag. */
const DRAG_THRESHOLD = 6;
/** Rough width of the drop label, used to keep it inside the map. */
const HINT_WIDTH = 200;

const FIT_CLASS: Record<FitLabel, string> = { 'Good fit': 'fit-good', 'Okay fit': 'fit-okay', 'Bad fit': 'fit-bad' };

export function PlacementScreen({ world, chosen, fixed, placements, subtitle, onFixedChange, onReroll, onReset, onStart }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const placedCount = chosen.filter((id) => fixed[id] !== undefined).length;

  function fitAt(id: AnimalId, regionId: number): FitLabel {
    return fitLabel(regionFitness(world, getAnimal(id), regionId));
  }

  /** Land animals can't be dropped at sea, sea animals can't go on land, shore animals need water nearby. */
  function canSurvive(id: AnimalId, regionId: number): boolean {
    return habitatFit(world, getAnimal(id), world.regions[regionId]!) > 0;
  }

  const blocked = drag?.moved && drag.target !== null ? !canSurvive(drag.animalId, drag.target) : false;

  function pointerPos(e: React.PointerEvent<HTMLElement>): { x: number; y: number } {
    const rect = e.currentTarget.parentElement!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function renderTokens(layout: MapLayout) {
    // Tokens sharing a hex fan out so each stays grabbable.
    const perRegion = new Map<number, AnimalId[]>();
    for (const id of chosen) {
      const r = placements[id]!;
      perRegion.set(r, [...(perRegion.get(r) ?? []), id]);
    }
    const tokenSize = Math.max(34, Math.min(64, layout.size * 0.78));
    return (
      <>
        {chosen.map((id) => {
          const regionId = placements[id]!;
          const group = perRegion.get(regionId)!;
          const i = group.indexOf(id);
          const center = regionCenter(world, layout, regionId);
          const spread = group.length > 1 ? layout.size * 0.35 : 0;
          const angle = (i / group.length) * Math.PI * 2 - Math.PI / 2;
          const dragging = drag?.animalId === id;
          const x = dragging && drag.moved ? drag.x : center.x + Math.cos(angle) * spread;
          const y = dragging && drag.moved ? drag.y : center.y + Math.sin(angle) * spread;
          const placed = fixed[id] !== undefined;
          return (
            <div
              key={id}
              className={`token ${placed ? 'placed' : 'auto'} ${dragging ? 'dragging' : ''} ${dragging && blocked ? 'blocked' : ''}`}
              style={{ left: x, top: y, width: tokenSize, height: tokenSize, fontSize: tokenSize * 0.32 }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const pos = pointerPos(e);
                setDrag({ animalId: id, ...pos, startX: pos.x, startY: pos.y, moved: false, target: regionId });
              }}
              onPointerMove={(e) => {
                if (!dragging) return;
                const pos = pointerPos(e);
                const moved = drag.moved || Math.hypot(pos.x - drag.startX, pos.y - drag.startY) > DRAG_THRESHOLD;
                setDrag({ ...drag, ...pos, moved, target: regionAt(world, layout, pos.x, pos.y) });
              }}
              onPointerUp={() => {
                // A drop where the animal can't survive snaps it back.
                if (dragging && drag.moved && drag.target !== null && canSurvive(id, drag.target)) {
                  onFixedChange({ ...fixed, [id]: drag.target });
                }
                setDrag(null);
              }}
              onPointerCancel={() => setDrag(null)}
            >
              {getAnimal(id).short}
            </div>
          );
        })}
        {drag?.moved && drag.target !== null && (
          <div
            className={`drop-hint ${blocked ? 'blocked' : ''}`}
            style={{
              left: Math.max(0, Math.min(drag.x + 30, layout.width - HINT_WIDTH)),
              top: Math.max(0, drag.y - 44),
            }}
          >
            {blocked
              ? `Can't survive here · ${BIOME_NAMES[world.regions[drag.target]!.biome]}`
              : `Drop on ${BIOME_NAMES[world.regions[drag.target]!.biome]} · ${fitAt(drag.animalId, drag.target)}`}
          </div>
        )}
      </>
    );
  }

  return (
    <main className="layout placement">
      <section className="placement-main">
        <div className="eyebrow">Step 2 of 2 · Year 0</div>
        <h1 className="page-title">Where do they start?</h1>
        <p className="muted">Every animal already has a spot. Drag the ones you care about. The rest stay on auto.</p>
        <div className="panel map-panel">
          <MapView
            world={world}
            highlightId={drag?.moved ? drag.target : undefined}
            highlightBlocked={blocked}
            showTooltip={!drag}
            overlay={renderTokens}
          />
          <div className="token-legend">
            <span><span className="token-swatch auto" /> Auto (game decides)</span>
            <span><span className="token-swatch placed" /> Placed by you</span>
          </div>
        </div>
      </section>
      <aside className="sidebar">
        <div className="panel side-panel">
          <div className="side-header">
            <h2>Your animals</h2>
            <span className="muted">{placedCount} placed · {chosen.length - placedCount} auto</span>
          </div>
          {chosen.map((id) => {
            const regionId = placements[id]!;
            const fit = fitAt(id, regionId);
            const placed = fixed[id] !== undefined;
            return (
              <div key={id} className="animal-row">
                <span className={`token-swatch ${placed ? 'placed' : 'auto'} small`}>{getAnimal(id).short}</span>
                <div className="animal-row-text">
                  <div className="animal-name">{getAnimal(id).name}</div>
                  <div className="muted">
                    {BIOME_NAMES[world.regions[regionId]!.biome]} #{regionId} · <span className={FIT_CLASS[fit]}>{fit}</span>
                  </div>
                </div>
                <span className={`pill ${placed ? 'placed' : 'auto'}`}>{placed ? 'Placed by you' : 'Auto'}</span>
              </div>
            );
          })}
          <div className="button-row">
            <button className="button" onClick={onReroll}>Re-roll auto</button>
            <button className="button" onClick={onReset}>Reset</button>
          </div>
        </div>
        <div className="tip">
          <strong>Try this:</strong> drop an animal somewhere it doesn't belong. Penguins on a desert coast is allowed; sharks on land are not.
        </div>
        <button className="primary" onClick={() => onStart(placements)}>Start 1,000 years</button>
        <div className="muted center small-text">{subtitle}</div>
      </aside>
    </main>
  );
}
