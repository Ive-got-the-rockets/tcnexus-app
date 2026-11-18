import { Person } from './models';

export interface LiveShow {
  id: string;
  title: string;
  status: string;
  scheduleLabel: string;
  description: string;
  host: string;
  hostPhotoUrl?: string | null;
  guests: Person[];
  thumbnailUrl: string;
  embedUrl: string;
  vimeoLiveEventId?: string;
}
