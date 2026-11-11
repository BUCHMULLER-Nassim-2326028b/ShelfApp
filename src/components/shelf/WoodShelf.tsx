import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShelf } from '../../context/ShelfContext';
import type { ShelfFilter } from '../../context/ShelfContext';
import { AlbumCard } from './AlbumCard';
import { Plus, Disc, Search, LayoutGrid } from 'lucide-react';
import '../../styles/wood-shelf.css';

interface WoodShelfProps {
  onAddClick: () => void;
}

export const WoodShelf: React.FC<WoodShelfProps> = ({ onAddClick }) => {
  const navigate = useNavigate();
  const { filteredCollection, filterSection, setFilterSection, setSelectedItem } = useShelf();

  // Grid columns (2, 3, 4 or 5 albums per shelf)
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
    // Default to 3 on phone screens, 4 on wider screens
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
        // Pinch Out (spread fingers) -> Zoom in -> Fewer columns (e.g. 4 -> 3 -> 2)
        setColumns((prev) => {
          if (prev > 2) {
            touchStartDistRef.current = currentDist;
            if (navigator.vibrate) navigator.vibrate(10);
            return prev - 1;
          }
          return prev;
        });
      } else if (delta < -PINCH_THRESHOLD) {
        // Pinch In (close fingers) -> Zoom out -> More columns (e.g. 2 -> 3 -> 4 -> 5)
        setColumns((prev) => {
          if (prev < 5) {
            touchStartDistRef.current = currentDist;
            if (navigator.vibrate) navigator.vibrate(10);
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

  // Trackpad pinch-to-zoom (Ctrl + Wheel)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < -15) {
          setColumns((prev) => Math.max(2, prev - 1));
        } else if (e.deltaY > 15) {
          setColumns((prev) => Math.min(5, prev + 1));
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Reactive window dimensions tracking for dynamic responsive layout on PC & mobile
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  }));

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cycle columns on click: 3 -> 4 -> 5 -> (6 on PC) -> 2
  const cycleColumns = useCallback(() => {
    setColumns((prev) => {
      const maxCols = typeof window !== 'undefined' && window.innerWidth >= 1200 ? 7 : window.innerWidth >= 768 ? 6 : 5;
      if (prev >= maxCols) return 2;
      return prev + 1;
    });
  }, []);

  // Split items into chunks of `columns` so every row matches its own shelf board!
  const rows: typeof filteredCollection[] = [];
  for (let i = 0; i < filteredCollection.length; i += columns) {
    rows.push(filteredCollection.slice(i, i + columns));
  }

  // Row height scales with album size: album ≈ viewport/columns wide (square)
  const rowMinHeight = Math.max(90, Math.floor(windowDimensions.width / columns) + 60);
  const viewportRows = Math.ceil(windowDimensions.height / rowMinHeight) + 3;
  const minRows = Math.max(rows.length, viewportRows);
  const displayRows = Array.from({ length: minRows }, (_, idx) => rows[idx] || []);

  // Gap scales inversely with columns: fewer = bigger albums so smaller gap needed
  const gridGap = columns <= 2 ? '10px'
    : columns === 3 ? '8px'
    : columns === 4 ? '6px'
    : '5px';

  return (
    <div
      ref={containerRef}
      className={`wood-bookcase ${columns >= 4 ? 'wood-grid--dense' : ''}`}
      style={{ '--shelf-columns': columns } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="wood-toolbar">
        {/* Left: Quick Grid Density Toggle & Étagère */}
        <div className="wood-toolbar-left">
          <button
            className="ios-grid-btn"
            onClick={cycleColumns}
            title="Changer le nombre d'albums par étagère (ou pincez avec deux doigts)"
            aria-label={`Grille de ${columns} albums`}
          >
            <LayoutGrid size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '3px' }} />
            <span>{columns}</span>
          </button>
        </div>

        {/* Center: Vintage Segmented Control */}
        <nav className="ios-vintage-segmented" aria-label="Filtres de format">
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
              className={`ios-vintage-segmented__tab ${filterSection === tab.id ? 'active' : ''}`}
              onClick={() => setFilterSection(tab.id as ShelfFilter)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: Add button */}
        <div className="wood-toolbar-right">
          <button
            className="ios-vintage-btn ios-vintage-btn--accent"
            onClick={onAddClick}
            aria-label="Ajouter un disque"
            id="btn-add-shelf"
          >
            <Plus size={14} />
            <span>Ajouter</span>
          </button>
        </div>
      </header>

      {/* Shelves Content — Always renders full uniform wooden bookcase */}
      <main className="wood-shelves-container">
        {displayRows.map((rowItems, rowIndex) => (
          <section key={rowIndex} className="wood-shelf-row" aria-label={`Étagère ${rowIndex + 1}`}>

            {/* ── Alcove block background ─────────────────────────────────────
                shelf_border + shelf_bg already have the shelf plank baked at
                the TOP of the image. We just tile them as a background.
            ──────────────────────────────────────────────────────────────── */}
            <div className="wood-row-bg" aria-hidden="true">
              <div className="wood-row-border wood-row-border--left" />
              <div
                className="wood-row-bg-fill"
                style={rowIndex % 2 === 1 ? { transform: 'scaleX(-1)' } : {}}
              />
              <div className="wood-row-border wood-row-border--right" />
            </div>

            {/* ── Items sit in the alcove below the pre-baked shelf ───────── */}
            {filteredCollection.length === 0 && rowIndex === 1 ? (
              <div
                className="wood-shelf-items"
                style={{ gridTemplateColumns: '1fr', padding: '24px 20px 0 20px' }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '12px', padding: '14px 20px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px dashed rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px', color: '#fae4c4',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  <Disc size={22} color="#f0cc99" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    Étagère vide • Touchez "+ Ajouter" pour rechercher sur Discogs
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="wood-shelf-items"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: gridGap }}
              >
                {rowItems.map((item) => (
                  <AlbumCard key={item.release_id} item={item} onClick={() => navigate('/album/' + item.release_id)} />
                ))}
                {Array.from({ length: Math.max(0, columns - rowItems.length) }).map((_, emptyIdx) => (
                  <div key={`empty-${emptyIdx}`} className="wood-album-item wood-album-item--empty" aria-hidden="true">
                    <div className="wood-cover-wrapper" />
                    <div className="wood-item-meta" />
                  </div>
                ))}
              </div>
            )}

          </section>
        ))}

      </main>
    </div>
  );
};
