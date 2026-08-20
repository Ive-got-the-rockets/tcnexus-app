import { Injectable, signal } from '@angular/core';

const VISITOR_ID_KEY = 'tcnexus_visitor_id';
const TOKEN_KEY = 'tcnexus_token';

@Injectable({ providedIn: 'root' })
export class VisitorService {
  private readonly registered = signal<boolean>(!!localStorage.getItem(TOKEN_KEY));

  getVisitorId(): string {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.registered.set(true);
  }

  /** Reads a signal internally, so calling this inside a computed() tracks it reactively. */
  isRegistered(): boolean {
    return this.registered();
  }
}
