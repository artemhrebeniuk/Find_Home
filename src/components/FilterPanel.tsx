import { useState, useEffect, useRef, useMemo } from 'react';
import { REGIONS } from '@/lib/geo';
import type { CRMStatus } from '@/lib/types';
import { CRM_STATUSES } from '@/lib/types';
import { DownloadCloud, RefreshCw, Loader2, Trash2, AlertTriangle, Database, Search, X, MapPin, Check, ChevronDown } from 'lucide-react';

interface SettlementItem {
  name: string;
  region: string;
  count: number;
  lat: number;
  lng: number;
}

/**
 * Props for the FilterPanel component.
 */
interface FilterPanelProps {
  dealType: 'sale' | 'rent';
  region: string;
  city: string;
  priceMin: string;
  priceMax: string;
  activeStatuses: CRMStatus[];
  syncing: string | null;
  onDealTypeChange: (dt: 'sale' | 'rent') => void;
  onRegionChange: (r: string) => void;
  onCityChange: (c: string, coords?: { lat: number; lng: number } | null) => void;
  onPriceMinChange: (v: string) => void;
  onPriceMaxChange: (v: string) => void;
  onStatusToggle: (s: CRMStatus) => void;
  onSync: (source: 'olx' | 'domria') => void;
  onClear: () => void;
  onRestore: () => void;
}

/**
 * Top navigation and filter bar.
 * Contains global filters (deal type, region, settlement, price), CRM status toggles,
 * and global action buttons (sync OLX, sync DOM.RIA, wipe database).
 */
