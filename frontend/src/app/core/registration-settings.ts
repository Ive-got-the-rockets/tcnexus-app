import { AccessCheckResult } from './models';

export function isFinalFreeLesson(access: AccessCheckResult, registered: boolean): boolean {
  return (
    registered === false &&
    access.granted === true &&
    access.tier === 'free' &&
    typeof access.free_views_used === 'number' &&
    typeof access.free_limit === 'number' &&
    access.free_views_used >= access.free_limit
  );
}
