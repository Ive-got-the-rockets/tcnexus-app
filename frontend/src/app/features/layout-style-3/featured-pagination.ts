export function nextFeaturedIndex(activeIndex: number, itemCount: number, direction: number): number {
  if (itemCount <= 0 || direction === 0) return activeIndex;

  const step = direction > 0 ? 1 : -1;
  return (activeIndex + step + itemCount) % itemCount;
}
