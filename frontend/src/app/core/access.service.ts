import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AccessCheckResult, RegisterResult } from './models';
import { VisitorService } from './visitor.service';

@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private visitor: VisitorService
  ) {}

  checkAccess(lessonId: number): Observable<AccessCheckResult> {
    return this.http.post<AccessCheckResult>(`${this.baseUrl}/access/check`, { lesson_id: lessonId });
  }

  register(email: string): Observable<RegisterResult> {
    return this.http.post<RegisterResult>(`${this.baseUrl}/register`, { email }).pipe(
      tap((result) => {
        if (result.success) {
          this.visitor.setToken(result.token);
        }
      })
    );
  }
}
