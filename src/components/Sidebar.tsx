import React from 'react';
import type { HouseWithCRM, CRMStatus } from '@/lib/types';
import HouseCard from './HouseCard';

/**
 * Props for the Sidebar component.
 */
interface SidebarProps {
  houses: HouseWithCRM[];
  selectedHouseId: number | null;
  sort: string;
  loading: boolean;
  mobileViewMode?: 'map' | 'list';
  onHouseSelect: (id: number) => void;
  onSortChange: (sort: string) => void;
  onStatusChange: (id: number, status: CRMStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
  onOpenGallery?: (house: HouseWithCRM, photoIndex?: number) => void;
  onPhotosUpdated?: (houseId: number, photos: string[], description?: string) => void;
}

/**
 * Sidebar layout containing the scrollable list of HouseCards,
 * total results count, and sorting controls.
 * Memoized for high FPS when other page components re-render.
 */
function SidebarComponent({
  houses,
  selectedHouseId,
  sort,
  loading,
  mobileViewMode = 'map',
  onHouseSelect,
  onSortChange,
  onStatusChange,
  onNotesChange,
  onOpenGallery,
  onPhotosUpdated,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${mobileViewMode === 'list' ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="sidebar-title">Результати</span>
          <span className="sidebar-count">{houses.length}</span>
        </div>
        <div className="sidebar-sort">
          <select
            className="select-control"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            style={{ minWidth: '130px', fontSize: '0.75rem' }}
          >
            <option value="price_asc">Ціна ↑</option>
            <option value="price_desc">Ціна ↓</option>
            <option value="date_desc">Нові спочатку</option>
            <option value="distance_asc">Ближче до міста</option>
            <option value="area_desc">Більша площа</option>
          </select>
        </div>
      </div>

      <div className="sidebar-list">
        {loading ? (
          <div className="sidebar-loading">
            <div className="loading-spinner" />
            <p>Завантаження будинків...</p>
          </div>
        ) : houses.length === 0 ? (
          <div className="sidebar-empty">
            <p className="empty-title">Нічого не знайдено</p>
            <p className="empty-subtitle">Спробуйте змінити фільтри або синхронізувати нові оголошення</p>
          </div>
        ) : (
          houses.map((house) => (
            <HouseCard
              key={house.id}
              house={house}
              isActive={house.id === selectedHouseId}
              onSelect={onHouseSelect}
              onStatusChange={onStatusChange}
              onNotesChange={onNotesChange}
              onOpenGallery={onOpenGallery}
              onPhotosUpdated={onPhotosUpdated}
            />
          ))
        )}
      </div>
    </aside>
  );
}

const Sidebar = React.memo(SidebarComponent);
export default Sidebar;
