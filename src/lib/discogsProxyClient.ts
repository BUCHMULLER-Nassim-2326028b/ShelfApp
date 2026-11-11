import { supabase, isSupabaseConfigured } from './supabase';
import type {
  DiscogsSearchResponse,
  DiscogsReleaseDetail,
  DiscogsMasterDetail,
  NormalizedMediaItem,
} from '../types/discogs';
import { normalizeDiscogsRelease, normalizeSearchResult } from '../utils/discogsNormalizer';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  lastUpdated: number;
}

// In-memory tracker for rate limit headers
let currentRateLimit: RateLimitInfo = {
  limit: 60,
  remaining: 60,
  lastUpdated: Date.now(),
};

/**
 * Sample offline mock items for instant testing and onboarding previews.
 * Includes Daft Punk, Pink Floyd, Miles Davis, and Kanye West!
 */
export const MOCK_DISCOGS_RELEASES: DiscogsReleaseDetail[] = [
  {
    id: 123456,
    master_id: 654321,
    title: 'Random Access Memories',
    artists: [{ id: 1, name: 'Daft Punk', resource_url: '' }],
    year: 2013,
    formats: [{ name: 'Vinyl', qty: '2', descriptions: ['LP', 'Album', 'Gatefold'] }],
    labels: [{ id: 1, name: 'Columbia', catno: '88883716861', entity_type: '', entity_type_name: '', resource_url: '' }],
    genres: ['Electronic', 'Funk / Soul'],
    styles: ['Disco', 'Synth-pop'],
    tracklist: [
      { position: 'A1', type_: 'track', title: 'Give Life Back to Music', duration: '4:34' },
      { position: 'A2', type_: 'track', title: 'The Game of Love', duration: '5:22' },
      { position: 'A3', type_: 'track', title: 'Giorgio by Moroder', duration: '9:05' },
      { position: 'B1', type_: 'track', title: 'Within', duration: '3:48' },
      { position: 'B2', type_: 'track', title: 'Instant Crush (feat. Julian Casablancas)', duration: '5:37' },
      { position: 'B3', type_: 'track', title: 'Lose Yourself to Dance (feat. Pharrell Williams)', duration: '5:53' },
      { position: 'C1', type_: 'track', title: 'Touch (feat. Paul Williams)', duration: '8:18' },
      { position: 'C2', type_: 'track', title: 'Get Lucky (feat. Pharrell Williams)', duration: '6:09' },
    ],
    images: [
      {
        type: 'primary',
        uri: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
        resource_url: '',
        uri150: '',
        width: 600,
        height: 600,
      },
    ],
    uri: 'https://www.discogs.com/release/123456',
  },
  {
    id: 567890,
    master_id: 123890,
    title: 'Graduation',
    artists: [{ id: 8, name: 'Kanye West', resource_url: '' }],
    year: 2007,
    formats: [{ name: 'Vinyl', qty: '2', descriptions: ['2xLP', 'Album', 'Special Edition'] }],
    labels: [{ id: 8, name: 'Roc-A-Fella Records', catno: 'B0009953-01', entity_type: '', entity_type_name: '', resource_url: '' }],
    genres: ['Hip Hop'],
    styles: ['Pop Rap', 'Electro'],
    tracklist: [
      { position: 'A1', type_: 'track', title: 'Good Morning', duration: '3:15' },
      { position: 'A2', type_: 'track', title: 'Champion', duration: '2:47' },
      { position: 'A3', type_: 'track', title: 'Stronger', duration: '5:11' },
      { position: 'A4', type_: 'track', title: 'I Wonder', duration: '4:03' },
      { position: 'B1', type_: 'track', title: 'Good Life (feat. T-Pain)', duration: '3:27' },
      { position: 'B2', type_: 'track', title: "Can't Tell Me Nothing", duration: '4:31' },
      { position: 'B3', type_: 'track', title: 'Flashing Lights', duration: '3:57' },
    ],
    images: [
      {
        type: 'primary',
        uri: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
        resource_url: '',
        uri150: '',
        width: 600,
        height: 600,
      },
    ],
    uri: 'https://www.discogs.com/release/567890',
  },
  {
    id: 678901,
    master_id: 234901,
    title: 'My Beautiful Dark Twisted Fantasy',
    artists: [{ id: 8, name: 'Kanye West', resource_url: '' }],
    year: 2010,
    formats: [{ name: 'Vinyl', qty: '3', descriptions: ['3xLP', 'Album', 'Gatefold'] }],
    labels: [{ id: 8, name: 'Def Jam Recordings', catno: 'B0014695-01', entity_type: '', entity_type_name: '', resource_url: '' }],
    genres: ['Hip Hop'],
    styles: ['Conscious', 'Contemporary R&B'],
    tracklist: [
      { position: 'A1', type_: 'track', title: 'Dark Fantasy', duration: '4:40' },
      { position: 'A2', type_: 'track', title: 'Gorgeous (feat. Kid Cudi, Raekwon)', duration: '5:57' },
      { position: 'B1', type_: 'track', title: 'POWER', duration: '4:52' },
      { position: 'B2', type_: 'track', title: 'All of the Lights (Interlude)', duration: '1:02' },
      { position: 'B3', type_: 'track', title: 'All of the Lights', duration: '4:59' },
      { position: 'C1', type_: 'track', title: 'Monster (feat. Jay-Z, Rick Ross, Nicki Minaj)', duration: '6:18' },
      { position: 'D1', type_: 'track', title: 'Runaway (feat. Pusha T)', duration: '9:08' },
    ],
    images: [
      {
        type: 'primary',
        uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
        resource_url: '',
        uri150: '',
        width: 600,
        height: 600,
      },
    ],
    uri: 'https://www.discogs.com/release/678901',
  },
  {
    id: 234567,
    master_id: 765432,
    title: 'The Dark Side of the Moon',
    artists: [{ id: 2, name: 'Pink Floyd', resource_url: '' }],
    year: 1973,
    formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP', 'Album', 'Stereo'] }],
    labels: [{ id: 2, name: 'Harvest', catno: 'SHVL 804', entity_type: '', entity_type_name: '', resource_url: '' }],
    genres: ['Rock'],
    styles: ['Psychedelic Rock', 'Prog Rock'],
    tracklist: [
      { position: 'A1', type_: 'track', title: 'Speak to Me', duration: '1:30' },
      { position: 'A2', type_: 'track', title: 'Breathe', duration: '2:43' },
      { position: 'A3', type_: 'track', title: 'On the Run', duration: '3:36' },
      { position: 'A4', type_: 'track', title: 'Time', duration: '6:53' },
      { position: 'A5', type_: 'track', title: 'The Great Gig in the Sky', duration: '4:36' },
      { position: 'B1', type_: 'track', title: 'Money', duration: '6:22' },
      { position: 'B2', type_: 'track', title: 'Us and Them', duration: '7:51' },
    ],
    images: [
      {
        type: 'primary',
        uri: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80',
        resource_url: '',
        uri150: '',
        width: 600,
        height: 600,
      },
    ],
    uri: 'https://www.discogs.com/release/234567',
  },
  {
    id: 345678,
    master_id: 876543,
    title: 'Kind of Blue',
    artists: [{ id: 3, name: 'Miles Davis', resource_url: '' }],
    year: 1959,
    formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP', 'Album', 'Mono'] }],
    labels: [{ id: 3, name: 'Columbia', catno: 'CL 1355', entity_type: '', entity_type_name: '', resource_url: '' }],
    genres: ['Jazz'],
    styles: ['Modal'],
    tracklist: [
      { position: 'A1', type_: 'track', title: 'So What', duration: '9:22' },
      { position: 'A2', type_: 'track', title: 'Freddie Freeloader', duration: '9:46' },
      { position: 'A3', type_: 'track', title: 'Blue in Green', duration: '5:37' },
      { position: 'B1', type_: 'track', title: 'All Blues', duration: '11:33' },
      { position: 'B2', type_: 'track', title: 'Flamenco Sketches', duration: '9:26' },
    ],
    images: [
      {
        type: 'primary',
        uri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        resource_url: '',
        uri150: '',
        width: 600,
        height: 600,
      },
    ],
    uri: 'https://www.discogs.com/release/345678',
  },
  {
    id: 456789,
    master_id: 987654,
    title: 'Discovery',
    artists: [{ id: 1, name: 'Daft Punk', resource_url: '' }],
    year: 2001,
    formats: [{ name: 'CD', qty: '1', descriptions: ['Album'] }],
    labels: [{ id: 4, name: 'Virgin', catno: 'CDV 2940', entity_type: '', entity_type_name: '', resource_url: '' }],
    genres: ['Electronic'],
    styles: ['House', 'Disco'],
    tracklist: [
      { position: '1', type_: 'track', title: 'One More Time', duration: '5:20' },
      { position: '2', type_: 'track', title: 'Aerodynamic', duration: '3:27' },
      { position: '3', type_: 'track', title: 'Digital Love', duration: '4:58' },
      { position: '4', type_: 'track', title: 'Harder, Better, Faster, Stronger', duration: '3:44' },
    ],
    images: [
      {
        type: 'primary',
        uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        resource_url: '',
        uri150: '',
        width: 600,
        height: 600,
      },
    ],
    uri: 'https://www.discogs.com/release/456789',
  },
];

