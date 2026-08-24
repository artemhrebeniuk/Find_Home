import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { HouseWithCRM, CRMStatus } from '@/lib/types';
import { CRM_STATUSES } from '@/lib/types';
import { MapPin, StickyNote, ExternalLink, Home, ChevronDown, Image as ImageIcon } from 'lucide-react';

/**
 * Props for the HouseCard component.
 */
interface HouseCardProps {
  house: HouseWithCRM;
  isActive: boolean;
  onSelect: (id: number) => void;
  onStatusChange: (id: number, status: CRMStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
  onOpenGallery?: (house: HouseWithCRM, photoIndex?: number) => void;
  onPhotosUpdated?: (houseId: number, photos: string[], description?: string) => void;
}

/**
 * Renders a single property card for the sidebar.
 * Displays property details (price, specs, photo), distance to city,
 * interactive CRM controls, and expandable full description drawer.
 * Memoized for instant UI responsiveness and 60 FPS scrolling with 1000+ items.
 */
function HouseCardComponent({
  house,
  isActive,
  onSelect,
  onStatusChange,
  onNotesChange,
  onOpenGallery,
  onPhotosUpdated,
}: HouseCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState(house.crm_notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isFetchingPhotos, setIsFetchingPhotos] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const status = (house.crm_status || 'new') as CRMStatus;
  const statusInfo = CRM_STATUSES[status];

  // Calculate total photo count
  const photoCount = useMemo(() => {
    if (!house.photos) return house.photo_url ? 1 : 0;
    try {
      const parsed = JSON.parse(house.photos);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.length;
    } catch {
      // ignore
    }
    return house.photo_url ? 1 : 0;
  }, [house.photos, house.photo_url]);

  // Auto-fetch full photos when expanding card or when card becomes active if only 1 photo cached
  useEffect(() => {
    if ((isExpanded || isActive) && photoCount <= 1 && house.id && !isFetchingPhotos) {
      setIsFetchingPhotos(true);
      fetch(`/api/houses/${house.id}/photos`)
        .then((res) => res.json())
        .then((data) => {
          if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
            if (onPhotosUpdated) {
              onPhotosUpdated(house.id, data.photos, data.description);
            }
          }
        })
        .catch((err) => console.error('Failed to fetch house photos:', err))
        .finally(() => setIsFetchingPhotos(false));
    }
  }, [isExpanded, isActive, photoCount, house.id, isFetchingPhotos, onPhotosUpdated]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    if (showStatusMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStatusMenu]);

  // Sync local state when notes change from parent or API
  useEffect(() => {
    setNotes(house.crm_notes || '');
  }, [house.crm_notes]);

  // Reset img error if photo_url changes
  useEffect(() => {
    setImgError(false);
  }, [house.photo_url]);

  const handleCardClick = useCallback(() => {
    onSelect(house.id);
  }, [onSelect, house.id]);

