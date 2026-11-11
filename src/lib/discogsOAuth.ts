import { supabase, isSupabaseConfigured } from './supabase';
import { saveUserDiscogsToken } from './discogsProxyClient';

export interface OAuthInitiateResponse {
  success: boolean;
  authorizeUrl: string;
  oauth_token: string;
  oauth_token_secret: string;
}

export interface OAuthCallbackResult {
  success: boolean;
  username: string;
  discogs_user_id?: number;
  accessToken: string;
  accessTokenSecret: string;
  fullToken: string;
}

const SESSION_OAUTH_TOKEN = 'shelfapp_oauth_token';
const SESSION_OAUTH_SECRET = 'shelfapp_oauth_secret';

/**
 * Lance le flux d'authentification 1-clic Discogs.
 * Appelle l'Edge Function Supabase 'discogs-auth' puis redirige l'utilisateur vers Discogs.
 */
export async function startDiscogsOAuth(callbackUrl?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase n’est pas configuré. Veuillez vérifier VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.',
    };
  }

  const effectiveCallback = callbackUrl || `${window.location.origin}/auth/callback`;

  try {
    const { data, error } = await supabase.functions.invoke('discogs-auth', {
      body: {
        action: 'initiate',
        callbackUrl: effectiveCallback,
      },
    });

    if (error || !data?.authorizeUrl) {
      console.error('Erreur initiate OAuth Discogs:', error || data);
      return {
        success: false,
        error: data?.message || error?.message || 'Impossible d’initialiser la connexion avec Discogs.',
      };
    }

    // Sauvegarde temporaire du secret pour l'échange lors du retour
    localStorage.setItem(SESSION_OAUTH_TOKEN, data.oauth_token);
    localStorage.setItem(SESSION_OAUTH_SECRET, data.oauth_token_secret);
    sessionStorage.setItem(SESSION_OAUTH_TOKEN, data.oauth_token);
    sessionStorage.setItem(SESSION_OAUTH_SECRET, data.oauth_token_secret);

    // Redirige l'utilisateur vers l'écran officiel Discogs "Autoriser ShelfApp"
    window.location.href = data.authorizeUrl;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    return { success: false, error: msg };
  }
}

let activeCallbackPromise: Promise<{
  success: boolean;
  username?: string;
  error?: string;
}> | null = null;

/**
 * Traite le retour de Discogs après autorisation (/auth/callback?oauth_token=...&oauth_verifier=...)
 */
export async function handleDiscogsOAuthCallback(): Promise<{
  success: boolean;
  username?: string;
  error?: string;
}> {
  // If already in flight, reuse existing promise (React StrictMode protection)
  if (activeCallbackPromise) {
    return activeCallbackPromise;
  }

  const existingToken = localStorage.getItem('shelfapp_discogs_token');
  const existingUsername = localStorage.getItem('shelfapp_discogs_username');
  if (existingToken && existingUsername) {
    return { success: true, username: existingUsername };
  }

  const execute = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('oauth_token');
    const oauthVerifier = urlParams.get('oauth_verifier');

    if (!oauthToken || !oauthVerifier) {
      return {
        success: false,
        error: 'Paramètres OAuth manquants dans l’URL de rappel Discogs.',
      };
    }

    const storedSecret =
      localStorage.getItem(SESSION_OAUTH_SECRET) ||
      sessionStorage.getItem(SESSION_OAUTH_SECRET);

    if (!storedSecret) {
      return {
        success: false,
        error: 'Session OAuth expirée ou introuvable. Veuillez relancer la connexion.',
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('discogs-auth', {
        body: {
          action: 'callback',
          oauth_token: oauthToken,
          oauth_verifier: oauthVerifier,
          oauth_token_secret: storedSecret,
        },
      });

      if (error || !data?.success) {
        let msg = error?.message || data?.message || 'Échec de la validation de connexion Discogs.';
        try {
          if (error && 'context' in error && error.context) {
            const errJson = await (error as { context: Response }).context.json();
            if (errJson?.message) msg = errJson.message;
          }
        } catch {
          // ignore
        }
        console.error('Erreur callback OAuth Discogs:', msg, error || data);
        return {
          success: false,
          error: msg,
        };
      }

      // Nettoyage de la session temporaire
      localStorage.removeItem(SESSION_OAUTH_TOKEN);
      localStorage.removeItem(SESSION_OAUTH_SECRET);
      sessionStorage.removeItem(SESSION_OAUTH_TOKEN);
      sessionStorage.removeItem(SESSION_OAUTH_SECRET);

      // Enregistrement des identifiants dans le stockage local
      const finalToken = data.fullToken || data.accessToken;
      localStorage.setItem('shelfapp_discogs_token', finalToken);
      localStorage.setItem('shelfapp_discogs_username', data.username || 'Discogs Collector');
      if (data.accessToken) {
        localStorage.setItem('shelfapp_discogs_oauth_token', data.accessToken);
      }
      if (data.accessTokenSecret) {
        localStorage.setItem('shelfapp_discogs_oauth_secret', data.accessTokenSecret);
      }

      // Synchronisation avec le compte Supabase si l'utilisateur est connecté
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await saveUserDiscogsToken(user.id, finalToken, data.username || undefined);
        }
      }

      return {
        success: true,
        username: data.username,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      return { success: false, error: msg };
    }
  };

  activeCallbackPromise = execute();
  try {
    return await activeCallbackPromise;
  } finally {
    activeCallbackPromise = null;
  }
}
