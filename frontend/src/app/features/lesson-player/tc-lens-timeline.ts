import type { TcLensTimelineEvent } from '../../core/models';
export { buildTcLensTimelineMessage } from './tc-lens-message';

export function getDueTimelineEvents(
  events: TcLensTimelineEvent[],
  previousTime: number,
  currentTime: number,
  sentIds: Set<string>,
): TcLensTimelineEvent[] {
  if (currentTime <= previousTime) {
    return [];
  }

  return events.filter((event) =>
    !sentIds.has(event.id) &&
    previousTime < event.startTime &&
    event.startTime <= currentTime,
  );
}
