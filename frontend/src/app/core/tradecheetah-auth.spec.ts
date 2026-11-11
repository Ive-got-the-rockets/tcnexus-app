// @vitest-environment jsdom
import '@angular/compiler';
import { webcrypto } from 'node:crypto';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@angular/common/http';
import { TradeCheetahAuthService, type TcAuthBrowser } from './tradecheetah-auth';
import { VisitorService } from './visitor.service';

afterEach(() => vi.unstubAllGlobals());
function setup() {
  vi.stubGlobal('crypto', webcrypto);
  localStorage.clear();
  let pending: string | null = null;
  const navigate = vi.fn();
  const browser: TcAuthBrowser = { currentPath: () => '/courses/55/lessons/66?level=advanced', read: () => pending, save: value => { pending = value; }, clear: () => { pending = null; }, navigate };
  const post = vi.fn((url: string) => of(url.endsWith('/start') ? { state: 'a'.repeat(64), authorization_url: `https://api.tradecheetah.com/_allauth/identity/o/authorize?state=${'a'.repeat(64)}` } : { success: true, token: 'nexus-session', user_id: 7, email: '' }));
  const http = { get: () => of({ enabled: true }), post } as unknown as HttpClient;
  const visitor = new VisitorService();
  const service = new TradeCheetahAuthService(http, visitor, browser);
  return { service, visitor, post, navigate, browser };
}
describe('TradeCheetah browser sign-in', () => {
  it('stores proof only in this tab, exchanges the callback and restores the selected lesson', async () => {
    const s = setup();
    try {
      await s.service.start();
      expect(s.navigate).toHaveBeenCalledWith(expect.stringContaining('https://api.tradecheetah.com/_allauth/identity/o/authorize'));
      expect(s.post.mock.calls[0][1]).toEqual({ browser_challenge: expect.stringMatching(/^[a-f0-9]{64}$/) });
      const returnTo = await s.service.complete(new URLSearchParams({ state: 'a'.repeat(64), code: 'code-only' }));
      expect(returnTo).toBe('/courses/55/lessons/66?level=advanced');
      expect(s.visitor.getLearnerId()).toBe('7');
      expect(s.visitor.getToken()).toBe('nexus-session');
      expect(s.browser.read()).toBeNull();
      await expect(s.service.complete(new URLSearchParams({ state: 'a'.repeat(64), code: 'code-only' }))).rejects.toThrow();
    } finally { s.visitor.ngOnDestroy(); }
  });
  it('rejects mismatched state, expired tabs and provider errors without changing the old session', async () => {
    const s = setup();
    try {
      s.visitor.setToken('existing-session'); await s.service.start();
      await expect(s.service.complete(new URLSearchParams({ state: 'b'.repeat(64), code: 'code' }))).rejects.toThrow();
      expect(s.post).toHaveBeenCalledTimes(1); expect(s.visitor.getToken()).toBe('existing-session');
      await s.service.start();
      const pending = JSON.parse(s.browser.read()!); pending.created = 0; s.browser.save(JSON.stringify(pending));
      await expect(s.service.complete(new URLSearchParams({ state: 'a'.repeat(64), code: 'code' }))).rejects.toThrow();
      await s.service.start();
      await expect(s.service.complete(new URLSearchParams({ error: 'access_denied', state: 'a'.repeat(64) }))).rejects.toThrow();
      expect(s.post).toHaveBeenCalledTimes(3);
    } finally { s.visitor.ngOnDestroy(); }
  });
});
