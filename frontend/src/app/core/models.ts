export type AccessTier = 'free' | 'registered' | 'paid';
export type CourseLevelSlug = 'beginner' | 'intermediate' | 'advanced';

export interface CourseLevelVersion {
  enabled: boolean;
  slug: CourseLevelSlug;
  label: string;
  title: string;
  content?: string;
  course_types: string[];
  lesson_count: number;
  lessons?: Lesson[];
  thumbnail: string | null;
  image: string | null;
  title_image?: string | null;
  overview_link: string | null;
  trailer_link?: string | null;
  instructor?: Person[];
  guest?: Person[];
}

export interface ShowSeason {
  enabled: boolean;
  season_key: string;
  label: string;
  title: string;
  content?: string;
  lesson_count: number;
  lessons?: Lesson[];
  thumbnail: string | null;
  image: string | null;
  title_image?: string | null;
  overview_link: string | null;
  trailer_link?: string | null;
}

export interface Course {
  id: number;
  title: string;
  excerpt: string;
  thumbnail: string | null;
  /** The course's own "Course Image" (Course Builder's Media tab) — much higher-res than thumbnail, used for the featured hero banner. */
  image: string | null;
  /** Desktop landing-page background image (8:3), when configured in the builder. */
  landing_background?: string | null;
  /** Optional 600x160 title artwork used in featured and single-page hero areas. */
  title_image?: string | null;
  course_types: string[];
  lesson_count: number;
  overview_link: string | null;
  trailer_link?: string | null;
  configured_levels?: CourseLevelSlug[];
  levels?: Partial<Record<CourseLevelSlug, CourseLevelVersion>>;
  languages?: Record<string, {
    label: string;
    levels?: Partial<Record<CourseLevelSlug, CourseLevelVersion>>;
  }>;
}

export interface Lesson {
  id: number;
  title: string;
  order: number;
  tier: AccessTier;
  course_id: number;
  thumbnail: string | null;
  locked: boolean;
  excerpt: string;
  content?: string;
  guests?: Person[];
  /** A Vimeo URL, or just the bare id (optionally "id/hash" for an unlisted share link). */
  video_url: string | null;
  tc_lens_timeline: TcLensTimelineEvent[];
}

export type TcLensMessageType = 'llm' | 'trade';

export type TcLensLearningLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | string;

export interface TcLensTradeLeg {
  action: string;
  side: string;
  quantity: number;
  strike: number | string | null;
  expiration: string | null;
  entryPrice?: number | null;
}

export interface TcLensTradeData {
  underlying: string;
  strategy: string;
  legs: TcLensTradeLeg[];
  strikes: Array<number | string>;
  expiration: string | null;
  quantity: number | null;
  entryPrice: number | null;
  assumptions: string;
}

export interface TcLensLlmData {
  question: string;
  sceneContext: string;
  learningLevel: TcLensLearningLevel;
}

export interface TcLensTimelineBase {
  id: string;
  messageType: TcLensMessageType;
  startTime: number;
  endTime: number | null;
  /** Legacy fallback retained while existing lessons migrate to structured data. */
  message?: string;
}

export interface TcLensTradeCue extends TcLensTimelineBase {
  messageType: 'trade';
  data: TcLensTradeData;
}

export interface TcLensLlmCue extends TcLensTimelineBase {
  messageType: 'llm';
  data: TcLensLlmData;
}

export type TcLensTimelineEvent = TcLensTradeCue | TcLensLlmCue;

export interface TcLensProtocolEnvelope {
  protocolVersion: number;
  lessonId: string;
  sessionId: string;
}

export interface Person {
  id: number;
  name: string;
  photo: string | null;
}

export interface CourseDetail {
  id: number;
  title: string;
  content: string;
  thumbnail: string | null;
  /** The course's own "Course Image" (Course Builder's Media tab) — the main image for this page, distinct from thumbnail (used for catalog cards). */
  image: string | null;
  /** Desktop landing-page background image (8:3), when configured in the builder. */
  landing_background?: string | null;
  /** Optional 600x160 title artwork used in featured and single-page hero areas. */
  title_image?: string | null;
  course_types: string[];
  overview_link: string | null;
  trailer_link?: string | null;
  instructor: Person[] | null;
  guest: Person[] | null;
  characters?: Person[];
  lessons: Lesson[];
  configured_levels?: CourseLevelSlug[];
  configured_seasons?: string[];
  seasons?: Record<string, ShowSeason>;
  levels?: Partial<Record<CourseLevelSlug, CourseLevelVersion>>;
  languages?: Record<string, {
    label: string;
    levels?: Partial<Record<CourseLevelSlug, CourseLevelVersion>>;
    seasons?: Record<string, ShowSeason>;
  }>;
}

export type AccessReason = 'ok' | 'requires_registration' | 'requires_payment';

export interface AccessCheckResult {
  granted: boolean;
  reason: AccessReason;
  tier: AccessTier;
  vimeo_id?: string;
  free_limit?: number;
  free_views_used?: number;
  limit_reached?: boolean;
  all_registered_seen?: boolean;
  viewer_tier?: 'anonymous' | 'registered' | 'paid';
}

export interface RegistrationCopy {
  heading: string;
  message: string;
  button_label: string;
  media: RegistrationMedia;
}

export interface RegistrationMedia {
  type: 'none' | 'image' | 'video';
  url: string;
  alt: string;
}

export interface CardAnimationSettings {
  id: string;
  name: string;
  open: number;
  switch: number;
  close: number;
}

export interface RegistrationSettings {
  registration: RegistrationCopy;
  final_free: RegistrationCopy;
  paid_member: RegistrationCopy;
  pricing: PaidMembershipSettings;
  animations?: {
    card_carousel: CardAnimationSettings;
  };
}

export interface MembershipTierSettings {
  visible: boolean;
  name: string;
  description: string;
  monthly_price: number;
  button_label: string;
  bullets: string[];
}

export interface PaidMembershipSettings {
  heading: string;
  message: string;
  save_percent: number;
  currency: string;
  close_label: string;
  tiers: [MembershipTierSettings, MembershipTierSettings, MembershipTierSettings];
}

export interface RegisterResult {
  success: boolean;
  token: string;
}
