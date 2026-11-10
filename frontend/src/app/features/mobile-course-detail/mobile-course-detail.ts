import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CoursesService } from '../../core/courses.service';
import { CourseDetail } from '../../core/models';

@Component({ selector: 'app-mobile-course-detail', imports: [RouterLink], templateUrl: './mobile-course-detail.html', styleUrl: './mobile-course-detail.scss' })
export class MobileCourseDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly courses = inject(CoursesService);
  protected readonly course = signal<CourseDetail | null>(null);
  protected readonly levelOpen = signal(false);
  constructor() { this.courses.getCourse(Number(this.route.snapshot.paramMap.get('id'))).subscribe(c => this.course.set(c)); }
  protected hero(c: CourseDetail) { return c.mobile_landing_background ?? c.image ?? c.thumbnail ?? ''; }
}
