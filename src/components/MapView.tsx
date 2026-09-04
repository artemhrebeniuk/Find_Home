'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import {
  Layers,
  Moon,
  Satellite,
  Sun,
  Route,
  Mountain,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import type { HouseWithCRM, CRMStatus } from '@/lib/types';
import { formatPriceBubble } from '@/lib/geo';

export type MapStyleId = 'dark' | 'satellite' | 'streets' | 'osm' | 'topo';

export interface MapStyleOption {
  id: MapStyleId;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  thumbnail: React.ReactNode;
}

// Custom vector micro-cartography thumbnails
const GRAPHITE_THUMBNAIL = (
  <div className="map-thumb-canvas map-thumb-dark">
    <svg className="map-thumb-bg" viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="10" fill="#0b0f19" />
      <path d="M-4 18 L24 48" stroke="#1e293b" strokeWidth="2.5" />
      <path d="M12 -4 L48 32" stroke="#1e293b" strokeWidth="1.8" />
      <path d="M-2 36 Q18 20 46 22" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="22" cy="22" r="14" fill="rgba(99, 102, 241, 0.14)" />
    </svg>
    <Moon size={18} className="map-thumb-icon map-icon-moon" />
  </div>
);

const SATELLITE_THUMBNAIL = (
  <div className="map-thumb-canvas map-thumb-satellite">
    <svg className="map-thumb-bg" viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="10" fill="#061e12" />
      <path d="M0 0 H44 V26 Q32 18 18 28 Q8 35 0 24 Z" fill="#133d26" />
      <path d="M0 24 Q10 34 20 28 Q34 18 44 26 V44 H0 Z" fill="#0a2538" />
      <path d="M4 12 Q22 16 40 8" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="22" cy="22" r="14" fill="rgba(56, 189, 248, 0.15)" />
    </svg>
    <Satellite size={18} className="map-thumb-icon map-icon-sat" />
  </div>
);

const OSM_THUMBNAIL = (
  <div className="map-thumb-canvas map-thumb-osm">
    <svg className="map-thumb-bg" viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="10" fill="#f8fafc" />
      <path d="M0 0 H20 V20 H0 Z" fill="#dcfce7" />
      <path d="M26 24 H44 V44 H26 Z" fill="#e0f2fe" />
      <path d="M-2 22 H46" stroke="#f59e0b" strokeWidth="2.2" />
      <path d="M22 -2 V46" stroke="#ffffff" strokeWidth="3.2" />
      <path d="M22 -2 V46" stroke="#94a3b8" strokeWidth="1.4" />
    </svg>
    <Sun size={18} className="map-thumb-icon map-icon-sun" />
  </div>
);

const STREETS_THUMBNAIL = (
  <div className="map-thumb-canvas map-thumb-streets">
    <svg className="map-thumb-bg" viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="10" fill="#1e293b" />
      <path d="M-2 14 H46" stroke="#38bdf8" strokeWidth="2.5" />
      <path d="M-2 30 H46" stroke="#64748b" strokeWidth="1.5" />
      <path d="M16 -2 V46" stroke="#fbbf24" strokeWidth="2.2" />
      <path d="M32 -2 V46" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="16" cy="14" r="3.5" fill="#38bdf8" />
    </svg>
    <Route size={18} className="map-thumb-icon map-icon-route" />
  </div>
);

const TOPO_THUMBNAIL = (
  <div className="map-thumb-canvas map-thumb-topo">
    <svg className="map-thumb-bg" viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="10" fill="#064e3b" />
      <path d="M-4 36 Q12 16 28 22 Q40 28 48 18" stroke="#10b981" strokeWidth="1.6" fill="none" />
      <path d="M-4 28 Q14 8 30 14 Q42 20 48 10" stroke="#34d399" strokeWidth="1.2" fill="none" />
      <path d="M6 46 Q22 28 36 34 Q44 38 48 30" stroke="#059669" strokeWidth="1.6" fill="none" />
      <circle cx="22" cy="22" r="14" fill="rgba(16, 185, 129, 0.18)" />
    </svg>
    <Mountain size={18} className="map-thumb-icon map-icon-topo" />
  </div>
);

