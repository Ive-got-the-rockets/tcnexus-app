export interface TcLensMessage {
  type: 'tc-lens-time-update';
  videoId: string;
  message: string;
}

export function buildTcLensMessage(videoId: number, message: string): TcLensMessage {
  return {
    type: 'tc-lens-time-update',
    videoId: String(videoId),
    message,
  };
}

import type { TcLensTimelineEvent } from '../../core/models';

export interface TcLensTimelineMessage {
  type: 'tc-lens-timeline-event';
  videoId: string;
  messageType: 'llm' | 'trade';
  message: string;
  startTime: number;
  endTime: number | null;
  eventId: string;
}

export function buildTcLensTimelineMessage(videoId: number | string, event: TcLensTimelineEvent): TcLensTimelineMessage {
  return {
    type: 'tc-lens-timeline-event',
    videoId: String(videoId),
    messageType: event.messageType,
    message: event.message,
    startTime: event.startTime,
    endTime: event.endTime,
    eventId: event.id,
  };
}
