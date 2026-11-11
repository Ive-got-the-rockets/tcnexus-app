import type { Params } from '@angular/router';

export function localLayoutOneUrl(params: Params, query: Params): string | null {
  if (query['tcLensHost'] === 'workspace' || query['layout'] === '0') return null;
  const courseId = Number(params['id']);
  const lessonId = Number(params['lessonId']);
  if (![courseId, lessonId].every(id => Number.isSafeInteger(id) && id > 0)) return null;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null) search.set(key, String(value));
  }
  search.set('courseId', String(courseId));
  search.set('lessonId', String(lessonId));
  return `/tc-lens-layout-01?${search}`;
}

/** Opens the live Layout 1 workspace while keeping the exact playback position. */
export function workspaceEntryUrl(courseId: number, lessonId: number, currentTime: number, query: Params): string {
  const search = workspaceQuery(query);
  search.set('courseId', String(courseId));
  search.set('lessonId', String(lessonId));
  search.set('resume', String(safePlaybackSecond(currentTime)));
  return `/tc-lens-layout-01?${search}`;
}

/** Leaves Layout 1 for the regular player without trusting saved-progress timing. */
export function workspaceExitUrl(courseId: number, lessonId: number, currentTime: number, query: Params): string {
  const search = workspaceQuery(query);
  search.set('layout', '0');
  search.set('resume', String(safePlaybackSecond(currentTime)));
  return `/courses/${courseId}/lessons/${lessonId}?${search}`;
}

function workspaceQuery(query: Params): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && !['courseId', 'lessonId', 'layout', 'restart', 'resume', 'tcLensHost'].includes(key)) {
      search.set(key, String(value));
    }
  }
  return search;
}

function safePlaybackSecond(currentTime: number): number {
  return Number.isFinite(currentTime) && currentTime > 0 ? Math.round(currentTime * 1000) / 1000 : 0;
}
