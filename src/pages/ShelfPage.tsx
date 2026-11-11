import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShelf } from '../context/ShelfContext';
import { WoodShelf } from '../components/shelf/WoodShelf';
import { ModernShelf } from '../components/shelf/ModernShelf';
import { OnboardingModal } from '../components/onboarding/OnboardingModal';

export default function ShelfPage() {
  const navigate = useNavigate();
  const { shelfStyle } = useShelf();

  const isModern = shelfStyle === 'modern';

  return (
    <div
      className={`shelf-page ${isModern ? 'shelf-page--modern' : 'shelf-page--wood'}`}
      style={{
        padding: 0,
        minHeight: '100vh',
        height: '100%',
        width: '100%',
        background: isModern ? 'var(--color-bg-primary, #000000)' : '#d19a58',
      }}
    >
      {/* Either Modern iOS Grid or 3D Skeuomorphic Wooden Bookcase */}
      {isModern ? (
        <ModernShelf onAddClick={() => navigate('/recherche')} />
      ) : (
        <WoodShelf onAddClick={() => navigate('/recherche')} />
      )}

      {/* First-launch Onboarding */}
      <OnboardingModal />
    </div>
  );
}
