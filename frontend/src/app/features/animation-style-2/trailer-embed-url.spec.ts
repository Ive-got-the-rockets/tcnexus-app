import { describe, expect, it } from 'vitest';
import { trailerEmbedUrl } from './trailer-embed-url';

describe('trailerEmbedUrl', () => {
  it('converts a Vimeo course-builder link into an embeddable player URL', () => {
    expect(trailerEmbedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789?dnt=1&autoplay=1&playsinline=1&controls=0&title=0&byline=0&portrait=0&badge=0'
    );
  });

  it('preserves an unrecognized trailer URL for iframe embedding', () => {
    expect(trailerEmbedUrl('https://example.com/trailer.mp4')).toBe('https://example.com/trailer.mp4');
  });
});
