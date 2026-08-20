import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { VisitorService } from './visitor.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const visitor = inject(VisitorService);

  let headers = req.headers.set('X-Visitor-Id', visitor.getVisitorId());
  const token = visitor.getToken();
  if (token) {
    headers = headers.set('X-Tcnexus-Token', token);
  }

  return next(req.clone({ headers }));
};
