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

import type { TcLensLlmCue, TcLensTimelineEvent, TcLensTradeCue } from '../../core/models';

export const TC_LENS_PROTOCOL_VERSION = 1;

export interface TcLensSessionMessage {
  type: 'tc-lens-session-start' | 'tc-lens-session-close';
  protocolVersion: number;
  lessonId: string;
  sessionId: string;
  currentTime: number;
}

export interface TcLensTradeCueMessage {
  type: 'tc-lens-trade-cue';
  protocolVersion: number;
  lessonId: string;
  sessionId: string;
  sequence: number;
  eventId: string;
  startTime: number;
  endTime: number | null;
  data: TcLensTradeCue['data'];
}

export interface TcLensLlmCueMessage {
  type: 'tc-lens-llm-cue';
  protocolVersion: number;
  lessonId: string;
  sessionId: string;
  sequence: number;
  eventId: string;
  startTime: number;
  endTime: number | null;
  data: TcLensLlmCue['data'];
}

export interface TcLensStateSyncMessage {
  type: 'tc-lens-state-sync';
  protocolVersion: number;
  lessonId: string;
  sessionId: string;
  currentTime: number;
  activeTradeCues: TcLensTradeCue['data'][];
}

export interface TcLensSeekMessage {
  type: 'tc-lens-seek';
  protocolVersion: number;
  lessonId: string;
  sessionId: string;
  currentTime: number;
}

export interface TcLensReadyMessage {
  type: 'tc-lens-ready';
  protocolVersion: number;
  sessionId?: string;
}

export interface TcLensAckMessage {
  type: 'tc-lens-ack';
  protocolVersion?: number;
  sessionId: string;
  eventId: string;
}

export type TcLensOutboundMessage =
  | TcLensSessionMessage
  | TcLensTradeCueMessage
  | TcLensLlmCueMessage
  | TcLensStateSyncMessage
  | TcLensSeekMessage;

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
    message: event.message ?? (event.messageType === 'llm' ? event.data.question : event.data.assumptions),
    startTime: event.startTime,
    endTime: event.endTime,
    eventId: event.id,
  };
}

export function buildTcLensCueMessage(
  lessonId: number | string,
  sessionId: string,
  sequence: number,
  event: TcLensTimelineEvent,
): TcLensTradeCueMessage | TcLensLlmCueMessage {
  if (event.messageType === 'trade') {
    return {
      type: 'tc-lens-trade-cue',
      protocolVersion: TC_LENS_PROTOCOL_VERSION,
      lessonId: String(lessonId),
      sessionId,
      sequence,
      eventId: event.id,
      startTime: event.startTime,
      endTime: event.endTime,
      data: event.data,
    };
  }

  return {
    type: 'tc-lens-llm-cue',
    protocolVersion: TC_LENS_PROTOCOL_VERSION,
    lessonId: String(lessonId),
    sessionId,
    sequence,
    eventId: event.id,
    startTime: event.startTime,
    endTime: event.endTime,
    data: event.data,
  };
}

export function buildTcLensSessionMessage(
  phase: 'start' | 'close',
  lessonId: number | string,
  sessionId: string,
  currentTime: number,
): TcLensSessionMessage {
  return {
    type: phase === 'start' ? 'tc-lens-session-start' : 'tc-lens-session-close',
    protocolVersion: TC_LENS_PROTOCOL_VERSION,
    lessonId: String(lessonId),
    sessionId,
    currentTime,
  };
}

export function buildTcLensStateSyncMessage(
  lessonId: number | string,
  sessionId: string,
  currentTime: number,
  activeEvents: TcLensTimelineEvent[],
): TcLensStateSyncMessage {
  return {
    type: 'tc-lens-state-sync',
    protocolVersion: TC_LENS_PROTOCOL_VERSION,
    lessonId: String(lessonId),
    sessionId,
    currentTime,
    activeTradeCues: activeEvents
      .filter((event): event is TcLensTradeCue => event.messageType === 'trade')
      .map((event) => event.data),
  };
}

export function buildTcLensSeekMessage(
  lessonId: number | string,
  sessionId: string,
  currentTime: number,
): TcLensSeekMessage {
  return {
    type: 'tc-lens-seek',
    protocolVersion: TC_LENS_PROTOCOL_VERSION,
    lessonId: String(lessonId),
    sessionId,
    currentTime,
  };
}
