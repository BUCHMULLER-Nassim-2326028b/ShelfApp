import './GlassCard.css';

export default function GlassCard({
  children,
  className = '',
  onClick,
  variant = 'default',
  glowColor,
  ...props
}) {
  return (
    <div
      className={`glass-card glass-card--${variant} ${className}`}
      onClick={onClick}
      style={glowColor ? { '--glass-glow': glowColor } : undefined}
      {...props}
    >
      {/* Top highlight edge for liquid glass feel */}
      <div className="glass-card__highlight" aria-hidden="true" />
      {children}
    </div>
  );
}
