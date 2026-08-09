'use client';

import { useState, useRef, useEffect } from 'react';
import type { HouseWithCRM, CRMStatus } from '@/lib/types';
import { CRM_STATUSES } from '@/lib/types';
import { MapPin, StickyNote, ExternalLink } from 'lucide-react';

interface HouseCardProps {
  house: HouseWithCRM;
  isActive: boolean;
  onClick: () => void;
  onStatusChange: (id: number, status: CRMStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
}

export default function HouseCard({
  house,
  isActive,
  onClick,
  onStatusChange,
  onNotesChange,
}: HouseCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(house.crm_notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const status = (house.crm_status || 'new') as CRMStatus;
  const statusInfo = CRM_STATUSES[status];

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

  // Sync notes from props
  useEffect(() => {
    setNotes(house.crm_notes || '');
  }, [house.crm_notes]);

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

  return (
    <div className={`house-card ${isActive ? 'active' : ''}`}>
      {/* Image */}
      <div className="house-card-image" onClick={onClick}>
        {house.photo_url ? (
          <img src={house.photo_url} alt={house.title || 'Будинок'} loading="lazy" />
        ) : (
          <div className="no-photo">Немає фото</div>
        )}
      </div>

      {/* Body */}
      <div className="house-card-body" onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span className="house-card-price">
            ${house.price.toLocaleString()}{house.deal_type === 'rent' ? '/міс' : ''}
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
          <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setShowNotes(!showNotes)}
              title="Нотатки"
              style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <StickyNote size={14} />
            </button>
            {house.source_url && (
              <a
                className="btn btn-ghost btn-icon"
                href={house.source_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Оригінал"
                style={{ fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

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
    </div>
  );
}
