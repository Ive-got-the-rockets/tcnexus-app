import { Inject, Injectable, InjectionToken, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { VisitorService } from './visitor.service';

const PENDING_KEY = 'tcnexus_tc_login';
export interface TcAuthBrowser {
  currentPath(): string; read(): string | null; save(value: string): void; clear(): void; navigate(url: string): void;
}
export const TC_AUTH_BROWSER = new InjectionToken<TcAuthBrowser>('TC_AUTH_BROWSER', { providedIn: 'root', factory: () => ({
  currentPath: () => location.pathname + location.search,
  read: () => sessionStorage.getItem(PENDING_KEY), save: value => sessionStorage.setItem(PENDING_KEY, value),
  clear: () => sessionStorage.removeItem(PENDING_KEY), navigate: url => location.assign(url),
}) });
function safeReturnPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') &&
    !/[\\\r\n]/.test(value) && !value.startsWith('/tc-auth/') ? value : '/';
}

@Injectable({ providedIn: 'root' })
export class TradeCheetahAuthService {
  readonly available = signal(false);
  readonly busy = signal(false);
  private readonly base = `${environment.apiBaseUrl}/tc-auth`;
  constructor(private http: HttpClient, private visitor: VisitorService, @Inject(TC_AUTH_BROWSER) private browser: TcAuthBrowser) {
    this.http.get<{ enabled: boolean }>(`${this.base}/settings`).subscribe({ next: data => this.available.set(data?.enabled === true), error: () => this.available.set(false) });
  }
  async start(): Promise<void> {
    if (!this.available() || this.busy()) throw new Error('TradeCheetah sign-in is not available.');
    this.busy.set(true);
    try {
      const proof = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(proof));
      const challenge = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const response = await firstValueFrom(this.http.post<{ state: string; authorization_url: string }>(`${this.base}/start`, { browser_challenge: challenge }));
      const url = new URL(response.authorization_url);
      if (url.origin !== 'https://api.tradecheetah.com' || url.pathname !== '/_allauth/identity/o/authorize' ||
          !/^[a-f0-9]{64}$/.test(response.state) || url.searchParams.get('state') !== response.state || url.username || url.password) throw new Error('Invalid sign-in response.');
      this.browser.save(JSON.stringify({ state: response.state, proof, created: Date.now(), returnTo: safeReturnPath(this.browser.currentPath()) }));
      this.browser.navigate(url.href);
    } catch { throw new Error('Unable to start TradeCheetah sign-in. Please try again.'); }
    finally { this.busy.set(false); }
  }
  async complete(query: URLSearchParams): Promise<string> {
    const raw = this.browser.read();
    this.browser.clear(); // A callback attempt is one-shot in this tab, including errors.
    let pending: { state: string; proof: string; created: number; returnTo: string };
    try { pending = JSON.parse(raw ?? 'null'); } catch { throw new Error('Please start sign-in again.'); }
    if (!pending || query.has('error') || query.getAll('state').length !== 1 || query.getAll('code').length !== 1 ||
        !/^[a-f0-9]{64}$/.test(pending.state) || !/^[a-f0-9]{64}$/.test(pending.proof) || query.get('state') !== pending.state ||
        !query.get('code') || !Number.isFinite(pending.created) || Date.now() - pending.created > 300000 || pending.created > Date.now()) throw new Error('Sign-in expired or was cancelled. Please start again.');
    const result = await firstValueFrom(this.http.post<{ success: boolean; token: string; user_id: number; email?: string }>(`${this.base}/exchange`, {
      state: pending.state, code: query.get('code'), browser_proof: pending.proof,
    }));
    if (result?.success !== true || typeof result.token !== 'string' || !result.token || !Number.isSafeInteger(result.user_id) || result.user_id <= 0) throw new Error('Sign-in could not be verified.');
    this.visitor.setToken(result.token);
    this.visitor.setEmail(typeof result.email === 'string' ? result.email : '');
    this.visitor.setLearnerId(result.user_id);
    return safeReturnPath(pending.returnTo);
  }
}
