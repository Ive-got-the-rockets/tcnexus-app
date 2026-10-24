export function courseOverviewUrl(link: string | null | undefined): string | null {
  if (!link) return null;
  let url: URL;
  try { url = new URL(link); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.hostname === 'gamma.app' && url.pathname.startsWith('/docs/')) {
    const id = url.pathname.split('/')[2]?.split('-').pop();
    if (!id || !/^[a-zA-Z0-9]+$/.test(id)) return null;
    url = new URL('https://gamma.app/embed/' + id);
  }
  return url.href;
}
