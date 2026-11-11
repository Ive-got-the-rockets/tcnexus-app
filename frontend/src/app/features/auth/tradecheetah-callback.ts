import { Component, afterNextRender, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TradeCheetahAuthService } from '../../core/tradecheetah-auth';

@Component({
  selector: 'app-tradecheetah-callback', imports: [RouterLink],
  template: `<main><h1>{{ failed() ? 'Sign-in could not be completed' : 'Completing sign-in…' }}</h1>
    <p role="status">{{ failed() ? 'Return to Nexus and start sign-in again. Your existing account has not been changed.' : 'Please keep this page open.' }}</p>
    @if (failed()) { <a routerLink="/">Return to Nexus</a> }</main>`,
  styles: [`:host{display:grid;min-height:100dvh;place-items:center;background:#10161e;color:#f5f7fb}main{max-width:36rem;padding:2rem}h1{font-size:1.5rem}a{color:#8fd8c2}`],
})
export class TradeCheetahCallbackPage {
  private readonly auth = inject(TradeCheetahAuthService);
  private readonly router = inject(Router);
  protected readonly failed = signal(false);
  constructor() {
    // Remove the temporary provider code before making the exchange request or navigating.
    const query = new URLSearchParams(location.search);
    history.replaceState(history.state, '', '/tc-auth/callback');
    afterNextRender(async () => {
      try { await this.router.navigateByUrl(await this.auth.complete(query), { replaceUrl: true }); }
      catch { this.failed.set(true); }
    });
  }
}
