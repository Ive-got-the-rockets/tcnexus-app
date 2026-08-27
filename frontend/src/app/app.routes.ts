import { Routes } from '@angular/router';

import { ProfilePage } from './features/auth/profile';
import { CourseCatalog } from './features/catalog/course-catalog';
import { CourseDetailPage } from './features/course-detail/course-detail';
import { LessonPlayerPage } from './features/lesson-player/lesson-player';

export const routes: Routes = [
  { path: '', component: CourseCatalog },
  { path: 'profile', component: ProfilePage },
  { path: 'courses/:id', component: CourseDetailPage },
  { path: 'courses/:id/lessons/:lessonId', component: LessonPlayerPage, data: { hideChrome: true } },
  { path: '**', redirectTo: '' }
];