/**
 * Parses either a personal token or consumer key/secret into the proper Discogs Authorization header.
 */
export function parseDiscogsAuthHeader(stored: string): string {
  const clean = stored.trim().replace(/^["']|["']$/g, '');
  if (clean.startsWith('Discogs ') || clean.startsWith('OAuth ')) {
    return clean;
  }
  if (clean.includes('key=') && clean.includes('secret=')) {
    const pairs: Record<string, string> = {};
    clean.split(/[,&\n]+/).forEach((item) => {
      const eq = item.indexOf('=');
      if (eq !== -1) {
        const k = item.substring(0, eq).trim();
        const v = item.substring(eq + 1).trim();
        if (k && v) pairs[k] = v;
      }
    });
    if (pairs.key && pairs.secret) {
      return `Discogs key=${pairs.key}, secret=${pairs.secret}`;
    }
  }
  if (clean.includes(':') && !clean.includes('=')) {
    const [key, secret] = clean.split(':');
    return `Discogs key=${key.trim()}, secret=${secret.trim()}`;
  }
  return `Discogs token=${clean}`;
}

/**
 * Calls Discogs API directly (used in dev/client mode with user's token or consumer key/secret).
 */
async function callDirectDiscogsApi<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  token?: string | null
): Promise<T> {
  const cleanToken = token ? token.trim().replace(/^["']|["']$/g, '') : null;

  if (!cleanToken) {
    throw new Error(
      "Clés Discogs manquantes : renseignez votre Consumer Key & Secret ou votre Token personnel pour lancer la recherche."
    );
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = new URL(`https://api.discogs.com${cleanEndpoint}`);

  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      targetUrl.searchParams.append(key, String(val));
    }
  });

  const authHeader = parseDiscogsAuthHeader(cleanToken);

  const response = await fetch(targetUrl.toString(), {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      'User-Agent': 'ShelfApp/1.0 (+https://github.com/shelfapp)',
      Accept: 'application/json',
    },
  });

  // Track rate limits from Discogs headers
  const rateLimit = response.headers.get('x-discogs-ratelimit');
  const rateLimitRemaining = response.headers.get('x-discogs-ratelimit-remaining');
  if (rateLimit) currentRateLimit.limit = parseInt(rateLimit, 10);
  if (rateLimitRemaining) currentRateLimit.remaining = parseInt(rateLimitRemaining, 10);
  currentRateLimit.lastUpdated = Date.now();

  if (response.status === 401) {
    throw new Error("Votre token Discogs n'est pas valide ou a expiré. Vérifiez qu'il est bien actif sur Discogs.");
  }

  if (response.status === 429) {
    throw new Error('Limite de requêtes Discogs atteinte (60 req/min). Patientez quelques secondes.');
  }

  if (!response.ok) {
    throw new Error(`Erreur Discogs (${response.status}) : impossible d'effectuer la requête.`);
  }

  return response.json();
}

