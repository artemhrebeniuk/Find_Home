'use client';
import { useState, useEffect } from 'react';
import { REGIONS } from '@/lib/geo';
import type { CRMStatus } from '@/lib/types';
import { CRM_STATUSES } from '@/lib/types';
import { DownloadCloud, RefreshCw, Loader2, Trash2, AlertTriangle } from 'lucide-react';

interface FilterPanelProps {
  dealType: 'sale' | 'rent';
  region: string;
  priceMin: string;
  priceMax: string;
  activeStatuses: CRMStatus[];
  syncing: string | null;
  onDealTypeChange: (dt: 'sale' | 'rent') => void;
  onRegionChange: (r: string) => void;
  onPriceMinChange: (v: string) => void;
  onPriceMaxChange: (v: string) => void;
  onStatusToggle: (s: CRMStatus) => void;
  onSync: (source: 'olx' | 'domria') => void;
  onClear: () => void;
}

export default function FilterPanel({
  dealType,
  region,
  priceMin,
  priceMax,
  activeStatuses,
  syncing,
  onDealTypeChange,
  onRegionChange,
  onPriceMinChange,
  onPriceMaxChange,
  onStatusToggle,
  onSync,
  onClear,
}: FilterPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  // Auto-reset confirm state after 3 seconds if not clicked
  useEffect(() => {
    if (confirmClear) {
      const timer = setTimeout(() => setConfirmClear(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmClear]);

  return (
    <div className="filter-bar">
      {/* Deal Type Toggle */}
      <div className="filter-group">
        <div className="toggle-group">
          <button
            className={`toggle-option ${dealType === 'sale' ? 'active' : ''}`}
            onClick={() => onDealTypeChange('sale')}
          >
            Купівля
          </button>
          <button
            className={`toggle-option ${dealType === 'rent' ? 'active' : ''}`}
            onClick={() => onDealTypeChange('rent')}
          >
            Оренда
          </button>
        </div>
      </div>

      <div className="filter-divider" />

      {/* Region */}
      <div className="filter-group">
        <span className="filter-label">Область</span>
        <select
          className="select-control"
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
        >
          <option value="all">Вся Україна</option>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-divider" />

      {/* Price Range */}
      <div className="filter-group">
        <span className="filter-label">Ціна $</span>
        <input
          className="input-control"
          type="number"
          placeholder="Від"
          value={priceMin}
          onChange={(e) => onPriceMinChange(e.target.value)}
          min={0}
          step={1000}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
        <input
          className="input-control"
          type="number"
          placeholder="До"
          value={priceMax}
          onChange={(e) => onPriceMaxChange(e.target.value)}
          min={0}
          step={1000}
        />
      </div>

      <div className="filter-divider" />

      {/* CRM Status Filters */}
      <div className="filter-group">
        <span className="filter-label">Статус</span>
        <div className="crm-filters">
          {(Object.entries(CRM_STATUSES) as [CRMStatus, typeof CRM_STATUSES[CRMStatus]][]).map(
            ([key, { label, icon: Icon, color }]) => {
              const isActive = activeStatuses.includes(key);
              return (
                <button
                  key={key}
                  className={`crm-filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => onStatusToggle(key)}
                  style={isActive ? { borderColor: color, background: `${color}20`, color } : { color }}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              );
            }
          )}
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className={`sync-btn olx ${syncing === 'olx' ? 'syncing' : ''}`}
          onClick={() => onSync('olx')}
          disabled={syncing !== null}
          title="Зібрати всі оголошення з OLX (до 50 сторінок)"
        >
          {syncing === 'olx' ? (
            <Loader2 size={16} className="spin-icon" />
          ) : (
            <DownloadCloud size={16} />
          )}
          {syncing === 'olx' ? 'Збираємо...' : 'OLX'}
        </button>
        <button
          className={`sync-btn domria ${syncing === 'domria' ? 'syncing' : ''}`}
          onClick={() => onSync('domria')}
          disabled={syncing !== null}
          title="Синхронізувати з DOM.RIA (потребує API ключ)"
        >
          {syncing === 'domria' ? (
            <Loader2 size={16} className="spin-icon" />
          ) : (
            <RefreshCw size={16} />
          )}
          {syncing === 'domria' ? 'Збираємо...' : 'DOM.RIA'}
        </button>
        <button
          type="button"
          className="sync-btn"
          style={
            confirmClear 
              ? { color: '#fff', background: '#ef4444', borderColor: '#ef4444' }
              : { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.25)' }
          }
          onClick={() => {
            if (confirmClear) {
              setConfirmClear(false);
              onClear();
            } else {
              setConfirmClear(true);
            }
          }}
          title="Видалити всі оголошення з бази"
        >
          {confirmClear ? <AlertTriangle size={16} /> : <Trash2 size={16} />}
          {confirmClear ? 'Ви впевнені?' : 'Очистити'}
        </button>
      </div>
    </div>
  );
}
