import React from 'react';
import { useImageLoader } from '../hooks/useImageLoader';

interface NoteImageProps {
    imageUrl: string;
    index: number;
    onDelete: () => void;
}

const NoteImage: React.FC<NoteImageProps> = ({ imageUrl, index, onDelete }) => {
    const { error, loaded } = useImageLoader(imageUrl);
    const fullImageUrl = `${process.env.REACT_APP_API_URL?.replace('/api', '')}${imageUrl}`;

    if (error) {
        return <div className="image-error">Error al cargar la imagen</div>;
    }

    return (
        <div className="note-image-container">
            {!loaded && <div className="image-loading">Cargando...</div>}
            <img 
                src={fullImageUrl}
                alt={`Imagen ${index + 1}`}
                className={`note-image ${loaded ? 'loaded' : ''}`}
                style={{ display: loaded ? 'block' : 'none' }}
            />
            <button 
                className="delete-image-button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
            >
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};

export default NoteImage;
