import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, retry } from 'rxjs';

import { environment } from '../../environments/environment';
import { Course, CourseDetail, Lesson } from './models';
import { LIVE_SHOWS } from './live-shows';

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
        ? { ...show, course_types: ['Shows'], lesson_count: Math.max(1, show.lesson_count) }
        : show))
    );
  }

  getLiveShows(): Observable<Course[]> {
    const fallback = LIVE_SHOWS.map((show, index) => ({
      id: 9001 + index,
      title: show.title,
      excerpt: show.description,
      thumbnail: show.thumbnailUrl,
      image: show.thumbnailUrl,
      course_types: ['Live Shows'],
      lesson_count: 0,
      overview_link: null,
      trailer_link: null,
      vimeo_live_event_id: show.vimeoLiveEventId || null,
    } as Course));
    return this.withTransientRetry(this.http.get<Course[]>(`${this.baseUrl}/live-shows`)).pipe(
      map(shows => this.withLocalBrianLiveMock(shows.length ? shows : fallback)),
      catchError(() => of(this.withLocalBrianLiveMock(fallback)))
    );
  }

  private withLocalBrianLiveMock(shows: Course[]): Course[] {
    if (environment.production) return shows;
    const brianIndex = shows.findIndex(show => show.title.trim().toLowerCase().includes('live with brian'));
    if (brianIndex !== -1) {
      return shows.map((show, index) => index === brianIndex ? {
        ...show,
        live_start_at: new Date(Date.now() - 60_000).toISOString(),
        live_duration: '120',
        live_status: 'live',
      } : show);
    }
    return [{
      id: 999001,
      title: 'Live with Brian',
      excerpt: 'Local frontend preview for the live-now state.',
      thumbnail: '/shows/the-primer-BG-ratio-8by3.jpg',
      image: '/shows/the-primer-BG-ratio-8by3.jpg',
      course_types: ['Live Shows'],
      lesson_count: 0,
      overview_link: null,
      trailer_link: null,
      live_start_at: new Date(Date.now() - 60_000).toISOString(),
      live_duration: '120',
      live_status: 'live',
    }, ...shows];
  }

  getCourse(id: number): Observable<CourseDetail> {
    return this.withTransientRetry(this.http.get<CourseDetail>(`${this.baseUrl}/courses/${id}`)).pipe(
      map(detail => {
        if (detail.id !== 382 || detail.lessons.length > 0) return detail;
        return {
          ...detail,
          course_types: detail.course_types.length ? detail.course_types : ['Shows'],
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
            tc_lens_timeline: [],
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
