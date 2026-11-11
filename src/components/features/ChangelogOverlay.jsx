import { useEffect } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import changelogData from '../../data/changelog.json';
import './ChangelogOverlay.css';

export default function ChangelogOverlay({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="changelog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Notes de mise à jour"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Bar with RETOUR */}
      <header className="changelog-topbar">
        <button
          className="changelog-back-btn"
          onClick={onClose}
          id="btn-changelog-retour"
          aria-label="Retour à l'accueil"
        >
          <span className="changelog-back-arrow" aria-hidden="true">◀</span>
          <span className="changelog-back-text">RETOUR</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="changelog-body">
        <div className="changelog-header-title">
          <Sparkles size={20} className="changelog-title-icon" />
          <h2>Notes de Mises à Jour</h2>
        </div>

        <div className="changelog-list">
          {changelogData.map((item) => (
            <article key={item.version} className="changelog-card">
              <header className="changelog-card-header">
                <div className="changelog-badge-group">
                  <span className="changelog-version-tag">v{item.version}</span>
                  {item.isLatest && (
                    <span className="changelog-latest-tag">Actuelle</span>
                  )}
                </div>
                <time className="changelog-date">{item.date}</time>
              </header>

              <h3 className="changelog-card-title">{item.title}</h3>

              <ul className="changelog-changes-list">
                {item.changes.map((change, idx) => (
                  <li key={idx} className="changelog-change-item">
                    <CheckCircle2 size={15} className="changelog-check-icon" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
