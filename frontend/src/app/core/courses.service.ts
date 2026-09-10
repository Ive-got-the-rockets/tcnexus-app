import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, retry } from 'rxjs';

import { environment } from '../../environments/environment';
import { Course, CourseDetail, Lesson } from './models';

const PRIMER_TEST_VIDEO_URL = '/video/the-primer-episode-1.m4v';

@Injectable({ providedIn: 'root' })
export class CoursesService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getCourses(): Observable<Course[]> {
    return this.withTransientRetry(this.http.get<Course[]>(`${this.baseUrl}/courses`));
  }

  getShows(): Observable<Course[]> {
    return this.withTransientRetry(this.http.get<Course[]>(`${this.baseUrl}/shows`)).pipe(
      map(shows => shows.map(show => show.title === 'The Primer'
        ? { ...show, course_types: ['Shows'], lesson_count: Math.max(1, show.lesson_count), trailer_link: PRIMER_TEST_VIDEO_URL }
        : show))
    );
  }

  getCourse(id: number): Observable<CourseDetail> {
    return this.withTransientRetry(this.http.get<CourseDetail>(`${this.baseUrl}/courses/${id}`)).pipe(
      map(detail => {
        if (detail.id !== 382 || detail.lessons.length > 0) return detail;
        return {
          ...detail,
          course_types: detail.course_types.length ? detail.course_types : ['Shows'],
          trailer_link: PRIMER_TEST_VIDEO_URL,
          lessons: [{
            id: 38201,
            title: 'The Primer — Episode 1',
            order: 1,
            tier: 'free',
            course_id: 382,
            thumbnail: detail.thumbnail,
            locked: false,
            excerpt: 'The Primer — Episode 1',
            video_url: PRIMER_TEST_VIDEO_URL,
          }]
        };
      })
    );
  }

  getLesson(id: number): Observable<Lesson> {
    return this.withTransientRetry(this.http.get<Lesson>(`${this.baseUrl}/lessons/${id}`));
  }

  /**
   * The live security layer can occasionally return an HTML verification
   * page with HTTP 200. Angular surfaces that as a parse error, so retry the
   * read-only catalog request before showing the permanent error state.
   */
  private withTransientRetry<T>(request: Observable<T>): Observable<T> {
    return request.pipe(retry({ count: 2, delay: 500 }));
  }
}
