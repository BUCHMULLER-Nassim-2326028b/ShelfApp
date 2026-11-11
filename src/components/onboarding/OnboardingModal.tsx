import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useShelf } from '../../context/ShelfContext';
import { useNativeBack } from '../../lib/nativeBackHandler';
import {
  Disc,
  ArrowRight,
  ScanBarcode,
  Search,
  ShieldCheck,
  Library,
} from 'lucide-react';
import './OnboardingModal.css';

export const OnboardingModal: React.FC = () => {
  const {
    isOnboardingOpen,
    setIsOnboardingOpen,
    supabaseUser,
    setIsAuthModalOpen,
  } = useShelf();
  const [step, setStep] = useState<1 | 2>(1);

  // Swipe gesture support between slides
  const touchStartX = useRef<number | null>(null);

  // Native back gesture to dismiss
  useNativeBack(() => setIsOnboardingOpen(false), isOnboardingOpen);

  if (!isOnboardingOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('shelfapp_has_seen_onboarding', 'true');
    setIsOnboardingOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50 && step < 2) {
      setStep(2);
    } else if (dx > 50 && step > 1) {
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
        style={{ transform: `translateX(-${(step - 1) * 50}%)` }}
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

        {/* ── Slide 2 : Compte ShelfApp ── */}
        <section className="ios-onboarding-slide">
          <div className="ios-onboarding-hero">
            <div
              className="ios-onboarding-disc-wrapper"
            >
              <div className="ios-onboarding-disc-center" style={{ background: '#0a84ff', color: '#fff' }}>
                <ShieldCheck size={18} strokeWidth={2.4} />
              </div>
            </div>
          </div>

          <h1 className="ios-onboarding-title">Votre compte ShelfApp</h1>
          <p className="ios-onboarding-subtitle">
            Créez votre compte pour sauvegarder votre collection et la retrouver sur tous vos appareils.
          </p>

          <div className="ios-onboarding-features">
            <div className="ios-onboarding-feature">
              <div className="ios-onboarding-feature-badge ios-badge--green">
                <Library size={20} />
              </div>
              <div className="ios-onboarding-feature-text">
                <h3 className="ios-onboarding-feature-title">Votre collection vous suit</h3>
                <p className="ios-onboarding-feature-desc">
                  Vos ajouts, notes et pochettes sont conservés dans votre compte.
                </p>
              </div>
            </div>

            <div className="ios-onboarding-feature">
              <div className="ios-onboarding-feature-badge ios-badge--blue">
                <ShieldCheck size={20} />
              </div>
              <div className="ios-onboarding-feature-text">
                <h3 className="ios-onboarding-feature-title">Connexion sécurisée</h3>
                <p className="ios-onboarding-feature-desc">
                  Un compte est nécessaire pour activer la sauvegarde cloud.
                </p>
              </div>
            </div>
          </div>
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
          <button
            type="button"
            className="ios-onboarding-btn-primary"
            onClick={() => (supabaseUser ? handleFinish() : setIsAuthModalOpen(true))}
          >
            <ShieldCheck size={19} />
            <span>{supabaseUser ? 'Commencer' : 'Créer mon compte'}</span>
          </button>
        )}
        {step === 2 && !supabaseUser && (
          <button type="button" className="ios-onboarding-btn-subtle" onClick={handleFinish}>
            Passer pour l'instant
          </button>
        )}
      </footer>
    </div>
  );

  return createPortal(modalContent, document.body);
};
