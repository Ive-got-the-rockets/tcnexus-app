export interface FloatingWindowGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function hasExceededDragThreshold(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold = 12
): boolean {
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;
  return deltaX * deltaX + deltaY * deltaY >= threshold * threshold;
}

export function resizeFloatingWindow(
  start: FloatingWindowGeometry,
  direction: ResizeDirection,
  delta: { x: number; y: number },
  viewport: ViewportSize,
  minimum: { width: number; height: number } = { width: 320, height: 180 },
  gutter = 8
): FloatingWindowGeometry {
  const minWidth = Math.min(minimum.width, Math.max(1, viewport.width - gutter * 2));
  const minHeight = Math.min(minimum.height, Math.max(1, viewport.height - gutter * 2));
  const right = Math.min(start.left + start.width, viewport.width - gutter);
  const bottom = Math.min(start.top + start.height, viewport.height - gutter);
  let { left, top } = start;
  let width = right - left;
  let height = bottom - top;

  if (direction.includes('e')) {
    width = Math.max(minWidth, Math.min(start.width + delta.x, viewport.width - gutter - start.left));
  }
  if (direction.includes('w')) {
    left = Math.max(gutter, Math.min(start.left + delta.x, right - minWidth));
    width = right - left;
  }
  if (direction.includes('s')) {
    height = Math.max(minHeight, Math.min(start.height + delta.y, viewport.height - gutter - start.top));
  }
  if (direction.includes('n')) {
    top = Math.max(gutter, Math.min(start.top + delta.y, bottom - minHeight));
    height = bottom - top;
  }

  return { left, top, width, height };
}
