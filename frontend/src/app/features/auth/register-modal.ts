import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, isDevMode, signal, viewChild } from '@angular/core';

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
  protected readonly animationTestMode = isDevMode() && new URLSearchParams(window.location.search).get('popup-preview') === 'register';
  protected readonly previewEpisodes = (() => {
    const count = isDevMode() ? Number(new URLSearchParams(window.location.search).get('episodes') ?? 15) : 15;
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 15;
  })();
  protected readonly authModal = inject(AuthModalService);
  protected readonly visitor = inject(VisitorService);
  private readonly accessService = inject(AccessService);

  protected readonly settings = signal<RegistrationSettings>(DEFAULT_REGISTRATION_SETTINGS);

  protected readonly status = signal<SubmitStatus>('idle');
  protected readonly membershipRevealed = signal(false);
  protected readonly oneMoreThing = signal(false);
  private previewTimers: ReturnType<typeof setTimeout>[] = [];
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly annualBilling = signal(false);
  protected readonly priceVersion = signal(0);
  private successCloseTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearPreviewTimers());
    this.accessService.registrationSettings$.subscribe((settings) => this.settings.set(settings));
  }

  protected close(): void {
    this.clearPreviewTimers();
    this.oneMoreThing.set(false);
    if (this.successCloseTimer) {
      clearTimeout(this.successCloseTimer);
      this.successCloseTimer = null;
    }
    this.authModal.close();
    this.membershipRevealed.set(false);
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

  protected revealMembership(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    if (!this.animationTestMode && !form.reportValidity()) return;
    if (this.status() === 'submitting' || this.status() === 'success') return;
    // Simulate creation for the frontend prototype; no registration request is sent.
    this.status.set('submitting');
    this.previewTimers.push(setTimeout(() => this.status.set('success'), 1200));
    this.previewTimers.push(setTimeout(() => this.oneMoreThing.set(true), 2100));
    this.previewTimers.push(setTimeout(() => this.membershipRevealed.set(true), 4400));
  }

  private clearPreviewTimers(): void {
    this.previewTimers.forEach(clearTimeout);
    this.previewTimers = [];
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
