import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFullImageUrl } from '../utils/imageHelpers';

interface UseProfileImageResult {
  profileImageUrl: string | null;
  imageLoaded: boolean;
  imageError: boolean;
  setImageError: (value: boolean) => void;
  setImageLoaded: (value: boolean) => void;
  refreshProfileImage: (newPath?: string) => void;
}

export function useProfileImage(): UseProfileImageResult {
  const { user } = useAuth();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const loadImage = useCallback((imagePath: string) => {
    const fullUrl = getFullImageUrl(imagePath);
    setProfileImageUrl(fullUrl);
    setImageLoaded(false);
    setImageError(false);

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageError(true);
      setImageLoaded(false);
    };
    img.src = fullUrl;
  }, []);

  useEffect(() => {
    if (user?.profile_image) {
      loadImage(user.profile_image);
    } else {
      setProfileImageUrl(null);
      setImageLoaded(false);
      setImageError(false);
    }
  }, [user?.profile_image, loadImage]);

  const refreshProfileImage = useCallback((newPath?: string) => {
    const path = newPath ?? user?.profile_image;
    if (path) {
      loadImage(path);
    }
  }, [user?.profile_image, loadImage]);

  return {
    profileImageUrl,
    imageLoaded,
    imageError,
    setImageError,
    setImageLoaded,
    refreshProfileImage
  };
}
