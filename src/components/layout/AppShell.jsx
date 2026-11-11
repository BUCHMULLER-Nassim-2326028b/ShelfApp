import React from 'react';
import { useLocation } from 'react-router-dom';
import { useShelf } from '../../context/ShelfContext';
import BottomNav from './BottomNav';
import { AuthModal } from '../auth/AuthModal';

export default function AppShell({ children }) {
  const location = useLocation();
  const { isOnboardingOpen } = useShelf();
  const isAuthCallback = location.pathname.startsWith('/auth/callback');

  return (
    <div className="app-shell" style={{ minHeight: '100vh', height: '100%' }}>
      {/* Full screen main content — no black gap behind bottom nav */}
      <main className="app-shell__content" style={{ paddingBottom: 0, height: '100%' }}>
        {children}
      </main>

      {/* Global Supabase Auth Modal */}
      <AuthModal />

      {/* iOS Floating Bottom navigation hovering over full-screen content */}
      {!isAuthCallback && !isOnboardingOpen && <BottomNav />}
    </div>
  );
}
