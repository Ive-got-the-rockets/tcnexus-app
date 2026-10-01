import type { TcLensTimelineEvent } from '../../core/models';
import {
  buildTcLensCueMessage,
  buildTcLensSeekMessage,
  buildTcLensSessionMessage,
  buildTcLensStateSyncMessage,
  type TcLensOutboundMessage,
} from './tc-lens-message';

type SessionIdFactory = () => string;

function isActiveTrade(event: TcLensTimelineEvent, currentTime: number): boolean {
  return event.messageType === 'trade' && event.startTime <= currentTime && (event.endTime === null || currentTime < event.endTime);
}

export class TcLensSessionEngine {
  private lessonId: number | string;
  private events: TcLensTimelineEvent[];
  private readonly createSessionId: SessionIdFactory;
  private sessionId: string | null = null;
  private currentTime = 0;
  private sequence = 0;
  private openState = false;
  private readonly sentEventIds = new Set<string>();

  constructor(lessonId: number | string, events: TcLensTimelineEvent[], createSessionId: SessionIdFactory = () => crypto.randomUUID()) {
    this.lessonId = lessonId;
    this.events = events;
    this.createSessionId = createSessionId;
  }

  open(currentTime: number): TcLensOutboundMessage[] {
    this.sessionId = this.createSessionId();
    this.currentTime = currentTime;
    this.sequence = 0;
    this.sentEventIds.clear();
    this.openState = true;

    return [
      buildTcLensSessionMessage('start', this.lessonId, this.sessionId, currentTime),
      buildTcLensStateSyncMessage(this.lessonId, this.sessionId, currentTime, this.events.filter((event) => isActiveTrade(event, currentTime))),
    ];
  }

  close(currentTime: number): TcLensOutboundMessage[] {
    if (!this.openState || !this.sessionId) return [];
    this.currentTime = currentTime;
    this.openState = false;
    return [buildTcLensSessionMessage('close', this.lessonId, this.sessionId, currentTime)];
  }

  advance(previousTime: number, currentTime: number): TcLensOutboundMessage[] {
    if (!this.openState || !this.sessionId || currentTime <= previousTime) return [];

    this.currentTime = currentTime;
    return this.events
      .filter((event) => !this.sentEventIds.has(event.id) && previousTime < event.startTime && event.startTime <= currentTime)
      .map((event) => {
        this.sentEventIds.add(event.id);
        this.sequence += 1;
        return buildTcLensCueMessage(this.lessonId, this.sessionId as string, this.sequence, event);
      });
  }

  seek(currentTime: number): TcLensOutboundMessage[] {
    if (!this.openState || !this.sessionId) return [];
    this.currentTime = currentTime;
    return [
      buildTcLensSeekMessage(this.lessonId, this.sessionId, currentTime),
      buildTcLensStateSyncMessage(this.lessonId, this.sessionId, currentTime, this.events.filter((event) => isActiveTrade(event, currentTime))),
    ];
  }

  resetLesson(lessonId: number | string, events: TcLensTimelineEvent[]): void {
    this.lessonId = lessonId;
    this.events = events;
    this.sessionId = null;
    this.currentTime = 0;
    this.sequence = 0;
    this.openState = false;
    this.sentEventIds.clear();
  }
}
