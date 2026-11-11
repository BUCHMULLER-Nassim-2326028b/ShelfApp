/**
 * Native Back & Gesture Controller for ShelfApp
 *
 * Disables native browser navigation gestures (Safari/Chrome edge-swipes)
 * and traps the browser history to prevent accidentally exiting the PWA or web app.
 * Allows modals, drawers, and nested navigation stacks to handle the back action.
 */
import { useEffect } from 'react';

type BackHandler = () => boolean | void;

// LIFO registry of active back handlers (e.g. topmost modal -> sub-page -> root)
const backHandlers: BackHandler[] = [];

/**
 * Register a back handler. Handlers are evaluated in reverse registration order.
 * If a handler returns `true` (or undefined), it is considered consumed.
 * If a handler returns `false`, evaluation continues to the next handler.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.lastIndexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Executes the topmost back handler if available.
 * Returns true if an in-app action was handled, false otherwise.
 */
export function triggerAppBack(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i--) {
    const handler = backHandlers[i];
    const result = handler();
    if (result !== false) {
      return true;
    }
  }
  return false;
}

/**
 * React hook to register a back action when a modal or sub-screen is active.
 *
 * @param onBack Callback function to execute on back.
 * @param isEnabled Whether the handler is currently active.
 */
export function useNativeBack(onBack: () => void, isEnabled: boolean = true) {
  useEffect(() => {
    if (!isEnabled) return;
    return registerBackHandler(() => {
      onBack();
      return true;
    });
  }, [onBack, isEnabled]);
}

/**
 * Initializes global browser back protection and gesture blocking.
 * Should be called once at application bootstrap.
 */
export function initNativeBackTrap(): void {
  if (typeof window === 'undefined') return;

  // 1. Maintain a persistent history trap entry so popstate fires instead of leaving the app
  const ensureHistoryTrap = () => {
    try {
      window.history.pushState({ shelfAppTrap: true }, '', window.location.href);
    } catch {
      // Ignore if pushState fails in restricted sandbox
    }
  };

  // Push initial trap state
  ensureHistoryTrap();

  // Listen to popstate (back button, Android system back gesture)
  window.addEventListener('popstate', () => {
    // Re-push immediately so consecutive back presses stay trapped within the app
    ensureHistoryTrap();

    // Trigger internal app back (closes modal, sub-page, etc.)
    triggerAppBack();
  });

  // 2. Prevent keyboard back navigations outside of text inputs
  window.addEventListener('keydown', (e) => {
    // Alt + Left Arrow (browser back on Windows/Linux/macOS)
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      triggerAppBack();
      return;
    }

    // Backspace outside input/textarea
    if (e.key === 'Backspace') {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);
      if (!isInput) {
        e.preventDefault();
        triggerAppBack();
      }
    }
  });

  // 3. Block native browser edge swipe navigation gestures (iOS Safari / WebKit & Android Chrome)
  let touchStartX = 0;
  let touchStartY = 0;

  window.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches.length === 1) {
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const dx = clientX - touchStartX;
        const dy = clientY - touchStartY;

        // Check if touch started near the screen edge (within 32px)
        const isLeftEdge = touchStartX <= 32;
        const isRightEdge = touchStartX >= window.innerWidth - 32;
        const isHorizontal = Math.abs(dx) > Math.abs(dy);

        // Check if any modal or bottom sheet is open
        const hasOpenModal = document.querySelector(
          '.search-modal-backdrop, .onboarding-overlay, [role="dialog"]'
        ) !== null;

        // Cancel browser native edge navigation
        if (((isLeftEdge && dx > 0) || (isRightEdge && dx < 0) || hasOpenModal) && isHorizontal) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    },
    { passive: false }
  );
}
