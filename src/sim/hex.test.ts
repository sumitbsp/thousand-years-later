import { describe, expect, it } from 'vitest';
import { axialToOffset, gridNeighbors, hexToPixel, offsetToAxial, pixelToHex } from './hex';

const COLS = 8;
const ROWS = 6;

function neighborOffsets(col: number, row: number) {
  const { q, r } = offsetToAxial(col, row);
  return gridNeighbors(q, r, COLS, ROWS)
    .map((n) => axialToOffset(n.q, n.r))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

describe('hex grid', () => {
  it('round-trips offset and axial coordinates', () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const { q, r } = offsetToAxial(col, row);
        expect(axialToOffset(q, r)).toEqual({ col, row });
      }
    }
  });

  it('gives an interior hex six neighbors', () => {
    expect(neighborOffsets(3, 2)).toHaveLength(6);
  });

  it('handles the top-left corner (even row)', () => {
    expect(neighborOffsets(0, 0)).toEqual([
      { col: 1, row: 0 },
      { col: 0, row: 1 },
    ]);
  });

  it('handles the top-right corner (even row)', () => {
    expect(neighborOffsets(7, 0)).toEqual([
      { col: 6, row: 0 },
      { col: 6, row: 1 },
      { col: 7, row: 1 },
    ]);
  });

  it('handles the left edge on an odd (shifted) row', () => {
    expect(neighborOffsets(0, 1)).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 1, row: 1 },
      { col: 0, row: 2 },
      { col: 1, row: 2 },
    ]);
  });

  it('handles the bottom-right corner (odd row)', () => {
    expect(neighborOffsets(7, 5)).toEqual([
      { col: 7, row: 4 },
      { col: 6, row: 5 },
    ]);
  });

  it('every neighbor relation is symmetric', () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        for (const n of neighborOffsets(col, row)) {
          expect(neighborOffsets(n.col, n.row)).toContainEqual({ col, row });
        }
      }
    }
  });

  it('pixelToHex inverts hexToPixel', () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const { q, r } = offsetToAxial(col, row);
        const p = hexToPixel(q, r, 20);
        expect(pixelToHex(p.x + 3, p.y - 4, 20)).toEqual({ q, r });
      }
    }
  });
});
