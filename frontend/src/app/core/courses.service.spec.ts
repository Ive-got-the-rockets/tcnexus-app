import { describe, expect, it } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { CoursesService } from './courses.service';
import { Course, CourseDetail } from './models';

const trailer = 'https://vimeo.com/1234497843?fl=ip&fe=ec&share=copy';
describe('configured show trailers', () => {
  it('uses the saved trailer for The Primer in the show carousel', async () => {
    const show = { id: 59, title: 'The Primer', lesson_count: 1, trailer_link: trailer } as Course;
    const service = new CoursesService({ get: () => of([show]) } as unknown as HttpClient);
    expect((await firstValueFrom(service.getShows()))[0].trailer_link).toBe(trailer);
  });
  it('does not replace the saved trailer when local fallback lessons are used', async () => {
    const show = { id: 382, title: 'The Primer', course_types: [], lessons: [], trailer_link: trailer } as unknown as CourseDetail;
    const service = new CoursesService({ get: () => of(show) } as unknown as HttpClient);
    expect((await firstValueFrom(service.getCourse(382))).trailer_link).toBe(trailer);
  });
});
