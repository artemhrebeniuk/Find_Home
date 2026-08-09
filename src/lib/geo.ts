// === Geo module: Ukraine cities + Haversine distance ===

import type { UkraineRegion, UkraineCity } from './types';

// All 24 oblasts + Kyiv city (excluding occupied territories for safety)
export const REGIONS: UkraineRegion[] = [
  { id: 1, name: 'Вінницька', name_en: 'Vinnytsia', center: 'Вінниця', lat: 49.2331, lng: 28.4682, domria_id: 1, bounds: { sw: [48.2, 27.6], ne: [50.2, 30.0] } },
  { id: 2, name: 'Волинська', name_en: 'Volyn', center: 'Луцьк', lat: 50.7472, lng: 25.3254, domria_id: 2, bounds: { sw: [50.2, 23.5], ne: [51.8, 26.2] } },
  { id: 3, name: 'Дніпропетровська', name_en: 'Dnipropetrovsk', center: 'Дніпро', lat: 48.4647, lng: 35.0462, domria_id: 3, bounds: { sw: [47.6, 33.2], ne: [49.4, 36.8] } },
  { id: 4, name: 'Житомирська', name_en: 'Zhytomyr', center: 'Житомир', lat: 50.2547, lng: 28.6587, domria_id: 4, bounds: { sw: [49.5, 27.0], ne: [51.6, 30.5] } },
  { id: 5, name: 'Закарпатська', name_en: 'Zakarpattia', center: 'Ужгород', lat: 48.6208, lng: 22.2879, domria_id: 5, bounds: { sw: [47.9, 22.1], ne: [49.1, 24.6] } },
  { id: 6, name: 'Запорізька', name_en: 'Zaporizhzhia', center: 'Запоріжжя', lat: 47.8388, lng: 35.1396, domria_id: 6, bounds: { sw: [46.6, 33.6], ne: [48.2, 36.8] } },
  { id: 7, name: 'Івано-Франківська', name_en: 'Ivano-Frankivsk', center: 'Івано-Франківськ', lat: 48.9226, lng: 24.7111, domria_id: 7, bounds: { sw: [48.1, 23.5], ne: [49.4, 25.5] } },
  { id: 8, name: 'Київська', name_en: 'Kyiv Oblast', center: 'Київ', lat: 50.4501, lng: 30.5234, domria_id: 8, bounds: { sw: [49.2, 29.2], ne: [51.6, 32.2] } },
  { id: 9, name: 'Кіровоградська', name_en: 'Kirovohrad', center: 'Кропивницький', lat: 48.5079, lng: 32.2623, domria_id: 9, bounds: { sw: [47.8, 30.7], ne: [49.5, 33.7] } },
  { id: 10, name: 'Львівська', name_en: 'Lviv', center: 'Львів', lat: 49.8397, lng: 24.0297, domria_id: 10, bounds: { sw: [48.8, 22.6], ne: [50.5, 25.4] } },
  { id: 11, name: 'Миколаївська', name_en: 'Mykolaiv', center: 'Миколаїв', lat: 46.9750, lng: 31.9946, domria_id: 11, bounds: { sw: [46.2, 30.3], ne: [48.2, 33.5] } },
  { id: 12, name: 'Одеська', name_en: 'Odesa', center: 'Одеса', lat: 46.4825, lng: 30.7233, domria_id: 12, bounds: { sw: [45.2, 28.2], ne: [48.2, 31.8] } },
  { id: 13, name: 'Полтавська', name_en: 'Poltava', center: 'Полтава', lat: 49.5883, lng: 34.5514, domria_id: 13, bounds: { sw: [48.7, 32.7], ne: [50.5, 36.2] } },
  { id: 14, name: 'Рівненська', name_en: 'Rivne', center: 'Рівне', lat: 50.6199, lng: 26.2516, domria_id: 14, bounds: { sw: [50.0, 25.0], ne: [51.8, 27.6] } },
  { id: 15, name: 'Сумська', name_en: 'Sumy', center: 'Суми', lat: 50.9077, lng: 34.7981, domria_id: 15, bounds: { sw: [50.0, 32.5], ne: [52.4, 36.5] } },
  { id: 16, name: 'Тернопільська', name_en: 'Ternopil', center: 'Тернопіль', lat: 49.5535, lng: 25.5948, domria_id: 16, bounds: { sw: [48.7, 24.6], ne: [50.1, 26.6] } },
  { id: 17, name: 'Харківська', name_en: 'Kharkiv', center: 'Харків', lat: 49.9935, lng: 36.2304, domria_id: 17, bounds: { sw: [48.9, 34.6], ne: [50.6, 37.6] } },
  { id: 18, name: 'Херсонська', name_en: 'Kherson', center: 'Херсон', lat: 46.6354, lng: 32.6169, domria_id: 18, bounds: { sw: [45.8, 31.5], ne: [47.6, 35.0] } },
  { id: 19, name: 'Хмельницька', name_en: 'Khmelnytskyi', center: 'Хмельницький', lat: 49.4230, lng: 26.9871, domria_id: 19, bounds: { sw: [48.6, 25.5], ne: [50.3, 28.6] } },
  { id: 20, name: 'Черкаська', name_en: 'Cherkasy', center: 'Черкаси', lat: 49.4444, lng: 32.0598, domria_id: 20, bounds: { sw: [48.5, 30.3], ne: [50.0, 33.2] } },
  { id: 21, name: 'Чернівецька', name_en: 'Chernivtsi', center: 'Чернівці', lat: 48.2920, lng: 25.9358, domria_id: 21, bounds: { sw: [47.7, 24.8], ne: [48.8, 27.1] } },
  { id: 22, name: 'Чернігівська', name_en: 'Chernihiv', center: 'Чернігів', lat: 51.4982, lng: 31.2893, domria_id: 22, bounds: { sw: [50.5, 30.0], ne: [52.4, 33.6] } },
  { id: 23, name: 'м. Київ', name_en: 'Kyiv City', center: 'Київ', lat: 50.4501, lng: 30.5234, domria_id: 23, bounds: { sw: [50.2, 30.2], ne: [50.6, 30.9] } },
];