/**
 * Invokes the discogs-proxy Supabase Edge function or direct client proxy.
 */
export async function invokeDiscogsProxy<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const localToken =
    localStorage.getItem('shelfapp_discogs_token') ||
    localStorage.getItem('shelfapp_demo_token');

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('discogs-proxy', {
        body: {
          endpoint,
          params,
          discogsToken: localToken || undefined,
        },
        headers: localToken ? { 'x-discogs-token': localToken } : {},
      });

      if (!error && data) {
        if (typeof data === 'object' && '_rateLimit' in data) {
          const rl = (data as { _rateLimit: { limit?: number; remaining?: number } })._rateLimit;
          if (rl.limit !== undefined) currentRateLimit.limit = rl.limit;
          if (rl.remaining !== undefined) currentRateLimit.remaining = rl.remaining;
          currentRateLimit.lastUpdated = Date.now();
        }
        return data as T;
      }

      if (error) {
        let errMsg = error.message;
        try {
          if ('context' in error && error.context) {
            const errJson = await (error as { context: Response }).context.json();
            if (errJson?.message) errMsg = errJson.message;
          }
        } catch {
          // ignore
        }

        // If error is an explicit auth error from the proxy when a token was sent, throw directly
        if (
          localToken &&
          (errMsg.includes('compte Discogs') ||
            errMsg.includes('invalide') ||
            errMsg.includes('expiré') ||
            errMsg.includes('60 requêtes/min'))
        ) {
          throw new Error(errMsg);
        }
      }
    } catch (err) {
      if (
        localToken &&
        err instanceof Error &&
        (err.message.includes('compte Discogs') ||
          err.message.includes('invalide') ||
          err.message.includes('expiré'))
      ) {
        throw err;
      }
      console.warn('Proxy invoke error, evaluating fallback:', err);
    }
  }

  // Direct client / development mode fallback:
  // Only attempt if it's a simple personal token (not an OAuth token needing server-side signature)
  if (localToken && localToken.trim().length > 5 && !localToken.includes('oauth_token')) {
    return await callDirectDiscogsApi<T>(endpoint, params, localToken);
  }

  // 2. If no token is provided, check if the query matches our mock dataset
  try {
    const mockRes = handleOfflineMock<T>(endpoint, params);
    if (mockRes && typeof mockRes === 'object' && 'results' in mockRes) {
      const results = (mockRes as { results: unknown[] }).results;
      if (results && results.length > 0) {
        return mockRes;
      }
    } else {
      return mockRes;
    }
  } catch {
    /* fallback to prompting user */
  }

  // 3. If query didn't match mock and user has no token, explain clearly
  throw new Error(
    "Token Discogs requis : connectez votre compte Discogs dans les Réglages pour lancer la recherche."
  );
}