  /**
   * Debounces the notes change event to avoid saving on every keystroke.
   */
  const handleNotesChange = (value: string) => {
    setNotes(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onNotesChange(house.id, value);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1500);
    }, 500);
  };

  const distanceText = house.distance_to_city
    ? `${house.distance_to_city < 1 ? '< 1' : house.distance_to_city < 10 ? house.distance_to_city.toFixed(1) : Math.round(house.distance_to_city)} км до ${house.nearest_city}`
    : '';

  const isRent = house.deal_type === 'rent';
  const rawPrice = isRent
    ? (house.price_uah || (house.price ? Math.round(house.price * 41.5) : 0))
    : (house.price || (house.price_uah ? Math.round(house.price_uah / 41.5) : 0));
  const numericPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/\s+/g, '')) || 0;

  const formattedPrice = isRent
    ? `₴${numericPrice.toLocaleString()}/міс`
    : `$${numericPrice.toLocaleString()}`;

  const hasValidPhoto = Boolean(
    house.photo_url &&
    !imgError &&
    house.photo_url.startsWith('http') &&
    !house.photo_url.includes('no_thumbnail')
  );

  return (
    <div className={`house-card ${isActive ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}>
      {/* Main Top Row */}
      <div className="house-card-main">
        {/* Image Container with Direct Gallery Trigger */}
        <div
          className="house-card-image"
          onClick={(e) => {
            if (onOpenGallery && hasValidPhoto) {
              e.stopPropagation();
              onOpenGallery(house, 0);
            } else {
              handleCardClick();
            }
          }}
          title={hasValidPhoto ? "Натисніть для перегляду всіх фото" : ""}
        >
          {hasValidPhoto ? (
            <>
              <img
                src={house.photo_url!}
                alt={house.title || 'Будинок'}
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
              />
              {photoCount > 1 && (
                <div className="card-photo-badge" title={`${photoCount} фотографій`}>
                  <ImageIcon size={12} />
                  <span>{photoCount}</span>
                </div>
              )}
            </>
          ) : (
            <div className="no-photo">
              <Home size={22} className="no-photo-icon" />
              <span>Немає фото</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="house-card-body" onClick={handleCardClick}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span className="house-card-price">
              {formattedPrice}
            </span>

            {/* Status selector */}
            <div className="status-selector" ref={menuRef} onClick={(e) => e.stopPropagation()}>
              <button
                className="status-selector-trigger"
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                title="Змінити статус"
              >
                <span className="status-dot" style={{ background: statusInfo.color }} />
                <span>{statusInfo.label}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {showStatusMenu && (
                <div className="status-dropdown">
                  {(Object.entries(CRM_STATUSES) as [CRMStatus, typeof CRM_STATUSES[CRMStatus]][]).map(
                    ([key, { label, icon: Icon, color }]) => (
                      <button
                        key={key}
                        className={`status-option ${key === status ? 'active' : ''}`}
                        onClick={() => {
                          onStatusChange(house.id, key);
                          setShowStatusMenu(false);
                        }}
                      >
                        <span className="status-dot" style={{ background: color }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icon size={14} />
                          <span>{label}</span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="house-card-location">{house.address || house.city || house.region || ''}</div>

          <div className="house-card-specs">
            {house.area_total && (
              <span className="house-card-spec">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                {house.area_total} м²
              </span>
            )}
            {house.area_land && (
              <span className="house-card-spec">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21L12 3L21 21H3Z" />
                </svg>
                {house.area_land} сот
              </span>
            )}
            {house.rooms && (
              <span className="house-card-spec">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12L12 3L21 12V21H3V12Z" />
                </svg>
                {house.rooms} кімн
              </span>
            )}
          </div>

          <div className="house-card-footer">
            {distanceText && (
              <span className="house-card-distance" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {distanceText}
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowNotes(!showNotes)}
                title="Нотатки"
                style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <StickyNote size={14} />
              </button>
              {hasValidPhoto && (
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => onOpenGallery?.(house, 0)}
                  title="Переглянути галерею фото"
                  style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ImageIcon size={14} />
                </button>
              )}
              {house.source_url && (
                <a
                  className="btn btn-ghost btn-icon"
                  href={house.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Оригінал оголошення"
                  style={{ fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expand Details Button */}
      <button
        type="button"
        className="btn-card-expand"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        aria-expanded={isExpanded}
      >
        <span>{isExpanded ? 'Згорнути опис' : 'Детальніше та опис'}</span>
        <ChevronDown size={14} className={`expand-chevron ${isExpanded ? 'rotated' : ''}`} />
      </button>

      {/* Expandable Details Drawer (Full Width) */}
      {isExpanded && (
        <div className="card-expanded-drawer" onClick={(e) => e.stopPropagation()}>
          {/* Description Text */}
          <div className="drawer-description">
            <p>{house.description || house.title || 'Опис об\'єкта відсутній.'}</p>
          </div>

          {/* Specs Grid */}
          <div className="drawer-specs-grid">
            {house.area_total && (
              <div className="drawer-spec-item">
                <span className="drawer-spec-lbl">Площа будинку</span>
                <span className="drawer-spec-val">{house.area_total} м²</span>
              </div>
            )}
            {house.area_land && (
              <div className="drawer-spec-item">
                <span className="drawer-spec-lbl">Площа ділянки</span>
                <span className="drawer-spec-val">{house.area_land} соток</span>
              </div>
            )}
            {house.rooms && (
              <div className="drawer-spec-item">
                <span className="drawer-spec-lbl">Кімнати</span>
                <span className="drawer-spec-val">{house.rooms}</span>
              </div>
            )}
            {house.floors && (
              <div className="drawer-spec-item">
                <span className="drawer-spec-lbl">Поверхи</span>
                <span className="drawer-spec-val">{house.floors}</span>
              </div>
            )}
            {house.year_built && (
              <div className="drawer-spec-item">
                <span className="drawer-spec-lbl">Рік побудови</span>
                <span className="drawer-spec-val">{house.year_built} р.</span>
              </div>
            )}
            {house.nearest_city && house.distance_to_city !== null && (
              <div className="drawer-spec-item">
                <span className="drawer-spec-lbl">Відстань до міста</span>
                <span className="drawer-spec-val">{distanceText}</span>
              </div>
            )}
          </div>

          {/* Quick Actions inside Drawer */}
          <div className="drawer-actions">
            {hasValidPhoto && (
              <button
                type="button"
                className="btn btn-primary drawer-action-btn"
                onClick={() => onOpenGallery?.(house, 0)}
              >
                <ImageIcon size={15} />
                <span>{isFetchingPhotos ? 'Завантаження фото...' : `Фотографії (${photoCount})`}</span>
              </button>
            )}
            {house.source_url && (
              <a
                href={house.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost drawer-action-btn"
              >
                <ExternalLink size={15} />
                <span>Оригінал на {house.source === 'olx' ? 'OLX' : 'DOM.RIA'}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Notes section */}
      {showNotes && (
        <div className="popup-notes" onClick={(e) => e.stopPropagation()} style={{ marginTop: '8px' }}>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Додайте нотатку..."
            rows={2}
          />
          <span className={`notes-saved ${notesSaved ? 'visible' : ''}`}>✓ Збережено</span>
        </div>
      )}
    </div>
  );
}

const HouseCard = React.memo(HouseCardComponent, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.house.id === next.house.id &&
    prev.house.crm_status === next.house.crm_status &&
    prev.house.crm_notes === next.house.crm_notes &&
    prev.house.photos === next.house.photos &&
    prev.house.photo_url === next.house.photo_url &&
    prev.house.price === next.house.price &&
    prev.house.price_uah === next.house.price_uah &&
    prev.house.deal_type === next.house.deal_type &&
    prev.onSelect === next.onSelect &&
    prev.onStatusChange === next.onStatusChange &&
    prev.onNotesChange === next.onNotesChange &&
    prev.onOpenGallery === next.onOpenGallery &&
    prev.onPhotosUpdated === next.onPhotosUpdated
  );
});

export default HouseCard;
