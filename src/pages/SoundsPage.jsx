import { useMemo } from 'react';
import soundsData from '../data/sounds.json';
import CategoryCard from '../components/ui/CategoryCard';
import './SoundsPage.css';

/**
 * Sounds category selection view.
 * Displays ordered categories (featured banner, standard grid, compact pairs).
 *
 * @component
 * @returns {JSX.Element}
 */
export default function SoundsPage() {
  const categories = soundsData.categories;

  const sortedCategories = useMemo(() => {
    const featured = categories.filter((c) => c.size === 'featured');
    const normal = categories.filter((c) => c.size === 'normal' || (!c.size && c.size !== 'petit'));
    const petit = categories.filter((c) => c.size === 'petit');
    return [...featured, ...normal, ...petit];
  }, [categories]);

  return (
    <div className="page sounds-page">
      <header className="page-header">
        <h1 className="page-title">CHOIX DE LA CATÉGORIE</h1>
      </header>

      <section className="sounds-grid-section" aria-label="Catégories">
        <div className="sounds-grid">
          {sortedCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              size={category.size || 'normal'}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