/**
 * Searches Discogs releases and masters via the proxy.
 */
export interface SearchOptions {
  format?: string;
  type?: string;
  year?: number | string;
  genre?: string;
  page?: number;
  per_page?: number;
  barcode?: string;
}

export async function searchDiscogs(
  query: string,
  options: SearchOptions = {}
): Promise<DiscogsSearchResponse> {
  const params: Record<string, string | number | undefined> = {
    q: query.trim(),
    page: options.page || 1,
    per_page: options.per_page || 30,
  };

  if (options.type && options.type !== 'all') {
    params.type = options.type;
  }
  if (options.format) params.format = options.format;
  if (options.year) params.year = options.year;
  if (options.genre) params.genre = options.genre;
  if (options.barcode) params.barcode = options.barcode;

  return invokeDiscogsProxy<DiscogsSearchResponse>('/database/search', params);
}

/**
 * Retrieves full release details (tracklist, credits, labels, high-res images).
 */
export async function getDiscogsRelease(releaseId: number): Promise<DiscogsReleaseDetail> {
  return invokeDiscogsProxy<DiscogsReleaseDetail>(`/releases/${releaseId}`);
}

/**
 * Retrieves full master details (main release pointer, general tracklist, credits).
 */
export async function getDiscogsMaster(masterId: number): Promise<DiscogsMasterDetail> {
  return invokeDiscogsProxy<DiscogsMasterDetail>(`/masters/${masterId}`);
}

