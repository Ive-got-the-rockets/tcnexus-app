import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';

import { AccessService } from '../../core/access.service';
import { AuthModalService } from '../../core/auth-modal.service';
import { VisitorService } from '../../core/visitor.service';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-register-modal',
  templateUrl: './register-modal.html',
  styleUrl: './register-modal.scss'
})
export class RegisterModal {
  protected readonly authModal = inject(AuthModalService);
  protected readonly visitor = inject(VisitorService);
  private readonly accessService = inject(AccessService);

  protected readonly status = signal<SubmitStatus>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submittedEmail = signal('');

  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  protected close(): void {
    this.authModal.close();
    // Reset so reopening later starts fresh instead of showing stale success/error state.
    this.status.set('idle');
    this.errorMessage.set(null);
    this.submittedEmail.set('');
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const email = this.emailInput()?.nativeElement.value.trim();
    if (!email) return;

    this.status.set('submitting');
    this.errorMessage.set(null);

    this.accessService.register(email).subscribe({
      next: () => {
        this.submittedEmail.set(email);
        this.status.set('success');
      },
      error: (err: HttpErrorResponse) => {
        this.status.set('error');
        this.errorMessage.set(err.status === 409 ? 'This email is already registered. Use Log In instead.' : 'Something went wrong — try again.');
      }
    });
  }

  protected submitLogin(event: Event): void {
    event.preventDefault();
    const email = this.emailInput()?.nativeElement.value.trim();
    const password = this.passwordInput()?.nativeElement.value ?? '';
    if (!email || !password) return;

    this.status.set('submitting');
    this.errorMessage.set(null);

    this.accessService.login(email, password).subscribe({
      next: () => {
        this.submittedEmail.set(email);
        this.status.set('success');
      },
      error: (err: HttpErrorResponse) => {
        this.status.set('error');
        this.errorMessage.set(err.status === 401 ? 'Email or password is incorrect.' : 'Something went wrong — try again.');
      }
    });
  }
}
