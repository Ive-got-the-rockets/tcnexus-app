import { describe, expect, it } from 'vitest';
import { courseOverviewUrl } from './course-overview-url';

describe('courseOverviewUrl', () => {
  it('uses each configured Gamma embed URL', () => {
    expect(courseOverviewUrl('https://gamma.app/embed/another123')).toBe('https://gamma.app/embed/another123');
  });
  it('converts Gamma document links including titled slugs', () => {
    expect(courseOverviewUrl('https://gamma.app/docs/Market-Mavericks-s1zmj0f59xs70ex')).toBe('https://gamma.app/embed/s1zmj0f59xs70ex');
    expect(courseOverviewUrl('https://gamma.app/docs/s1zmj0f59xs70ex')).toBe('https://gamma.app/embed/s1zmj0f59xs70ex');
  });
  it('rejects missing URLs, iframe markup and executable schemes', () => {
    for (const value of [null, '', '<iframe src="https://gamma.app/embed/abc"></iframe>', 'javascript:alert(1)', 'http://gamma.app/embed/abc']) {
      expect(courseOverviewUrl(value)).toBeNull();
    }
  });
  it('preserves other HTTPS overview links', () => {
    expect(courseOverviewUrl('https://example.com/overview.pdf')).toBe('https://example.com/overview.pdf');
  });
});
