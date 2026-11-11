import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ShelfProvider } from '../context/ShelfContext';
import { DiscogsConnectCard } from '../components/features/DiscogsConnectCard';

describe('DiscogsConnectCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderCard = () => {
    return render(
      <ShelfProvider>
        <DiscogsConnectCard />
      </ShelfProvider>
    );
  };

  it('renders the clean iOS Discogs connection card with 1-click connect button', () => {
    renderCard();
    expect(screen.getByText('Connexion à Discogs')).toBeDefined();
    expect(screen.getByText('Se connecter à Discogs')).toBeDefined();
  });
});
