import React, { useState } from 'react';
import { useShelf } from '../context/ShelfContext';
import {
  Disc,
  Layers,
  Trash2,
  BookOpen,
  ChevronRight,
  Smartphone,
  Loader2,
  Sun,
  Moon,
  LayoutGrid,
  Info,
  Cloud,
} from 'lucide-react';
import { startDiscogsOAuth } from '../lib/discogsOAuth';
import '../styles/ios-settings.css';

export default function OptionsPage() {
  const {
    hasToken,
    discogsUsername,
    deleteToken,
    collection,
    clearCollection,
    setIsOnboardingOpen,
    theme,
    setTheme,
    shelfStyle,
    setShelfStyle,
    realisticSpineEnabled,
    setRealisticSpineEnabled,
    supabaseUser,
    setIsAuthModalOpen,
  } = useShelf();

  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

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

  const handleInstallPWA = async () => {
    if ((window as unknown as { deferredPrompt?: { prompt: () => void; userChoice: Promise<{ outcome: string }> } }).deferredPrompt) {
      const prompt = (window as unknown as { deferredPrompt: { prompt: () => void; userChoice: Promise<{ outcome: string }> } }).deferredPrompt;
      prompt.prompt();
      const res = await prompt.userChoice;
      if (res.outcome === 'accepted') {
        alert('Application installée !');
      }
    } else {
      alert("ShelfApp est prête à être installée via le menu 'Sur l'écran d'accueil' de votre navigateur.");
    }
  };

  return (
    <div className="ios-settings-page">
      {/* Large Title Header */}
      <header className="ios-settings-header">
        <h1 className="ios-settings-title">Réglages</h1>
      </header>

      {/* ── Section: Compte iShelf Cloud ── */}
      <div className="ios-settings-group" style={{ marginBottom: '8px' }}>
        {supabaseUser ? (
          <>
            <div
              className="ios-settings-row"
              onClick={() => setIsAuthModalOpen(true)}
              role="button"
              tabIndex={0}
              style={{
                cursor: 'pointer',
                padding: '14px 18px',
                minHeight: '68px',
                borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="ios-row-left" style={{ gap: '14px', minWidth: 0, flex: 1 }}>
                <div
                  className="ios-account-avatar"
                  style={{
                    width: '46px',
                    height: '46px',
                    background: '#2c2c2e',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {supabaseUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="ios-row-label-wrap" style={{ minWidth: 0, flex: 1 }}>
                  <span
                    className="ios-row-label"
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}
                  >
                    {supabaseUser.email}
                  </span>
                  <span className="ios-row-sublabel" style={{ fontSize: '13px', color: '#30d158', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>●</span> Sauvegarde cloud active
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="ios-chevron" style={{ color: '#8e8e93' }} />
            </div>

          </>
        ) : (
          <div
            className="ios-settings-row"
            onClick={() => setIsAuthModalOpen(true)}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', padding: '14px 18px', minHeight: '68px' }}
          >
            <div className="ios-row-left" style={{ gap: '14px' }}>
              <div
                className="ios-account-avatar"
                style={{
                  width: '46px',
                  height: '46px',
                  background: 'rgba(255, 176, 56, 0.15)',
                  border: '1px solid rgba(255, 176, 56, 0.3)',
                  color: '#ffb038',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Cloud size={22} />
              </div>
              <div className="ios-row-label-wrap">
                <span className="ios-row-label" style={{ fontSize: '16px', fontWeight: 600 }}>
                  Se connecter à ShelfApp
                </span>
                <span className="ios-row-sublabel" style={{ fontSize: '13px', color: '#8e8e93' }}>
                  Sauvegarde cloud et synchronisation de vos vinyles
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="ios-chevron" style={{ color: '#8e8e93' }} />
          </div>
        )}
      </div>
      <p className="ios-settings-group-footer" style={{ marginTop: '0px', marginBottom: '22px' }}>
        Connectez-vous pour sauvegarder votre étagère dans le cloud. Vos pochettes personnalisées restent stockées localement pour préserver la bande passante.
      </p>

      {/* ── Section: Compte Discogs ── */}
      <h3 className="ios-settings-group-title">Compte Discogs</h3>
      <section className="ios-account-row" style={{ marginBottom: '12px' }}>
        <div className={`ios-account-avatar ${hasToken ? 'ios-account-avatar--connected' : ''}`}>
          {discogsUsername ? discogsUsername.charAt(0).toUpperCase() : <Disc size={26} />}
        </div>
        <div className="ios-account-info">
          <h2 className="ios-account-name">
            {discogsUsername ? `@${discogsUsername}` : 'Non connecté'}
          </h2>
          <p className="ios-account-desc">Recherche et métadonnées Discogs</p>
        </div>
      </section>

      {/* Wide Action button: Dissocier or Se connecter */}
      <div style={{ marginBottom: '24px' }}>
        {hasToken ? (
          <button
            type="button"
            className="ios-btn-secondary"
            onClick={handleDisconnect}
            style={{ width: '100%', color: '#ff453a', fontWeight: 600 }}
          >
            Dissocier le compte
          </button>
        ) : (
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
        )}
        {oauthError && (
          <div className="ios-error-banner" style={{ marginTop: '10px' }}>
            {oauthError}
          </div>
        )}
      </div>

      {/* Group 1: Apparence (Light/Dark & Shelf Style) */}
      <h3 className="ios-settings-group-title">Apparence</h3>
      <div className="ios-settings-group">
        {/* Light / Dark Mode Toggle */}
        <div className="ios-settings-row">
          <div className="ios-row-left">
            <div className="ios-badge ios-badge--amber">
              {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
            </div>
            <div className="ios-row-label-wrap">
              <span className="ios-row-label">Thème</span>
            </div>
          </div>
          <div className="ios-row-right">
            <div className="ios-segmented-control" role="group" aria-label="Sélection du thème">
              <button
                type="button"
                className={`ios-segmented-control__tab ${theme === 'light' ? 'ios-segmented-control__tab--active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Clair
              </button>
              <button
                type="button"
                className={`ios-segmented-control__tab ${theme === 'dark' ? 'ios-segmented-control__tab--active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Sombre
              </button>
            </div>
          </div>
        </div>

        {/* Shelf Style: Skeuomorphic Wood vs Modern iOS Grid */}
        <div className="ios-settings-row">
          <div className="ios-row-left">
            <div className="ios-badge ios-badge--orange">
              <LayoutGrid size={17} />
            </div>
            <div className="ios-row-label-wrap">
              <span className="ios-row-label">Étagère</span>
            </div>
          </div>
          <div className="ios-row-right">
            <div className="ios-segmented-control" role="group" aria-label="Style d'étagère">
              <button
                type="button"
                className={`ios-segmented-control__tab ${shelfStyle === 'skeuomorphic' ? 'ios-segmented-control__tab--active' : ''}`}
                onClick={() => setShelfStyle('skeuomorphic')}
              >
                Classique
              </button>
              <button
                type="button"
                className={`ios-segmented-control__tab ${shelfStyle === 'modern' ? 'ios-segmented-control__tab--active' : ''}`}
                onClick={() => setShelfStyle('modern')}
              >
                Moderne
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="ios-settings-group-footer">
        L'étagère en bois reproduit fidèlement une bibliothèque skeuomorphique vintage. La grille moderne propose un affichage épuré style Apple Music.
      </p>

      {/* Group 2: Rendu Visuel */}
      <h3 className="ios-settings-group-title">Rendu visuel</h3>
      <div className="ios-settings-group">
        <div className="ios-settings-row">
          <div className="ios-row-left">
            <div className="ios-badge ios-badge--blue">
              <Layers size={17} />
            </div>
            <div className="ios-row-label-wrap">
              <span className="ios-row-label">Reflets</span>
              <span className="ios-row-sublabel">Les reflets auront un effet de brillance</span>
            </div>
          </div>
          <div className="ios-row-right">
            <label className="ios-switch" aria-label="Activer les reflets et tranches 3D">
              <input
                type="checkbox"
                checked={realisticSpineEnabled}
                onChange={(e) => setRealisticSpineEnabled(e.target.checked)}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Group 3: Bibliothèque */}
      <h3 className="ios-settings-group-title">Bibliothèque</h3>
      <div className="ios-settings-group">
        <div className="ios-settings-row">
          <div className="ios-row-left">
            <div className="ios-badge ios-badge--teal">
              <Disc size={17} />
            </div>
            <div className="ios-row-label-wrap">
              <span className="ios-row-label">Disques possédés</span>
            </div>
          </div>
          <div className="ios-row-right">
            <span className="ios-row-value">
              {collection.length} {collection.length > 1 ? 'albums' : 'album'}
            </span>
          </div>
        </div>

        <div
          className="ios-settings-row"
          onClick={async () => {
            if (window.confirm("Voulez-vous vraiment vider tous les albums de votre étagère ?")) {
              await clearCollection();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="ios-row-left">
            <div className="ios-badge ios-badge--red">
              <Trash2 size={17} />
            </div>
            <span className="ios-row-label" style={{ color: '#ff453a' }}>
              Vider l'étagère
            </span>
          </div>
        </div>
      </div>

      {/* Group 4: Application */}
      <h3 className="ios-settings-group-title">Application</h3>
      <div className="ios-settings-group">
        <div className="ios-settings-row" onClick={() => setIsOnboardingOpen(true)} role="button" tabIndex={0}>
          <div className="ios-row-left">
            <div className="ios-badge ios-badge--purple">
              <BookOpen size={17} />
            </div>
            <span className="ios-row-label">Revoir le guide d'accueil</span>
          </div>
          <ChevronRight size={14} className="ios-chevron" />
        </div>

        <div className="ios-settings-row" onClick={handleInstallPWA} role="button" tabIndex={0}>
          <div className="ios-row-left">
            <div className="ios-badge ios-badge--green">
              <Smartphone size={17} />
            </div>
            <span className="ios-row-label">Installer l'application (PWA)</span>
          </div>
          <ChevronRight size={14} className="ios-chevron" />
        </div>

        <div className="ios-settings-row">
          <div className="ios-row-left">
            <div className="ios-badge ios-badge--gray">
              <Info size={17} />
            </div>
            <span className="ios-row-label">Version</span>
          </div>
          <div className="ios-row-right">
            <span className="ios-row-value">2.2.0 (SF Pro & Wood)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
