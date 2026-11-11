import { describe, it, expect } from 'vitest';
import { readWorkspacePlayback, readWorkspaceClose } from './tc-lens-workspace-playback';
describe('workspace playback boundary', () => {
  it('accepts only its own same-origin video frame and matching lesson', () => {
    const source = {} as Window;
    const event = { origin: 'https://dev.tcnexus.tv', source, data: { type: 'tc-nexus-playback', videoId: '66', state: 'time', currentTime: 30 } };
    expect(readWorkspacePlayback(event, event.origin, source, 66)).toEqual(event.data);
    expect(readWorkspacePlayback({ ...event, origin: 'https://other.example' }, event.origin, source, 66)).toBeNull();
    expect(readWorkspacePlayback({ ...event, source: {} as Window }, event.origin, source, 66)).toBeNull();
    expect(readWorkspacePlayback(event, event.origin, source, 67)).toBeNull();
    expect(readWorkspacePlayback({ ...event, data: { ...event.data, currentTime: NaN } }, event.origin, source, 66)).toBeNull();
  });

  it('accepts a close request only from its own matching video frame', () => {
    const source = {} as Window;
    const event = { origin: 'https://dev.tcnexus.tv', source, data: { type: 'tc-nexus-close-workspace', videoId: '66' } };
    expect(readWorkspaceClose(event, event.origin, source, 66)).toEqual(event.data);
    expect(readWorkspaceClose({ ...event, origin: 'https://other.example' }, event.origin, source, 66)).toBeNull();
    expect(readWorkspaceClose({ ...event, source: {} as Window }, event.origin, source, 66)).toBeNull();
    expect(readWorkspaceClose({ ...event, data: { ...event.data, videoId: '67' } }, event.origin, source, 66)).toBeNull();
  });
});
