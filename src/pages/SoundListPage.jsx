import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import SoundButton from '../components/ui/SoundButton';
import CustomSoundSlot from '../components/features/CustomSoundSlot';
import { useApp } from '../context/AppContext';
import soundsData from '../data/sounds.json';
import './SoundListPage.css';

/**
 * Category sounds detail view.
 * Displays playable sound buttons or custom user slots with a back navigation header.
 *
 * @component
 * @param {object} props
 * @param {string} [props.categoryId] - Target category identifier.
 * @param {Function} [props.onBack] - Callback triggered when navigating back.
 * @returns {JSX.Element}
 */
export default function SoundListPage({ categoryId: propCategoryId, onBack }) {
  const params = useParams();
  const categoryId = propCategoryId || params?.categoryId;
  const navigate = useNavigate();
  const { state } = useApp();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/sons');
    }
  };

  const isAll = categoryId === 'all';
  const isCustom = categoryId === 'custom';

  const category = useMemo(() => {
    if (isAll) {
      const allSounds = soundsData.categories.flatMap((c) => c.sounds);
      return {
        id: 'all',
        name: 'Tous les sons',
        sounds: allSounds,
        color: '#1e3a8a',
        bgGradient: ['#1e40af', '#1e3a8a'],
      };
    }
    if (isCustom) {
      return {
        id: 'custom',
        name: 'Mes sons',
        sounds: state.customSounds || [],
        color: '#4338ca',
        bgGradient: ['#4f46e5', '#3730a3'],
      };
    }
    return soundsData.categories.find((c) => c.id === categoryId);
  }, [categoryId, isAll, isCustom, state.customSounds]);

  if (!category) {
    return (
      <div className="sound-list-screen">
        <div className="page sound-list-page">
          <div className="sound-list-404">
            <HelpCircle size={48} />
            <h2>Catégorie introuvable</h2>
            <button onClick={handleBack} className="sound-list-404__btn">
              Retour aux sons
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sound-list-screen">
      <div className="page sound-list-page">
        <header
          className="sound-list-header slide-up"
          style={{
            '--cat-color-1': category.bgGradient?.[0] || category.color,
            '--cat-color-2': category.bgGradient?.[1] || category.color,
          }}
        >
          <button
            className="sound-list-back"
            onClick={handleBack}
            id="back-to-categories"
            aria-label="Retour au choix de la catégorie"
          >
            <ArrowLeft size={18} />
            <span>RETOUR</span>
          </button>

          <h1 className="sound-list-title">{category.name}</h1>
        </header>

        {isCustom ? (
          <div className="sound-list-custom-section">
            <p className="sound-list-custom-hint">
              Glisse ou importe tes fichiers audio (.mp3, .wav, .ogg) dans les slots ci-dessous :
            </p>
            <div className="sound-list-slots-grid">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <CustomSoundSlot key={i} index={i} />
              ))}
            </div>
          </div>
        ) : (
          <div className="sound-list-grid">
            {category.sounds.map((sound, index) => (
              <SoundButton key={sound.id} sound={sound} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
