import { describe, expect, it } from 'vitest';
import type { CourseDetail } from '../../core/models';
import { courseForLesson } from './course-lesson-selection';

describe('lesson level selection', () => {
  const course = { lessons: [{ id: 1 }], levels: { advanced: { lessons: [{ id: 7 }, { id: 8 }] } } } as CourseDetail;
  it('loads a level-specific lesson and keeps its next lesson in that level', () => {
    expect(courseForLesson(course, 7, 'advanced').lessons.map(lesson => lesson.id)).toEqual([7, 8]);
    expect(courseForLesson(course, 7, null).lessons.map(lesson => lesson.id)).toEqual([7, 8]);
  });
  it('retains the default list for default or missing lessons without mutating the course', () => {
    expect(courseForLesson(course, 1, 'advanced')).toBe(course);
    expect(courseForLesson(course, 99, null)).toBe(course);
    expect(course.lessons.map(lesson => lesson.id)).toEqual([1]);
  });
});
