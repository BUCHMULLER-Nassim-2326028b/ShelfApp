import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ShelfProvider } from './context/ShelfContext';
import AppShell from './components/layout/AppShell';
import AnimatedRoutes from './components/layout/AnimatedRoutes';

import './styles/index.css';
import './styles/animations.css';
import './styles/wood-shelf.css';
import './styles/ios-settings.css';

// On OAuth callback, the browser lands on /auth/callback?... — capture it
// so MemoryRouter can route to OAuthCallbackPage, then the real URL stays clean.
const initialPath =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/auth/callback') || window.location.pathname.startsWith('/callback'))
    ? `${window.location.pathname}${window.location.search}`
    : '/';

export default function App() {
  return (
    <ShelfProvider>
      <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </MemoryRouter>
    </ShelfProvider>
  );
}
