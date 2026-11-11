export const TC_APP_ORIGIN = 'https://app.tradecheetah.com';
type PaneStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Policy only: callers provide a server-verified learner, never an email-derived identity. */
export class TcLensPaneSession {
  private learner: string | null = null;
  private state: string | null = null;
  authenticated = false;
  constructor(
    private frame: () => Window | null,
    private storage: PaneStorage,
    private post: (message: { type: 'tc-lens-signout' }) => void,
    private auth: (authenticated: boolean) => void,
  ) {}

  setLearner(learner: string | null): void {
    if (learner === this.learner) return;
    const previous = this.learner;
    this.learner = learner;
    if (previous !== null || learner === null) this.signOut();
    else this.setAuthenticated(false);
  }

  loading(): void { this.state = null; this.setAuthenticated(false); }
  signOut(): void {
    this.state = null;
    this.setAuthenticated(false);
    this.post({ type: 'tc-lens-signout' });
  }
  handle(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>): boolean {
    if (event.origin !== TC_APP_ORIGIN || !this.frame() || event.source !== this.frame() || event.data?.type !== 'tc-lens-auth') return false;
    const state = event.data.state;
    if (state !== 'authenticated' && state !== 'anonymous') return false;
    if (state === 'authenticated') {
      try {
        if (this.state === 'anonymous' && this.learner) this.storage.setItem('tcPaneOwner', this.learner);
        if (!this.learner || this.storage.getItem('tcPaneOwner') !== this.learner) {
          this.signOut(); return true;
        }
        this.setAuthenticated(true);
      } catch { this.signOut(); return true; }
    } else this.setAuthenticated(false);
    this.state = state;
    return true;
  }
  private setAuthenticated(value: boolean): void { this.authenticated = value; this.auth(value); }
}
