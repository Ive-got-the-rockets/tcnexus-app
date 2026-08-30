import { Injectable, signal } from '@angular/core';

export type AuthModalMode = 'register' | 'final_free' | 'login';

/** Lets any component open the shared create-profile / log-in modal. */
@Injectable({ providedIn: 'root' })
export class AuthModalService {
  readonly isOpen = signal(false);
  readonly mode = signal<AuthModalMode>('register');

  open(mode: AuthModalMode = 'register'): void {
    this.mode.set(mode);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
