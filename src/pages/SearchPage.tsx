import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useShelf } from '../context/ShelfContext';
import {
  Search,
  Plus,
  Check,
  Disc,
  AlertCircle,
  Loader2,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ScanBarcode,
  RotateCcw,
  Filter,
  Camera,
} from 'lucide-react';
import { getRateLimit } from '../lib/discogsProxyClient';
import { useNativeBack } from '../lib/nativeBackHandler';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';
import '../styles/ios-settings.css';
import './SearchPage.css';

/**
 * Splits standard Discogs search result title "Artist - Album" into separate fields.
 */
function parseDiscogsTitle(rawTitle: string): { title: string; artist: string } {
  if (!rawTitle) return { title: 'Sans titre', artist: '' };
  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' - ').trim();
    return { title, artist };
  }
  return { title: rawTitle.trim(), artist: '' };
}

const GENRE_OPTIONS = [
  'Hip Hop',
  'Electronic',
  'Rock',
  'Funk / Soul',
  'Jazz',
  'Pop',
  'Reggae',
  'Classical',
  'Folk, World, & Country',
];

const DECADE_OPTIONS = [
  { label: 'Années 2020', value: '2020' },
  { label: 'Années 2010', value: '2010' },
  { label: 'Années 2000', value: '2000' },
  { label: 'Années 90', value: '1990' },
  { label: 'Années 80', value: '1980' },
  { label: 'Années 70', value: '1970' },
  { label: 'Années 60', value: '1960' },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    executeSearch,
    importFromDiscogs,
    collection,
    hasToken,
    discogsUsername,
    setSelectedItem,
  } = useShelf();

  // Primary chip format selector
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  // Secondary filters (sheet/drawer)
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedDecade, setSelectedDecade] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'year-desc' | 'year-asc' | 'title'>('relevance');

  // UI Modals
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [addingId, setAddingId] = useState<number | null>(null);

  // Barcode Camera Scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Slidable drag gesture state for filter sheet (30% threshold to dismiss)
  const filterSheetRef = useRef<HTMLDivElement>(null);
  const [filterDragY, setFilterDragY] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  const filterTouchStartY = useRef(0);
  const filterTouchStartTime = useRef(0);

  const closeFilterDrawer = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterDrawerOpen(false);
      setIsFilterClosing(false);
      setFilterDragY(0);
    }, 240);
  };

  const handleFilterTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isHeader = target.closest('.search-sheet-header') !== null;
    const isAtTop = !filterSheetRef.current || filterSheetRef.current.scrollTop <= 0;

    if (isHeader || isAtTop) {
      filterTouchStartY.current = e.touches[0].clientY;
      filterTouchStartTime.current = Date.now();
      setIsFilterDragging(true);
    }
  };

  const handleFilterTouchMove = (e: React.TouchEvent) => {
    if (!isFilterDragging) return;
    const dy = e.touches[0].clientY - filterTouchStartY.current;
    if (dy > 0) {
      if (e.cancelable) e.preventDefault();
      setFilterDragY(dy);
    } else {
      setFilterDragY(0);
    }
  };

  const handleFilterTouchEnd = () => {
    if (!isFilterDragging) return;
    setIsFilterDragging(false);

    const sheetHeight = filterSheetRef.current?.clientHeight || 600;
    const threshold = sheetHeight * 0.30; // 30% threshold
    const dt = Date.now() - filterTouchStartTime.current;
    const velocity = filterDragY / (dt || 1);

    if (filterDragY > threshold || (velocity > 0.45 && filterDragY > 40)) {
      closeFilterDrawer();
    } else {
      setFilterDragY(0);
    }
  };

  // Slidable drag gesture state for barcode modal (30% threshold to dismiss)
  const barcodeSheetRef = useRef<HTMLDivElement>(null);
  const [barcodeDragY, setBarcodeDragY] = useState(0);
  const [isBarcodeDragging, setIsBarcodeDragging] = useState(false);
  const [isBarcodeClosing, setIsBarcodeClosing] = useState(false);
  const barcodeTouchStartY = useRef(0);
  const barcodeTouchStartTime = useRef(0);

  const closeBarcodeModal = () => {
    setIsBarcodeClosing(true);
    setTimeout(() => {
      setIsBarcodeModalOpen(false);
      setIsBarcodeClosing(false);
      setBarcodeDragY(0);
    }, 240);
  };

  const handleBarcodeTouchStart = (e: React.TouchEvent) => {
    barcodeTouchStartY.current = e.touches[0].clientY;
    barcodeTouchStartTime.current = Date.now();
    setIsBarcodeDragging(true);
  };

  const handleBarcodeTouchMove = (e: React.TouchEvent) => {
    if (!isBarcodeDragging) return;
    const dy = e.touches[0].clientY - barcodeTouchStartY.current;
    if (dy > 0) {
      if (e.cancelable) e.preventDefault();
      setBarcodeDragY(dy);
    } else {
      setBarcodeDragY(0);
    }
  };

  const handleBarcodeTouchEnd = () => {
    if (!isBarcodeDragging) return;
    setIsBarcodeDragging(false);

    const sheetHeight = barcodeSheetRef.current?.clientHeight || 500;
    const threshold = sheetHeight * 0.30; // 30% threshold
    const dt = Date.now() - barcodeTouchStartTime.current;
    const velocity = barcodeDragY / (dt || 1);

    if (barcodeDragY > threshold || (velocity > 0.45 && barcodeDragY > 40)) {
      closeBarcodeModal();
    } else {
      setBarcodeDragY(0);
    }
  };

  // Trap back navigation to close active modals instead of exiting
  useNativeBack(closeBarcodeModal, isBarcodeModalOpen);
  useNativeBack(closeFilterDrawer, isFilterDrawerOpen);

  const rateLimit = getRateLimit();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced auto-search when query or primary format changes
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = setTimeout(() => {
      executeSearch(searchQuery, {
        format: selectedFormat || undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedFormat, selectedType, executeSearch]);

  // Live Camera Barcode & QR Scanner using robust cross-platform ZXing engine
  useEffect(() => {
    if (!isBarcodeModalOpen) {
      setIsCameraActive(false);
      return;
    }

    let isSubscribed = true;
    let controls: { stop: () => void } | null = null;
    const codeReader = new BrowserMultiFormatReader();

    async function startScanner() {
      try {
        setCameraError(null);
        setIsCameraActive(true);

        if (!videoRef.current) return;

        controls = await codeReader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result: Result | undefined) => {
            if (!isSubscribed) return;
            if (result) {
              const detectedValue = result.getText();
              if (detectedValue) {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try {
                    navigator.vibrate(100);
                  } catch {
                    // ignore vibrate failure
                  }
                }
                closeBarcodeModal();
                setSearchQuery(detectedValue);
                executeSearch(detectedValue);
              }
            }
          }
        );
      } catch (err: unknown) {
        console.warn('Camera/ZXing scanner initialization failed:', err);
        if (isSubscribed) {
          setCameraError("Impossible d'activer la caméra. Entrez les chiffres du code-barres manuellement.");
          setIsCameraActive(false);
        }
      }
    }

    startScanner();

    return () => {
      isSubscribed = false;
      if (controls) {
        try {
          controls.stop();
        } catch {
          // ignore stop failure
        }
      }
      setIsCameraActive(false);
    };
  }, [isBarcodeModalOpen, executeSearch, setSearchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      executeSearch(searchQuery, {
        format: selectedFormat || undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
      });
    }
  };

  const handleAddRelease = async (
    id: number,
    type: 'release' | 'master' = 'release',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    try {
      setAddingId(id);
      await importFromDiscogs(id, type);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'importation de l'album.";
      alert(msg);
    } finally {
      setAddingId(null);
    }
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      setSearchQuery(barcodeInput.trim());
      executeSearch(barcodeInput.trim(), { format: selectedFormat || undefined });
      setIsBarcodeModalOpen(false);
      setBarcodeInput('');
    }
  };

  const isAlreadyInCollection = (id: number, masterId?: number) => {
    return collection.some(
      (item) => item.release_id === id || (masterId && item.master_id === masterId)
    );
  };

  const getItemInCollection = (releaseId: number) => {
    return collection.find((item) => item.release_id === releaseId);
  };

  // Active filter badge count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedFormat) count++;
    if (selectedGenre) count++;
    if (selectedDecade) count++;
    if (selectedType !== 'all') count++;
    return count;
  }, [selectedFormat, selectedGenre, selectedDecade, selectedType]);

  const resetAllFilters = () => {
    setSelectedFormat('');
    setSelectedGenre('');
    setSelectedDecade('');
    setSelectedType('all');
    setSortBy('relevance');
  };

  // Client-side filtering and sorting of the retrieved results
  const processedResults = useMemo(() => {
    // Only keep release and master albums (filter out raw artists and record labels)
    let list = searchResults.filter((r) => r.type === 'release' || r.type === 'master');

    if (selectedGenre) {
      list = list.filter((r) =>
        r.genre?.some((g) => g.toLowerCase() === selectedGenre.toLowerCase()) ||
        r.style?.some((s) => s.toLowerCase() === selectedGenre.toLowerCase())
      );
    }

    if (selectedDecade) {
      const dec = parseInt(selectedDecade, 10);
      list = list.filter((r) => {
        const year = parseInt(r.year || '0', 10);
        return year >= dec && year < dec + 10;
      });
    }

    if (sortBy === 'year-desc') {
      list.sort((a, b) => parseInt(b.year || '0', 10) - parseInt(a.year || '0', 10));
    } else if (sortBy === 'year-asc') {
      list.sort((a, b) => parseInt(a.year || '9999', 10) - parseInt(b.year || '9999', 10));
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [searchResults, selectedGenre, selectedDecade, sortBy]);

  return (
    <div className="ios-settings-page search-page">
      {/* ── Native iOS Large Header ── */}
      <header className="ios-settings-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="ios-settings-title">Recherche</h1>
        {!hasToken ? (
          <button
            type="button"
            onClick={() => navigate('/options')}
            className="ios-auth-link"
          >
            Connexion
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/options')}
            className="ios-discogs-user-pill"
          >
            <Disc size={13} color="#30d158" />
            <span>@{discogsUsername || 'Discogs'}</span>
          </button>
        )}
      </header>

      {/* ── Native iOS Search Bar with Barcode Scanner ── */}
      <form onSubmit={handleSearchSubmit} className="ios-search-container">
        <div className="ios-search-bar" style={{ opacity: 1 }}>
          <Search size={18} className="ios-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="ios-search-input"
            placeholder={
              hasToken
                ? "Artiste, album, pressage..."
                : "Rechercher un vinyle, CD, artiste..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="discogs-search-input"
            autoComplete="off"
            enterKeyHint="search"
          />

          {searchQuery && (
            <button
              type="button"
              className="ios-search-clear-btn"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label="Effacer"
            >
              <X size={12} />
            </button>
          )}

          <button
            type="button"
            className="ios-barcode-action-btn"
            onClick={() => setIsBarcodeModalOpen(true)}
            title="Scanner le code-barres d’un disque"
            aria-label="Scanner code-barres"
          >
            <ScanBarcode size={18} />
          </button>
        </div>
      </form>

      {/* ── Quota & Connection Warning if logged out ── */}
      {!hasToken ? (
        <div className="ios-settings-group ios-auth-prompt-card">
          <div className="ios-auth-icon-wrapper">
            <Disc size={28} color="#ffb038" />
          </div>
          <h2 className="ios-auth-prompt-title">Connexion Discogs requise</h2>
          <p className="ios-auth-prompt-desc">
            Chaque utilisateur effectue ses recherches avec son propre compte Discogs pour respecter les quotas de l’API.
          </p>
          <button
            type="button"
            className="ios-auth-connect-btn"
            onClick={() => navigate('/options')}
          >
            Connecter mon compte Discogs
          </button>
        </div>
      ) : (
        <>
          {/* Format Chips (iOS Segmented Style) */}
          <div className="search-filter-chips">
            {[
              { label: 'Tous formats', format: '', type: 'all' },
              { label: 'Vinyles', format: 'Vinyl', type: 'release' },
              { label: 'CDs', format: 'CD', type: 'release' },
              { label: 'Cassettes', format: 'Cassette', type: 'release' },
              { label: 'Maxi 12"', format: '12"', type: 'release' },
              { label: 'Albums (Masters)', format: '', type: 'master' },
            ].map((tab, idx) => {
              const isActive =
                tab.type === 'master'
                  ? selectedType === 'master'
                  : selectedFormat === tab.format && selectedType !== 'master';

              return (
                <button
                  key={idx}
                  type="button"
                  className={`search-chip ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (tab.type === 'master') {
                      setSelectedType('master');
                      setSelectedFormat('');
                    } else {
                      setSelectedType(tab.type);
                      setSelectedFormat(tab.format);
                    }
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Subbar: Filters & Sort Buttons */}
          <div className="search-subbar">
            <button
              type="button"
              className={`search-filters-btn ${activeFiltersCount > 0 ? 'active' : ''}`}
              onClick={() => setIsFilterDrawerOpen(true)}
            >
              <SlidersHorizontal size={14} />
              <span>Filtres</span>
              {activeFiltersCount > 0 && (
                <span className="search-filters-badge">{activeFiltersCount}</span>
              )}
            </button>

            <div className="search-sort-pill">
              <ArrowUpDown size={13} color="#8e8e93" />
              <select
                className="search-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Trier les résultats"
              >
                <option value="relevance">Pertinence</option>
                <option value="year-desc">Année (plus récent)</option>
                <option value="year-asc">Année (plus ancien)</option>
                <option value="title">Titre (A à Z)</option>
              </select>
            </div>
          </div>

          {/* Centered Results Count Divider (Discogs Style) */}
          {!isSearching && processedResults.length > 0 && (
            <div className="search-results-divider">
              <div className="search-divider-line" />
              <span className="search-divider-label">
                {processedResults.length} {processedResults.length > 1 ? 'résultats' : 'résultat'}
              </span>
              <div className="search-divider-line" />
            </div>
          )}
        </>
      )}

      {/* Loading state */}
      {isSearching && (
        <div className="search-loading-state">
          <Loader2 size={34} className="spin-animation" color="#ffb038" />
          <p>Recherche en direct sur Discogs...</p>
        </div>
      )}

      {/* Error state */}
      {searchError && (
        <div className="search-error-box">
          <AlertCircle size={20} color="#ff453a" />
          <div>
            <h4>Information Discogs</h4>
            <p>{searchError}</p>
          </div>
        </div>
      )}

      {/* ── Large Results Cards (Discogs Mobile Scale with iOS Black Dark Mode) ── */}
      {!isSearching && processedResults.length > 0 && (
        <div className="search-cards-container">
          {processedResults.map((result) => {
            const isMaster = result.type === 'master';
            const inCollection = isAlreadyInCollection(
              result.id,
              isMaster ? result.id : undefined
            );
            const isAdding = addingId === result.id;
            const thumbUrl = result.thumb || result.cover_image || '';
            const { title, artist } = parseDiscogsTitle(result.title);
            const detailPath = `/recherche/album/${isMaster ? 'm-' : ''}${result.id}`;

            const primaryFormat =
              result.format?.[0] || (isMaster ? 'Album' : 'Disque');
            const descriptions =
              result.format && result.format.length > 1
                ? result.format.slice(1, 4).join(', ')
                : '';

            const releaseParts: string[] = [];
            if (result.year) releaseParts.push(`Sortie : ${result.year}`);
            if (result.country) releaseParts.push(result.country);
            const releaseLine = releaseParts.join(' • ');

            const labelName = result.label?.[0] || '';
            const catNo = result.catno || '';
            const labelLine = [labelName, catNo].filter(Boolean).join(' – ');

            return (
              <div
                key={`${result.type}-${result.id}`}
                className={`search-album-card ${inCollection ? 'in-collection' : ''}`}
                onClick={() => {
                  navigate(detailPath);
                }}
              >
                {/* Main Card Content */}
                <div className="search-card-main">
                  {/* Big Square Cover Image (96x96px) */}
                  <div className="search-card-cover">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={title} loading="lazy" />
                    ) : (
                      <div className="search-cover-fallback">
                        <Disc size={34} color="#636366" />
                      </div>
                    )}
                  </div>

                  {/* Metadata block */}
                  <div className="search-card-info">
                    <h3 className="search-card-title">{title}</h3>

                    <div className="search-card-subtitle">
                      <span className="search-format-label">{primaryFormat}</span>
                      {artist && (
                        <>
                          <span className="search-dot">•</span>
                          <span className="search-artist-label">{artist}</span>
                        </>
                      )}
                    </div>

                    {descriptions && (
                      <p className="search-card-descriptions">{descriptions}</p>
                    )}

                    {releaseLine && (
                      <p className="search-card-meta">{releaseLine}</p>
                    )}

                    {labelLine && (
                      <p className="search-card-catno">{labelLine}</p>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="search-card-footer">
                  <div className="search-footer-meta">
                    {inCollection ? (
                      <span className="search-added-pill">
                        <Check size={13} color="#30d158" />
                        <span>Sur votre étagère</span>
                      </span>
                    ) : (
                      <span className="search-discogs-id">
                        {isMaster ? 'Master' : 'Release'} #{result.id}
                        {result.genre && result.genre[0] && (
                          <span className="search-genre-badge">{result.genre[0]}</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="search-footer-action">
                    <button
                      type="button"
                      className={`search-add-btn ${inCollection ? 'added' : ''}`}
                      onClick={(e) =>
                        !inCollection &&
                        !isAdding &&
                        handleAddRelease(result.id, isMaster ? 'master' : 'release', e)
                      }
                      disabled={inCollection || isAdding}
                      aria-label={inCollection ? 'Déjà dans la collection' : 'Ajouter à mon étagère'}
                    >
                      {isAdding ? (
                        <>
                          <Loader2 size={14} className="spin-animation" />
                          <span>Ajout...</span>
                        </>
                      ) : inCollection ? (
                        <>
                          <Check size={14} />
                          <span>Ajouté</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Ajouter</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && processedResults.length === 0 && !searchError && hasToken && (
        <div className="search-empty-prompt">
          <Disc size={50} color="#2c2c2e" />
          <p>
            {searchQuery
              ? `Aucun disque ne correspond aux filtres pour "${searchQuery}".`
              : "Tapez le nom d'un artiste, album ou scannez un code-barres pour lancer la recherche."}
          </p>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              className="search-reset-filters-btn"
              onClick={resetAllFilters}
            >
              <RotateCcw size={13} />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>
      )}

      {/* ── Filter Drawer / Bottom Sheet Modal via Portal (above Navbar) ── */}
      {typeof document !== 'undefined' &&
        isFilterDrawerOpen &&
        createPortal(
          <div
            className="search-modal-backdrop"
            style={{ zIndex: 9999 }}
            onClick={closeFilterDrawer}
          >
            <div
              ref={filterSheetRef}
              className="search-filter-sheet"
              style={{
                transform: isFilterClosing
                  ? 'translateY(100%)'
                  : filterDragY > 0
                    ? `translateY(${filterDragY}px)`
                    : 'translateY(0)',
                transition: isFilterDragging
                  ? 'none'
                  : 'transform 0.26s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleFilterTouchStart}
              onTouchMove={handleFilterTouchMove}
              onTouchEnd={handleFilterTouchEnd}
            >
              {/* Progressive Blur Scrims */}
              <div className="search-sheet-top-blur" />
              <div className="search-sheet-header">
                <div className="search-sheet-handle" />
                <div className="search-sheet-title-row">
                  <h2 className="search-sheet-title">Filtres</h2>
                  <button
                    type="button"
                    className="search-sheet-close"
                    onClick={closeFilterDrawer}
                    aria-label="Fermer"
                  >
                    <X size={17} strokeWidth={2.4} />
                  </button>
                </div>
              </div>

              <div className="search-sheet-body">
                {/* Format */}
                <div className="search-filter-section">
                  <span className="search-section-label">Format physique</span>
                  <div className="search-filter-grid">
                    {[
                      { label: 'Tous formats', value: '' },
                      { label: 'Vinyles', value: 'Vinyl' },
                      { label: 'CDs', value: 'CD' },
                      { label: 'Cassettes', value: 'Cassette' },
                      { label: 'Maxi 12"', value: '12"' },
                      { label: 'Single 7"', value: '7"' },
                    ].map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        className={`search-filter-toggle ${selectedFormat === f.value ? 'selected' : ''}`}
                        onClick={() => setSelectedFormat(f.value)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genre */}
                <div className="search-filter-section">
                  <span className="search-section-label">Genre musical</span>
                  <div className="search-filter-grid">
                    <button
                      type="button"
                      className={`search-filter-toggle ${selectedGenre === '' ? 'selected' : ''}`}
                      onClick={() => setSelectedGenre('')}
                    >
                      Tous genres
                    </button>
                    {GENRE_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={`search-filter-toggle ${selectedGenre === g ? 'selected' : ''}`}
                        onClick={() => setSelectedGenre(selectedGenre === g ? '' : g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Decade */}
                <div className="search-filter-section">
                  <span className="search-section-label">Décennie de sortie</span>
                  <div className="search-filter-grid">
                    <button
                      type="button"
                      className={`search-filter-toggle ${selectedDecade === '' ? 'selected' : ''}`}
                      onClick={() => setSelectedDecade('')}
                    >
                      Toutes
                    </button>
                    {DECADE_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        className={`search-filter-toggle ${selectedDecade === d.value ? 'selected' : ''}`}
                        onClick={() => setSelectedDecade(selectedDecade === d.value ? '' : d.value)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div className="search-filter-section">
                  <span className="search-section-label">Type</span>
                  <div className="search-filter-grid">
                    {[
                      { label: 'Tous', value: 'all' },
                      { label: 'Pressages (Releases)', value: 'release' },
                      { label: 'Albums (Masters)', value: 'master' },
                    ].map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        className={`search-filter-toggle ${selectedType === t.value ? 'selected' : ''}`}
                        onClick={() => setSelectedType(t.value)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="search-sheet-bottom-blur" />

              <div className="search-sheet-footer">
                <button
                  type="button"
                  className="search-sheet-reset-btn"
                  onClick={resetAllFilters}
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  className="search-sheet-apply-btn"
                  onClick={() => {
                    setIsFilterDrawerOpen(false);
                    setFilterDragY(0);
                  }}
                >
                  Appliquer ({processedResults.length})
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Live Camera Barcode Scanner Modal via Portal ── */}
      {typeof document !== 'undefined' &&
        isBarcodeModalOpen &&
        createPortal(
          <div
            className="search-modal-backdrop"
            style={{ zIndex: 9999 }}
            onClick={closeBarcodeModal}
          >
            <div
              ref={barcodeSheetRef}
              className="search-barcode-sheet"
              style={{
                transform: isBarcodeClosing
                  ? 'translateY(100%)'
                  : barcodeDragY > 0
                    ? `translateY(${barcodeDragY}px)`
                    : 'translateY(0)',
                transition: isBarcodeDragging
                  ? 'none'
                  : 'transform 0.26s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleBarcodeTouchStart}
              onTouchMove={handleBarcodeTouchMove}
              onTouchEnd={handleBarcodeTouchEnd}
            >
              <div className="search-sheet-top-blur" />

              <div className="search-sheet-header">
                <div className="search-sheet-handle" />
                <div className="search-sheet-title-row">
                  <h2 className="search-sheet-title">Scanner</h2>
                  <button
                    type="button"
                    className="search-sheet-close"
                    onClick={closeBarcodeModal}
                    aria-label="Fermer"
                  >
                    <X size={17} strokeWidth={2.4} />
                  </button>
                </div>
              </div>

              <div className="search-barcode-content">
                {/* Camera Video Viewfinder */}
                <div className="search-camera-viewfinder">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="search-camera-video"
                  />

                  {/* Laser scan animation & reticle */}
                  <div className="search-scanner-frame">
                    <div className="search-scanner-corner top-left" />
                    <div className="search-scanner-corner top-right" />
                    <div className="search-scanner-corner bottom-left" />
                    <div className="search-scanner-corner bottom-right" />
                    <div className="search-scanner-laser" />
                  </div>

                  {!isCameraActive && (
                    <div className="search-camera-loading">
                      <Camera size={36} color="#8e8e93" />
                      <span>Démarrage de la caméra...</span>
                    </div>
                  )}
                </div>

                {cameraError ? (
                  <p className="search-camera-error-hint">{cameraError}</p>
                ) : (
                  <p className="search-camera-hint">
                    Placez le code-barres (EAN/UPC) au dos de la pochette dans le cadre.
                  </p>
                )}

                {/* Manual Input Fallback */}
                <form onSubmit={handleManualBarcodeSubmit} className="search-manual-barcode-form">
                  <div className="search-barcode-input-wrapper">
                    <ScanBarcode size={18} color="#8e8e93" />
                    <input
                      type="text"
                      className="search-barcode-text-input"
                      placeholder="Ou entrer les chiffres (ex: 888837168613)..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                    />
                    {barcodeInput && (
                      <button
                        type="submit"
                        className="search-barcode-submit-btn"
                      >
                        OK
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
