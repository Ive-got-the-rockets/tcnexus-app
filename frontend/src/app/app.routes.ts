import { Routes } from '@angular/router';

import { ProfilePage } from './features/auth/profile';
import { CourseDetailPage } from './features/course-detail/course-detail';
import { LessonPlayerPage } from './features/lesson-player/lesson-player';
import { LayoutStyle3Page } from './features/layout-style-3/layout-style-3';

export const routes: Routes = [
  { path: '', component: LayoutStyle3Page },
  { path: 'trading-courses', component: LayoutStyle3Page, data: { landingMode: 'trading' } },
  { path: 'platform-courses', component: LayoutStyle3Page, data: { landingMode: 'platform' } },
  { path: 'shows', component: LayoutStyle3Page, data: { landingMode: 'shows' } },
  { path: 'layout-style-3', component: LayoutStyle3Page },
  { path: 'profile', component: ProfilePage },
  { path: 'courses/:id', component: CourseDetailPage },
  { path: 'courses/:id/lessons/:lessonId', component: LessonPlayerPage, data: { hideChrome: true } },
  { path: '**', redirectTo: '' }
];
