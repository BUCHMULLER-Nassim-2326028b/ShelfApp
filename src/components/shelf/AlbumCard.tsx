import React from 'react';
import type { NormalizedMediaItem } from '../../types/discogs';
import { useShelf } from '../../context/ShelfContext';

interface AlbumCardProps {
  item: NormalizedMediaItem;
  onClick: () => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ item, onClick }) => {
  const { realisticSpineEnabled } = useShelf();
  const displayCover = item.cover_url_custom || item.cover_url_official || '/images/default_record.png';
  const isVinyl =
    item.format === 'Vinyl' ||
    (typeof item.format === 'string' && item.format.toLowerCase().includes('vinyl'));

  return (
    <div
      className="wood-album-item"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${item.title} par ${item.artist}`}
    >
      <div className="wood-cover-wrapper">
        {/* Vinyl disc peeking out behind jacket - always visible for vinyls to distinguish from CDs */}
        {isVinyl && <div className="wood-vinyl-disc" />}

        {/* Jacket card */}
        <div className="wood-cover-card">
          <img
            src={displayCover}
            alt={item.title}
            loading="lazy"
            onError={(e) => {
              // Fallback to placeholder if external image fails
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80';
            }}
          />
          {/* Diagonal skeuomorphic gloss shine */}
          {realisticSpineEnabled && <div className="wood-cover-gloss" />}
        </div>
      </div>

      {/* Album name & artist plaque under cover */}
      <div className="wood-item-meta">
        <h3 className="wood-item-title">{item.title}</h3>
        <p className="wood-item-artist">{item.artist}</p>
        <span className="wood-item-badge">{item.format}</span>
      </div>
    </div>
  );
};
