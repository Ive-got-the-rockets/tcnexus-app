import { Routes } from '@angular/router';

import { ProfilePage } from './features/auth/profile';
import { CourseCatalog } from './features/catalog/course-catalog';
import { CourseDetailPage } from './features/course-detail/course-detail';
import { LessonPlayerPage } from './features/lesson-player/lesson-player';
import { AnimationStyle2Page } from './features/animation-style-2/animation-style-2';

export const routes: Routes = [
  { path: '', component: AnimationStyle2Page },
  { path: 'trading-courses', component: CourseCatalog, data: { catalogMode: 'trading' } },
  { path: 'platform-courses', component: CourseCatalog, data: { catalogMode: 'platform' } },
  { path: 'animation-style-2', component: AnimationStyle2Page },
  { path: 'profile', component: ProfilePage },
  { path: 'courses/:id', component: CourseDetailPage },
  { path: 'courses/:id/lessons/:lessonId', component: LessonPlayerPage, data: { hideChrome: true } },
  { path: '**', redirectTo: '' }
];
