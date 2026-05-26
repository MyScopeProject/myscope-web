/**
 * Helpers for working with the YouTube trailer URL stored on events.
 *
 * The API validator (myscope-api/routes/organizerEvents.js) accepts any of:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtube.com/watch?v=VIDEO_ID&t=...
 *   - https://m.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://www.youtube.com/shorts/VIDEO_ID
 *
 * All resolve to an 11-character video id (`[A-Za-z0-9_-]{11}`), which is what
 * we need to build the iframe embed URL on the event detail page.
 */

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

/** Extracts the 11-char YouTube video id from a stored trailer URL, or null. */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(YOUTUBE_ID_RE)
  return match?.[1] ?? null
}

/**
 * Builds the iframe `src` for an embedded trailer. Returns null when the URL
 * isn't a recognisable YouTube link, so callers can suppress the whole section
 * rather than render a broken iframe.
 *
 * Uses `youtube-nocookie.com` (the privacy-enhanced mode) so visitors who
 * don't play the trailer don't get a YouTube tracking cookie.
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url)
  if (!id) return null
  return `https://www.youtube-nocookie.com/embed/${id}`
}
