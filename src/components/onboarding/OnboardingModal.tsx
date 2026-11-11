import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useShelf } from '../../context/ShelfContext';
import { useNativeBack } from '../../lib/nativeBackHandler';
import { startDiscogsOAuth } from '../../lib/discogsOAuth';
import {
  Disc,
  ArrowRight,
  ScanBarcode,
  Search,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Library,
  Layers,
} from 'lucide-react';
import './OnboardingModal.css';

export const OnboardingModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, hasToken } = useShelf();
  const [step, setStep] = useState<1 | 2>(1);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Swipe gesture support between slides
  const touchStartX = useRef<number | null>(null);

  // Native back gesture to dismiss
  useNativeBack(() => setIsOnboardingOpen(false), isOnboardingOpen);

  if (!isOnboardingOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('shelfapp_has_seen_onboarding', 'true');
    setIsOnboardingOpen(false);
  };

  const handleOAuthConnect = async () => {
    try {
      setIsOAuthLoading(true);
      setOauthError(null);
      const result = await startDiscogsOAuth();
      if (!result.success) {
        setIsOAuthLoading(false);
        setOauthError(result.error || "Impossible d'initialiser la connexion avec Discogs.");
      }
    } catch {
      setIsOAuthLoading(false);
      setOauthError("Erreur lors de la redirection vers Discogs.");
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50 && step === 1) {
      setStep(2);
    } else if (dx > 50 && step === 2) {
      setStep(1);
    }
    touchStartX.current = null;
  };

  const modalContent = (
    <div
      className="ios-onboarding-fullscreen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue sur ShelfApp"
    >
      <div className="ios-onboarding-ambient" />

      {/* Espace sécurisé supérieur */}
      <div className="ios-onboarding-topbar" />

      {/* Conteneur des slides paginées */}
      <div
        className="ios-onboarding-slides-container"
        style={{ transform: step === 1 ? 'translateX(0%)' : 'translateX(-50%)' }}
      >
        {/* ── Slide 1 : Présentation des fonctionnalités ── */}
        <section className="ios-onboarding-slide">
          <div className="ios-onboarding-hero">
            <div className="ios-onboarding-disc-wrapper">
              <div className="ios-onboarding-disc-center">
                <Disc size={18} strokeWidth={2.4} />
              </div>
            </div>
          </div>

          <h1 className="ios-onboarding-title">Bienvenue sur ShelfApp</h1>
          <p className="ios-onboarding-subtitle">
            Gérez votre collection musicale et retrouvez tous vos disques au même endroit.
          </p>

          <div className="ios-onboarding-features">
            <div className="ios-onboarding-feature">
              <div className="ios-onboarding-feature-badge ios-badge--amber">
                <Library size={20} />
              </div>
              <div className="ios-onboarding-feature-text">
                <h3 className="ios-onboarding-feature-title">Gestion de votre discothèque</h3>
                <p className="ios-onboarding-feature-desc">
                  Classez et visualisez vos vinyles, CD et cassettes avec leurs visuels haute définition.
                </p>
              </div>
            </div>

            <div className="ios-onboarding-feature">
              <div className="ios-onboarding-feature-badge ios-badge--blue">
                <ScanBarcode size={20} />
              </div>
              <div className="ios-onboarding-feature-text">
                <h3 className="ios-onboarding-feature-title">Scan de code-barres rapide</h3>
                <p className="ios-onboarding-feature-desc">
                  Scannez le code au dos d'une pochette avec la caméra de votre téléphone pour ajouter un disque instantanément.
                </p>
              </div>
            </div>

            <div className="ios-onboarding-feature">
              <div className="ios-onboarding-feature-badge ios-badge--purple">
                <Search size={20} />
              </div>
              <div className="ios-onboarding-feature-text">
                <h3 className="ios-onboarding-feature-title">Fiches d'albums détaillées</h3>
                <p className="ios-onboarding-feature-desc">
                  Consultez la liste des pistes, l'année de sortie, le label et les caractéristiques de chaque pressage.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Slide 2 : Connexion Discogs ── */}
        <section className="ios-onboarding-slide">
          <div className="ios-onboarding-hero">
            <div
              className="ios-onboarding-disc-wrapper"
              style={{
                background: 'radial-gradient(circle at center, #0a84ff 0%, #004080 30%, #111 31%, #1f1f1f 45%, #050505 100%)',
              }}
            >
              <div className="ios-onboarding-disc-center" style={{ background: '#0a84ff', color: '#fff' }}>
                <Search size={18} strokeWidth={2.4} />
              </div>
            </div>
          </div>

          <h1 className="ios-onboarding-title">Connexion à Discogs</h1>
          <p className="ios-onboarding-subtitle">
            Reliez votre compte pour synchroniser votre bibliothèque et profiter du moteur de recherche sans limite.
          </p>

          <div className="ios-onboarding-features">
            <div className="ios-onboarding-feature">
              <div className="ios-onboarding-feature-badge ios-badge--green">
                <ShieldCheck size={20} />
              </div>
              <div className="ios-onboarding-feature-text">
                <h3 className="ios-onboarding-feature-title">Connexion officielle en un clic</h3>
                <p className="ios-onboarding-feature-desc">
                  Autorisation directe et sécurisée auprès de Discogs. Aucun mot de passe ni token à saisir à la main.
                </p>
              </div>
            </div>

            <div className="ios-onboarding-feature">
              <div className="ios-onboarding-feature-badge ios-badge--orange">
                <Layers size={20} />
              </div>
              <div className="ios-onboarding-feature-text">
                <h3 className="ios-onboarding-feature-title">Recherche et synchronisation</h3>
                <p className="ios-onboarding-feature-desc">
                  Accédez à des millions d'éditions et importez vos disques favoris en quelques secondes.
                </p>
              </div>
            </div>
          </div>

          {oauthError && (
            <div
              style={{
                background: 'rgba(255, 69, 58, 0.15)',
                border: '1px solid rgba(255, 69, 58, 0.3)',
                borderRadius: '14px',
                padding: '10px 16px',
                color: '#ff453a',
                fontSize: '13px',
                maxWidth: '360px',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              {oauthError}
            </div>
          )}
        </section>
      </div>

      {/* ── Pied de page fixe : points de pagination et actions ── */}
      <footer className="ios-onboarding-footer">
        {/* Points de pagination */}
        <div className="ios-onboarding-dots" aria-hidden="true">
          <div
            className={`ios-onboarding-dot ${step === 1 ? 'ios-onboarding-dot--active' : ''}`}
            onClick={() => setStep(1)}
          />
          <div
            className={`ios-onboarding-dot ${step === 2 ? 'ios-onboarding-dot--active' : ''}`}
            onClick={() => setStep(2)}
          />
        </div>

        {step === 1 ? (
          <button
            type="button"
            className="ios-onboarding-btn-primary"
            onClick={() => setStep(2)}
            id="btn-onboarding-next"
          >
            <span>Continuer</span>
            <ArrowRight size={18} strokeWidth={2.4} />
          </button>
        ) : (
          <>
            {hasToken ? (
              <button
                type="button"
                className="ios-onboarding-btn-primary"
                onClick={handleFinish}
              >
                <CheckCircle2 size={19} color="#34c759" />
                <span>Compte connecté • Commencer</span>
              </button>
            ) : (
              <button
                type="button"
                className="ios-onboarding-btn-primary"
                onClick={handleOAuthConnect}
                disabled={isOAuthLoading}
                id="btn-onboarding-oauth"
              >
                {isOAuthLoading ? (
                  <>
                    <Loader2 size={19} className="spin-animation" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <Disc size={19} />
                    <span>Se connecter à Discogs</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className="ios-onboarding-btn-subtle"
              onClick={handleFinish}
            >
              Passer pour l'instant
            </button>
          </>
        )}
      </footer>
    </div>
  );

  return createPortal(modalContent, document.body);
};
