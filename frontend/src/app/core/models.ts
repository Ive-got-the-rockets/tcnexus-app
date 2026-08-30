export type AccessTier = 'free' | 'registered' | 'paid';

export interface Course {
  id: number;
  title: string;
  excerpt: string;
  thumbnail: string | null;
  /** The course's own "Course Image" (Course Builder's Media tab) — much higher-res than thumbnail, used for the featured hero banner. */
  image: string | null;
  course_types: string[];
  lesson_count: number;
  overview_link: string | null;
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
  /** A Vimeo URL, or just the bare id (optionally "id/hash" for an unlisted share link). */
  video_url: string | null;
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
  course_types: string[];
  overview_link: string | null;
  instructor: Person | null;
  guest: Person | null;
  lessons: Lesson[];
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
}

export interface RegistrationCopy {
  heading: string;
  message: string;
  button_label: string;
}

export interface RegistrationMedia {
  type: 'none' | 'image' | 'video';
  url: string;
  alt: string;
}

export interface RegistrationSettings {
  registration: RegistrationCopy;
  final_free: RegistrationCopy;
  media: RegistrationMedia;
}

export interface RegisterResult {
  success: boolean;
  token: string;
}
