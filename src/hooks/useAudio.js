import { useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';

// Single shared audio element to prevent overlapping
let currentAudio = null;

export function useAudio() {
  const { state, dispatch } = useApp();
  const playingRef = useRef(null);

  const play = useCallback((soundId, audioSrc) => {
    // Stop current sound if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(audioSrc);
    audio.volume = state.volume;
    currentAudio = audio;
    playingRef.current = soundId;

    // Haptic feedback on mobile
    if (state.hapticFeedback && navigator.vibrate) {
      navigator.vibrate(30);
    }

    // Track play count
    dispatch({ type: 'PLAY_SOUND', payload: soundId });

    audio.play().catch(() => {
      // Audio play failed (autoplay policy)
    });

    audio.addEventListener('ended', () => {
      if (playingRef.current === soundId) {
        playingRef.current = null;
        currentAudio = null;
      }
    });

    return audio;
  }, [state.volume, state.hapticFeedback, dispatch]);

  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      playingRef.current = null;
    }
  }, []);

  return { play, stop, playingId: playingRef.current };
}
