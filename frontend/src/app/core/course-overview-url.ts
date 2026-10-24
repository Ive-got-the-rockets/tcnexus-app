export function courseOverviewUrl(link: string | null | undefined): string | null {
  if (!link) return null;
  let url: URL;
  try { url = new URL(link); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  return link;
}