export default function FilterPanel({
  dealType,
  region,
  city,
  priceMin,
  priceMax,
  activeStatuses,
  syncing,
  onDealTypeChange,
  onRegionChange,
  onCityChange,
  onPriceMinChange,
  onPriceMaxChange,
  onStatusToggle,
  onSync,
  onClear,
  onRestore,
}: FilterPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [settlementSearch, setSettlementSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const settlementRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-reset confirm state after 3 seconds if not clicked
  useEffect(() => {
    if (confirmClear) {
      const timer = setTimeout(() => setConfirmClear(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmClear]);

  // Fetch settlements when region or dealType changes
  useEffect(() => {
    let isMounted = true;
    setLoadingSettlements(true);
    const params = new URLSearchParams();
    if (region && region !== 'all') params.set('region', region);
    if (dealType) params.set('deal_type', dealType);

    fetch(`/api/settlements?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.settlements) {
          setSettlements(data.settlements);
        }
      })
      .catch((err) => console.error('Failed to load settlements:', err))
      .finally(() => {
        if (isMounted) setLoadingSettlements(false);
      });

    return () => {
      isMounted = false;
    };
  }, [region, dealType]);

  // Click outside to close settlement dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settlementRef.current && !settlementRef.current.contains(event.target as Node)) {
        setIsSettlementOpen(false);
      }
    }
    if (isSettlementOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opening dropdown
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettlementOpen]);

  // Filter settlements based on user search query
  const filteredSettlements = useMemo(() => {
    const q = settlementSearch.trim().toLowerCase();
    if (!q) return settlements;
    return settlements.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q)
    );
  }, [settlements, settlementSearch]);

  const activeSettlementName = city && city !== 'all' ? city : 'Всі міста та села';

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

      {/* Settlement / City / Village Filter */}
      <div className="filter-group settlement-filter-group" ref={settlementRef}>
        <span className="filter-label">Місто / село</span>
        <div className="settlement-selector-wrapper">
          <button
            type="button"
            className={`settlement-trigger-btn ${city && city !== 'all' ? 'has-value' : ''}`}
            onClick={() => setIsSettlementOpen((prev) => !prev)}
            aria-expanded={isSettlementOpen}
            title={activeSettlementName}
          >
            <MapPin size={13} className="settlement-pin-icon" />
            <span className="settlement-name-text">{activeSettlementName}</span>
            {city && city !== 'all' ? (
              <span
                className="settlement-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCityChange('all', null);
                  setSettlementSearch('');
                }}
                title="Скинути населений пункт"
              >
                <X size={14} />
              </span>
            ) : (
              <ChevronDown size={14} className="settlement-chevron" />
            )}
          </button>

          {isSettlementOpen && (
            <>
              <div 
                className="settlement-backdrop" 
                onClick={() => setIsSettlementOpen(false)} 
              />
              <div className="settlement-dropdown-menu">
                <div className="settlement-sheet-header">
                  <div className="settlement-sheet-title-wrap">
                    <MapPin size={15} className="settlement-pin-icon" />
                    <span className="settlement-sheet-title">Оберіть населений пункт</span>
                  </div>
                  <button 
                    type="button" 
                    className="settlement-sheet-close" 
                    onClick={() => setIsSettlementOpen(false)}
                    aria-label="Закрити"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="settlement-search-header">
                  <Search size={14} className="search-input-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="settlement-search-input"
                    placeholder="Введіть місто або село..."
                    value={settlementSearch}
                    onChange={(e) => {
                      setSettlementSearch(e.target.value);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex((prev) =>
                          prev < filteredSettlements.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex((prev) =>
                          prev > 0 ? prev - 1 : filteredSettlements.length - 1
                        );
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (highlightedIndex >= 0 && filteredSettlements[highlightedIndex]) {
                          const target = filteredSettlements[highlightedIndex];
                          onCityChange(target.name, { lat: target.lat, lng: target.lng });
                        } else if (filteredSettlements.length > 0) {
                          const first = filteredSettlements[0];
                          onCityChange(first.name, { lat: first.lat, lng: first.lng });
                        } else if (settlementSearch.trim()) {
                          onCityChange(settlementSearch.trim(), null);
                        }
                        setIsSettlementOpen(false);
                        setSettlementSearch('');
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsSettlementOpen(false);
                      }
                    }}
                  />
                  {settlementSearch && (
                    <button
                      type="button"
                      className="settlement-search-clear"
                      onClick={() => {
                        setSettlementSearch('');
                        setHighlightedIndex(-1);
                        searchInputRef.current?.focus();
                      }}
                      title="Очистити пошук"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

              <div className="settlement-options-list">
                {/* Option to select All */}
                <button
                  type="button"
                  className={`settlement-option-item ${(!city || city === 'all') ? 'selected' : ''}`}
                  onClick={() => {
                    onCityChange('all', null);
                    setIsSettlementOpen(false);
                    setSettlementSearch('');
                  }}
                >
                  <span className="settlement-item-name">Всі міста та села</span>
                  {(!city || city === 'all') && <Check size={14} className="check-icon" />}
                </button>

                {/* Filtered list of settlements */}
                {filteredSettlements.map((s, idx) => {
                  const isSelected = city?.toLowerCase() === s.name.toLowerCase();
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={`${s.name}-${s.region}-${idx}`}
                      type="button"
                      className={`settlement-option-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => {
                        onCityChange(s.name, { lat: s.lat, lng: s.lng });
                        setIsSettlementOpen(false);
                        setSettlementSearch('');
                      }}
                    >
                      <div className="settlement-item-info">
                        <span className="settlement-item-name">{s.name}</span>
                        {region === 'all' && s.region && (
                          <span className="settlement-item-region">{s.region}</span>
                        )}
                      </div>
                      <div className="settlement-item-badges">
                        {s.count > 0 ? (
                          <span className="settlement-count-badge">
                            {s.count} {s.count === 1 ? 'будинок' : s.count < 5 ? 'будинки' : 'будинків'}
                          </span>
                        ) : (
                          <span className="settlement-empty-badge">село / місто</span>
                        )}
                        {isSelected && <Check size={14} className="check-icon" />}
                      </div>
                    </button>
                  );
                })}

                {/* Freeform search if not matched in list */}
                {settlementSearch.trim() && filteredSettlements.length === 0 && (
                  <button
                    type="button"
                    className="settlement-option-item custom-search-item"
                    onClick={() => {
                      onCityChange(settlementSearch.trim(), null);
                      setIsSettlementOpen(false);
                    }}
                  >
                    <div className="settlement-item-info">
                      <span className="settlement-item-name">Шукати «{settlementSearch.trim()}»</span>
                      <span className="settlement-item-region">довільний пошук</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      <div className="filter-divider" />

      {/* Price Range */}
      <div className="filter-group">
        <span className="filter-label">
          {dealType === 'rent' ? 'Ціна ₴/міс' : 'Ціна $'}
        </span>
        <input
          className="input-control"
          type="number"
          placeholder={dealType === 'rent' ? 'Від ₴' : 'Від $'}
          value={priceMin}
          onChange={(e) => onPriceMinChange(e.target.value)}
          min={0}
          step={dealType === 'rent' ? 500 : 1000}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
        <input
          className="input-control"
          type="number"
          placeholder={dealType === 'rent' ? 'До ₴' : 'До $'}
          value={priceMax}
          onChange={(e) => onPriceMaxChange(e.target.value)}
          min={0}
          step={dealType === 'rent' ? 500 : 1000}
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
          disabled={syncing !== null && syncing !== 'olx'}
          title={syncing === 'olx' ? 'Натисніть, щоб зупинити збір' : 'Зібрати всі оголошення з OLX'}
        >
          {syncing === 'olx' ? (
            <Loader2 size={16} className="spin-icon" />
          ) : (
            <DownloadCloud size={16} />
          )}
          {syncing === 'olx' ? 'Зупинити' : 'OLX'}
        </button>
        <button
          className={`sync-btn domria ${syncing === 'domria' ? 'syncing' : ''}`}
          onClick={() => onSync('domria')}
          disabled={syncing !== null && syncing !== 'domria'}
          title={syncing === 'domria' ? 'Натисніть, щоб зупинити збір' : 'Синхронізувати з DOM.RIA'}
        >
          {syncing === 'domria' ? (
            <Loader2 size={16} className="spin-icon" />
          ) : (
            <RefreshCw size={16} />
          )}
          {syncing === 'domria' ? 'Зупинити' : 'DOM.RIA'}
        </button>
        <button
          type="button"
          className="sync-btn"
          style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)' }}
          onClick={onRestore}
          title="Відновити перевірену базу будинків (покупка та оренда по всій Україні)"
        >
          <Database size={15} />
          Відновити базу
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