/**
 * Retrieves release or master details.
 * If a masterId is given, fetches the master and resolves to its primary physical release,
 * ensuring the user views the exact album rather than an unrelated release that happens
 * to share the same numeric ID.
 */
export async function getDiscogsReleaseOrMaster(
  id: number,
  type: 'release' | 'master' = 'release'
): Promise<DiscogsReleaseDetail> {
  if (type === 'master') {
    try {
      const master = await getDiscogsMaster(id);
      if (master.main_release) {
        const release = await getDiscogsRelease(master.main_release);
        return {
          ...release,
          master_id: id,
        };
      }
      // Fallback: build a synthetic release detail from the master data
      return {
        id,
        master_id: id,
        title: master.title,
        artists: master.artists || [],
        year: master.year || 0,
        formats: [{ name: 'Vinyl', qty: '1', descriptions: ['Album'] }],
        labels: [],
        genres: master.genres || [],
        styles: master.styles || [],
        images: master.images,
        tracklist: master.tracklist || [],
        uri: master.uri || `https://www.discogs.com/master/${id}`,
      };
    } catch (err) {
      console.warn(`Master #${id} fetch failed, falling back to release:`, err);
      return await getDiscogsRelease(id);
    }
  }

  return await getDiscogsRelease(id);
}

/**
 * Gets currently tracked rate limit info.
 */
export function getRateLimit(): RateLimitInfo {
  return { ...currentRateLimit };
}

/**
 * Check if the user has configured their Discogs personal token in Supabase.
 */
export async function checkUserDiscogsToken(userId: string): Promise<{
  hasToken: boolean;
  username: string | null;
}> {
  const local =
    localStorage.getItem('shelfapp_discogs_token') ||
    localStorage.getItem('shelfapp_demo_token');
  const localUsername =
    localStorage.getItem('shelfapp_discogs_username') || (local ? 'DiscogsCollector' : null);
  const hasLocal = Boolean(local && local.trim().length > 5);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

  if (!isSupabaseConfigured || !isUuid) {
    return {
      hasToken: hasLocal,
      username: localUsername,
    };
  }

  try {
    const { data, error } = await supabase
      .from('discogs_tokens')
      .select('discogs_username, token_encrypted')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      const username = (data as any).discogs_username || localUsername;
      const remoteToken = (data as any).token_encrypted;
      if (remoteToken) {
        localStorage.setItem('shelfapp_discogs_token', remoteToken);
        localStorage.setItem('shelfapp_demo_token', remoteToken);
        if (username) localStorage.setItem('shelfapp_discogs_username', username);
      }
      return { hasToken: true, username };
    }

    // If Supabase has no record yet but local has a valid token, sync it up!
    if (hasLocal && local) {
      saveUserDiscogsToken(userId, local, localUsername || undefined).catch(() => {});
      return { hasToken: true, username: localUsername };
    }
  } catch (err) {
    console.warn('Error checking Discogs token from Supabase:', err);
  }

  // Fallback to local storage
  if (hasLocal) {
    return { hasToken: true, username: localUsername };
  }

  return { hasToken: false, username: null };
}

