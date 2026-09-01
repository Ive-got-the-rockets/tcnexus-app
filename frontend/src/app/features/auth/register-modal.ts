import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';

import { AccessService } from '../../core/access.service';
import { AuthModalService } from '../../core/auth-modal.service';
import { VisitorService } from '../../core/visitor.service';
import { annualPrice, DEFAULT_REGISTRATION_SETTINGS } from '../../core/registration-settings';
import { RegistrationSettings } from '../../core/models';

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

  protected readonly settings = signal<RegistrationSettings>(DEFAULT_REGISTRATION_SETTINGS);

  protected readonly status = signal<SubmitStatus>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly annualBilling = signal(false);
  protected readonly priceVersion = signal(0);
  private successCloseTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  constructor() {
    this.accessService.registrationSettings$.subscribe((settings) => this.settings.set(settings));
  }

  protected close(): void {
    if (this.successCloseTimer) {
      clearTimeout(this.successCloseTimer);
      this.successCloseTimer = null;
    }
    this.authModal.close();
    this.annualBilling.set(false);
    this.priceVersion.update((version) => version + 1);
    // Reset so reopening later starts fresh instead of showing stale success/error state.
    this.status.set('idle');
    this.errorMessage.set(null);
  }

  protected openRegister(): void {
    this.status.set('idle');
    this.errorMessage.set(null);
    this.authModal.open('register');
  }

  protected setBilling(annual: boolean): void {
    if (this.annualBilling() === annual) return;
    this.annualBilling.set(annual);
    this.priceVersion.update((version) => version + 1);
  }

  protected tierPrice(monthly: number): number {
    return this.annualBilling() ? annualPrice(monthly, this.settings().pricing.save_percent) : monthly;
  }

  protected priceDigits(monthly: number): string[] {
    return Array.from(String(this.tierPrice(monthly)));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const email = this.emailInput()?.nativeElement.value.trim();
    if (!email) return;

    this.status.set('submitting');
    this.errorMessage.set(null);

    this.accessService.register(email).subscribe({
      next: () => {
        this.status.set('success');
        this.scheduleSuccessClose();
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
        this.status.set('success');
        this.scheduleSuccessClose();
      },
      error: (err: HttpErrorResponse) => {
        this.status.set('error');
        this.errorMessage.set(err.status === 401 ? 'Email or password is incorrect.' : 'Something went wrong — try again.');
      }
    });
  }

  private scheduleSuccessClose(): void {
    if (this.successCloseTimer) clearTimeout(this.successCloseTimer);
    this.successCloseTimer = setTimeout(() => this.close(), 1200);
  }
}
