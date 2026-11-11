// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { TcLensConnection } from './tc-lens-connection';
import type { TcLensHostBridge } from './tc-lens-host-bridge';

describe('pane connection lifecycle', () => {
  it('keeps an early authentication event across iframe load and clears on account change', () => {
    localStorage.clear();
    let learner: string | null = null;
    const source = { postMessage: vi.fn() } as unknown as Window;
    const frame = { contentWindow: source } as HTMLIFrameElement;
    const bridge = { setAuthenticated: vi.fn(), markReady: vi.fn(), markNotReady: vi.fn(), clearForLearnerChange: vi.fn(), handleIncoming: vi.fn() };
    const connection = new TcLensConnection(() => frame, () => learner, () => bridge as unknown as TcLensHostBridge);
    learner = '7'; window.dispatchEvent(new Event('tcnexus-identity-change'));
    expect(bridge.clearForLearnerChange).not.toHaveBeenCalled();
    const auth = (state: string) => window.dispatchEvent(new MessageEvent('message', { origin: 'https://app.tradecheetah.com', source, data: { type: 'tc-lens-auth', state } }));
    auth('anonymous'); auth('authenticated'); connection.loaded();
    expect(bridge.setAuthenticated).toHaveBeenLastCalledWith(true);
    window.dispatchEvent(new MessageEvent('message', { origin: 'https://other.example', source, data: { type: 'tc-lens-ack' } }));
    expect(bridge.handleIncoming).not.toHaveBeenCalled();
    learner = '8'; window.dispatchEvent(new Event('tcnexus-identity-change'));
    expect(bridge.clearForLearnerChange).toHaveBeenCalledTimes(1);
    expect(source.postMessage).toHaveBeenCalledWith({ type: 'tc-lens-signout' }, 'https://app.tradecheetah.com');
    connection.dispose();
    bridge.setAuthenticated.mockClear(); auth('anonymous'); expect(bridge.setAuthenticated).not.toHaveBeenCalled();
  });
});
