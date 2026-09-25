export function buildTcLensUrl(baseUrl: string, videoId: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set('videoId', String(videoId));
  return url.toString();
}
