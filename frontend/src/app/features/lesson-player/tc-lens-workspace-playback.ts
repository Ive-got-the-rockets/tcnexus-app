export interface TcWorkspacePlayback { type: 'tc-nexus-playback'; videoId: string; state: 'ready' | 'time' | 'seek'; currentTime: number }
export interface TcWorkspaceClose { type: 'tc-nexus-close-workspace'; videoId: string }
export function readWorkspacePlayback(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, origin: string, frame: Window | null, lessonId: number): TcWorkspacePlayback | null {
  const data = event.data;
  if (!frame || event.origin !== origin || event.source !== frame || data?.type !== 'tc-nexus-playback' || data.videoId !== String(lessonId) ||
      !['ready', 'time', 'seek'].includes(data.state) || typeof data.currentTime !== 'number' || !Number.isFinite(data.currentTime) || data.currentTime < 0) return null;
  return data;
}

export function readWorkspaceClose(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, origin: string, frame: Window | null, lessonId: number): TcWorkspaceClose | null {
  const data = event.data;
  if (!frame || event.origin !== origin || event.source !== frame || data?.type !== 'tc-nexus-close-workspace' || data.videoId !== String(lessonId)) return null;
  return data;
}
