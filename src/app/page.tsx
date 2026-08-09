'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Star, Calendar, Home, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import FilterPanel from '@/components/FilterPanel';
import Sidebar from '@/components/Sidebar';
import type { HouseWithCRM, CRMStatus } from '@/lib/types';
import { REGIONS } from '@/lib/geo';

// Dynamic import for Leaflet (no SSR)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="map-container"><div className="loading-spinner" /></div>,
});

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let toastIdCounter = 0;

/**
 * Main application entry point.
 * Acts as the centralized state manager for filters, map bounds, synchronization,
 * and data fetching. It connects the FilterPanel, Sidebar, and MapView components.
 */
export default function HomePage() {
  // Filter state
  const [dealType, setDealType] = useState<'sale' | 'rent'>('sale');
  const [region, setRegion] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [activeStatuses, setActiveStatuses] = useState<CRMStatus[]>([]);
  const [sort, setSort] = useState('price_asc');

  // Data state
  const [houses, setHouses] = useState<HouseWithCRM[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Map state
  const [mapBounds, setMapBounds] = useState<{ sw: [number, number]; ne: [number, number] } | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState<string | null>(null); // 'olx' | 'domria' | null

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Debounce timer
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Toast functions
  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Fetch houses from API
  const fetchHouses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('deal_type', dealType);
      if (region !== 'all') params.set('region', region);
      if (priceMin) params.set('price_min', priceMin);
      if (priceMax) params.set('price_max', priceMax);
      if (activeStatuses.length > 0) params.set('status', activeStatuses.join(','));
      params.set('sort', sort);

      const res = await fetch(`/api/houses?${params.toString()}`);
      const data = await res.json();
      setHouses(data.houses || []);
    } catch (error) {
      console.error('Failed to fetch houses:', error);
    } finally {
      setLoading(false);
    }
  }, [dealType, region, priceMin, priceMax, activeStatuses, sort]);

  // Debounced fetch on filter change
  useEffect(() => {
    clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(fetchHouses, 300);
    return () => clearTimeout(fetchTimerRef.current);
  }, [fetchHouses]);

  // Update map bounds when region changes
  useEffect(() => {
    if (region === 'all') {
      setMapBounds(null);
    } else {
      const r = REGIONS.find(reg => reg.name === region);
      if (r) {
        setMapBounds({ sw: r.bounds.sw as [number, number], ne: r.bounds.ne as [number, number] });
      }
    }
  }, [region]);

  // Sync handler — replaces alert() with toast
  const handleSync = useCallback(async (source: 'olx' | 'domria') => {
    if (syncing) return; // Prevent double-sync

    setSyncing(source);
    const sourceName = source === 'olx' ? 'OLX' : 'DOM.RIA';
    showToast('info', `Синхронізація ${sourceName} почалась... Зачекайте.`);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          deal_type: dealType,
          mode: source === 'olx' ? 'full' : undefined,
          page: source === 'domria' ? 0 : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('success', `${data.message}`);
        // Refresh the data without page reload
        fetchHouses();
      } else {
        showToast('error', `${data.error || 'Помилка синхронізації'}`);
      }
    } catch (e) {
      showToast('error', `Помилка з'єднання з сервером`);
    } finally {
      setSyncing(null);
    }
  }, [syncing, dealType, showToast, fetchHouses]);

  const handleClear = useCallback(async () => {
    try {
      showToast('info', 'Видалення...');
      const res = await fetch('/api/houses', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', `${data.message}`);
        fetchHouses();
      } else {
        showToast('error', `${data.error}`);
      }
    } catch (e) {
      showToast('error', `Помилка з'єднання з сервером`);
    }
  }, [showToast, fetchHouses]);


  // CRM actions
  const handleStatusChange = useCallback(async (id: number, status: CRMStatus) => {
    try {
      await fetch(`/api/houses/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Update local state
      setHouses(prev =>
        prev.map(h => h.id === id ? { ...h, crm_status: status } : h)
      );
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }, []);

  const handleNotesChange = useCallback(async (id: number, notes: string) => {
    try {
      await fetch(`/api/houses/${id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      // Update local state
      setHouses(prev =>
        prev.map(h => h.id === id ? { ...h, crm_notes: notes } : h)
      );
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  }, []);

  const handleStatusToggle = useCallback((status: CRMStatus) => {
    setActiveStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  }, []);

  // Stats
  const favoriteCount = houses.filter(h => h.crm_status === 'favorite').length;
  const viewingCount = houses.filter(h => h.crm_status === 'viewing').length;

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <a className="app-logo" href="/">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" />
          </svg>
          Find<span>Home</span>
        </a>
        <div className="header-stats">
          <div className="header-stat">
            <Star size={16} />
            <strong>{favoriteCount}</strong>
            <span>обрані</span>
          </div>
          <div className="header-stat">
            <Calendar size={16} />
            <strong>{viewingCount}</strong>
            <span>перегляди</span>
          </div>
          <div className="header-stat">
            <Home size={16} />
            <strong>{houses.length}</strong>
            <span>будинків</span>
          </div>
        </div>
      </header>

      <FilterPanel
        dealType={dealType}
        region={region}
        priceMin={priceMin}
        priceMax={priceMax}
        activeStatuses={activeStatuses}
        syncing={syncing}
        onDealTypeChange={setDealType}
        onRegionChange={setRegion}
        onPriceMinChange={setPriceMin}
        onPriceMaxChange={setPriceMax}
        onStatusToggle={handleStatusToggle}
        onSync={handleSync}
        onClear={handleClear}
      />

      {/* Main Body: Sidebar + Map */}
      <div className="app-body">
        <Sidebar
          houses={houses}
          selectedHouseId={selectedHouseId}
          sort={sort}
          loading={loading}
          onHouseSelect={setSelectedHouseId}
          onSortChange={setSort}
          onStatusChange={handleStatusChange}
          onNotesChange={handleNotesChange}
        />
        <MapView
          houses={houses}
          selectedHouseId={selectedHouseId}
          onHouseSelect={setSelectedHouseId}
          onStatusChange={handleStatusChange}
          onNotesChange={handleNotesChange}
          mapBounds={mapBounds}
        />
      </div>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />}
            {toast.type === 'error' && <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />}
            {toast.type === 'info' && <Info size={18} style={{ color: '#3B82F6', flexShrink: 0 }} />}
            <span>{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