/**
 * Saves or updates user's personal Discogs token.
 */
export async function saveUserDiscogsToken(
  userId: string,
  token: string,
  discogsUsername?: string
): Promise<void> {
  const cleanToken = token.trim().replace(/^["']|["']$/g, '');
  if (!cleanToken) throw new Error('Le token ne peut pas être vide.');

  // Always save to localStorage immediately for instant offline & reload resilience
  localStorage.setItem('shelfapp_discogs_token', cleanToken);
  localStorage.setItem('shelfapp_demo_token', cleanToken);
  if (discogsUsername) {
    localStorage.setItem('shelfapp_discogs_username', discogsUsername.trim());
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  if (!isSupabaseConfigured || !isUuid) return;

  const { error } = await (supabase.from('discogs_tokens' as any) as any).upsert(
    {
      user_id: userId,
      token_encrypted: cleanToken,
      discogs_username: discogsUsername?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn(`Supabase token sync warning: ${error.message}`);
  }
}

/**
 * Removes user's personal Discogs token.
 */
export async function removeUserDiscogsToken(userId: string): Promise<void> {
  // Always clear local storage
  localStorage.removeItem('shelfapp_discogs_token');
  localStorage.removeItem('shelfapp_demo_token');
  localStorage.removeItem('shelfapp_discogs_username');
  localStorage.removeItem('shelfapp_discogs_oauth_token');
  localStorage.removeItem('shelfapp_discogs_oauth_secret');

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  if (!isSupabaseConfigured || !isUuid) return;

  const { error } = await supabase.from('discogs_tokens').delete().eq('user_id', userId);
  if (error) {
    console.warn(`Supabase token delete warning: ${error.message}`);
  }
}

/**
 * Offline development mock handler when Supabase or internet is not connected.
 */
function handleOfflineMock<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>
): T {
  if (endpoint.startsWith('/database/search')) {
    const query = String(params.q || '').toLowerCase();
    const filtered = MOCK_DISCOGS_RELEASES.filter((r) => {
      const matchTitle = r.title.toLowerCase().includes(query);
      const matchArtist = r.artists.some((a) => a.name.toLowerCase().includes(query));
      return query === '' || matchTitle || matchArtist;
    });

    const results = filtered.map((r) => ({
      id: r.id,
      type: 'release' as const,
      title: `${r.artists.map((a) => a.name).join(', ')} - ${r.title}`,
      uri: r.uri,
      thumb: r.images?.[0]?.uri || '',
      cover_image: r.images?.[0]?.uri || '',
      year: r.year ? String(r.year) : undefined,
      format: r.formats.map((f) => f.name),
      label: r.labels.map((l) => l.name),
      catno: r.labels[0]?.catno,
    }));

    return {
      pagination: {
        page: 1,
        pages: 1,
        per_page: 25,
        items: results.length,
        urls: {},
      },
      results,
    } as unknown as T;
  }

  if (endpoint.startsWith('/releases/')) {
    const id = parseInt(endpoint.split('/')[2], 10);
    const found = MOCK_DISCOGS_RELEASES.find((r) => r.id === id);
    if (!found) {
      throw new Error(`Release #${id} non trouvée.`);
    }
    return found as unknown as T;
  }

  if (endpoint.startsWith('/masters/')) {
    const id = parseInt(endpoint.split('/')[2], 10);
    const found = MOCK_DISCOGS_RELEASES.find((r) => r.master_id === id || r.id === id);
    if (!found) {
      throw new Error(`Master #${id} non trouvé.`);
    }
    return {
      id: found.master_id || found.id,
      main_release: found.id,
      title: found.title,
      artists: found.artists,
      year: found.year,
      images: found.images,
      tracklist: found.tracklist,
      genres: found.genres,
      styles: found.styles,
      uri: found.uri,
    } as unknown as T;
  }

  throw new Error(`Endpoint inconnu: ${endpoint}`);
}
