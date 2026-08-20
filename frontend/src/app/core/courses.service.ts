import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Course, CourseDetail, Lesson } from './models';

@Injectable({ providedIn: 'root' })
export class CoursesService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.baseUrl}/courses`);
  }

  getCourse(id: number): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(`${this.baseUrl}/courses/${id}`);
  }

  getLesson(id: number): Observable<Lesson> {
    return this.http.get<Lesson>(`${this.baseUrl}/lessons/${id}`);
  }
}
