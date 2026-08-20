export type AccessTier = 'free' | 'registered' | 'paid';

export interface Course {
  id: number;
  title: string;
  excerpt: string;
  thumbnail: string | null;
  course_types: string[];
  lesson_count: number;
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

export interface CourseDetail {
  id: number;
  title: string;
  content: string;
  thumbnail: string | null;
  course_types: string[];
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

export interface RegisterResult {
  success: boolean;
  token: string;
}
