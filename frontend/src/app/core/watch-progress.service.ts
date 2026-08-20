import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'tcnexus_watch_progress';

interface LessonProgress {
  currentTime: number;
  duration: number;
  /** Absent on entries saved before this field existed — lastLessonForCourse() just can't match those to a course. */
  courseId?: number;
  /** epoch ms — lets lastLessonForCourse() pick the most recently watched lesson when a course has more than one with saved progress. */
  lastWatchedAt?: number;
}

/** Lesson id -> last known playback position. */
type ProgressMap = Record<number, LessonProgress>;

function readStoredProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

/** Local stand-in for the reference theme's `contine_watched_update` AJAX call — no backend endpoint for this yet. */
@Injectable({ providedIn: 'root' })
export class WatchProgressService {
  private readonly progress = signal<ProgressMap>(readStoredProgress());
  readonly all = this.progress.asReadonly();

  /** 0 to 1, for the thumbnail progress bar. */
  fractionFor(lessonId: number): number {
    const entry = this.progress()[lessonId];
    if (!entry || !entry.duration) return 0;
    return Math.max(0, Math.min(1, entry.currentTime / entry.duration));
  }

  /** Raw seconds to resume from. */
  timeFor(lessonId: number): number {
    return this.progress()[lessonId]?.currentTime ?? 0;
  }

  /** The most recently watched lesson id within a course, or null if nothing's been watched there yet — drives the catalog card's Play button. */
  lastLessonForCourse(courseId: number): number | null {
    let bestLessonId: number | null = null;
    let bestWatchedAt = -Infinity;

    for (const [lessonIdKey, entry] of Object.entries(this.progress())) {
      if (entry.courseId !== courseId) continue;
      const watchedAt = entry.lastWatchedAt ?? 0;
      if (watchedAt > bestWatchedAt) {
        bestWatchedAt = watchedAt;
        bestLessonId = Number(lessonIdKey);
      }
    }

    return bestLessonId;
  }

  update(lessonId: number, courseId: number, currentTime: number, duration: number): void {
    if (!duration) return;
    const next = { ...this.progress(), [lessonId]: { currentTime, duration, courseId, lastWatchedAt: Date.now() } };
    this.progress.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}
