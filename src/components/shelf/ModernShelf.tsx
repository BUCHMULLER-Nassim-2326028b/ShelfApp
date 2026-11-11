import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShelf } from '../../context/ShelfContext';
import type { ShelfFilter } from '../../context/ShelfContext';
import { Plus, Disc, LayoutGrid } from 'lucide-react';
import '../../styles/modern-shelf.css';

interface ModernShelfProps {
  onAddClick: () => void;
}

export const ModernShelf: React.FC<ModernShelfProps> = ({ onAddClick }) => {
  const navigate = useNavigate();
  const {
    filteredCollection,
    filterSection,
    setFilterSection,
    setSelectedItem,
    realisticSpineEnabled,
  } = useShelf();

  // Grid columns (2, 3, 4 or 5)
  const [columns, setColumns] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('shelfapp_shelf_columns');
      if (saved) {
        const val = parseInt(saved, 10);
        if (val >= 2 && val <= 5) return val;
      }
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' && window.innerWidth < 420 ? 3 : 4;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef<number | null>(null);

  // Persist columns in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shelfapp_shelf_columns', columns.toString());
    } catch {
      /* ignore */
    }
  }, [columns]);

  // Touch Pinch-to-Resize Gesture Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    } else {
      touchStartDistRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const delta = currentDist - touchStartDistRef.current;

      const PINCH_THRESHOLD = 50;

      if (delta > PINCH_THRESHOLD) {
        // Pinch Out -> Fewer columns (Zoom in)
        setColumns((prev) => {
          if (prev > 2) {
            touchStartDistRef.current = currentDist;
            return prev - 1;
          }
          return prev;
        });
      } else if (delta < -PINCH_THRESHOLD) {
        // Pinch In -> More columns (Zoom out)
        setColumns((prev) => {
          if (prev < 5) {
            touchStartDistRef.current = currentDist;
            return prev + 1;
          }
          return prev;
        });
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  const cycleColumns = useCallback(() => {
    setColumns((prev) => {
      const maxCols = typeof window !== 'undefined' && window.innerWidth >= 1200 ? 7 : window.innerWidth >= 768 ? 6 : 5;
      if (prev >= maxCols) return 2;
      return prev + 1;
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="modern-shelf-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Modern iOS Glass Toolbar */}
      <header className="modern-shelf-toolbar">
        <div className="modern-toolbar-left">
          <button
            type="button"
            className="modern-density-btn"
            onClick={cycleColumns}
            title="Changer le nombre d'albums par ligne"
            aria-label={`Grille de ${columns} colonnes`}
          >
            <LayoutGrid size={15} />
            <span>{columns}</span>
          </button>
        </div>

        {/* Center: Clean iOS Segmented Filter */}
        <nav className="modern-segmented" aria-label="Filtres de format">
          {(
            [
              { id: 'All', label: 'Tous' },
              { id: 'Vinyl', label: 'Vinyles' },
              { id: 'CD', label: 'CDs' },
              { id: 'Cassette', label: 'K7' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`modern-segmented__tab ${filterSection === tab.id ? 'active' : ''}`}
              onClick={() => setFilterSection(tab.id as ShelfFilter)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: Add button */}
        <div className="modern-toolbar-right">
          <button
            type="button"
            className="modern-add-btn"
            onClick={onAddClick}
            aria-label="Ajouter un disque"
            id="btn-add-modern-shelf"
          >
            <Plus size={15} />
            <span>Ajouter</span>
          </button>
        </div>
      </header>

      {/* Grid of Albums or Empty State */}
      {filteredCollection.length === 0 ? (
        <div className="modern-empty-state">
          <div className="modern-empty-icon">
            <Disc size={34} />
          </div>
          <h2 className="modern-empty-title">Votre étagère est vide</h2>
          <p className="modern-empty-desc">
            Recherchez et ajoutez vos vinyles, CDs et cassettes depuis la base Discogs.
          </p>
          <button
            type="button"
            className="modern-add-btn"
            onClick={onAddClick}
            style={{ marginTop: '8px', padding: '10px 20px', fontSize: '14px' }}
          >
            <Plus size={16} />
            <span>Ajouter un premier disque</span>
          </button>
        </div>
      ) : (
        <main
          className={`modern-grid-container ${columns >= 4 ? 'modern-grid-container--dense' : ''}`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {filteredCollection.map((item) => {
            const displayCover =
              item.cover_url_custom ||
              item.cover_url_official ||
              '/images/default_record.png';

            return (
              <div
                key={item.release_id}
                className="modern-album-card"
                onClick={() => navigate('/album/' + item.release_id)}
                role="button"
                tabIndex={0}
                aria-label={`${item.title} par ${item.artist}`}
              >
                <div className="modern-cover-wrap">
                  {(item.format === 'Vinyl' || (typeof item.format === 'string' && item.format.toLowerCase().includes('vinyl'))) && (
                    <div className="modern-vinyl-peek" />
                  )}
                  <img
                    src={displayCover}
                    alt={item.title}
                    className="modern-cover-img"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  {realisticSpineEnabled && <div className="modern-cover-gloss" />}
                </div>

                <div className="modern-card-meta">
                  <h3 className="modern-card-title">{item.title}</h3>
                  <p className="modern-card-artist">{item.artist}</p>
                  <span className="modern-card-badge">{item.format}</span>
                </div>
              </div>
            );
          })}
        </main>
      )}
    </div>
  );
};
