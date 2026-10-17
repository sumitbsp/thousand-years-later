import { useEffect, useMemo, useRef, useState } from 'react';
import { BIOME_NAMES } from '../sim/biomes';
import type { World } from '../sim/world';
import { computeLayout, drawMap, regionAt } from '../render/mapRenderer';
import { formatPercent } from './labels';

interface Hover {
  id: number;
  x: number;
  y: number;
}

export function MapView({ world }: { world: World }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => computeLayout(world, size.width, size.height), [world, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMap(ctx, world, layout, hover?.id ?? null);
  }, [world, layout, size, hover?.id]);

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = regionAt(world, layout, x, y);
    setHover(id === null ? null : { id, x, y });
  }

  const region = hover ? world.regions[hover.id] : undefined;

  return (
    <div ref={containerRef} className="map-canvas">
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover && region && (
        <div
          className="tooltip"
          style={{
            left: Math.min(hover.x + 14, size.width - 190),
            top: Math.min(hover.y + 14, size.height - 130),
          }}
        >
          <div className="tooltip-title">{BIOME_NAMES[region.biome]}</div>
          <dl>
            <dt>Temperature</dt>
            <dd>{formatPercent(region.temperature)}</dd>
            <dt>Moisture</dt>
            <dd>{formatPercent(region.moisture)}</dd>
            <dt>Elevation</dt>
            <dd>{formatPercent(region.elevation)}</dd>
            <dt>Plant food</dt>
            <dd>{formatPercent(region.plantFood)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
