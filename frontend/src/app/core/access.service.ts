import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AccessCheckResult, RegisterResult, RegistrationSettings } from './models';
import { DEFAULT_REGISTRATION_SETTINGS, normalizeRegistrationSettings } from './registration-settings';
import { VisitorService } from './visitor.service';

@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly baseUrl = environment.apiBaseUrl;
  readonly registrationSettings$: Observable<RegistrationSettings>;

  constructor(
    private http: HttpClient,
    private visitor: VisitorService
  ) {
    this.registrationSettings$ = this.http
      .get<RegistrationSettings>(`${this.baseUrl}/registration-settings`)
      .pipe(
        map((settings) => normalizeRegistrationSettings(settings)),
        // Settings are public configuration; a failed request should never make auth unusable.
        catchError(() => of(DEFAULT_REGISTRATION_SETTINGS)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
  }

  checkAccess(lessonId: number): Observable<AccessCheckResult> {
    return this.http.post<AccessCheckResult>(`${this.baseUrl}/access/check`, { lesson_id: lessonId }).pipe(
      tap((access) => {
        // A WordPress user may have been deleted while the browser still has
        // its old token. The API reports the actual viewer tier so this stale
        // local registration state is removed automatically.
        if (this.visitor.isRegistered() && access.viewer_tier === 'anonymous') {
          this.visitor.logout();
        }
      }),
      catchError((error) => {
        if (error.status === 401 || error.status === 403) {
          this.visitor.logout();
        }
        return throwError(() => error);
      }),
    );
  }

  register(email: string): Observable<RegisterResult> {
    return this.http.post<RegisterResult>(`${this.baseUrl}/register`, { email }).pipe(
      tap((result) => {
        if (result.success) {
          this.visitor.setToken(result.token);
          this.visitor.setEmail(email);
        }
      })
    );
  }

  login(email: string, password: string): Observable<RegisterResult> {
    return this.http.post<RegisterResult>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((result) => {
        if (result.success) {
          this.visitor.setToken(result.token);
          this.visitor.setEmail(email);
        }
      })
    );
  }
}
