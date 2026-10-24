import { describe, expect, it } from 'vitest';
import { courseOverviewUrl } from './course-overview-url';

describe('courseOverviewUrl', () => {
  it('uses each configured Gamma embed URL', () => {
    expect(courseOverviewUrl('https://gamma.app/embed/another123')).toBe('https://gamma.app/embed/another123');
  });
  it('passes the supplied URL through without rewriting its path or parameters', () => {
    for (const link of [
      'https://gamma.app/embed/Market-Mavericks-s1zmj0f59xs70ex?mode=doc',
      'https://gamma.app/docs/s1zmj0f59xs70ex',
    ]) {
      expect(courseOverviewUrl(link)).toBe(link);
    }
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
