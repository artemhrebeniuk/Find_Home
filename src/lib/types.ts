// === TypeScript Types for Find Home ===

export interface House {
  id: number;
  external_id: string;
  source: string;
  deal_type: 'sale' | 'rent';
  title: string | null;
  description: string | null;
  price: number;
  currency: string;
  price_uah: number | null;
  latitude: number;
  longitude: number;
  region: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  area_total: number | null;
  area_land: number | null;
  rooms: number | null;
  floors: number | null;
  year_built: number | null;
  photo_url: string | null;
  photos: string | null; // JSON array of URLs
  source_url: string | null;
  nearest_city: string | null;
  distance_to_city: number | null;
  created_at: string;
  updated_at: string;
  is_active: number;
}

export type CRMStatus = 'new' | 'favorite' | 'call' | 'viewing' | 'archived';

export interface HouseCRM {
  id: number;
  house_id: number;
  status: CRMStatus;
  notes: string;
  updated_at: string;
}

export interface HouseWithCRM extends House {
  crm_status: CRMStatus | null;
  crm_notes: string | null;
}

export interface SearchFilters {
  deal_type?: 'sale' | 'rent';
  region?: string;
  city?: string;
  price_min?: number;
  price_max?: number;
  currency?: string;
  status?: CRMStatus[];
  bounds?: {
    sw_lat: number;
    sw_lng: number;
    ne_lat: number;
    ne_lng: number;
  };
  sort?: 'price_asc' | 'price_desc' | 'distance' | 'date';
}

export interface UkraineRegion {
  id: number;
  name: string;
  name_en: string;
  center: string;
  lat: number;
  lng: number;
  domria_id: number;
  bounds: {
    sw: [number, number];
    ne: [number, number];
  };
}

export interface UkraineCity {
  name: string;
  lat: number;
  lng: number;
  region_id: number;
}

import { Sparkles, Star, Phone, Calendar, Archive } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const CRM_STATUSES: Record<CRMStatus, { label: string; icon: LucideIcon; color: string }> = {
  new: { label: 'Нове', icon: Sparkles, color: '#3B82F6' },
  favorite: { label: 'Обране', icon: Star, color: '#F59E0B' },
  call: { label: 'Зателефонувати', icon: Phone, color: '#8B5CF6' },
  viewing: { label: 'Перегляд', icon: Calendar, color: '#10B981' },
  archived: { label: 'Архів', icon: Archive, color: '#6B7280' },
};
