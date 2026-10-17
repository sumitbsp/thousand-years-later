// Hex math for pointy-top hexes in axial coordinates (q, r).
// The world is a rectangle laid out in "odd-r" offset form: odd rows are
// shifted half a hex to the right. See https://www.redblobgames.com/grids/hexagons/

export interface Axial {
  q: number;
  r: number;
}

export interface Offset {
  col: number;
  row: number;
}

export interface Point {
  x: number;
  y: number;
}

/** The six axial neighbor directions, in a fixed order (E, NE, NW, W, SW, SE). */
export const AXIAL_DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const SQRT3 = Math.sqrt(3);

export function offsetToAxial(col: number, row: number): Axial {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

export function axialToOffset(q: number, r: number): Offset {
  return { col: q + (r - (r & 1)) / 2, row: r };
}

export function isInGrid(q: number, r: number, cols: number, rows: number): boolean {
  const { col, row } = axialToOffset(q, r);
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

/** All six neighbors, ignoring grid bounds. */
export function axialNeighbors(q: number, r: number): Axial[] {
  return AXIAL_DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

/** Neighbors that lie inside a cols × rows grid. */
export function gridNeighbors(q: number, r: number, cols: number, rows: number): Axial[] {
  return axialNeighbors(q, r).filter((n) => isInGrid(n.q, n.r, cols, rows));
}

/** Center of a hex in pixels, for hexes of the given size (center to corner). */
export function hexToPixel(q: number, r: number, size: number): Point {
  return { x: size * SQRT3 * (q + r / 2), y: size * 1.5 * r };
}

/** Which hex contains a pixel position (inverse of hexToPixel). */
export function pixelToHex(x: number, y: number, size: number): Axial {
  const q = ((SQRT3 / 3) * x - y / 3) / size;
  const r = ((2 / 3) * y) / size;
  return roundAxial(q, r);
}

/** Rounds fractional axial coordinates to the nearest hex (via cube coords). */
export function roundAxial(q: number, r: number): Axial {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  // `+ 0` turns -0 into 0 so coordinates compare cleanly.
  return { q: rq + 0, r: rr + 0 };
}

/** The six corners of a pointy-top hex, starting at the upper-right. */
export function hexCorners(cx: number, cy: number, size: number): Point[] {
  const corners: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return corners;
}
