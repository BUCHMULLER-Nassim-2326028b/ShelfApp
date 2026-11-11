import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const DISCOGS_BASE_URL = 'https://api.discogs.com';
const USER_AGENT = 'ShelfApp/1.0 (+https://github.com/shelfapp)';

interface ProxyRequestBody {
  endpoint: string;
  params?: Record<string, string | number | undefined>;
  discogsToken?: string;
  token?: string;
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseTokenPairs(text: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  const items = text.split(/[,&\n]+/);
  for (const item of items) {
    const eqIdx = item.indexOf('=');
    if (eqIdx !== -1) {
      const k = item.substring(0, eqIdx).trim();
      const v = item.substring(eqIdx + 1).trim();
      if (k && v) pairs[k] = v;
    }
  }
  return pairs;
}

function buildDiscogsAuthHeader(
  rawToken: string,
  envConsumerKey: string,
  envConsumerSecret: string
): string {
  const token = rawToken.trim().replace(/^["']|["']$/g, '');
  if (!token) return '';

  // Already formatted Authorization header
  if (token.startsWith('Discogs ') || token.startsWith('OAuth ')) {
    return token;
  }

  // Check if it contains OAuth 1.0 credentials (oauth_token & oauth_token_secret)
  if (token.includes('oauth_token') && token.includes('oauth_token_secret')) {
    const pairs = parseTokenPairs(token);
    const oauthToken = pairs['oauth_token'] || '';
    const oauthTokenSecret = pairs['oauth_token_secret'] || '';
    const consumerKey = pairs['key'] || pairs['oauth_consumer_key'] || envConsumerKey;
    const consumerSecret = pairs['secret'] || pairs['oauth_consumer_secret'] || envConsumerSecret;

    if (oauthToken && oauthTokenSecret && consumerKey && consumerSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = generateNonce();
      const signature = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(oauthTokenSecret)}`;

      return (
        `OAuth oauth_consumer_key="${encodeURIComponent(consumerKey)}", ` +
        `oauth_nonce="${encodeURIComponent(nonce)}", ` +
        `oauth_token="${encodeURIComponent(oauthToken)}", ` +
        `oauth_signature="${signature}", ` +
        `oauth_signature_method="PLAINTEXT", ` +
        `oauth_timestamp="${timestamp}", ` +
        `oauth_version="1.0"`
      );
    }
  }

  // Consumer key & secret pair (no OAuth token)
  if (
    (token.includes('key=') && token.includes('secret=')) ||
    (token.includes(':') && !token.includes(' ') && !token.includes('='))
  ) {
    if (token.includes(':') && !token.includes('=')) {
      const [key, secret] = token.split(':');
      return `Discogs key=${key.trim()}, secret=${secret.trim()}`;
    }
    const pairs = parseTokenPairs(token);
    if (pairs['key'] && pairs['secret']) {
      return `Discogs key=${pairs['key']}, secret=${pairs['secret']}`;
    }
  }

  // Fallback: personal access token
  return `Discogs token=${token}`;
}

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Parse request payload early to extract endpoint, params, and bodyToken
    let endpoint = '';
    let params: Record<string, string | number | undefined> = {};
    let bodyToken = '';

    if (req.method === 'POST') {
      try {
        const body: ProxyRequestBody = await req.json();
        endpoint = body.endpoint || '';
        params = body.params || {};
        bodyToken = body.discogsToken || body.token || '';
      } catch {
        // empty body
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      endpoint = url.searchParams.get('endpoint') || '';
      bodyToken = url.searchParams.get('discogsToken') || url.searchParams.get('token') || '';
      url.searchParams.forEach((value, key) => {
        if (key !== 'endpoint' && key !== 'discogsToken' && key !== 'token') {
          params[key] = value;
        }
      });
    }

    // 3. Resolve credentials — personal user token only, no server-side fallback
    let rawToken = req.headers.get('x-discogs-token') || bodyToken || '';

    if (!rawToken) {
      // Require the user to be logged in with a personal Discogs OAuth token
      const authHeader = req.headers.get('Authorization');
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

      if (authHeader && supabaseUrl && supabaseServiceKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          const token = authHeader.replace(/^Bearer\s+/i, '');
          const { data: { user } } = await supabaseAdmin.auth.getUser(token);
          if (user) {
            const { data: tokenRecord } = await supabaseAdmin
              .from('discogs_tokens')
              .select('token_encrypted')
              .eq('user_id', user.id)
              .maybeSingle();

            if (tokenRecord?.token_encrypted) {
              rawToken = tokenRecord.token_encrypted;
            }
          }
        } catch {
          // ignore auth resolution errors
        }
      }
    }

    const envConsumerKey = Deno.env.get('DISCOGS_CONSUMER_KEY') ?? '';
    const envConsumerSecret = Deno.env.get('DISCOGS_CONSUMER_SECRET') ?? '';

    let discogsAuthHeader = '';
    if (rawToken) {
      discogsAuthHeader = buildDiscogsAuthHeader(rawToken, envConsumerKey, envConsumerSecret);
    }

    // No personal token → force the user to connect their Discogs account
    if (!discogsAuthHeader) {
      return new Response(
        JSON.stringify({
          error: 'auth_required',
          message: 'Connectez votre compte Discogs dans les Réglages pour utiliser la recherche.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }



    // Validate authorized endpoints to prevent arbitrary proxy abuse
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const isAllowedEndpoint =
      cleanEndpoint.startsWith('/database/search') ||
      cleanEndpoint.startsWith('/releases/') ||
      cleanEndpoint.startsWith('/masters/') ||
      cleanEndpoint === '/oauth/identity';

    if (!isAllowedEndpoint) {
      return new Response(
        JSON.stringify({
          error: 'forbidden_endpoint',
          message: `Endpoint '${cleanEndpoint}' non autorisé par le proxy Discogs.`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. Build Discogs URL with Query Params
    const targetUrl = new URL(`${DISCOGS_BASE_URL}${cleanEndpoint}`);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        targetUrl.searchParams.append(key, String(val));
      }
    });

    // 8. Execute Discogs Request with resolved auth header
    const discogsResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: discogsAuthHeader,
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    // Extract rate limit headers from Discogs
    const rateLimit = discogsResponse.headers.get('x-discogs-ratelimit');
    const rateLimitRemaining = discogsResponse.headers.get('x-discogs-ratelimit-remaining');

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': 'application/json',
    };
    if (rateLimit) responseHeaders['X-Discogs-Ratelimit'] = rateLimit;
    if (rateLimitRemaining) responseHeaders['X-Discogs-Ratelimit-Remaining'] = rateLimitRemaining;

    // Handle Rate Limiting (429)
    if (discogsResponse.status === 429) {
      return new Response(
        JSON.stringify({
          error: 'rate_limited',
          message: 'Limite Discogs atteinte (60 requêtes/min). Veuillez patienter quelques secondes.',
        }),
        {
          status: 429,
          headers: responseHeaders,
        }
      );
    }

    // Handle Invalid / Revoked Discogs Token (401 from Discogs)
    if (discogsResponse.status === 401) {
      return new Response(
        JSON.stringify({
          error: 'invalid_discogs_token',
          message: 'Votre token personnel Discogs est invalide ou a expiré. Veuillez le renouveler dans vos réglages.',
        }),
        {
          status: 401,
          headers: responseHeaders,
        }
      );
    }

    // Return payload
    const data = await discogsResponse.json();
    return new Response(JSON.stringify(data), {
      status: discogsResponse.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
    console.error('Discogs proxy internal error:', err);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
