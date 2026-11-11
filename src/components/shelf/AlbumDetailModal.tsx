import React, { useState, useRef } from 'react';
import { useShelf } from '../../context/ShelfContext';
import {
  X,
  Camera,
  Trash2,
  Star,
  Disc,
  Calendar,
  Tag,
  Hash,
  ListMusic,
  Check,
  Upload,
} from 'lucide-react';
import './AlbumDetailModal.css';

export const AlbumDetailModal: React.FC = () => {
  const {
    selectedItem,
    setSelectedItem,
    removeFromCollection,
    updateItemNotesAndRating,
    uploadCustomCover,
    removeCustomCover,
  } = useShelf();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState(selectedItem?.notes || '');
  const [rating, setRating] = useState<number | null>(selectedItem?.rating || null);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!selectedItem) return null;

  const currentCover = selectedItem.cover_url_custom || selectedItem.cover_url_official || '';

  const handleSaveNotes = async () => {
    await updateItemNotesAndRating(selectedItem.release_id, notes, rating);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await uploadCustomCover(selectedItem.release_id, file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l’enregistrement de la pochette';
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    if (window.confirm("Rétablir la pochette originale Discogs ?")) {
      await removeCustomCover(selectedItem.release_id);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Voulez-vous retirer "${selectedItem.title}" de votre collection ?`)) {
      const removed = await removeFromCollection(selectedItem.release_id);
      if (!removed) {
        alert('La suppression Supabase a échoué. Vérifiez la console pour le détail.');
      }
    }
  };

  return (
    <div className="album-modal-backdrop" onClick={() => setSelectedItem(null)}>
      <div className="album-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* iOS Drag Handle */}
        <div className="album-modal-handle" />

        {/* Modal Top Bar */}
        <div className="album-modal-top">
          <button
            className="album-modal-close"
            onClick={() => setSelectedItem(null)}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
          <span className="album-modal-badge">{selectedItem.format}</span>
          <button
            className="album-modal-delete"
            onClick={handleDelete}
            aria-label="Supprimer"
            title="Retirer de l'étagère"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="album-modal-body">
          {/* Cover Presentation with 3D spine and upload overlay */}
          <div className="album-modal-cover-section">
            <div className="album-modal-cover-wrap">
              <img src={currentCover} alt={selectedItem.title} className="album-modal-img" />
              <div className="album-modal-gloss" />

              <button
                className="album-modal-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Changer la pochette par une photo ou un scan"
              >
                <Camera size={16} />
                <span>{isUploading ? 'Téléversement...' : 'Photo / Scan perso'}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
              />
            </div>

            {selectedItem.cover_url_custom && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                <span className="album-modal-cover-status">
                  ✓ Photo perso (locale)
                </span>
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

          {/* Titles & Metadata */}
          <div className="album-modal-header-info">
            <h1 className="album-modal-title">{selectedItem.title}</h1>
            <h2 className="album-modal-artist">{selectedItem.artist}</h2>

            <div className="album-modal-tags">
              {selectedItem.year && (
                <div className="album-modal-pill">
                  <Calendar size={13} />
                  <span>{selectedItem.year}</span>
                </div>
              )}
              {selectedItem.label && (
                <div className="album-modal-pill">
                  <Tag size={13} />
                  <span>{selectedItem.label}</span>
                </div>
              )}
              {selectedItem.catno && (
                <div className="album-modal-pill">
                  <Hash size={13} />
                  <span>{selectedItem.catno}</span>
                </div>
              )}
            </div>

            {selectedItem.format_details.length > 0 && (
              <div className="album-modal-formats">
                {selectedItem.format_details.map((fd, i) => (
                  <span key={i} className="album-format-chip">
                    {fd}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rating (1 to 5 Stars) */}
          <section className="album-modal-section">
            <h3 className="album-section-title">Note de l'exemplaire</h3>
            <div className="album-stars-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`album-star-btn ${(rating || 0) >= star ? 'active' : ''}`}
                  onClick={() => setRating(star === rating ? null : star)}
                  aria-label={`${star} étoiles`}
                >
                  <Star size={24} fill={(rating || 0) >= star ? '#ffd60a' : 'none'} />
                </button>
              ))}
            </div>
          </section>

          {/* Tracklist */}
          {selectedItem.tracklist && selectedItem.tracklist.length > 0 && (
            <section className="album-modal-section">
              <div className="album-section-header">
                <ListMusic size={16} />
                <h3 className="album-section-title">Tracklist ({selectedItem.tracklist.length} titres)</h3>
              </div>
              <div className="album-tracklist-list">
                {selectedItem.tracklist.map((t, idx) => (
                  <div key={idx} className="album-track-row">
                    <span className="album-track-pos">{t.position || idx + 1}</span>
                    <span className="album-track-name">{t.title}</span>
                    <span className="album-track-dur">{t.duration || '--:--'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Personal Collector Notes */}
          <section className="album-modal-section">
            <h3 className="album-section-title">Notes personnelles</h3>
            <textarea
              className="album-notes-textarea"
              placeholder="État du disque (ex: VG+ / NM), date d'achat, dédicace, couleur du vinyle..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <button
              type="button"
              className="album-save-notes-btn"
              onClick={handleSaveNotes}
            >
              {saveSuccess ? (
                <>
                  <Check size={16} />
                  <span>Enregistré</span>
                </>
              ) : (
                'Enregistrer les notes & la note'
              )}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
