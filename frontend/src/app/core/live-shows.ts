export interface LiveShow {
  id: string;
  title: string;
  status: string;
  scheduleLabel: string;
  description: string;
  host: string;
  guests: string[];
  thumbnailUrl: string;
  embedUrl: string;
  vimeoLiveEventId?: string;
}

export const LIVE_SHOWS: readonly LiveShow[] = [
  {
    id: 'market-open-live',
    title: 'Market Open Live',
    status: 'LIVE SOON',
    scheduleLabel: 'Weekdays · 09:15 ET',
    description: 'Market Open Live is a focused pre-market briefing built for traders who want a clear view of the session before the opening bell. Join the TC Nexus Desk as the team reviews the overnight action, major indexes, futures, economic releases, sector strength, and the themes most likely to shape today’s market. The conversation combines practical preparation with real-time context, helping you understand not only what is moving, but why it matters.',
    host: 'TC Nexus Desk',
    guests: ['TradeCheetah Analysts'],
    thumbnailUrl: '/shows/the-primer-BG-ratio-8by3.jpg',
    // The first live stream workspace is the existing local TC Lens build.
    // We keep it as a URL so the live player can later swap in the real stream embed.
    embedUrl: '/live-stream-layout',
  },
  {
    id: 'after-hours-room',
    title: 'After Hours Room',
    status: 'UP NEXT',
    scheduleLabel: 'Today · 16:15 ET',
    description: 'Close the session with live context, setups, and Q&A.',
    host: 'TC Nexus Desk',
    guests: ['Market Guests'],
    thumbnailUrl: '/shows/the-primer-BG-ratio-8by3.jpg',
    embedUrl: '/live-stream-layout',
  },
];

export function liveShowById(id: string | null): LiveShow | undefined {
  return LIVE_SHOWS.find(show => show.id === id);
}
