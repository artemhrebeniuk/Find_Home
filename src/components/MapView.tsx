'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { HouseWithCRM, CRMStatus } from '@/lib/types';
import { formatPriceBubble } from '@/lib/geo';

interface MapViewProps {
  houses: HouseWithCRM[];
  selectedHouseId: number | null;
  onHouseSelect: (id: number) => void;
  onStatusChange: (id: number, status: CRMStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
  mapCenter?: [number, number];
  mapZoom?: number;
  mapBounds?: { sw: [number, number]; ne: [number, number] } | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  favorite: '#F59E0B',
  call: '#8B5CF6',
  viewing: '#10B981',
  archived: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Нове',
  favorite: 'Обране',
  call: 'Зателефонувати',
  viewing: 'Перегляд',
  archived: 'Архів',
};

export default function MapView({
  houses,
  selectedHouseId,
  onHouseSelect,
  onStatusChange,
  onNotesChange,
  mapCenter = [48.9, 31.2],
  mapZoom = 6,
  mapBounds,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark-themed tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const statusLabel = STATUS_LABELS[status];
    const statusColor = STATUS_COLORS[status];

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
      ? `<img class="popup-image" src="${house.photo_url}" alt="${house.title || 'Будинок'}" loading="lazy" onerror="this.style.display='none'" />`
      : '';

    return `
      <div class="house-popup" data-house-id="${house.id}">
        ${photoHtml}
        <div class="popup-body">
          <div class="popup-price">$${house.price.toLocaleString()}${house.deal_type === 'rent' ? '/міс' : ''}</div>
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
      const priceText = formatPriceBubble(house.price, house.currency);
      const suffix = house.deal_type === 'rent' ? '/м' : '';

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
  }, [houses, createPopupContent, onHouseSelect, onStatusChange, onNotesChange]);

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

  return (
    <div className="map-container">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
