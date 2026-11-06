import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, computed, inject, isDevMode, signal, viewChild } from '@angular/core';
import { normalizePopupEditor, PopupEditorSettings } from '../../core/popup-editor-settings';

import { AccessService } from '../../core/access.service';
import { AuthModalService } from '../../core/auth-modal.service';
import { VisitorService } from '../../core/visitor.service';
import { TradeCheetahAuthService } from '../../core/tradecheetah-auth';
import { annualPrice, DEFAULT_REGISTRATION_SETTINGS } from '../../core/registration-settings';
import { RegistrationSettings } from '../../core/models';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-register-modal',
  templateUrl: './register-modal.html',
  styleUrl: './register-modal.scss'
})
export class RegisterModal {
  // Temporary frontend test mode, including the live site, until backend integration.
  protected readonly animationTestMode = true;
  protected readonly previewEpisodes = (() => {
    const count = isDevMode() ? Number(new URLSearchParams(window.location.search).get('episodes') ?? 15) : 15;
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 15;
  })();
  protected readonly authModal = inject(AuthModalService);
  protected readonly visitor = inject(VisitorService);
  protected readonly tradeCheetahAuth = inject(TradeCheetahAuthService);
  private readonly accessService = inject(AccessService);

  protected readonly settings = signal<RegistrationSettings>(DEFAULT_REGISTRATION_SETTINGS);
  protected readonly editor = computed(() => normalizePopupEditor(this.settings().editor));
  protected copy(key: keyof PopupEditorSettings): string {
    const data = this.editor();
    return String(data[key]).replace(/\{(episodes|annual|monthly|membership|store)\}/g, (_, token: keyof PopupEditorSettings) => String(data[token]));
  }
  protected savingsParts(): { text: string; discount: boolean }[] {
    return this.copy('savings').split(/(\d+%)/g).map(text => ({ text, discount: /^\d+%$/.test(text) }));
  }
  protected readonly popupStyles = computed(() => {
    const data = this.editor();
    return {
      '--popup-image': `url(${JSON.stringify(data.image)})`,
      '--popup-fit': data.fit,
      '--popup-width': `${data.width}px`,
      '--popup-overlay': String(data.firstOpacity / 100),
      '--popup-offer-overlay': String(data.offerOpacity / 100),
      '--popup-coverage': `${data.coverage}%`,
      '--popup-text': data.textColor,
      '--popup-cyan': data.cyan,
      '--popup-shine': data.shine,
      '--popup-shimmer': data.shimmer ? 'running' : 'paused',
      '--popup-body-size': `${data.bodySize}px`,
      '--popup-discount-size': `${data.discountSize}px`,
      '--popup-footer-size': `${data.footerSize}px`,
    };
  });

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
  protected async signInWithTradeCheetah(): Promise<void> {
    this.errorMessage.set(null);
    try { await this.tradeCheetahAuth.start(); }
    catch { this.errorMessage.set('Unable to start TradeCheetah sign-in. Please try again.'); }
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

  protected yearlyTotal(monthly: number): number {
    return this.tierPrice(monthly) * 12;
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
    const { creatingMs, successMs, transitionMs } = this.editor();
    this.previewTimers.push(setTimeout(() => this.status.set('success'), creatingMs));
    this.previewTimers.push(setTimeout(() => this.oneMoreThing.set(true), creatingMs + successMs));
    this.previewTimers.push(setTimeout(() => this.membershipRevealed.set(true), creatingMs + successMs + transitionMs));
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
