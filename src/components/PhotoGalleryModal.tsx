'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { HouseWithCRM } from '@/lib/types';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, MapPin, ExternalLink } from 'lucide-react';

interface PhotoGalleryModalProps {
  house: HouseWithCRM | null;
  initialPhotoIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onPhotosUpdated?: (houseId: number, photos: string[], description?: string) => void;
}

export default function PhotoGalleryModal({
  house,
  initialPhotoIndex = 0,
  isOpen,
  onClose,
  onPhotosUpdated,
}: PhotoGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dynamicPhotos, setDynamicPhotos] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  // Extract photos from house prop
  const extractPhotos = useCallback((h: HouseWithCRM | null): string[] => {
    if (!h) return [];
    const list: string[] = [];

    if (h.photos) {
      try {
        const parsed = JSON.parse(h.photos);
        if (Array.isArray(parsed)) {
          parsed.forEach((url) => {
            if (typeof url === 'string' && url.startsWith('http') && !url.includes('no_thumbnail')) {
              list.push(url);
            }
          });
        }
      } catch {
        // Not JSON array
      }
    }

    if (list.length === 0 && h.photo_url && h.photo_url.startsWith('http')) {
      list.push(h.photo_url);
    }

    return list;
  }, []);

  // Sync initial photos when house opens
  useEffect(() => {
    if (!isOpen || !house) return;
    const initialList = extractPhotos(house);
    setDynamicPhotos(initialList);
    setCurrentIndex(initialPhotoIndex);
    setIsLoaded(false);

    // If only 1 preview photo exists, fetch all photos from listing detail page
    if (initialList.length <= 1 && house.id) {
      setIsLoadingMore(true);
      fetch(`/api/houses/${house.id}/photos`)
        .then((res) => res.json())
        .then((data) => {
          if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
            setDynamicPhotos(data.photos);
            if (onPhotosUpdated) {
              onPhotosUpdated(house.id, data.photos, data.description);
            }
          }
        })
        .catch((err) => console.error('Failed to fetch full photos:', err))
        .finally(() => setIsLoadingMore(false));
    }
  }, [isOpen, house, initialPhotoIndex, extractPhotos, onPhotosUpdated]);

  const photos = dynamicPhotos.length > 0 ? dynamicPhotos : extractPhotos(house);

  // Body scroll lock & gallery-open state class
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('gallery-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('gallery-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('gallery-open');
    };
  }, [isOpen]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailStripRef.current) {
      const activeThumb = thumbnailStripRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  // Preload adjacent images in browser cache for instant 0ms transitions
  useEffect(() => {
    if (!isOpen || photos.length <= 1) return;
    const indicesToPreload = [
      (currentIndex + 1) % photos.length,
      (currentIndex + 2) % photos.length,
      (currentIndex - 1 + photos.length) % photos.length,
    ];
    indicesToPreload.forEach((idx) => {
      const url = photos[idx];
      if (url && typeof Image !== 'undefined') {
        const img = new Image();
        img.src = url;
      }
    });
  }, [isOpen, currentIndex, photos]);

  const nextPhoto = useCallback(() => {
    if (photos.length <= 1) return;
    setIsLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    if (photos.length <= 1) return;
    setIsLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, nextPhoto, prevPhoto]);

  // Touch swipe handling
  const minSwipeDistance = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextPhoto();
    } else if (isRightSwipe) {
      prevPhoto();
    }
  };

  if (!isOpen || !house) return null;

  const isRent = house.deal_type === 'rent';
  const displayPrice = isRent
    ? `₴${(house.price_uah || Math.round(house.price * 41.5)).toLocaleString()}/міс`
    : `$${house.price.toLocaleString()}`;

  const currentUrl = photos[currentIndex] || house.photo_url;

  return (
    <div className="gallery-modal-overlay" onClick={onClose}>
      <div
        className="gallery-modal-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Header Bar */}
        <div className="gallery-header">
          <div className="gallery-info">
            <span className="gallery-price">{displayPrice}</span>
            <div className="gallery-location">
              <MapPin size={13} />
              <span>{house.address || house.city || house.region || 'Україна'}</span>
            </div>
          </div>

          <div className="gallery-header-actions">
            {photos.length > 0 && (
              <div className="gallery-counter">
                <ImageIcon size={14} />
                <span>
                  {currentIndex + 1} / {photos.length}
                </span>
              </div>
            )}
            {house.source_url && (
              <a
                href={house.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="gallery-btn-icon"
                title="Відкрити оригінал оголошення"
              >
                <ExternalLink size={18} />
              </a>
            )}
            <button className="gallery-btn-icon gallery-btn-close" onClick={onClose} title="Закрити (Esc)">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Main Photo View */}
        <div className="gallery-main-view">
          {photos.length > 1 && (
            <button
              className="gallery-nav-btn prev"
              onClick={prevPhoto}
              aria-label="Попереднє фото"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div className="gallery-image-wrapper">
            {currentUrl ? (
              <img
                src={currentUrl}
                alt={house.title || 'Будинок'}
                className={`gallery-main-img ${isLoaded ? 'loaded' : 'loading'}`}
                onLoad={() => setIsLoaded(true)}
              />
            ) : (
              <div className="gallery-no-photo">
                <ImageIcon size={48} />
                <span>Фотографії відсутні</span>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <button
              className="gallery-nav-btn next"
              onClick={nextPhoto}
              aria-label="Наступне фото"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>

        {/* Bottom Thumbnail Strip */}
        {photos.length > 1 && (
          <div className="gallery-thumbnails" ref={thumbnailStripRef}>
            {photos.map((url, idx) => (
              <button
                key={idx}
                className={`gallery-thumb-item ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setIsLoaded(false);
                  setCurrentIndex(idx);
                }}
              >
                <img src={url} alt={`Мініатюра ${idx + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
