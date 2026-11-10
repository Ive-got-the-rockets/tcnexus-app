import type { TcLensTimelineEvent } from '../../core/models';
import { getDueTimelineEvents } from './tc-lens-timeline';

/** Tracks playback independently of whether the user has the panel open. */
export class TcLensAutoOpen {
  private previousTime = -1;
  private seen = new Set<string>();

  reset(currentTime = 0): void {
    this.seen.clear();
    this.previousTime = currentTime === 0 ? -1 : currentTime;
  }

  seek(currentTime: number): void { this.previousTime = currentTime; }

  advance(events: TcLensTimelineEvent[], currentTime: number): number | null {
    const previous = this.previousTime;
    this.previousTime = currentTime;
    const due = getDueTimelineEvents(events, previous, currentTime, this.seen);
    for (const event of due) this.seen.add(event.id);
    return due.length ? previous : null;
  }
}
