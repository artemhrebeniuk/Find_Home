'use client';

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
  onHouseSelect: (id: number) => void;
  onSortChange: (sort: string) => void;
  onStatusChange: (id: number, status: CRMStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
}

/**
 * Sidebar layout containing the scrollable list of HouseCards,
 * total results count, and sorting controls.
 */
export default function Sidebar({
  houses,
  selectedHouseId,
  sort,
  loading,
  onHouseSelect,
  onSortChange,
  onStatusChange,
  onNotesChange,
}: SidebarProps) {
  return (
    <aside className="sidebar">
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
            <option value="distance">Відстань</option>
            <option value="date">Нові</option>
          </select>
        </div>
      </div>

      <div className="sidebar-list">
        {loading && (
          <div className="loading-spinner" />
        )}

        {!loading && houses.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" />
            </svg>
            <h3>Нічого не знайдено</h3>
            <p>Спробуйте змінити фільтри або розширити діапазон пошуку</p>
          </div>
        )}

        {!loading && houses.map((house) => (
          <HouseCard
            key={house.id}
            house={house}
            isActive={house.id === selectedHouseId}
            onClick={() => onHouseSelect(house.id)}
            onStatusChange={onStatusChange}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>
    </aside>
  );
}
