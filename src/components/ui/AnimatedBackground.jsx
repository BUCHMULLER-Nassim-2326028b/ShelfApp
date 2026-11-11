import { useMemo } from 'react';
import './AnimatedBackground.css';

/**
 * AnimatedBackground — Universal Animated Background System
 * 
 * Supports:
 * - 'aurora': Ethereal flowing aurora borealis gradients
 * - 'embers': Floating rising magma/fire embers and thermal glow
 * - 'mesh': Dynamic shifting multi-point liquid gradient mesh
 * - 'particles': Twinkling stardust & floating ambient motes
 * - 'video': Looping MP4/WebM video background with fallback
 * 
 * Props:
 * @param {string} type - 'aurora' | 'embers' | 'mesh' | 'particles' | 'video'
 * @param {Array<string>} [colors] - Custom gradient color stops (e.g. ['#e11d48', '#4c0519'])
 * @param {string} [videoSrc] - URL for looping background video
 * @param {string} [className] - Additional CSS classes
 * @param {boolean} [overlay=true] - Whether to include a subtle dark contrast vignette
 * @param {number} [particleCount=16] - Number of ember/particle elements
 */
export default function AnimatedBackground({
  type = 'aurora',
  colors,
  videoSrc,
  className = '',
  overlay = true,
  particleCount = 16,
}) {
  // Generate stable random particle positions and timings
  const particles = useMemo(() => {
    if (type !== 'embers' && type !== 'particles') return [];
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: `${(i * 100) / particleCount + (Math.sin(i * 99) * 8)}%`,
      size: `${3 + (i % 4) * 2}px`,
      duration: `${4 + (i % 5) * 1.5}s`,
      delay: `-${(i * 0.7) % 6}s`,
      drift: `${(i % 2 === 0 ? 1 : -1) * (15 + (i % 20))}px`,
      opacity: 0.35 + (i % 5) * 0.15,
    }));
  }, [type, particleCount]);

  // Dynamic custom gradient style if custom colors are passed
  const customStyle = useMemo(() => {
    if (!colors || colors.length === 0) return {};
    return {
      '--anim-color-1': colors[0],
      '--anim-color-2': colors[1] || colors[0],
      '--anim-color-3': colors[2] || colors[1] || colors[0],
      '--anim-color-bg': colors[colors.length - 1],
    };
  }, [colors]);

  return (
    <div
      className={`anim-bg anim-bg--${type} ${className}`}
      style={customStyle}
      aria-hidden="true"
    >
      {/* 1. AURORA TYPE */}
      {type === 'aurora' && (
        <div className="anim-bg__aurora-wrap">
          <div className="anim-bg__aurora-blob anim-bg__aurora-blob--1" />
          <div className="anim-bg__aurora-blob anim-bg__aurora-blob--2" />
          <div className="anim-bg__aurora-blob anim-bg__aurora-blob--3" />
        </div>
      )}

      {/* 2. EMBERS / FIRE TYPE */}
      {type === 'embers' && (
        <div className="anim-bg__embers-wrap">
          <div className="anim-bg__embers-glow" />
          <div className="anim-bg__embers-heat" />
          {particles.map((p) => (
            <span
              key={p.id}
              className="anim-bg__ember-spark"
              style={{
                left: p.left,
                width: p.size,
                height: p.size,
                animationDuration: p.duration,
                animationDelay: p.delay,
                opacity: p.opacity,
                '--ember-drift': p.drift,
              }}
            />
          ))}
        </div>
      )}

      {/* 3. MESH LIQUID GRADIENT */}
      {type === 'mesh' && (
        <div className="anim-bg__mesh-wrap">
          <div className="anim-bg__mesh-layer anim-bg__mesh-layer--a" />
          <div className="anim-bg__mesh-layer anim-bg__mesh-layer--b" />
        </div>
      )}

      {/* 4. PARTICLES / STARDUST */}
      {type === 'particles' && (
        <div className="anim-bg__particles-wrap">
          <div className="anim-bg__particles-glow" />
          {particles.map((p) => (
            <span
              key={p.id}
              className="anim-bg__stardust"
              style={{
                left: p.left,
                width: p.size,
                height: p.size,
                animationDuration: p.duration,
                animationDelay: p.delay,
                opacity: p.opacity,
              }}
            />
          ))}
        </div>
      )}

      {/* 5. VIDEO LOOP */}
      {type === 'video' && videoSrc && (
        <video
          className="anim-bg__video"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* Noise grain texture for filmic organic depth */}
      <div className="anim-bg__grain" />

      {/* Vignette contrast overlay */}
      {overlay && <div className="anim-bg__overlay" />}
    </div>
  );
}
