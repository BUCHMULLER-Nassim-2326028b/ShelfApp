import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext(null);

const STORAGE_KEY = 'savunapp_state';

const initialState = {
  volume: 1,
  pinnedSoundId: null,
  soundStats: {},       // { [soundId]: clickCount }
  customSounds: [],     // user-uploaded sounds stored as { id, name, audioUrl, categoryId }
  theme: 'dark',
  hapticFeedback: true,
  isChangelogOpen: false,
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...initialState, ...JSON.parse(saved), isChangelogOpen: false };
    }
  } catch {
    /* ignore */
  }
  return initialState;
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };

    case 'PIN_SOUND':
      return {
        ...state,
        pinnedSoundId: state.pinnedSoundId === action.payload ? null : action.payload,
      };

    case 'PLAY_SOUND': {
      const soundId = action.payload;
      const currentCount = state.soundStats[soundId] || 0;
      return {
        ...state,
        soundStats: { ...state.soundStats, [soundId]: currentCount + 1 },
      };
    }

    case 'ADD_CUSTOM_SOUND':
      return {
        ...state,
        customSounds: [...state.customSounds, action.payload],
      };

    case 'REMOVE_CUSTOM_SOUND':
      return {
        ...state,
        customSounds: state.customSounds.filter((s) => s.id !== action.payload),
      };

    case 'SET_HAPTIC':
      return { ...state, hapticFeedback: action.payload };

    case 'RESET_STATS':
      return { ...state, soundStats: {}, pinnedSoundId: null };

    case 'OPEN_CHANGELOG':
      return { ...state, isChangelogOpen: true };

    case 'CLOSE_CHANGELOG':
      return { ...state, isChangelogOpen: false };

    case 'TOGGLE_CHANGELOG':
      return { ...state, isChangelogOpen: !state.isChangelogOpen };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, loadState);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full */
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
