import type { QuestionType, QuizTrack, TrackProvider } from '@party/music-quiz';

/**
 * Song pool for the music quiz, built from the providers' own free APIs.
 *
 * Deezer needs no key and every track carries an official 30-second `preview`
 * field, so it is the primary. iTunes is the fallback when Deezer has nothing
 * playable for a query.
 *
 * The licensing line we stay inside: we link the provider's own preview URL and
 * play it. Nothing is downloaded, cut, re-encoded, cached to disk or
 * redistributed, and no DRM is touched.
 */

const DEEZER = 'https://api.deezer.com';
const ITUNES = 'https://itunes.apple.com';
const TIMEOUT_MS = 6000;

/**
 * The chart is a fixed list, so it needs a ceiling. An artist query does not:
 * it walks the whole discography, which for Taylor Swift is 126 albums and well
 * over a thousand playable tracks. The game still only plays `rounds` of them.
 */
const MAX_CHART = 100;
const MAX_ALBUMS = 200;
/** Deezer caps `limit` at 100 and pages with `index`. */
const ALBUMS_PER_PAGE = 100;
const TRACKS_PER_ALBUM = 100;
/** Parallel album fetches; sequential costs ~2.3x for the same result. */
const ALBUM_BATCH = 12;

async function json(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

interface DeezerTrack {
  id: number;
  title: string;
  preview?: string;
  artist?: { name?: string };
}

/** Deezer's own search is title-fuzzy and pulls in unrelated artists, so a
 *  free-text query keeps only tracks that actually mention it. */
function matchesQuery(track: DeezerTrack, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  return norm(`${track.title} ${track.artist?.name ?? ''}`).includes(q);
}

const trackKey = (provider: TrackProvider, id: string | number) => `${provider}:${id}`;

/** Deduplicated on title *and* artist, so an album and its single do not both
 *  appear as two identical buttons. */
function dedupe(tracks: QuizTrack[]): QuizTrack[] {
  const seen = new Set<string>();
  const out: QuizTrack[] = [];
  for (const t of tracks) {
    if (!t.title || !t.artist || !t.providerId) continue;
    const key = `${norm(t.title)}|${norm(t.artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

async function deezerArtistPool(query: string): Promise<QuizTrack[]> {
  const found = await json(`${DEEZER}/search/artist?q=${encodeURIComponent(query)}`);
  const artist = found?.data?.find((a: any) => a?.nb_album > 0);
  if (!artist?.id) return [];

  // Every album, not just the first page. Deezer pages with `index` and stops
  // returning a short page once the discography runs out.
  const albumIds: number[] = [];
  for (let index = 0; albumIds.length < MAX_ALBUMS; index += ALBUMS_PER_PAGE) {
    const page = await json(
      `${DEEZER}/artist/${artist.id}/albums?limit=${ALBUMS_PER_PAGE}&index=${index}`
    );
    const data = (page?.data ?? []) as Array<{ id: number }>;
    albumIds.push(...data.map((a) => a.id));
    if (data.length < ALBUMS_PER_PAGE) break;
  }

  const out: QuizTrack[] = [];
  for (let i = 0; i < albumIds.length; i += ALBUM_BATCH) {
    const pages = await Promise.all(
      albumIds
        .slice(i, i + ALBUM_BATCH)
        .map((id) => json(`${DEEZER}/album/${id}/tracks?limit=${TRACKS_PER_ALBUM}`))
    );
    for (const page of pages) {
      for (const t of (page?.data ?? []) as DeezerTrack[]) {
        if (!t.preview) continue;
        out.push({
          provider: 'deezer',
          providerId: String(t.id),
          title: t.title,
          artist: t.artist?.name ?? query,
        });
      }
    }
  }
  return out;
}

async function deezerSearchPool(query: string): Promise<QuizTrack[]> {
  const res = await json(`${DEEZER}/search?q=${encodeURIComponent(query)}&limit=${TRACKS_PER_ALBUM}`);
  const out: QuizTrack[] = [];
  for (const t of (res?.data ?? []) as DeezerTrack[]) {
    if (!t.preview || !matchesQuery(t, query)) continue;
    out.push({
      provider: 'deezer',
      providerId: String(t.id),
      title: t.title,
      artist: t.artist?.name ?? '',
    });
  }
  return out;
}

async function deezerChartPool(): Promise<QuizTrack[]> {
  const res = await json(`${DEEZER}/chart/0/tracks?limit=${MAX_CHART}`);
  const out: QuizTrack[] = [];
  for (const t of (res?.data ?? []) as DeezerTrack[]) {
    if (!t.preview) continue;
    out.push({
      provider: 'deezer',
      providerId: String(t.id),
      title: t.title,
      artist: t.artist?.name ?? '',
    });
  }
  return out;
}

async function itunesPool(query: string): Promise<QuizTrack[]> {
  const term = query || 'top hits';
  const res = await json(
    `${ITUNES}/search?term=${encodeURIComponent(term)}&entity=song&limit=50`
  );
  const out: QuizTrack[] = [];
  for (const t of res?.results ?? []) {
    if (!t?.previewUrl || !t.trackName) continue;
    out.push({
      provider: 'itunes',
      providerId: String(t.trackId ?? t.collectionId),
      title: t.trackName,
      artist: t.artistName ?? '',
    });
  }
  return out;
}

export interface BuiltPool {
  pool: QuizTrack[];
  /** What the pool can actually support. See the note on ARTIST mode below. */
  questionType: QuestionType;
  /** Set when the pool had to come from somewhere other than the query. */
  note: 'exact' | 'fuzzy' | 'fallback' | 'chart';
}

/**
 * `ARTIST` questions need four different artists in the pool. A query that
 * resolves to one artist cannot supply them, and quietly serving four buttons
 * that all read the same would be worse than asking for the title instead — so
 * the type is decided here and the view carries the truth, and the lobby card
 * says so before anyone starts.
 */
export async function buildSongPool(queryRaw: string): Promise<BuiltPool> {
  const query = (queryRaw || '').trim().slice(0, 80);

  if (!query) {
    const chart = dedupe(await deezerChartPool());
    if (chart.length) return { pool: chart, questionType: 'TITLE', note: 'chart' };
  }

  if (query) {
    const exact = dedupe(await deezerArtistPool(query));
    if (exact.length) {
      const artists = new Set(exact.map((t) => norm(t.artist)));
      return {
        pool: exact,
        questionType: artists.size >= 4 ? 'ARTIST' : 'TITLE',
        note: 'exact',
      };
    }
    const fuzzy = dedupe(await deezerSearchPool(query));
    if (fuzzy.length) return { pool: fuzzy, questionType: 'TITLE', note: 'fuzzy' };
  }

  const itunes = dedupe(await itunesPool(query));
  return { pool: itunes, questionType: 'TITLE', note: 'fallback' };
}

// ── Preview URLs ────────────────────────────────────────────────────────────

/**
 * Preview URLs are signed and expire about fifteen minutes after issue, so one
 * is never persisted and never shipped in the pool. It is fetched when a round
 * starts. The cache is only there to collapse four players asking for the same
 * clip into one request; five minutes is well inside the signature's lifetime.
 */
const previewCache = new Map<string, { url: string; at: number }>();
const PREVIEW_TTL_MS = 5 * 60 * 1000;
const PREVIEW_CACHE_MAX = 200;

async function fetchDeezerPreview(providerId: string): Promise<string | null> {
  const res = await json(`${DEEZER}/track/${encodeURIComponent(providerId)}`);
  return res?.preview || null;
}

/**
 * Deezer answers 200 with `{"error":{"message":"Quota limit exceeded","code":4}}`
 * and no `preview` once its per-ip quota is spent — measured at 91 of 192
 * responses under a sustained burst, and never on a quiet server. The clip
 * exists, the answer is missing, so asking again is the whole fix. A back-to-back
 * ask lands inside the same window and fails too, which is why the gaps grow.
 * Only a failing lookup pays for them: a preview that is there is returned by
 * the first ask, with no delay at all.
 */
const RETRY_GAPS_MS = [0, 300, 900, 2500];

async function fetchPreviewOnce(
  provider: TrackProvider,
  providerId: string
): Promise<string | null> {
  return provider === 'itunes'
    ? fetchItunesPreview(providerId)
    : fetchDeezerPreview(providerId);
}

async function fetchPreview(provider: TrackProvider, providerId: string): Promise<string | null> {
  for (const gap of RETRY_GAPS_MS) {
    if (gap) await new Promise((r) => setTimeout(r, gap));
    const url = await fetchPreviewOnce(provider, providerId);
    if (url) return url;
  }
  return null;
}

async function fetchItunesPreview(providerId: string): Promise<string | null> {
  const res = await json(`${ITUNES}/lookup?id=${encodeURIComponent(providerId)}&entity=song`);
  return res?.results?.[0]?.previewUrl || null;
}

/**
 * Returns a playable URL for one track, fetched fresh. Null when the provider
 * has nothing — the caller shows a retry rather than swapping in another song,
 * because a different track would make the four choices wrong.
 */
export async function resolvePreviewUrl(
  provider: TrackProvider,
  providerId: string
): Promise<string | null> {
  if (!providerId) return null;
  const key = trackKey(provider, providerId);
  const hit = previewCache.get(key);
  if (hit && Date.now() - hit.at < PREVIEW_TTL_MS) return hit.url;

  const url = await fetchPreview(provider, providerId);
  if (!url) return null;

  if (previewCache.size >= PREVIEW_CACHE_MAX) {
    previewCache.delete(previewCache.keys().next().value as string);
  }
  previewCache.set(key, { url, at: Date.now() });
  return url;
}

/** Exposed for the readiness check the lobby card runs against the pool. */
export function poolSupports(pool: QuizTrack[], questionType: QuestionType): boolean {
  if (pool.length < 4) return false;
  const titles = new Set(pool.map((t) => norm(t.title))).size;
  const artists = new Set(pool.map((t) => norm(t.artist))).size;
  if (questionType === 'ARTIST') return artists >= 4;
  if (questionType === 'BOTH') return titles >= 4 && artists >= 4;
  return titles >= 4;
}