const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'dark',
    name: 'Графіт (Темна)',
    icon: Moon,
    thumbnail: GRAPHITE_THUMBNAIL,
  },
  {
    id: 'satellite',
    name: 'Супутник (Гібрид)',
    icon: Satellite,
    thumbnail: SATELLITE_THUMBNAIL,
  },
  {
    id: 'osm',
    name: 'Світла (Класична)',
    icon: Sun,
    thumbnail: OSM_THUMBNAIL,
  },
  {
    id: 'streets',
    name: 'Вулиці та райони',
    icon: Route,
    thumbnail: STREETS_THUMBNAIL,
  },
  {
    id: 'topo',
    name: 'Топографічна',
    icon: Mountain,
    thumbnail: TOPO_THUMBNAIL,
  },
];

function createStyleLayer(styleId: MapStyleId): L.Layer {
  switch (styleId) {
    case 'dark': {
      const base = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxNativeZoom: 16,
          maxZoom: 19,
        }
      );
      const ref = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 16,
          maxZoom: 19,
        }
      );
      return L.layerGroup([base, ref]);
    }

    case 'satellite': {
      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Source: Esri, Maxar, Earthstar Geographics',
          maxNativeZoom: 18,
          maxZoom: 19,
        }
      );
      const labels = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 18,
          maxZoom: 19,
        }
      );
      return L.layerGroup([sat, labels]);
    }

    case 'streets': {
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxNativeZoom: 18,
          maxZoom: 19,
        }
      );
    }

    case 'topo': {
      return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, SRTM | style: OpenTopoMap',
        subdomains: 'abc',
        maxNativeZoom: 17,
        maxZoom: 19,
      });
    }

    case 'osm':
    default: {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abc',
        maxZoom: 19,
      });
    }
  }
}

/**
 * Props for the MapView component.
 */
