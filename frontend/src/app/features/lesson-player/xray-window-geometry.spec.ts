import { describe, expect, it } from 'vitest';

import { hasExceededDragThreshold, resizeFloatingWindow } from './xray-window-geometry';

const start = { left: 100, top: 80, width: 400, height: 240 };
const viewport = { width: 1000, height: 700 };

describe('hasExceededDragThreshold', () => {
  it('waits until the pointer moves far enough to treat the gesture as a drag', () => {
    expect(hasExceededDragThreshold({ x: 10, y: 10 }, { x: 17, y: 15 }, 12)).toBe(false);
    expect(hasExceededDragThreshold({ x: 10, y: 10 }, { x: 21, y: 17 }, 12)).toBe(true);
  });
});

it.each([
  ['north', 'n', 0, -20, 100, 60, 400, 260],
  ['south', 's', 0, 20, 100, 80, 400, 260],
  ['east', 'e', 20, 0, 100, 80, 420, 240],
  ['west', 'w', -20, 0, 80, 80, 420, 240],
  ['north-east', 'ne', 20, -20, 100, 60, 420, 260],
  ['north-west', 'nw', -20, -20, 80, 60, 420, 260],
  ['south-east', 'se', 20, 20, 100, 80, 420, 260],
  ['south-west', 'sw', -20, 20, 80, 80, 420, 260]
] as const)('resizes from the %s handle', (_name, direction, dx, dy, left, top, width, height) => {
  expect(resizeFloatingWindow(start, direction, { x: dx, y: dy }, viewport)).toEqual({ left, top, width, height });
});

describe('resizeFloatingWindow', () => {
  it('resizes from the west edge while keeping the opposite edge fixed', () => {
    expect(resizeFloatingWindow(start, 'w', { x: -50, y: 0 }, viewport)).toEqual({
      left: 50,
      top: 80,
      width: 450,
      height: 240
    });
  });

  it('resizes diagonally from the north-west corner while keeping right and bottom fixed', () => {
    expect(resizeFloatingWindow(start, 'nw', { x: -40, y: -30 }, viewport)).toEqual({
      left: 60,
      top: 50,
      width: 440,
      height: 270
    });
  });

  it('does not shrink below the minimum size or move the opposite edges', () => {
    expect(resizeFloatingWindow(start, 'nw', { x: 500, y: 500 }, viewport)).toEqual({
      left: 180,
      top: 140,
      width: 320,
      height: 180
    });
  });

  it('keeps east and south edges inside the viewport', () => {
    expect(resizeFloatingWindow({ ...start, left: 660, top: 500 }, 'se', { x: 500, y: 500 }, viewport)).toEqual({
      left: 660,
      top: 500,
      width: 332,
      height: 192
    });
  });
});
