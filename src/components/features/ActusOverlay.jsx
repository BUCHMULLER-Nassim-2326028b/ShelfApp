import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import eventsData from '../../data/events.json';
import AnimatedBackground from '../ui/AnimatedBackground';
import './ActusOverlay.css';

export default function ActusOverlay({ isOpen, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isPointerDownRef = useRef(false);
  const isWheelLockedRef = useRef(false);
  const wheelTimeoutRef = useRef(null);

  const navigate = useNavigate();
  const events = eventsData.events.filter((e) => e.active);

  // Close on Escape or arrow keys
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && activeIndex < events.length - 1) {
        setActiveIndex((i) => i + 1);
      }
      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        setActiveIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, events.length, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveIndex(0);
      setDragOffset(0);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [isOpen]);

  // Discrete 1-by-1 wheel scroll (stops on each card like Instagram)
  const handleWheel = useCallback(
    (e) => {
      if (isWheelLockedRef.current) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 25) return;

      isWheelLockedRef.current = true;

      if (delta > 0 && activeIndex < events.length - 1) {
        setActiveIndex((i) => i + 1);
      } else if (delta < 0 && activeIndex > 0) {
        setActiveIndex((i) => i - 1);
      }

      wheelTimeoutRef.current = setTimeout(() => {
        isWheelLockedRef.current = false;
      }, 420);
    },
    [activeIndex, events.length]
  );

  // Pointer / Touch gestures for snappy drag & 1-by-1 snap lock
  const handlePointerDown = (e) => {
    isPointerDownRef.current = true;
    startXRef.current = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    currentXRef.current = startXRef.current;
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;
    // Friction when dragging beyond bounds
    if ((activeIndex === 0 && diff > 0) || (activeIndex === events.length - 1 && diff < 0)) {
      setDragOffset(diff * 0.3);
    } else {
      setDragOffset(diff);
    }
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    const diff = currentXRef.current - startXRef.current;
    const threshold = 45; // Minimum drag px to trigger next/prev card

    if (diff < -threshold && activeIndex < events.length - 1) {
      setActiveIndex((i) => i + 1);
    } else if (diff > threshold && activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    }

    setDragOffset(0);
  };

  if (!isOpen) return null;

  const currentEvent = events[activeIndex] || events[0];

  return (
    <div
      className="actus-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Actualités"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dynamic Ambient Event Background */}
      {currentEvent?.animatedBackground && (
        <AnimatedBackground
          type={currentEvent.animatedBackground.type}
          colors={currentEvent.animatedBackground.colors}
          className="actus-overlay-backdrop-anim"
          particleCount={18}
          overlay={true}
        />
      )}

      {/* Top Bar with RETOUR button */}
      <header className="actus-topbar">
        <button
          className="actus-back-btn"
          onClick={onClose}
          id="btn-actus-retour"
          aria-label="Retour à l'accueil"
        >
          <span className="actus-back-arrow" aria-hidden="true">◀</span>
          <span className="actus-back-text">RETOUR</span>
        </button>
      </header>

      {/* Main Snap-Lock Carousel (Strict 1-by-1 Instagram feel) */}
      <div
        className="actus-carousel-wrapper"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <div
          className="actus-cards-track"
          style={{
            transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {events.map((event, index) => (
            <div key={event.id} className="actus-card-slide">
              <div className="actus-card">
                {/* Event Animated Background inside card */}
                {event.animatedBackground && (
                  <AnimatedBackground
                    type={event.animatedBackground.type}
                    colors={event.animatedBackground.colors}
                    className="actus-card-anim-bg"
                    particleCount={12}
                    overlay={false}
                  />
                )}

                {event.image ? (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="actus-card-image"
                    draggable="false"
                  />
                ) : (
                  <div
                    className="actus-card-fallback"
                    style={{ background: event.gradient }}
                  >
                    <span className="actus-card-display-title">
                      {event.cardTitle || event.title}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Info Section with Dots and Text */}
      <footer className="actus-footer">
        {/* Dot Indicators */}
        <div className="actus-dots" aria-label="Indicateurs de cartes">
          {events.map((_, i) => (
            <button
              key={i}
              className={`actus-dot ${i === activeIndex ? 'actus-dot--active' : ''}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`Aller au post ${i + 1}`}
              aria-current={i === activeIndex ? 'true' : 'false'}
            />
          ))}
        </div>

        {/* Dynamic Title and Description */}
        <div className="actus-info" key={currentEvent.id}>
          <h3 className="actus-info-title">{currentEvent.title}</h3>
          <p className="actus-info-desc">{currentEvent.description}</p>

          {currentEvent.categoryLink && (
            <button
              className="actus-action-btn"
              onClick={() => {
                onClose();
                navigate(`/sons/${currentEvent.categoryLink}`);
              }}
            >
              <span>Découvrir la catégorie</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
