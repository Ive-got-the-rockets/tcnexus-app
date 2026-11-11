// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TcLensConnection } from './tc-lens-connection';
import { TcLensHostBridge } from './tc-lens-host-bridge';
import { TC_APP_ORIGIN } from './tc-lens-pane-session';
import type { TcLensTimelineEvent } from '../../core/models';

const events: TcLensTimelineEvent[] = [10, 11, 20].map((time, index) => ({
  id: `simulation-${index}`, messageType: 'llm', startTime: time, endTime: null,
  data: { question: `Explain cue ${index}`, sceneContext: '', learningLevel: 'beginner' },
}));
const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(fn => fn()); localStorage.clear(); });

function simulation() {
  let learner: string | null = '7';
  const post = vi.fn();
  const source = { postMessage: post } as unknown as Window;
  const frame = { contentWindow: source } as HTMLIFrameElement;
  const status = vi.fn();
  const bridge = new TcLensHostBridge(66, events, message => source.postMessage(message, TC_APP_ORIGIN), status);
  const connection = new TcLensConnection(() => frame, () => learner, () => bridge);
  cleanup.push(() => { connection.dispose(); bridge.dispose(); });
  const receive = (data: object, origin = TC_APP_ORIGIN, sender = source) => window.dispatchEvent(new MessageEvent('message', { origin, source: sender, data }));
  const auth = (state: string) => receive({ type: 'tc-lens-auth', state });
  const prompts = () => post.mock.calls.map(call => call[0]).filter(message => message.type === 'tc-lens-time-update');
  const ack = (state: string, reason?: string) => receive({ type: 'tc-lens-ack', videoId: '66', chapter: prompts().at(-1)?.chapter, state, reason });
  connection.loaded(); bridge.open(0); bridge.advance(0, 12);
  return { bridge, connection, post, receive, auth, prompts, ack, status, switchLearner: (id: string | null) => { learner = id; window.dispatchEvent(new Event('tcnexus-identity-change')); } };
}

describe('real connection and bridge with a simulated TradeCheetah app', () => {
  it('waits for sign-in and finished replies, ignoring forged frames and duplicate replies', () => {
    const app = simulation();
    expect(app.prompts()).toHaveLength(0);
    app.auth('anonymous'); app.auth('authenticated');
    expect(app.prompts()).toHaveLength(1);
    const first = app.prompts()[0];
    const reply = { type: 'tc-lens-ack', videoId: '66', chapter: first.chapter, state: 'finished' };
    app.receive(reply, 'https://untrusted.example');
    app.receive(reply, TC_APP_ORIGIN, {} as Window);
    app.ack('running'); expect(app.prompts()).toHaveLength(1);
    app.receive(reply); expect(app.prompts()).toHaveLength(2);
    app.receive(reply); expect(app.prompts()).toHaveLength(2);
    expect(app.prompts().every(message => message.workflow === 'ask')).toBe(true);
    expect(app.post.mock.calls.every(call => call[1] === TC_APP_ORIGIN)).toBe(true);
  });
  it.each(['busy', 'agent_unavailable'])('stops queued work on %s without unsafe retry', reason => {
    const app = simulation(); app.auth('anonymous'); app.auth('authenticated');
    app.ack('error', reason); app.bridge.advance(12, 21);
    expect(app.prompts()).toHaveLength(1);
    expect(app.status).toHaveBeenLastCalledWith(reason);
  });
  it('drops the previous learner queue and ignores their late reply after account switching', () => {
    const app = simulation(); app.auth('anonymous'); app.auth('authenticated');
    app.switchLearner('8'); app.ack('finished');
    app.auth('authenticated'); // stale provider session cannot claim a new owner
    expect(app.post).toHaveBeenCalledWith({ type: 'tc-lens-signout' }, TC_APP_ORIGIN);
    app.auth('anonymous'); app.auth('authenticated');
    expect(localStorage.getItem('tcPaneOwner')).toBe('8');
    expect(app.prompts()).toHaveLength(1);
    app.bridge.advance(12, 21); expect(app.prompts()).toHaveLength(2);
    app.switchLearner(null); app.ack('finished');
    expect(app.prompts()).toHaveLength(2);
  });
  it('signs out on a cross-tab owner change and resumes only after a fresh valid sign-in', () => {
    const app = simulation(); app.auth('anonymous'); app.auth('authenticated');
    localStorage.setItem('tcPaneOwner', '8');
    window.dispatchEvent(new StorageEvent('storage', { key: 'tcPaneOwner', newValue: '8' }));
    app.ack('finished'); expect(app.prompts()).toHaveLength(1);
    app.auth('anonymous'); app.auth('authenticated'); expect(app.prompts()).toHaveLength(2);
  });
});
