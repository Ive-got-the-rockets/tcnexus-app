import type { TcLensTimelineEvent } from '../../core/models';
import { buildEmbedPrompt, type TcLensEmbedMessage } from './tc-lens-embed-protocol';

/** Host-owned timeline; the embedded app only receives resolved text prompts. */
export class TcLensHostBridge {
  private pending: TcLensEmbedMessage[] = [];
  private inFlight: TcLensEmbedMessage | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sentIds = new Set<string>();
  private ready = false;
  private active = false;
  private stopped = false;
  private sequence = 0;

  constructor(
    private lessonId: number | string,
    private events: TcLensTimelineEvent[],
    private readonly post: (message: TcLensEmbedMessage) => void,
    private readonly status: (message: string) => void = () => {},
  ) {}

  open(currentTime: number): void {
    if (this.active) return;
    this.active = true;
    this.stopped = false;
    this.sentIds.clear();
    this.status('');
    if (this.inFlight) this.startTimer();
    this.enqueue(this.events.filter(event => event.startTime === currentTime || this.activeTrade(event, currentTime)));
  }

  close(_currentTime: number): void {
    this.active = false;
    this.pending = [];
    this.clearTimer();
  }

  advance(previousTime: number, currentTime: number): void {
    if (!this.active || this.stopped || currentTime <= previousTime) return;
    this.enqueue(this.events.filter(event => previousTime < event.startTime && event.startTime <= currentTime));
  }

  seek(currentTime: number): void {
    if (!this.active || this.stopped) return;
    this.pending = [];
    this.enqueue(this.events.filter(event => this.activeTrade(event, currentTime)));
  }

  resetLesson(lessonId: number | string, events: TcLensTimelineEvent[]): void {
    this.dispose();
    this.lessonId = lessonId;
    this.events = events;
    this.sentIds.clear();
    this.ready = false;
  }

  markReady(): void { this.ready = true; this.flush(); }
  markNotReady(): void { this.ready = false; }
  dispose(): void { this.close(0); this.inFlight = null; }

  handleIncoming(value: unknown): boolean {
    if (!value || typeof value !== 'object' || !this.inFlight) return false;
    const message = value as Record<string, unknown>;
    if (message['type'] !== 'tc-lens-ack' || message['videoId'] !== this.inFlight.videoId ||
        message['chapter'] !== this.inFlight.chapter ||
        !['running', 'finished', 'rejected', 'error'].includes(String(message['state']))) return false;
    if (message['state'] === 'running') return true;
    this.clearTimer();
    this.inFlight = null;
    if (message['state'] !== 'finished') {
      this.pending = [];
      this.stopped = true;
      this.status(typeof message['reason'] === 'string' ? message['reason'] : 'TC Lens could not complete this prompt.');
    } else {
      this.status('');
      this.flush();
    }
    return true;
  }

  private activeTrade(event: TcLensTimelineEvent, currentTime: number): boolean {
    return event.messageType === 'trade' && event.startTime <= currentTime &&
      (event.endTime === null || currentTime < event.endTime);
  }

  private enqueue(events: TcLensTimelineEvent[]): void {
    for (const event of [...events].sort((a, b) => a.startTime - b.startTime)) {
      if (this.sentIds.has(event.id)) continue;
      this.sentIds.add(event.id);
      const message = buildEmbedPrompt(this.lessonId, `cue-${++this.sequence}`, event);
      if (message) this.pending.push(message);
    }
    this.flush();
  }

  private flush(): void {
    if (!this.ready || !this.active || this.stopped || this.inFlight || !this.pending.length) return;
    this.inFlight = this.pending.shift()!;
    this.startTimer();
    this.post(this.inFlight);
  }

  private startTimer(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.status('No response from TC Lens. Check the app connection and sign in inside the panel.');
    }, 90000);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
