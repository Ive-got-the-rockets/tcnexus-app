import type { TcLensTimelineEvent } from '../../core/models';
import type { TcLensAckMessage, TcLensOutboundMessage } from './tc-lens-message';
import { TcLensSessionEngine } from './tc-lens-session';

type PostMessage = (message: TcLensOutboundMessage) => void;

export class TcLensHostBridge {
  private readonly engine: TcLensSessionEngine;
  private readonly post: PostMessage;
  private readonly pending: TcLensOutboundMessage[] = [];
  private readonly acknowledgedEventIds = new Set<string>();
  private ready = false;
  private activeSessionId: string | null = null;

  constructor(
    lessonId: number | string,
    events: TcLensTimelineEvent[],
    post: PostMessage,
    createSessionId?: () => string,
  ) {
    this.engine = new TcLensSessionEngine(lessonId, events, createSessionId);
    this.post = post;
  }

  open(currentTime: number): void {
    const messages = this.engine.open(currentTime);
    this.activeSessionId = messages[0]?.type === 'tc-lens-session-start' ? messages[0].sessionId : null;
    this.acknowledgedEventIds.clear();
    this.enqueue(messages);
  }

  close(currentTime: number): void {
    this.enqueue(this.engine.close(currentTime));
    this.activeSessionId = null;
  }

  advance(previousTime: number, currentTime: number): void {
    this.enqueue(this.engine.advance(previousTime, currentTime));
  }

  seek(currentTime: number): void {
    this.enqueue(this.engine.seek(currentTime));
  }

  resetLesson(lessonId: number | string, events: TcLensTimelineEvent[]): void {
    this.engine.resetLesson(lessonId, events);
    this.pending.length = 0;
    this.acknowledgedEventIds.clear();
    this.activeSessionId = null;
  }

  markReady(): void {
    this.ready = true;
    this.flush();
  }

  markNotReady(): void {
    this.ready = false;
  }

  handleIncoming(message: TcLensAckMessage): boolean {
    if (message.type !== 'tc-lens-ack' || !this.activeSessionId || message.sessionId !== this.activeSessionId || !message.eventId) return false;
    this.acknowledgedEventIds.add(message.eventId);
    return true;
  }

  private enqueue(messages: TcLensOutboundMessage[]): void {
    this.pending.push(...messages);
    this.flush();
  }

  private flush(): void {
    if (!this.ready) return;
    while (this.pending.length) {
      this.post(this.pending.shift() as TcLensOutboundMessage);
    }
  }
}
