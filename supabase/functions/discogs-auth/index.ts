import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const DISCOGS_REQUEST_TOKEN_URL = 'https://api.discogs.com/oauth/request_token';
const DISCOGS_AUTHORIZE_URL = 'https://www.discogs.com/oauth/authorize';
const DISCOGS_ACCESS_TOKEN_URL = 'https://api.discogs.com/oauth/access_token';
const DISCOGS_IDENTITY_URL = 'https://api.discogs.com/oauth/identity';
const USER_AGENT = 'ShelfApp/1.0 (+https://github.com/shelfapp)';

interface AuthRequestBody {
  action: 'initiate' | 'callback';
  callbackUrl?: string;
  oauth_token?: string;
  oauth_verifier?: string;
  oauth_token_secret?: string;
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseUrlEncoded(text: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(text);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

serve(async (req: Request) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const consumerKey = Deno.env.get('DISCOGS_CONSUMER_KEY') ?? '';
    const consumerSecret = Deno.env.get('DISCOGS_CONSUMER_SECRET') ?? '';

    if (!consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({
          error: 'config_missing',
          message: 'Les secrets DISCOGS_CONSUMER_KEY et DISCOGS_CONSUMER_SECRET ne sont pas configurés sur Supabase.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AuthRequestBody = await req.json().catch(() => ({ action: 'initiate' } as AuthRequestBody));

    // ==========================================
    // ACTION 1: INITIATE OAUTH FLOW
    // ==========================================
    if (body.action === 'initiate') {
      const callbackUrl = body.callbackUrl || 'http://localhost:5173/auth/callback';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = generateNonce();

      // OAuth 1.0a Header with PLAINTEXT signature
      const authHeader = `OAuth oauth_consumer_key="${encodeURIComponent(consumerKey)}", ` +
        `oauth_nonce="${encodeURIComponent(nonce)}", ` +
        `oauth_signature="${encodeURIComponent(consumerSecret)}&", ` +
        `oauth_signature_method="PLAINTEXT", ` +
        `oauth_timestamp="${timestamp}", ` +
        `oauth_callback="${encodeURIComponent(callbackUrl)}"`;

      const response = await fetch(DISCOGS_REQUEST_TOKEN_URL, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader,
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Discogs request_token error:', response.status, responseText);
        return new Response(
          JSON.stringify({
            error: 'discogs_request_token_failed',
            message: `Discogs a refusé la demande (${response.status}) : ${responseText}`,
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const parsed = parseUrlEncoded(responseText);
      const oauthToken = parsed.oauth_token;
      const oauthTokenSecret = parsed.oauth_token_secret;

      if (!oauthToken || !oauthTokenSecret) {
        return new Response(
          JSON.stringify({
            error: 'invalid_discogs_response',
            message: 'Réponse invalide de Discogs lors de l’initialisation.',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const authorizeUrl = `${DISCOGS_AUTHORIZE_URL}?oauth_token=${encodeURIComponent(oauthToken)}`;

      return new Response(
        JSON.stringify({
          success: true,
          authorizeUrl,
          oauth_token: oauthToken,
          oauth_token_secret: oauthTokenSecret,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION 2: CALLBACK (EXCHANGE VERIFIER FOR ACCESS TOKEN)
    // ==========================================
    if (body.action === 'callback') {
      const { oauth_token, oauth_verifier, oauth_token_secret } = body;

      if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
        return new Response(
          JSON.stringify({
            error: 'missing_params',
            message: 'Paramètres manquants : oauth_token, oauth_verifier et oauth_token_secret sont requis.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = generateNonce();

      // Standard OAuth 1.0a access_token PLAINTEXT signature is consumerSecret&oauth_token_secret
      const signatureA = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(oauth_token_secret)}`;

      const buildAuthHeader = (sig: string) =>
        `OAuth oauth_consumer_key="${encodeURIComponent(consumerKey)}", ` +
        `oauth_nonce="${encodeURIComponent(nonce)}", ` +
        `oauth_token="${encodeURIComponent(oauth_token)}", ` +
        `oauth_signature="${sig}", ` +
        `oauth_signature_method="PLAINTEXT", ` +
        `oauth_timestamp="${timestamp}", ` +
        `oauth_verifier="${encodeURIComponent(oauth_verifier)}", ` +
        `oauth_version="1.0"`;

      let response = await fetch(DISCOGS_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: buildAuthHeader(signatureA),
        },
        body: new URLSearchParams({ oauth_verifier }).toString(),
      });

      let responseText = await response.text();

      // Alternative attempt: some Discogs endpoints accept consumerSecret& without token secret
      if (!response.ok) {
        console.warn('First access_token attempt status:', response.status, responseText);
        const signatureB = `${encodeURIComponent(consumerSecret)}&`;
        const retryResponse = await fetch(DISCOGS_ACCESS_TOKEN_URL, {
          method: 'POST',
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: buildAuthHeader(signatureB),
          },
          body: new URLSearchParams({ oauth_verifier }).toString(),
        });

        if (retryResponse.ok) {
          response = retryResponse;
          responseText = await retryResponse.text();
        }
      }

      if (!response.ok) {
        console.error('Discogs access_token error:', response.status, responseText);
        return new Response(
          JSON.stringify({
            error: 'discogs_access_token_failed',
            message: `Échec de l’échange du token (${response.status}) : ${responseText}`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const parsed = parseUrlEncoded(responseText);
      const accessToken = parsed.oauth_token;
      const accessTokenSecret = parsed.oauth_token_secret;

      if (!accessToken || !accessTokenSecret) {
        return new Response(
          JSON.stringify({
            error: 'invalid_access_token_response',
            message: 'Discogs n’a pas renvoyé de jeton d’accès valide.',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch user profile identity to get the username
      const identityTimestamp = Math.floor(Date.now() / 1000).toString();
      const identityNonce = generateNonce();
      const identitySignature = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`;

      const identityAuthHeader = `OAuth oauth_consumer_key="${encodeURIComponent(consumerKey)}", ` +
        `oauth_nonce="${encodeURIComponent(identityNonce)}", ` +
        `oauth_token="${encodeURIComponent(accessToken)}", ` +
        `oauth_signature="${identitySignature}", ` +
        `oauth_signature_method="PLAINTEXT", ` +
        `oauth_timestamp="${identityTimestamp}"`;

      let username = 'Discogs Collector';
      let discogsUserId: number | undefined;

      try {
        const idRes = await fetch(DISCOGS_IDENTITY_URL, {
          headers: {
            'User-Agent': USER_AGENT,
            Authorization: identityAuthHeader,
          },
        });
        if (idRes.ok) {
          const idData = await idRes.json();
          username = idData.username || username;
          discogsUserId = idData.id;
        }
      } catch (err) {
        console.warn('Could not fetch Discogs identity:', err);
      }

      // If user is logged into Supabase (Bearer token passed in Authorization header)
      const userAuthHeader = req.headers.get('Authorization');
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

      if (userAuthHeader && supabaseUrl && supabaseServiceKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          const jwt = userAuthHeader.replace(/^Bearer\s+/i, '');
          const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);

          if (user) {
            // Upsert into discogs_tokens
            await supabaseAdmin.from('discogs_tokens').upsert({
              user_id: user.id,
              discogs_user_id: discogsUserId,
              discogs_username: username,
              token_encrypted: `oauth_token=${accessToken}&oauth_token_secret=${accessTokenSecret}`,
              updated_at: new Date().toISOString(),
            });
          }
        } catch (dbErr) {
          console.warn('Could not persist token in Supabase DB:', dbErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          username,
          discogs_user_id: discogsUserId,
          accessToken,
          accessTokenSecret,
          // Easy combined token string that can be used directly or stored
          fullToken: `key=${consumerKey}, secret=${consumerSecret}, oauth_token=${accessToken}, oauth_token_secret=${accessTokenSecret}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'invalid_action', message: 'Action inconnue.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled discogs-auth error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
