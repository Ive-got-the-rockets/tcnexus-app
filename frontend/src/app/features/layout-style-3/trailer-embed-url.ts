export function trailerEmbedUrl(raw: string | null | undefined): string | null {
  const url = raw?.trim();
  if (!url) return null;

  const vimeoMatch = url.match(/(?:player\.vimeo\.com\/video\/|vimeo\.com\/(?:video\/)?)()(\d+)(?:\/([0-9a-z]+))?/i);
  if (!vimeoMatch) return url;

  const hash = vimeoMatch[3] ? `&h=${vimeoMatch[3]}` : '';
  return `https://player.vimeo.com/video/${vimeoMatch[2]}?dnt=1&autoplay=1&playsinline=1&controls=0&title=0&byline=0&portrait=0&badge=0${hash}`;
}
