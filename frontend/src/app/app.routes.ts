import { Routes } from '@angular/router';

import { ProfilePage } from './features/auth/profile';
import { CourseCatalog } from './features/catalog/course-catalog';
import { CourseDetailPage } from './features/course-detail/course-detail';
import { LessonPlayerPage } from './features/lesson-player/lesson-player';
import { AnimationStyle2Page } from './features/animation-style-2/animation-style-2';
import { LayoutStyle3Page } from './features/layout-style-3/layout-style-3';

export const routes: Routes = [
  { path: '', component: LayoutStyle3Page },
  { path: 'trading-courses', component: CourseCatalog, data: { catalogMode: 'trading' } },
  { path: 'platform-courses', component: CourseCatalog, data: { catalogMode: 'platform' } },
  { path: 'animation-style-2', component: AnimationStyle2Page },
  { path: 'layout-style-3', component: LayoutStyle3Page },
  { path: 'profile', component: ProfilePage },
  { path: 'courses/:id', component: CourseDetailPage },
  { path: 'courses/:id/lessons/:lessonId', component: LessonPlayerPage, data: { hideChrome: true } },
  { path: '**', redirectTo: '' }
];
