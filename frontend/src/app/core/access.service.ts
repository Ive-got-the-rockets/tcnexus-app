import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

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
    return this.http.post<AccessCheckResult>(`${this.baseUrl}/access/check`, { lesson_id: lessonId });
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
