import './CustomSoundSlot.css';
import { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAudio } from '../../hooks/useAudio';
import { Plus, X, Volume2 } from 'lucide-react';

export default function CustomSoundSlot({ index }) {
  const { state, dispatch } = useApp();
  const { play } = useAudio();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const customSound = state.customSounds.find((s) => s.id === `custom-${index}`);

  const handleAddSound = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Sélectionne un fichier audio (MP3, WAV, OGG...)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const audioUrl = reader.result;
      const name = file.name.replace(/\.[^/.]+$/, '');

      dispatch({
        type: 'ADD_CUSTOM_SOUND',
        payload: {
          id: `custom-${index}`,
          name,
          audioUrl,
          createdAt: Date.now(),
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePlay = () => {
    if (customSound) {
      play(customSound.id, customSound.audioUrl);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_CUSTOM_SOUND', payload: `custom-${index}` });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      const reader = new FileReader();
      reader.onload = () => {
        dispatch({
          type: 'ADD_CUSTOM_SOUND',
          payload: {
            id: `custom-${index}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            audioUrl: reader.result,
            createdAt: Date.now(),
          },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (customSound) {
    return (
      <button
        className="custom-slot custom-slot--filled"
        onClick={handlePlay}
        id={`custom-slot-${index}`}
      >
        <div className="custom-slot__icon">
          <Volume2 size={22} />
        </div>
        <span className="custom-slot__name">{customSound.name}</span>
        <button
          className="custom-slot__remove"
          onClick={handleRemove}
          aria-label="Supprimer ce son"
        >
          <X size={14} />
        </button>
      </button>
    );
  }

  return (
    <button
      className={`custom-slot custom-slot--empty ${dragOver ? 'custom-slot--drag-over' : ''}`}
      onClick={handleAddSound}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      id={`custom-slot-${index}`}
    >
      <div className="custom-slot__add-icon">
        <Plus size={24} strokeWidth={1.5} />
      </div>
      <span className="custom-slot__label">Ajouter un son</span>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Importer un fichier audio"
      />
    </button>
  );
}
