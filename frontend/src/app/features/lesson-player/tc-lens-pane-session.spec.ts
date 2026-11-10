import { describe, it, expect, vi } from 'vitest';
import { TcLensPaneSession } from './tc-lens-pane-session';
const origin = 'https://app.tradecheetah.com';
function setup(owner: string | null = null) {
  const frame = {} as Window;
  const values = new Map<string, string>(); if (owner) values.set('tcPaneOwner', owner);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const post = vi.fn(); const auth = vi.fn();
  const pane = new TcLensPaneSession(() => frame, storage, post, auth);
  const send = (state: string, source = frame, from = origin) => pane.handle({ origin: from, source, data: { type: 'tc-lens-auth', state } });
  return { pane, values, post, auth, send };
}
describe('pane ownership', () => {
  it('allows an interactive sign-in for the verified current learner', () => {
    const x = setup(); x.pane.setLearner('7'); x.post.mockClear();
    x.send('anonymous'); x.send('authenticated');
    expect(x.values.get('tcPaneOwner')).toBe('7'); expect(x.auth).toHaveBeenLastCalledWith(true);
  });
  it('signs out an old owner, anonymous Nexus visitor and changed learner', () => {
    const x = setup('7'); x.pane.setLearner('8'); x.post.mockClear(); x.send('authenticated');
    expect(x.post).toHaveBeenCalledWith({ type: 'tc-lens-signout' });
    x.send('anonymous'); x.send('authenticated'); x.post.mockClear(); x.pane.setLearner(null);
    expect(x.post).toHaveBeenCalledWith({ type: 'tc-lens-signout' });
    expect(x.auth).toHaveBeenLastCalledWith(false);
  });
  it('accepts an existing matching owner but ignores another iframe or origin', () => {
    const x = setup('7'); x.pane.setLearner('7'); x.send('authenticated');
    expect(x.auth).toHaveBeenLastCalledWith(true); x.auth.mockClear();
    x.send('anonymous', {} as Window); x.send('anonymous', undefined, 'https://other.example');
    expect(x.auth).not.toHaveBeenCalled();
  });
});
