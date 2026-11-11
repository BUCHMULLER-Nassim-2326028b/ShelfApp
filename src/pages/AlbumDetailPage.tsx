import React, { useState, useEffect, useRef } from 'react';
import { useShelf } from '../context/ShelfContext';
import {
  ChevronLeft,
  Disc,
  Plus,
  Check,
  Trash2,
  Star,
  Camera,
  Calendar,
  Tag,
  Hash,
  ListMusic,
  ExternalLink,
  Loader2,
  Sparkles,
  Share2,
} from 'lucide-react';
import { getDiscogsReleaseOrMaster } from '../lib/discogsProxyClient';
import { normalizeDiscogsRelease } from '../utils/discogsNormalizer';
import type { NormalizedMediaItem } from '../types/discogs';
import './AlbumDetailPage.css';

interface AlbumDetailPageProps {
  releaseId: string | number;
  onBack: () => void;
  backLabel?: string;
}

export default function AlbumDetailPage({
  releaseId,
  onBack,
  backLabel = 'Retour',
}: AlbumDetailPageProps) {
  const {
    collection,
    addToCollection,
    removeFromCollection,
    updateItemNotesAndRating,
    uploadCustomCover,
    removeCustomCover,
  } = useShelf();

  const strId = String(releaseId);
  const isMaster = strId.startsWith('m-') || strId.startsWith('master-');
  const cleanId = parseInt(strId.replace(/^(m-|master-)/, ''), 10);

  const itemInCollection = collection.find(
    (item) => item.release_id === cleanId || (item.master_id && item.master_id === cleanId)
  );

  const [item, setItem] = useState<NormalizedMediaItem | null>(itemInCollection || null);
  const [isLoading, setIsLoading] = useState(!itemInCollection);
  const [loadError, setLoadError] = useState<string | null>(null);

  // User notes & rating
  const [notes, setNotes] = useState(itemInCollection?.notes || '');
  const [rating, setRating] = useState<number | null>(itemInCollection?.rating || null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Custom cover upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Add to collection state
  const [isAdding, setIsAdding] = useState(false);

  // Prevent rubber-band pull-down at top of album detail to prevent revealing shelf underneath
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const deltaY = currentY - startY;
        const deltaX = currentX - startX;

        if (el.scrollTop <= 0 && deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  // Keep notes and rating in sync if item in collection updates
  useEffect(() => {
    if (itemInCollection) {
      setItem(itemInCollection);
      setNotes(itemInCollection.notes || '');
      setRating(itemInCollection.rating || null);
    }
  }, [itemInCollection]);

  // Fetch full release details from Discogs if not already in collection
  useEffect(() => {
    if (itemInCollection) return;

    let isMounted = true;
    async function fetchRelease() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const raw = await getDiscogsReleaseOrMaster(cleanId, isMaster ? 'master' : 'release');
        if (isMounted) {
          const normalized = normalizeDiscogsRelease(raw);
          setItem(normalized);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Impossible de charger les détails de cet album.';
          setLoadError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchRelease();
    return () => {
      isMounted = false;
    };
  }, [cleanId, isMaster, itemInCollection]);

  const handleSaveNotes = async () => {
    if (!item) return;
    try {
      setIsSavingNotes(true);
      await updateItemNotesAndRating(item.release_id, notes, rating);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleRatingClick = async (star: number) => {
    if (!item) return;
    const newRating = rating === star ? null : star;
    setRating(newRating);
    if (itemInCollection) {
      await updateItemNotesAndRating(item.release_id, notes, newRating);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    try {
      setIsUploadingCover(true);
      const url = await uploadCustomCover(item.release_id, file);
      setItem((prev) => (prev ? { ...prev, cover_url_custom: url } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du téléversement';
      alert(msg);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!item) return;
    if (window.confirm("Rétablir la pochette officielle Discogs ?")) {
      await removeCustomCover(item.release_id);
      setItem((prev) => (prev ? { ...prev, cover_url_custom: undefined } : null));
    }
  };

  const handleAdd = async () => {
    if (!item) return;
    try {
      setIsAdding(true);
      await addToCollection(item);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout.";
      alert(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (window.confirm(`Voulez-vous retirer "${item.title}" de votre collection ?`)) {
      await removeFromCollection(item.release_id);
      onBack();
    }
  };

  const coverUrl = item?.cover_url_custom || item?.cover_url_official || '';

  return (
    <div className="album-detail-page" ref={containerRef}>
      {/* ── Sticky iOS Navigation Bar ── */}
      <nav className="album-detail-navbar">
        <button
          type="button"
          className="album-nav-back-btn"
          onClick={onBack}
          aria-label={backLabel}
        >
          <ChevronLeft size={24} className="album-nav-back-chevron" />
          <span className="album-nav-back-label">{backLabel}</span>
        </button>

        <span className="album-nav-title">
          {item ? item.title : 'Détails du disque'}
        </span>

        <div className="album-nav-actions">
          {itemInCollection && (
            <button
              type="button"
              className="album-nav-delete-btn"
              onClick={handleDelete}
              title="Retirer de l’étagère"
              aria-label="Supprimer"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </nav>

      {/* ── Loading Skeleton ── */}
      {isLoading && (
        <div className="album-detail-loading">
          <Loader2 size={38} className="spin-animation" color="#ffb038" />
          <p>Chargement des détails depuis Discogs...</p>
        </div>
      )}

      {/* ── Error Banner ── */}
      {loadError && (
        <div className="album-detail-error">
          <p>{loadError}</p>
          <button type="button" className="album-btn-retry" onClick={onBack}>
            Retourner à la recherche
          </button>
        </div>
      )}

      {/* ── Content View ── */}
      {!isLoading && item && (
        <div className="album-detail-body">
          {/* Big Cover Art Section with Vinyl Gloss */}
          <div className="album-hero-section">
            <div className="album-cover-stage">
              <div className="album-cover-container">
                {coverUrl ? (
                  <img src={coverUrl} alt={item.title} className="album-hero-img" />
                ) : (
                  <div className="album-hero-fallback">
                    <Disc size={80} color="#52525b" />
                  </div>
                )}
                <div className="album-hero-sheen" />

                {/* Custom Photo Button (if in collection) */}
                {itemInCollection && (
                  <button
                    type="button"
                    className="album-photo-badge-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingCover}
                    title="Changer par une photo de votre pochette"
                  >
                    <Camera size={15} />
                    <span>{isUploadingCover ? 'Envoi...' : 'Photo perso'}</span>
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                />
              </div>

              {item.cover_url_custom && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                  <span className="album-custom-cover-tag">✓ Photo perso (locale)</span>
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    style={{
                      background: 'rgba(255, 69, 58, 0.12)',
                      border: '1px solid rgba(255, 69, 58, 0.25)',
                      color: '#ff453a',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    Rétablir l'originale
                  </button>
                </div>
              )}
            </div>

            {/* Title & Artist */}
            <div className="album-title-block">
              <h1 className="album-main-title">{item.title}</h1>
              <h2 className="album-main-artist">{item.artist}</h2>

              {/* Format & Release Badges */}
              <div className="album-badge-row">
                <span className="album-badge-pill format-pill">{item.format}</span>
                {item.year && (
                  <span className="album-badge-pill">
                    <Calendar size={12} />
                    <span>{item.year}</span>
                  </span>
                )}
                {item.label && (
                  <span className="album-badge-pill">
                    <Tag size={12} />
                    <span>{item.label}</span>
                  </span>
                )}
                {item.catno && (
                  <span className="album-badge-pill">
                    <Hash size={12} />
                    <span>{item.catno}</span>
                  </span>
                )}
              </div>

              {/* Format details: LP, Album, Limited Edition... */}
              {item.format_details && item.format_details.length > 0 && (
                <div className="album-formats-list">
                  {item.format_details.map((fd, i) => (
                    <span key={i} className="album-format-spec">
                      {fd}
                    </span>
                  ))}
                </div>
              )}

              {/* Genres and Styles */}
              {((item.genres && item.genres.length > 0) || (item.styles && item.styles.length > 0)) && (
                <div className="album-genres-list">
                  {[...(item.genres || []), ...(item.styles || [])].map((g, i) => (
                    <span key={i} className="album-genre-tag">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Main Collection Action ── */}
          <div className="album-action-card">
            {itemInCollection ? (
              <div className="album-in-shelf-banner">
                <div className="album-in-shelf-left">
                  <Check size={18} color="#30d158" />
                  <div>
                    <strong>Sur votre étagère</strong>
                    <span>Format {item.format}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="album-btn-remove-shelf"
                  onClick={handleDelete}
                >
                  Retirer
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="album-btn-add-shelf"
                onClick={handleAdd}
                disabled={isAdding}
              >
                {isAdding ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Ajout à votre étagère...</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Ajouter à mon étagère</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* ── Personal Rating & Notes (Inset Grouped) ── */}
          {itemInCollection && (
            <div className="album-detail-group">
              <div className="album-group-header">Notes & Évaluation personnelle</div>

              <div className="album-rating-section">
                <span className="album-rating-label">Votre note :</span>
                <div className="album-stars-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`album-star-btn ${(rating || 0) >= star ? 'active' : ''}`}
                      onClick={() => handleRatingClick(star)}
                      aria-label={`${star} étoiles`}
                    >
                      <Star
                        size={24}
                        fill={(rating || 0) >= star ? '#ffb038' : 'transparent'}
                        color={(rating || 0) >= star ? '#ffb038' : '#636366'}
                      />
                    </button>
                  ))}
                  {rating && (
                    <span className="album-rating-text">{rating} / 5</span>
                  )}
                </div>
              </div>

              <div className="album-notes-section">
                <textarea
                  className="album-notes-textarea"
                  placeholder="État du disque (VG+, NM), pressage, date d'acquisition, impressions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <button
                  type="button"
                  className="album-notes-save-btn"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                >
                  {isSavingNotes
                    ? 'Enregistrement...'
                    : saveSuccess
                    ? '✓ Enregistré'
                    : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {/* ── Full Tracklist ── */}
          {item.tracklist && item.tracklist.length > 0 && (
            <div className="album-detail-group">
              <div className="album-group-header">
                Tracklist ({item.tracklist.length} titres)
              </div>
              <div className="album-tracklist-list">
                {item.tracklist.map((track, idx) => (
                  <div key={idx} className="album-track-row">
                    <span className="album-track-pos">
                      {track.position || idx + 1}
                    </span>
                    <span className="album-track-title">{track.title}</span>
                    {track.duration && (
                      <span className="album-track-duration">{track.duration}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Discogs External Link ── */}
          <div className="album-external-link-wrap">
            <a
              href={`https://www.discogs.com/release/${item.release_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="album-discogs-link-btn"
            >
              <span>Consulter la fiche officielle sur Discogs</span>
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
