// @vitest-environment jsdom
import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext, type EnvironmentInjector } from '@angular/core';
import type { HttpClient } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { VisitorService } from './visitor.service';
import { AccessService } from './access.service';

describe('verified learner identity', () => {
  it('never restores a learner identity from browser-stored email and clears it synchronously on logout', () => {
    localStorage.clear(); localStorage.setItem('tcnexus_email', 'person@example.invalid'); localStorage.setItem('tcnexus_token', 'test-token');
    const visitor = new VisitorService();
    expect(visitor.getLearnerId()).toBeNull(); visitor.setLearnerId(7);
    expect(visitor.getLearnerId()).toBe('7');
    const onIdentity = vi.fn(() => expect(visitor.getLearnerId()).toBeNull());
    window.addEventListener('tcnexus-identity-change', onIdentity);
    visitor.logout(); expect(onIdentity).toHaveBeenCalled(); expect(visitor.isRegistered()).toBe(false);
    window.removeEventListener('tcnexus-identity-change', onIdentity); visitor.ngOnDestroy();
  });
  it('ignores a late session response or failure from a different Nexus login', () => {
    localStorage.clear(); const visitor = new VisitorService(); visitor.setToken('old-token');
    const http = { get: vi.fn(() => of({})), post: vi.fn() };
    const injector = createEnvironmentInjector([], null as unknown as EnvironmentInjector);
    const access = runInInjectionContext(injector, () => new AccessService(http as unknown as HttpClient, visitor));
    const oldRequest = new Subject<unknown>(); http.get.mockReturnValue(oldRequest);
    access.validateSession().subscribe({ error: () => {} });
    visitor.setToken('new-token'); visitor.setLearnerId(8);
    oldRequest.next({ viewer_tier: 'paid', user_id: 7 });
    expect(visitor.getLearnerId()).toBe('8');
    oldRequest.error(new Error('old request failed'));
    expect(visitor.isRegistered()).toBe(true); expect(visitor.getLearnerId()).toBe('8');
    injector.destroy(); visitor.ngOnDestroy();
  });
});
