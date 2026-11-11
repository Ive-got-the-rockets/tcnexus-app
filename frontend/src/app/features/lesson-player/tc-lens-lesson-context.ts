import type { TcLensTimelineEvent } from '../../core/models';

function hash(text: string, seed: number): string {
  let value = seed;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return (value >>> 0).toString(16).padStart(8, '0');
}

export function tcChapterId(event: TcLensTimelineEvent): string {
  const id = event.id || JSON.stringify(event);
  if (/^[A-Za-z0-9_-]{1,56}$/.test(id)) return `chapter-${id}`;
  return `chapter-${id.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 38)}-${hash(id, 2166136261)}${hash(id, 3335557771)}`;
}

export function currentTcChapter(events: TcLensTimelineEvent[], time: number): string {
  const cue = [...events].sort((a, b) => a.startTime - b.startTime).filter(event => event.startTime <= time).at(-1);
  return cue ? tcChapterId(cue) : 'intro';
}

export interface TcTutorChapter {
  id: string; at: number; title: string; context?: string; assumptions?: string; trade?: string; questions: string[];
}
export function buildTcLessonContext(lesson: { id: number; title: string; excerpt?: string; tc_lens_timeline?: TcLensTimelineEvent[] }) {
  const chapters: TcTutorChapter[] = [{ id: 'intro', at: 0, title: lesson.title, context: lesson.excerpt || '', questions: [] }];
  for (const event of [...(lesson.tc_lens_timeline ?? [])].sort((a, b) => a.startTime - b.startTime)) {
    chapters.push(event.messageType === 'llm'
      ? { id: tcChapterId(event), at: event.startTime, title: `Lesson discussion at ${event.startTime}s`,
          context: event.data.sceneContext, questions: [event.data.question || event.message || ''].filter(Boolean) }
      : { id: tcChapterId(event), at: event.startTime, title: `Trade example at ${event.startTime}s`,
          assumptions: event.data.assumptions, trade: JSON.stringify(event.data), questions: [] });
  }
  return { v: 1, videoId: String(lesson.id), title: lesson.title, summary: lesson.excerpt || '', chapters };
}
