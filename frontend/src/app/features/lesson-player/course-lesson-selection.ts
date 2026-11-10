import type { CourseDetail } from '../../core/models';

/** Keep the player's next-lesson list in the same authored level as the selected video. */
export function courseForLesson(course: CourseDetail, lessonId: number, requestedLevel: string | null): CourseDetail {
  const variants = Object.entries(course.levels ?? {});
  const requested = variants.find(([level, variant]) => level === requestedLevel && variant.lessons?.some(lesson => lesson.id === lessonId));
  if (requested) return { ...course, lessons: requested[1].lessons! };
  if (course.lessons.some(lesson => lesson.id === lessonId)) return course;
  const containing = variants.find(([, variant]) => variant.lessons?.some(lesson => lesson.id === lessonId));
  return containing ? { ...course, lessons: containing[1].lessons! } : course;
}
