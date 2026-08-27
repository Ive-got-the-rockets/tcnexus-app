import { Injectable, signal } from '@angular/core';

const VISITOR_ID_KEY = 'tcnexus_visitor_id';
const TOKEN_KEY = 'tcnexus_token';
const EMAIL_KEY = 'tcnexus_email';

@Injectable({ providedIn: 'root' })
export class VisitorService {
  private readonly registered = signal<boolean>(!!localStorage.getItem(TOKEN_KEY));
  /** No display name to work with (registration is email-only) — the header icon uses this letter instead of an avatar. */
  private readonly email = signal<string | null>(localStorage.getItem(EMAIL_KEY));

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

  getEmail(): string | null {
    return this.email();
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.registered.set(true);
  }

  setEmail(email: string): void {
    localStorage.setItem(EMAIL_KEY, email);
    this.email.set(email);
  }

  /** Drops the account token but keeps the anonymous visitor id (free-view tracking). */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    this.registered.set(false);
    this.email.set(null);
  }

  /** Reads a signal internally, so calling this inside a computed() tracks it reactively. */
  isRegistered(): boolean {
    return this.registered();
  }

  /** Uppercased first letter of the registered email, or null if not registered — drives the header's profile icon. */
  initial(): string | null {
    const email = this.email();
    return email ? email.charAt(0).toUpperCase() : null;
  }
}
