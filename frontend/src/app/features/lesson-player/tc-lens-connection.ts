import { TcLensPaneSession, TC_APP_ORIGIN } from './tc-lens-pane-session';
import type { TcLensHostBridge } from './tc-lens-host-bridge';

/** One connection owns one exact app frame; neither other frames nor origins can control it. */
export class TcLensConnection {
  private readonly pane: TcLensPaneSession;
  private learner: string | null = null;
  private readonly onMessage = (event: MessageEvent): void => {
    if (event.origin !== TC_APP_ORIGIN || !this.frame()?.contentWindow || event.source !== this.frame()?.contentWindow) return;
    if (this.pane.handle(event)) return;
    if (event.data?.type === 'tc-lens-ack') this.bridge()?.handleIncoming(event.data);
  };
  private readonly onIdentity = (): void => {
    const learner = this.identity();
    if (learner === this.learner) return;
    const previous = this.learner;
    this.learner = learner;
    if (previous !== null) this.bridge()?.clearForLearnerChange();
    this.pane.setLearner(learner);
  };
  private readonly onStorage = (event: StorageEvent): void => {
    if (event.key === 'tcPaneOwner' && this.pane.authenticated && event.newValue !== this.learner) this.pane.signOut();
  };
  constructor(
    private frame: () => HTMLIFrameElement | null,
    private identity: () => string | null,
    private bridge: () => TcLensHostBridge | null,
    private host: Window = window,
  ) {
    this.pane = new TcLensPaneSession(() => this.frame()?.contentWindow ?? null,
      { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key) },
      message => this.frame()?.contentWindow?.postMessage(message, TC_APP_ORIGIN),
      authenticated => this.bridge()?.setAuthenticated(authenticated));
    this.host.addEventListener('message', this.onMessage);
    window.addEventListener('tcnexus-identity-change', this.onIdentity);
    window.addEventListener('storage', this.onStorage);
    this.onIdentity();
  }
  loading(): void {
    this.pane.loading();
    this.bridge()?.markNotReady();
  }
  loaded(): void {
    this.bridge()?.markReady();
    this.sync();
  }
  sync(): void { this.onIdentity(); this.bridge()?.setAuthenticated(this.pane.authenticated); }
  dispose(): void {
    this.host.removeEventListener('message', this.onMessage);
    window.removeEventListener('tcnexus-identity-change', this.onIdentity);
    window.removeEventListener('storage', this.onStorage);
  }
}
