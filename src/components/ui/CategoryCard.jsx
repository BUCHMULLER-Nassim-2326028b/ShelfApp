import { useNavigate } from 'react-router-dom';
import { Sparkles, Mic, Gamepad2, Globe, Ghost, Layers, Star, Music, Disc } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import './CategoryCard.css';

const ICON_MAP = {
  all: Sparkles,
  custom: Mic,
  base: Gamepad2,
  english: Globe,
  maskass: Ghost,
  sparkles: Sparkles,
  mic: Mic,
  gamepad: Gamepad2,
  globe: Globe,
  ghost: Ghost,
  layers: Layers,
  star: Star,
  music: Music,
  disc: Disc,
};

export default function CategoryCard({ category, size: sizeProp, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/sons/${category.id}`);
    }
  };

  const size = sizeProp || category.size || 'normal';
  const spanClass = category.span ? `category-card--span-${category.span}` : '';
  const title = Array.isArray(category.displayTitle)
    ? category.displayTitle.join(' ')
    : (category.displayTitle || category.name);
  const animBg = category.animatedBg || category.animatedBackground;

  // Resolve Lucide icon
  const IconComponent =
    ICON_MAP[category.icon] ||
    ICON_MAP[category.id] ||
    (category.id === 'all' ? Sparkles : category.id === 'custom' ? Mic : null);

  return (
    <button
      className={`category-card category-card--${size} ${spanClass} ${animBg ? 'category-card--has-anim' : ''}`}
      onClick={handleClick}
      id={`category-${category.id}`}
      aria-label={`Catégorie ${category.name}`}
    >
      {/* Background layer (animated background if specified) */}
      {animBg && (
        <AnimatedBackground
          type={animBg.type || 'aurora'}
          colors={animBg.colors}
          videoSrc={animBg.videoSrc}
          className="category-card__anim-bg"
          particleCount={size === 'featured' ? 14 : 8}
          overlay={false}
        />
      )}

      {/* Petit size: Sleek 1-line button with white Lucide icon + title */}
      {size === 'petit' ? (
        <div className="category-card__petit-content">
          {IconComponent && (
            <IconComponent
              className="category-card__petit-icon-svg"
              size={21}
              strokeWidth={2.4}
              aria-hidden="true"
            />
          )}
          <span className="category-card__title">{title}</span>
        </div>
      ) : (
        <>
          {/* Visual Artwork & Seamless Flipped Blurred Reflection for featured & normal */}
          {category.image && (
            <div className="category-card__visual">
              {/* 1. Seamless Flipped Blurred Reflection */}
              <div className="category-card__reflection" aria-hidden="true">
                <img
                  src={category.image}
                  alt=""
                  className="category-card__reflection-img"
                  draggable="false"
                />
                <div className="category-card__reflection-tint" />
              </div>

              {/* 2. Main Top Artwork */}
              <div className="category-card__artwork">
                <img
                  src={category.image}
                  alt={category.name}
                  className="category-card__img"
                  draggable="false"
                />
              </div>
            </div>
          )}

          {/* Footer Content: Category Title */}
          <div className="category-card__footer">
            <span className="category-card__title">{title}</span>
          </div>
        </>
      )}

      {/* NOUVEAU Badge on top right */}
      {category.isNew && (
        <div className="category-card__badge-wrap">
          <span className="category-card__nouveau-badge">NOUVEAU</span>
        </div>
      )}
    </button>
  );
}