interface MapViewProps {
  houses: HouseWithCRM[];
  selectedHouseId: number | null;
  onHouseSelect: (id: number) => void;
  onStatusChange: (id: number, status: CRMStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
  onOpenGallery?: (house: HouseWithCRM, photoIndex?: number) => void;
  mapCenter?: [number, number];
  mapZoom?: number;
  mapBounds?: { sw: [number, number]; ne: [number, number] } | null;
  theme?: 'light' | 'dark';
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  favorite: '#F59E0B',
  archived: '#64748B',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Нове',
  favorite: 'Обране',
  archived: 'Архів',
};

/**
 * Renders the Leaflet map with custom marker clusters and popups.
 * It uses raw DOM manipulation for markers inside Leaflet (which is standard practice)
 * to avoid massive React re-render overhead with thousands of markers.
 */
export default function MapView({
  houses,
  selectedHouseId,
  onHouseSelect,
  onStatusChange,
  onNotesChange,
  onOpenGallery,
  mapCenter = [48.9, 31.2],
  mapZoom = 6,
  mapBounds,
  theme = 'dark',
}: MapViewProps) {
  const [mapStyle, setMapStyle] = useState<MapStyleId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('findhome_map_style') as MapStyleId | null;
      if (saved && MAP_STYLES.some(s => s.id === saved)) return saved;
    }
    return theme === 'dark' ? 'dark' : 'osm';
  });
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.Layer | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());

  // Close style menu on click outside or Escape
  useEffect(() => {
    if (!isStyleMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsStyleMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsStyleMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStyleMenuOpen]);

  // If user hasn't explicitly set a preference, follow global theme
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('findhome_map_style') : null;
    if (!saved) {
      setMapStyle(theme === 'dark' ? 'dark' : 'osm');
    }
  }, [theme]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      zoomControl: true,
      attributionControl: true,
    });

    const initialLayer = createStyleLayer(mapStyle);
    initialLayer.addTo(map);
    tileLayerRef.current = initialLayer;

    // Initialize cluster group
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 40;
        const className = 'cluster-icon';
        if (count >= 50) size = 56;
        else if (count >= 20) size = 48;

        return L.divIcon({
          html: `<span>${count}</span>`,
          className,
          iconSize: L.point(size, size),
        });
      },
    });

    map.addLayer(clusterGroup);
    mapRef.current = map;
    clusterGroupRef.current = clusterGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, []); // Run once on mount

  // Switch tile layer dynamically when mapStyle changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const newLayer = createStyleLayer(mapStyle);
    newLayer.addTo(mapRef.current);
    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // Fly to bounds when region changes
  useEffect(() => {
    if (!mapRef.current || !mapBounds) return;
    const bounds = L.latLngBounds(
      L.latLng(mapBounds.sw[0], mapBounds.sw[1]),
      L.latLng(mapBounds.ne[0], mapBounds.ne[1])
    );
    mapRef.current.flyToBounds(bounds, { duration: 0.8, padding: [20, 20] });
  }, [mapBounds]);

  // Create popup content
  const createPopupContent = useCallback((house: HouseWithCRM): string => {
    const status = house.crm_status || 'new';
    const statusColor = STATUS_COLORS[status];

    const isRent = house.deal_type === 'rent';
    const rawPrice = isRent
      ? (house.price_uah || (typeof house.price === 'number' ? Math.round(house.price * 41.5) : Math.round(parseFloat(String(house.price).replace(/\s+/g, '')) * 41.5)))
      : (typeof house.price === 'number' ? house.price : parseFloat(String(house.price).replace(/\s+/g, '')) || 0);

    const numericPrice = typeof rawPrice === 'number' && !isNaN(rawPrice) ? rawPrice : 0;
    const formattedPopupPrice = isRent
      ? `₴${numericPrice.toLocaleString()}/міс`
      : `$${numericPrice.toLocaleString()}`;

    const specs = [];
    if (house.area_total) specs.push(`<div class="popup-spec"><span class="popup-spec-value">${house.area_total}</span><span class="popup-spec-label">м²</span></div>`);
    if (house.area_land) specs.push(`<div class="popup-spec"><span class="popup-spec-value">${house.area_land}</span><span class="popup-spec-label">соток</span></div>`);
    if (house.rooms) specs.push(`<div class="popup-spec"><span class="popup-spec-value">${house.rooms}</span><span class="popup-spec-label">кімн.</span></div>`);
    if (house.floors) specs.push(`<div class="popup-spec"><span class="popup-spec-value">${house.floors}</span><span class="popup-spec-label">пов.</span></div>`);

    const distanceText = house.distance_to_city
      ? `${house.distance_to_city < 1 ? '< 1' : house.distance_to_city < 10 ? house.distance_to_city.toFixed(1) : Math.round(house.distance_to_city)} км до ${house.nearest_city}`
      : '';

    // Use the real photo from the listing
    const photoHtml = house.photo_url
      ? `<div class="popup-img-container" title="Натисніть для перегляду фото"><img class="popup-image" src="${house.photo_url}" alt="${house.title || 'Будинок'}" loading="lazy" onerror="this.style.display='none'" /><div class="popup-img-badge">📷 Галерея</div></div>`
      : '';

    return `
      <div class="house-popup" data-house-id="${house.id}">
        ${photoHtml}
        <div class="popup-body">
          <div class="popup-price">${formattedPopupPrice}</div>
          <div class="popup-location">${house.address || house.city || ''}${distanceText ? ` · ${distanceText}` : ''}</div>
          ${specs.length > 0 ? `<div class="popup-specs">${specs.join('')}</div>` : ''}
          <div class="popup-actions">
            ${Object.entries(STATUS_LABELS).map(([key, label]) => `
              <button
                class="btn ${key === status ? 'btn-primary' : 'btn-ghost'}"
                data-action="status"
                data-house-id="${house.id}"
                data-status="${key}"
                style="${key === status ? `background:${statusColor};border-color:${statusColor}` : ''}"
              >${label}</button>
            `).join('')}
          </div>
          <div class="popup-notes">
            <textarea
              data-action="notes"
              data-house-id="${house.id}"
              placeholder="Нотатки..."
            >${house.crm_notes || ''}</textarea>
          </div>
          ${house.source_url ? `<a class="popup-link" href="${house.source_url}" target="_blank" rel="noopener noreferrer">Відкрити оригінал →</a>` : ''}
        </div>
      </div>
    `;
  }, []);

  // Update markers when houses change
  useEffect(() => {
    if (!clusterGroupRef.current || !mapRef.current) return;

    const cluster = clusterGroupRef.current;
    cluster.clearLayers();
    markersRef.current.clear();

    houses.forEach((house) => {
      const status = house.crm_status || 'new';
      const isRent = house.deal_type === 'rent';
      const displayPrice = isRent
        ? (house.price_uah || (typeof house.price === 'number' ? Math.round(house.price * 41.5) : Math.round(parseFloat(String(house.price).replace(/\s+/g, '')) * 41.5)))
        : (typeof house.price === 'number' ? house.price : parseFloat(String(house.price).replace(/\s+/g, '')) || 0);

      const priceCurrency = isRent ? 'UAH' : 'USD';
      const priceText = formatPriceBubble(displayPrice, priceCurrency);
      const suffix = isRent ? '/м' : '';

      const icon = L.divIcon({
        html: `<div class="price-bubble status-${status}">${priceText}${suffix}</div>`,
        className: 'price-marker',
        iconSize: L.point(0, 0),
        iconAnchor: L.point(0, 20),
      });

      const marker = L.marker([house.latitude, house.longitude], { icon });

      marker.bindPopup(createPopupContent(house), {
        maxWidth: 320,
        minWidth: 280,
        className: 'house-popup-wrapper',
        closeButton: true,
      });

      marker.on('click', () => {
        onHouseSelect(house.id);
      });

      // Handle popup events (status change, notes)
      marker.on('popupopen', () => {
        const popupEl = marker.getPopup()?.getElement();
        if (!popupEl) return;

        // Image click to open gallery
        const imgContainer = popupEl.querySelector('.popup-img-container');
        if (imgContainer) {
          imgContainer.addEventListener('click', () => {
            if (onOpenGallery) onOpenGallery(house, 0);
          });
        }

        // Status buttons
        popupEl.querySelectorAll('[data-action="status"]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const houseId = parseInt(target.dataset.houseId || '0', 10);
            const newStatus = target.dataset.status as CRMStatus;
            if (houseId && newStatus) {
              onStatusChange(houseId, newStatus);
              // Close popup — it will be refreshed when houses state updates
              marker.closePopup();
            }
          });
        });

        // Notes textarea
        const textarea = popupEl.querySelector('[data-action="notes"]') as HTMLTextAreaElement;
        if (textarea) {
          let debounceTimer: ReturnType<typeof setTimeout>;
          textarea.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              const houseId = parseInt(textarea.dataset.houseId || '0', 10);
              if (houseId) {
                onNotesChange(houseId, textarea.value);
              }
            }, 500);
          });
        }
      });

      cluster.addLayer(marker);
      markersRef.current.set(house.id, marker);
    });
  }, [houses, createPopupContent, onHouseSelect, onStatusChange, onNotesChange, onOpenGallery]);

  // Highlight selected house
  useEffect(() => {
    if (!selectedHouseId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedHouseId);
    if (marker) {
      const latlng = marker.getLatLng();
      mapRef.current.flyTo(latlng, 14, { duration: 0.5 });
      // Find the house to create fresh popup content
      const house = houses.find(h => h.id === selectedHouseId);
      if (house) {
        marker.setPopupContent(createPopupContent(house));
      }
      marker.openPopup();
    }
  }, [selectedHouseId, houses, createPopupContent]);

  const handleSelectStyle = (id: MapStyleId) => {
    setMapStyle(id);
    setIsStyleMenuOpen(false);
    try {
      localStorage.setItem('findhome_map_style', id);
    } catch {
      // ignore
    }
  };

  const currentStyleConfig = MAP_STYLES.find(s => s.id === mapStyle) || MAP_STYLES[0];
  const TriggerIcon = currentStyleConfig.icon;

  return (
    <div className="map-container">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Map Style Switcher */}
      <div className="map-style-switcher-wrap" ref={switcherRef}>
        <button
          type="button"
          className={`map-style-trigger ${isStyleMenuOpen ? 'active' : ''}`}
          onClick={() => setIsStyleMenuOpen(prev => !prev)}
          title="Змінити вигляд карти"
          aria-expanded={isStyleMenuOpen}
        >
          <span className="map-style-trigger-icon-wrap">
            <TriggerIcon size={16} className="map-style-trigger-icon" />
          </span>
          <span className="map-style-trigger-text">{currentStyleConfig.name.split(' ')[0]}</span>
          <ChevronDown size={14} className="map-style-chevron" />
        </button>

        {isStyleMenuOpen && (
          <div className="map-style-dropdown">
            <div className="map-style-dropdown-header">
              <div className="map-style-header-title-wrap">
                <Layers size={15} className="map-style-header-icon" />
                <span className="map-style-dropdown-title">Стилі карти</span>
              </div>
              <button
                type="button"
                className="map-style-close-btn"
                onClick={() => setIsStyleMenuOpen(false)}
                title="Закрити"
              >
                <X size={15} />
              </button>
            </div>
            <div className="map-style-list">
              {MAP_STYLES.map((st) => {
                const isSelected = mapStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    className={`map-style-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectStyle(st.id)}
                  >
                    {st.thumbnail}
                    <div className="map-style-card-info">
                      <span className="map-style-card-title">{st.name}</span>
                    </div>
                    {isSelected && (
                      <div className="map-style-check">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
