import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useShelf } from '../../context/ShelfContext';
import { useNativeBack } from '../../lib/nativeBackHandler';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Disc,
} from 'lucide-react';
import { startDiscogsOAuth } from '../../lib/discogsOAuth';
import './AuthModal.css';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    supabaseUser,
    signInWithEmail,
    signUpWithEmail,
    signOutSupabase,
    authModalMode,
    setAuthModalMode,
  } = useShelf();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Slidable drag gesture state (matching Search filter sheet 30% threshold to dismiss)
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsAuthModalOpen(false);
      setAuthModalMode('account');
      setIsClosing(false);
      setDragY(0);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }, 240);
  };

  const openPendingDiscogsModal = () => {
    if (localStorage.getItem('shelfapp_pending_discogs_after_auth') !== 'true') return;
    localStorage.removeItem('shelfapp_pending_discogs_after_auth');
    setAuthModalMode('discogs');
    setIsAuthModalOpen(true);
  };

  // Native back gesture to dismiss
  useNativeBack(closeModal, isAuthModalOpen);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isHeader = target.closest('.auth-sheet-header') !== null;
    const isAtTop = !sheetRef.current || sheetRef.current.scrollTop <= 0;

    if (isHeader || isAtTop) {
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      if (e.cancelable) e.preventDefault();
      setDragY(dy);
    } else {
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const sheetHeight = sheetRef.current?.clientHeight || 600;
    const threshold = sheetHeight * 0.30;
    const dt = Date.now() - touchStartTime.current;
    const velocity = dragY / (dt || 1);

    if (dragY > threshold || (velocity > 0.45 && dragY > 40)) {
      closeModal();
    } else {
      setDragY(0);
    }
  };

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const result = await signInWithEmail(cleanEmail, password);
        if (result.success) {
          setSuccessMessage('Connexion réussie.');
          setTimeout(() => {
            closeModal();
            setTimeout(openPendingDiscogsModal, 260);
          }, 700);
        } else {
          setErrorMessage(result.error || 'Erreur lors de la connexion.');
        }
      } else {
        const result = await signUpWithEmail(cleanEmail, password);
        if (result.success) {
          if (result.needConfirmation) {
            setSuccessMessage(
              'Compte créé. Un lien de confirmation vous a été envoyé par e-mail.'
            );
          } else {
            setSuccessMessage('Compte créé avec succès.');
            setTimeout(() => {
              closeModal();
              setTimeout(openPendingDiscogsModal, 260);
            }, 900);
          }
        } else {
          setErrorMessage(result.error || "Erreur lors de l'inscription.");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscogsConnect = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await startDiscogsOAuth();
    if (!result.success) {
      setIsLoading(false);
      setErrorMessage(result.error || 'Impossible de connecter Discogs.');
    }
  };

  const modalContent = (
    <div
      className="auth-modal-backdrop"
      onClick={closeModal}
    >
      <div
        ref={sheetRef}
        className="auth-modal-sheet"
        style={{
          transform: isClosing
            ? 'translateY(100%)'
            : dragY > 0
              ? `translateY(${dragY}px)`
              : 'translateY(0)',
          transition: isDragging
            ? 'none'
            : 'transform 0.26s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sticky Header with Progressive Blur (copied from filter sheet) */}
        <div className="auth-sheet-header">
          <div className="auth-sheet-handle" />
          <div className="auth-sheet-title-row">
            <h2 className="auth-sheet-title">
              {authModalMode === 'discogs'
                ? 'Connecter Discogs'
                : supabaseUser
                  ? 'Compte iShelf'
                  : 'Compte et cloud'}
            </h2>
            <button
              type="button"
              className="auth-sheet-close"
              onClick={closeModal}
              aria-label="Fermer"
            >
              <X size={17} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Body */}
        <div className="auth-sheet-body">
          {authModalMode === 'discogs' ? (
            <>
              <div className="auth-discogs-brand">
                <img
                  src="https://upload.wikimedia.org/wikipedia/it/e/e8/Discogs_logo.svg?utm_source=it.wikipedia.org&utm_campaign=index&utm_content=original"
                  alt="Discogs"
                />
              </div>
              <p className="auth-subtitle">
                Associez votre compte Discogs pour rechercher et importer vos disques.
              </p>

              {errorMessage && (
                <div className="auth-banner auth-banner--error">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="button"
                className="auth-submit-btn"
                onClick={() => void handleDiscogsConnect()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="spin-animation" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <Disc size={18} />
                    <span>Se connecter à Discogs</span>
                  </>
                )}
              </button>
            </>
          ) : supabaseUser ? (
            // Logged in state
            <>
              <p className="auth-subtitle">
                Vous êtes connecté à votre compte iShelf :
              </p>

              <div className="auth-user-card">
                <div className="auth-user-avatar">
                  {supabaseUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '1rem',
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {supabaseUser.email}
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginTop: '3px',
                      fontWeight: 500,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Sauvegarde cloud active</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="auth-destructive-btn"
                  onClick={async () => {
                    await signOutSupabase();
                    closeModal();
                  }}
                >
                  <LogOut size={16} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </>
          ) : (
            // Logged out form state
            <>
              <p className="auth-subtitle">
                Synchronisez votre collection musicale sur tous vos appareils en temps réel.
              </p>

              {/* Pill Segmented Control */}
              <div className="auth-segmented" role="tablist">
                <button
                  type="button"
                  className={`auth-segmented-btn ${mode === 'signin' ? 'auth-segmented-btn--active' : ''}`}
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  className={`auth-segmented-btn ${mode === 'signup' ? 'auth-segmented-btn--active' : ''}`}
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  Créer un compte
                </button>
              </div>

              {/* Banners */}
              {errorMessage && (
                <div className="auth-banner auth-banner--error">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="auth-banner auth-banner--success">
                  <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{successMessage}</span>
                </div>
              )}

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-email">
                    Adresse e-mail
                  </label>
                  <div className="auth-input-wrapper">
                    <Mail size={17} className="auth-input-icon" />
                    <input
                      id="auth-email"
                      type="email"
                      className="auth-input"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-pwd">
                    Mot de passe
                  </label>
                  <div className="auth-input-wrapper">
                    <Lock size={17} className="auth-input-icon" />
                    <input
                      id="auth-pwd"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Au moins 6 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      required
                    />
                    <button
                      type="button"
                      className="auth-toggle-pwd"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Masquer' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-confirm-pwd">
                      Confirmer le mot de passe
                    </label>
                    <div className="auth-input-wrapper">
                      <Lock size={17} className="auth-input-icon" />
                      <input
                        id="auth-confirm-pwd"
                        type={showPassword ? 'text' : 'password'}
                        className="auth-input"
                        placeholder="Retapez votre mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="spin-animation" />
                      <span>{mode === 'signin' ? 'Connexion en cours...' : 'Création en cours...'}</span>
                    </>
                  ) : (
                    <span>{mode === 'signin' ? 'Se connecter' : 'Créer un compte'}</span>
                  )}
                </button>
              </form>

              <p className="auth-footer-note">
                Vos albums et réglages sont sauvegardés dans votre espace cloud sécurisé. Vos pochettes personnalisées restent enregistrées localement sur votre appareil.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
