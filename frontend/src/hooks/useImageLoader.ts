import { useState, useEffect } from 'react';

export const useImageLoader = (imageUrl: string) => {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!imageUrl) {
            setError(true);
            setLoaded(false);
            return;
        }

        const img = new Image();
        
        img.onload = () => {
            setLoaded(true);
            setError(false);
        };
        
        img.onerror = () => {
            setError(true);
            setLoaded(false);
            console.error(`Error loading image: ${imageUrl}`);
        };

        const fullUrl = imageUrl.startsWith('http') 
            ? imageUrl 
            : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${imageUrl}`;
            
        img.src = fullUrl;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [imageUrl]);

    return { error, loaded };
};
