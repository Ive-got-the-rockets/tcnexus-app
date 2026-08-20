import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // 'enabled' (not 'top'): forward navigation still lands at the top of
      // the new page, but *backward* (popstate) navigation restores the
      // exact previous scroll position — which is what lets "Back To Home"
      // (using Location.back(), a real popstate) return the catalog to
      // however it looked when you left it, instead of resetting it.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
    ),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
