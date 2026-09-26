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
