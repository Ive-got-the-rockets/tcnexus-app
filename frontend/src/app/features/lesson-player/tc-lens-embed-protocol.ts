import type { TcLensTimelineEvent } from '../../core/models';
export interface TcLensEmbedMessage {
  type: 'tc-lens-time-update';
  videoId: string;
  chapter: string;
  message: string;
  workflow: 'ask';
}
export function buildEmbedPrompt(videoId: number | string, chapter: string, event: TcLensTimelineEvent): TcLensEmbedMessage | null {
  const text = event.message?.trim();
  const message = event.messageType === 'llm'
    ? [text || event.data.question, event.data.sceneContext && `Scene context: ${event.data.sceneContext}`,
       event.data.learningLevel && `Learning level: ${event.data.learningLevel}`].filter(Boolean).join('\n\n')
    : [text || event.data.assumptions || 'Explain this trade and its risks.',
       `Trade context:\n${JSON.stringify(event.data, null, 2)}`].join('\n\n');
  if (!message.trim()) return null;
  return { type: 'tc-lens-time-update', videoId: String(videoId), chapter, message, workflow: 'ask' };
}