// Major cities for distance calculation
export const MAJOR_CITIES: UkraineCity[] = [
  { name: 'Київ', lat: 50.4501, lng: 30.5234, region_id: 8 },
  { name: 'Харків', lat: 49.9935, lng: 36.2304, region_id: 17 },
  { name: 'Одеса', lat: 46.4825, lng: 30.7233, region_id: 12 },
  { name: 'Дніпро', lat: 48.4647, lng: 35.0462, region_id: 3 },
  { name: 'Львів', lat: 49.8397, lng: 24.0297, region_id: 10 },
  { name: 'Запоріжжя', lat: 47.8388, lng: 35.1396, region_id: 6 },
  { name: 'Вінниця', lat: 49.2331, lng: 28.4682, region_id: 1 },
  { name: 'Полтава', lat: 49.5883, lng: 34.5514, region_id: 13 },
  { name: 'Чернігів', lat: 51.4982, lng: 31.2893, region_id: 22 },
  { name: 'Черкаси', lat: 49.4444, lng: 32.0598, region_id: 20 },
  { name: 'Суми', lat: 50.9077, lng: 34.7981, region_id: 15 },
  { name: 'Житомир', lat: 50.2547, lng: 28.6587, region_id: 4 },
  { name: 'Кропивницький', lat: 48.5079, lng: 32.2623, region_id: 9 },
  { name: 'Рівне', lat: 50.6199, lng: 26.2516, region_id: 14 },
  { name: 'Хмельницький', lat: 49.4230, lng: 26.9871, region_id: 19 },
  { name: 'Тернопіль', lat: 49.5535, lng: 25.5948, region_id: 16 },
  { name: 'Івано-Франківськ', lat: 48.9226, lng: 24.7111, region_id: 7 },
  { name: 'Луцьк', lat: 50.7472, lng: 25.3254, region_id: 2 },
  { name: 'Ужгород', lat: 48.6208, lng: 22.2879, region_id: 5 },
  { name: 'Миколаїв', lat: 46.9750, lng: 31.9946, region_id: 11 },
  { name: 'Херсон', lat: 46.6354, lng: 32.6169, region_id: 18 },
  { name: 'Чернівці', lat: 48.2920, lng: 25.9358, region_id: 21 },
  { name: 'Біла Церква', lat: 49.7958, lng: 30.1090, region_id: 8 },
  { name: 'Бориспіль', lat: 50.3533, lng: 30.9550, region_id: 8 },
  { name: 'Ірпінь', lat: 50.5218, lng: 30.2530, region_id: 8 },
  { name: 'Буча', lat: 50.5479, lng: 30.2150, region_id: 8 },
  { name: 'Кременчук', lat: 49.0665, lng: 33.4207, region_id: 13 },
  { name: 'Мукачево', lat: 48.4414, lng: 22.7178, region_id: 5 },
];

/**
 * Haversine formula — calculate distance between two points on Earth
 * Returns distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Find nearest major city to given coordinates
 */
export function findNearestCity(lat: number, lng: number): { city: string; distance: number } {
  let minDist = Infinity;
  let nearestCity = MAJOR_CITIES[0].name;

  for (const city of MAJOR_CITIES) {
    const dist = haversineDistance(lat, lng, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      nearestCity = city.name;
    }
  }

  return { city: nearestCity, distance: minDist };
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) return '< 1 км';
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  if (currency === 'UAH') {
    if (price >= 1_000_000) return `₴${(price / 1_000_000).toFixed(1)}M`;
    if (price >= 1_000) return `₴${Math.round(price / 1_000)}K`;
    return `₴${price}`;
  }
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${Math.round(price / 1_000).toLocaleString()}`;
  return `$${price}`;
}

/**
 * Format price for map bubble (short version)
 */
export function formatPriceBubble(price: number, currency: string = 'USD'): string {
  const sym = currency === 'UAH' ? '₴' : '$';
  if (price >= 1_000_000) return `${sym}${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${sym}${Math.round(price / 1_000)}K`;
  return `${sym}${price}`;
}

/**
 * Ukraine bounds for initial map view
 */
export const UKRAINE_BOUNDS = {
  center: [48.9, 31.2] as [number, number],
  zoom: 6,
  sw: [44.3, 22.0] as [number, number],
  ne: [52.4, 40.2] as [number, number],
};
