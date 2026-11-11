import './SoundButton.css';
import { useState, useCallback, useRef } from 'react';
import { useAudio } from '../../hooks/useAudio';
import { useApp } from '../../context/AppContext';
import { Pin, PinOff } from 'lucide-react';

export default function SoundButton({ sound, index = 0 }) {
  const { play } = useAudio();
  const { state, dispatch } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const longPressTimer = useRef(null);
  const isPinned = state.pinnedSoundId === sound.id;
  const playCount = state.soundStats[sound.id] || 0;

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    const audio = play(sound.id, sound.audio);
    if (audio) {
      audio.addEventListener('ended', () => setIsPlaying(false));
    }
    setTimeout(() => setIsPlaying(false), 500);
  }, [play, sound.id, sound.audio]);

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowPin(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  const handlePin = useCallback((e) => {
    e.stopPropagation();
    dispatch({ type: 'PIN_SOUND', payload: sound.id });
    setShowPin(false);
  }, [dispatch, sound.id]);

  return (
    <div
      className={`sound-button-wrapper slide-up slide-up-delay-${Math.min(index % 6 + 1, 6)}`}
    >
      <button
        className={`sound-button ${isPlaying ? 'sound-button--playing' : ''} ${isPinned ? 'sound-button--pinned' : ''}`}
        onClick={handlePlay}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowPin(!showPin);
        }}
        id={`sound-${sound.id}`}
        aria-label={`Jouer le son ${sound.name}`}
      >
        <div className="sound-button__image-container">
          {sound.image ? (
            <img
              src={sound.image}
              alt={sound.name}
              className="sound-button__image"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="sound-button__fallback"
            style={{ display: sound.image ? 'none' : 'flex' }}
          >
            <span className="sound-button__emoji">🔊</span>
          </div>

          {isPlaying && (
            <div className="sound-button__playing-overlay">
              <div className="playing-indicator">
                <span /><span /><span /><span />
              </div>
            </div>
          )}

          {isPinned && (
            <div className="sound-button__pin-badge" title="Son épinglé">
              <Pin size={10} />
            </div>
          )}
        </div>

        <span className="sound-button__name">{sound.name}</span>

        {playCount > 0 && (
          <span className="sound-button__count">{playCount}×</span>
        )}
      </button>

      {showPin && (
        <div className="sound-button__pin-menu fade-in">
          <button className="sound-button__pin-action" onClick={handlePin}>
            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            {isPinned ? 'Désépingler' : 'Épingler'}
          </button>
        </div>
      )}
    </div>
  );
}
