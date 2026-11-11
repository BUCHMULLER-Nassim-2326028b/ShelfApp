import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

import { initNativeBackTrap } from './lib/nativeBackHandler';

// Clean up any legacy Service Workers from the previous soundboard app
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Trap browser history and disable native browser swipe-back navigation
initNativeBackTrap();

// Capture install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
});

// Disable native DOM interactions (context menu, drag) for pure native app feel
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('dragstart', (e) => e.preventDefault());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
