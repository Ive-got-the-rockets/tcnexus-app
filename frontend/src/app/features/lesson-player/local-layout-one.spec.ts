import { describe, expect, it } from 'vitest';
import { localLayoutOneUrl, workspaceEntryUrl, workspaceExitUrl } from './local-layout-one';

describe('Layout 1 entry', () => {
  it('opens the selected lesson and preserves level and restart settings', () => {
    const url = new URL(localLayoutOneUrl({ id: '55', lessonId: '66' }, { level: 'advanced', restart: '1' })!, 'http://localhost');
    expect(url.pathname).toBe('/tc-lens-layout-01');
    expect(Object.fromEntries(url.searchParams)).toEqual({ courseId: '55', lessonId: '66', level: 'advanced', restart: '1' });
  });
  it('keeps embedded video and explicit Layout 0 on the regular player', () => {
    const ids = { id: '55', lessonId: '66' };
    expect(localLayoutOneUrl(ids, { tcLensHost: 'workspace' })).toBeNull();
    expect(localLayoutOneUrl(ids, { layout: '0' })).toBeNull();
    expect(localLayoutOneUrl({ id: 'bad', lessonId: '66' }, {})).toBeNull();
  });

  it('leaves the workspace for the regular player at the exact playback time', () => {
    const url = new URL(workspaceExitUrl(55, 66, 754.5678, { level: 'advanced', tcLensHost: 'workspace' }), 'http://localhost');
    expect(url.pathname).toBe('/courses/55/lessons/66');
    expect(Object.fromEntries(url.searchParams)).toEqual({ level: 'advanced', layout: '0', resume: '754.568' });
  });

  it('opens the workspace from the regular player at the exact playback time', () => {
    const url = new URL(workspaceEntryUrl(55, 66, 754.5678, { level: 'advanced', layout: '0' }), 'http://localhost');
    expect(url.pathname).toBe('/tc-lens-layout-01');
    expect(Object.fromEntries(url.searchParams)).toEqual({ level: 'advanced', courseId: '55', lessonId: '66', resume: '754.568' });
  });
});
