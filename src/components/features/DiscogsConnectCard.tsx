import React, { useState } from 'react';
import { useShelf } from '../../context/ShelfContext';
import { startDiscogsOAuth } from '../../lib/discogsOAuth';
import { Disc, Check, Loader2, X } from 'lucide-react';
import '../../styles/ios-settings.css';

interface DiscogsConnectCardProps {
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const DiscogsConnectCard: React.FC<DiscogsConnectCardProps> = ({
  title,
  subtitle,
  onClose,
  showCloseButton = false,
}) => {
  const { hasToken, discogsUsername, deleteToken } = useShelf();

  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // 1-Click OAuth flow
  const handleOAuthConnect = async () => {
    setIsOAuthLoading(true);
    setOauthError(null);
    const result = await startDiscogsOAuth();
    if (!result.success) {
      setIsOAuthLoading(false);
      setOauthError(result.error || 'Impossible d’initialiser la connexion avec Discogs.');
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Voulez-vous vraiment dissocier votre compte Discogs ?')) {
      await deleteToken();
    }
  };

  // ── Connected State ──
  if (hasToken) {
    return (
      <div className="ios-discogs-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="ios-discogs-card__header">
            <div className="ios-discogs-card__icon ios-discogs-card__icon--connected">
              <Check size={20} />
            </div>
            <div>
              <h3 className="ios-discogs-card__title">
                {discogsUsername ? `@${discogsUsername}` : 'Compte Discogs'}
              </h3>
              <p className="ios-discogs-card__subtitle">Compte Discogs</p>
            </div>
          </div>
          {showCloseButton && onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8e8e93',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="ios-btn-secondary"
          onClick={handleDisconnect}
          style={{ width: '100%', color: '#ff453a', fontWeight: 500, marginTop: '6px' }}
        >
          Dissocier le compte
        </button>
      </div>
    );
  }

  // ── Disconnected / Setup State ──
  return (
    <div className="ios-discogs-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="ios-discogs-card__header">
          <div className="ios-discogs-card__icon">
            <Disc size={22} />
          </div>
          <div>
            <h3 className="ios-discogs-card__title">
              {title || 'Connexion à Discogs'}
            </h3>
          </div>
        </div>

        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8e8e93',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {oauthError && <div className="ios-error-banner">{oauthError}</div>}

      <button
        type="button"
        className="ios-btn-primary"
        onClick={handleOAuthConnect}
        disabled={isOAuthLoading}
      >
        {isOAuthLoading ? (
          <>
            <Loader2 size={18} className="spin-animation" />
            <span>Connexion à Discogs...</span>
          </>
        ) : (
          <>
            <Disc size={18} />
            <span>Se connecter à Discogs</span>
          </>
        )}
      </button>
    </div>
  );
};
