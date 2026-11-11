import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAudio } from '../hooks/useAudio';
import { Pin, TrendingUp, Play } from 'lucide-react';
import ActusOverlay from '../components/features/ActusOverlay';
import ChangelogOverlay from '../components/features/ChangelogOverlay';
import soundsData from '../data/sounds.json';
import changelogData from '../data/changelog.json';
import './HomePage.css';

export default function HomePage() {
  const [showActusOverlay, setShowActusOverlay] = useState(false);
  const { state, dispatch } = useApp();
  const { play } = useAudio();
  const navigate = useNavigate();

  const currentVersion = changelogData[0]?.version || '1.1';

  // Find top most clicked sound
  const topSound = useMemo(() => {
    const entries = Object.entries(state.soundStats);
    if (entries.length === 0) return null;
    const [topId, count] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
    for (const cat of soundsData.categories) {
      const found = cat.sounds.find((s) => s.id === topId);
      if (found) return { ...found, count, categoryId: cat.id };
    }
    return null;
  }, [state.soundStats]);

  // Find pinned sound
  const pinnedSound = useMemo(() => {
    if (!state.pinnedSoundId) return null;
    for (const cat of soundsData.categories) {
      const found = cat.sounds.find((s) => s.id === state.pinnedSoundId);
      if (found) return { ...found, categoryId: cat.id };
    }
    return null;
  }, [state.pinnedSoundId]);

  const handlePinnedClick = () => {
    if (pinnedSound) {
      play(pinnedSound.id, pinnedSound.file);
    } else {
      navigate('/sons');
    }
  };

  const handleTopSoundClick = () => {
    if (topSound) {
      play(topSound.id, topSound.file);
    } else {
      navigate('/sons');
    }
  };

  return (
    <div className="page home-page">
      {/* Header with clean logo image */}
      <header className="home-header">
        <img
          src="/images/majLogoMain.png"
          alt="Majestuatisation"
          className="home-logo-img"
        />
      </header>

      {/* Main Big ACTUS Card */}
      <section className="home-actus-section" aria-label="Actualités">
        <button
          className="home-actus-card"
          onClick={() => setShowActusOverlay(true)}
          id="btn-actus-card"
          aria-label="Ouvrir les actualités"
        >
          <span className="home-actus-text">ACTUS</span>
        </button>
        <span className="home-card-caption">Actualités</span>
      </section>

      {/* Version & Nouveautés Banner (Opens Changelog Overlay) */}
      <section className="home-banner-section" aria-label="Nouveautés">
        <button
          className="home-nouveautes-banner"
          onClick={() => dispatch({ type: 'OPEN_CHANGELOG' })}
          id="btn-nouveautes-banner"
          aria-label="Voir les nouveautés de version"
        >
          <div className="home-banner-avatar-wrap">
            <img
              src="/images/savun_avatar.png"
              alt="Savun"
              className="home-banner-avatar"
            />
          </div>
          <div className="home-banner-info">
            <span className="home-banner-version">VERSION {currentVersion}</span>
            <span className="home-banner-title">NOUVEAUTÉS</span>
          </div>
        </button>
      </section>

      {/* Duo Cards: Son épinglé & Son le plus cliqué */}
      <section className="home-duo-section" aria-label="Raccourcis sons">
        <div className="home-duo-grid">
          {/* Pinned Sound */}
          <div className="home-duo-col">
            <button
              className="home-duo-card"
              onClick={handlePinnedClick}
              id="btn-pinned-sound"
              aria-label={pinnedSound ? `Jouer le son épinglé: ${pinnedSound.name}` : 'Épingler un son'}
            >
              {pinnedSound ? (
                <div className="home-duo-content">
                  <Pin size={22} className="home-duo-icon home-duo-icon--active" />
                  <span className="home-duo-title">{pinnedSound.name}</span>
                  <Play size={14} className="home-duo-play" />
                </div>
              ) : (
                <div className="home-duo-empty">
                  {/* Subtle placeholder matching original clean dark blue */}
                </div>
              )}
            </button>
            <span className="home-card-caption">Son épinglé</span>
          </div>

          {/* Top Played Sound */}
          <div className="home-duo-col">
            <button
              className="home-duo-card"
              onClick={handleTopSoundClick}
              id="btn-top-sound"
              aria-label={topSound ? `Jouer le son le plus cliqué: ${topSound.name}` : 'Aucun son joué'}
            >
              {topSound ? (
                <div className="home-duo-content">
                  <TrendingUp size={22} className="home-duo-icon home-duo-icon--active" />
                  <span className="home-duo-title">{topSound.name}</span>
                  <span className="home-duo-badge">{topSound.count}×</span>
                </div>
              ) : (
                <div className="home-duo-empty">
                  {/* Subtle placeholder matching original clean dark blue */}
                </div>
              )}
            </button>
            <span className="home-card-caption">Son le plus cliqué</span>
          </div>
        </div>
      </section>

      {/* Actus Fullscreen Overlay */}
      <ActusOverlay
        isOpen={showActusOverlay}
        onClose={() => setShowActusOverlay(false)}
      />
    </div>
  );
}
