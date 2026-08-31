import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';

import { environment } from '../../environments/environment';
import { Course, CourseDetail, Lesson } from './models';

@Injectable({ providedIn: 'root' })
export class CoursesService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getCourses(): Observable<Course[]> {
    return this.withTransientRetry(this.http.get<Course[]>(`${this.baseUrl}/courses`));
  }

  getCourse(id: number): Observable<CourseDetail> {
    return this.withTransientRetry(this.http.get<CourseDetail>(`${this.baseUrl}/courses/${id}`));
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
