import { Injectable, signal } from '@angular/core';

/** Lets any component (currently just the header's profile icon) open the shared register modal. */
@Injectable({ providedIn: 'root' })
export class AuthModalService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
