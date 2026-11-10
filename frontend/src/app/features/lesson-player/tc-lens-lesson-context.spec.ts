import { describe, it, expect } from 'vitest';
import { buildTcLessonContext, tcChapterId, currentTcChapter } from './tc-lens-lesson-context';
import type { TcLensTimelineEvent } from '../../core/models';
const cue: TcLensTimelineEvent = { id: 'saved-cue-1', messageType: 'llm', startTime: 30, endTime: null,
  data: { question: 'Why delta?', sceneContext: 'AAPL chain', learningLevel: 'beginner' } };
describe('tutor lesson mapping', () => {
  it('uses deterministic safe chapter IDs independent of playback order', () => {
    expect(tcChapterId(cue)).toBe(tcChapterId({ ...cue, startTime: 70 }));
    expect(tcChapterId({ ...cue, id: '</script> bad / id' })).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(tcChapterId({ ...cue, id: 'a/b' })).not.toBe(tcChapterId({ ...cue, id: 'a b' }));
  });
  it('keeps IDs joined across lesson data, seek and prompt selection', () => {
    const context = buildTcLessonContext({ id: 66, title: 'Delta', excerpt: 'Learn delta', tc_lens_timeline: [cue] });
    expect(context.videoId).toBe('66');
    expect(context.chapters[1].id).toBe(tcChapterId(cue));
    expect(context.chapters[1].questions).toEqual(['Why delta?']);
    expect(currentTcChapter([cue], 35)).toBe(tcChapterId(cue));
    expect(currentTcChapter([cue], 10)).toBe('intro');
  });
});
