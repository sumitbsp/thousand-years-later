import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BIOME_NAMES } from '../sim/biomes';
import type { World } from '../sim/world';
import { THEME } from '../render/colors';
import { computeLayout, drawMap, regionAt, type MapLayout } from '../render/mapRenderer';
import { formatPercent } from './labels';

interface Hover {
  id: number;
  x: number;
  y: number;
}

interface Props {
  world: World;
  /** Outlined in amber instead of the hovered hex (e.g. the drop target while dragging). */
  highlightId?: number | null;
  /** Outline the highlighted hex in red instead (a drop the animal can't survive). */
  highlightBlocked?: boolean;
  /** Extra canvas drawing after the hexes (population dots). */
  drawExtra?: (ctx: CanvasRenderingContext2D, layout: MapLayout) => void;
  /** HTML laid over the canvas, in the same CSS-pixel coordinates (tokens). */
  overlay?: (layout: MapLayout) => ReactNode;
  showTooltip?: boolean;
}

export function MapView({ world, highlightId, highlightBlocked = false, drawExtra, overlay, showTooltip = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1);
  const [hover, setHover] = useState<Hover | null>(null);

  // Measure before the first paint, so the map never shows up blank for a frame.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = (width: number, height: number) =>
      setSize((s) => (s.width === Math.floor(width) && s.height === Math.floor(height) ? s : { width: Math.floor(width), height: Math.floor(height) }));
    const rect = el.getBoundingClientRect();
    measure(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Browser zoom or moving to another screen changes the pixel ratio: redraw sharp.
  useEffect(() => {
    const query = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [dpr]);

  const layout = useMemo(() => computeLayout(world, size.width, size.height), [world, size]);
  const outlined = highlightId !== undefined ? highlightId : (hover?.id ?? null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || size.width === 0) return;
    // The backing store is in device pixels; resizing it clears it, so only on change.
    const width = Math.round(size.width * dpr);
    const height = Math.round(size.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(width / size.width, 0, 0, height / size.height, 0, 0);
    drawMap(ctx, world, layout, outlined, highlightBlocked ? THEME.danger : THEME.accent);
    drawExtra?.(ctx, layout);
  }, [world, layout, size, dpr, outlined, highlightBlocked, drawExtra]);

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
      {size.width > 0 && overlay?.(layout)}
      {showTooltip && hover && region && (
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
