import { Routes } from '@angular/router';

import { ProfilePage } from './features/auth/profile';
import { CourseDetailPage } from './features/course-detail/course-detail';
import { LessonPlayerPage } from './features/lesson-player/lesson-player';
import { LayoutStyle3Page } from './features/layout-style-3/layout-style-3';
import { MobileLayout1Page } from './features/mobile-layout-1/mobile-layout-1';
import { MobileCourseDetailPage } from './features/mobile-course-detail/mobile-course-detail';
import { ResponsiveLandingPage } from './features/responsive-layout/responsive-landing';
import { ResponsiveCourseDetailPage } from './features/responsive-layout/responsive-course-detail';
import { TcLensLayout01Page } from './features/tc-lens-layout-01/tc-lens-layout-01';
import { TradeCheetahCallbackPage } from './features/auth/tradecheetah-callback';

import { LayoutStyle4Page } from './features/layout-style-4/layout-style-4';

export const routes: Routes = [
  { path: '', component: ResponsiveLandingPage },
  { path: 'trading-courses', component: ResponsiveLandingPage, data: { landingMode: 'trading' } },
  { path: 'platform-courses', component: ResponsiveLandingPage, data: { landingMode: 'platform' } },
  { path: 'shows', component: ResponsiveLandingPage, data: { landingMode: 'shows' } },
  { path: 'layout-style-4', component: LayoutStyle4Page },
  { path: 'layout-style-3', component: LayoutStyle3Page },
  { path: 'mobile-layout-1', component: MobileLayout1Page, data: { hideChrome: true } },
  { path: 'mobile-layout-1/courses/:id', component: MobileCourseDetailPage, data: { hideChrome: true } },
  { path: 'profile', component: ProfilePage },
  { path: 'tc-auth/callback', component: TradeCheetahCallbackPage, data: { hideChrome: true } },
  { path: 'tc-lens-layout-01', component: TcLensLayout01Page, data: { hideChrome: true } },
  { path: 'courses/:id', component: ResponsiveCourseDetailPage },
  { path: 'courses/:id/lessons/:lessonId', component: LessonPlayerPage, data: { hideChrome: true } },
  { path: '**', redirectTo: '' }
];
