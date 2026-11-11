import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleDiscogsOAuthCallback } from '../lib/discogsOAuth';
import { useShelf } from '../context/ShelfContext';
import './OAuthCallbackPage.css';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { reloadCredentials } = useShelf();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    async function processOAuth() {
      try {
        const result = await handleDiscogsOAuthCallback();

        if (result.success && result.username) {
          setUsername(result.username);
          setStatus('success');
          // Recharge le contexte avec les nouveaux identifiants
          reloadCredentials();

          // Redirection vers l'étagère après 1.5s
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.history?.replaceState) {
              window.history.replaceState(null, '', '/');
            }
            navigate('/', { replace: true });
          }, 1500);
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Impossible de finaliser l’authentification avec Discogs.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
      }
    }

    processOAuth();
  }, [navigate, reloadCredentials]);

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-card">
        {status === 'loading' && (
          <>
            <div className="ios-spinner" />
            <h1 className="oauth-title">Connexion à Discogs...</h1>
            <p className="oauth-subtitle">
              Validation de vos accès et synchronisation de votre profil.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="ios-badge-circle ios-badge-circle--success">
              <span style={{ fontSize: '24px' }}>✓</span>
            </div>
            <h1 className="oauth-title">Connexion Réussie</h1>
            <p className="oauth-subtitle">
              Bienvenue, <strong>@{username}</strong>.
            </p>
            <span className="oauth-redirect-hint">Ouverture de vos étagères...</span>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="ios-badge-circle ios-badge-circle--error">
              <span style={{ fontSize: '22px' }}>✕</span>
            </div>
            <h1 className="oauth-title">Échec de la connexion</h1>
            <p className="oauth-error-desc">{errorMessage}</p>
            <div className="oauth-actions">
              <button
                type="button"
                className="ios-btn-primary"
                onClick={() => navigate('/options', { replace: true })}
              >
                Retour aux Réglages
              </button>
              <button
                type="button"
                className="ios-btn-secondary"
                onClick={() => navigate('/', { replace: true })}
              >
                Ouvrir l’étagère
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
