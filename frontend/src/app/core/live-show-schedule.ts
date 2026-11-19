import type { Course } from './models';

type LiveSchedule = Pick<Course, 'live_start_at' | 'live_start_date' | 'live_start_time'>;

const scheduleLabel = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

export function liveShowStart(show: LiveSchedule): Date | null {
  // Keep the existing local-time behavior until the backend supplies UTC.
  const value = show.live_start_at === undefined && show.live_start_date && show.live_start_time
    ? `${show.live_start_date}T${show.live_start_time}`
    : show.live_start_at;
  if (!value) return null;
  const start = new Date(value);
  return Number.isFinite(start.getTime()) ? start : null;
}

export function liveShowOnDay(show: LiveSchedule, day: Date): boolean {
  const start = liveShowStart(show);
  return start !== null && start.toDateString() === day.toDateString();
}

export function localScheduleTime(start: Date): string {
  return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
}

export function liveShowScheduleLabel(show: LiveSchedule): string {
  const start = liveShowStart(show);
  return start ? scheduleLabel.format(start) : 'Live show';
}
