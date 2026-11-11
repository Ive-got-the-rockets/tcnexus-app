import { Component, HostListener, signal } from '@angular/core';
import { CourseDetailPage } from '../course-detail/course-detail';
import { MobileCourseDetailPage } from '../mobile-course-detail/mobile-course-detail';

const MOBILE_BREAKPOINT = 700;

@Component({
  selector: 'app-responsive-course-detail',
  imports: [CourseDetailPage, MobileCourseDetailPage],
  template: `@if (mobile()) { <app-mobile-course-detail /> } @else { <app-course-detail /> }`,
})
export class ResponsiveCourseDetailPage {
  protected readonly mobile = signal(window.innerWidth <= MOBILE_BREAKPOINT);

  @HostListener('window:resize')
  protected updateLayout(): void { this.mobile.set(window.innerWidth <= MOBILE_BREAKPOINT); }
}
