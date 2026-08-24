// === Geo module: Ukraine cities + Haversine distance ===

import type { UkraineRegion, UkraineCity } from './types';
import { UKRAINE_SETTLEMENTS } from './settlementsData';

/**
 * List of all 24 oblasts + Kyiv city (excluding occupied territories for safety).
 * Used for dropdown filtering and geocoding bounds logic.
 */
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

/**
 * Major cities in Ukraine used as anchor points.
 * Used to calculate the nearest city and distance for rural properties.
 */
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
  // Дніпропетровська
  { name: 'Кривий Ріг', lat: 47.9105, lng: 33.3918, region_id: 3 },
  { name: 'Кам\'янське', lat: 48.5167, lng: 34.6, region_id: 3 },
  { name: 'Нікополь', lat: 47.5675, lng: 34.3948, region_id: 3 },
  { name: 'Павлоград', lat: 48.5333, lng: 35.8667, region_id: 3 },
  { name: 'Новомосковськ', lat: 48.6333, lng: 35.2167, region_id: 3 },
  { name: 'Царичанка', lat: 48.9417, lng: 34.4833, region_id: 3 },
  // Київська
  { name: 'Біла Церква', lat: 49.7958, lng: 30.1090, region_id: 8 },
  { name: 'Бориспіль', lat: 50.3533, lng: 30.9550, region_id: 8 },
  { name: 'Ірпінь', lat: 50.5218, lng: 30.2530, region_id: 8 },
  { name: 'Буча', lat: 50.5479, lng: 30.2150, region_id: 8 },
  { name: 'Бровари', lat: 50.5114, lng: 30.7903, region_id: 8 },
  { name: 'Боярка', lat: 50.3292, lng: 30.2972, region_id: 8 },
  { name: 'Вишневе', lat: 50.3889, lng: 30.3708, region_id: 8 },
  { name: 'Васильків', lat: 50.1783, lng: 30.3167, region_id: 8 },
  { name: 'Обухів', lat: 50.1167, lng: 30.6333, region_id: 8 },
  { name: 'Фастів', lat: 50.0833, lng: 29.9167, region_id: 8 },
  { name: 'Переяслав', lat: 50.0667, lng: 31.45, region_id: 8 },
  { name: 'Софіївська Борщагівка', lat: 50.41, lng: 30.37, region_id: 8 },
  { name: 'Святопетрівське', lat: 50.39, lng: 30.32, region_id: 8 },
  { name: 'Петропавлівська Борщагівка', lat: 50.43, lng: 30.33, region_id: 8 },
  { name: 'Новосілки', lat: 50.36, lng: 30.45, region_id: 8 },
  { name: 'Гатне', lat: 50.36, lng: 30.39, region_id: 8 },
  { name: 'Хотів', lat: 50.33, lng: 30.47, region_id: 8 },
  { name: 'Козин', lat: 50.22, lng: 30.67, region_id: 8 },
  { name: 'Ворзель', lat: 50.55, lng: 30.15, region_id: 8 },
  { name: 'Гостомель', lat: 50.57, lng: 30.27, region_id: 8 },
  // Одеська
  { name: 'Чорноморськ', lat: 46.3014, lng: 30.6567, region_id: 12 },
  { name: 'Ізмаїл', lat: 45.35, lng: 28.8333, region_id: 12 },
  { name: 'Білгород-Дністровський', lat: 46.1833, lng: 30.3333, region_id: 12 },
  { name: 'Грибівка', lat: 46.2, lng: 30.58, region_id: 12 },
  { name: 'Затока', lat: 46.06, lng: 30.45, region_id: 12 },
  { name: 'Кароліно-Бугаз', lat: 46.14, lng: 30.52, region_id: 12 },
  // Львівська
  { name: 'Дрогобич', lat: 49.35, lng: 23.5, region_id: 10 },
  { name: 'Стрий', lat: 49.25, lng: 23.85, region_id: 10 },
  { name: 'Трускавець', lat: 49.2786, lng: 23.5042, region_id: 10 },
  { name: 'Червоноград', lat: 50.3833, lng: 24.2333, region_id: 10 },
  { name: 'Самбір', lat: 49.5167, lng: 23.2, region_id: 10 },
  // Полтавська
  { name: 'Кременчук', lat: 49.0665, lng: 33.4207, region_id: 13 },
  { name: 'Миргород', lat: 49.9667, lng: 33.6, region_id: 13 },
  { name: 'Лубни', lat: 50.0167, lng: 33.0, region_id: 13 },
  // Закарпатська
  { name: 'Мукачево', lat: 48.4414, lng: 22.7178, region_id: 5 },
  { name: 'Хуст', lat: 48.1833, lng: 23.3, region_id: 5 },
  { name: 'Берегове', lat: 48.2, lng: 22.65, region_id: 5 },
  // Івано-Франківська
  { name: 'Калуш', lat: 49.0333, lng: 24.3667, region_id: 7 },
  { name: 'Коломия', lat: 48.5333, lng: 25.0333, region_id: 7 },
  { name: 'Яремче', lat: 48.45, lng: 24.55, region_id: 7 },
  // Миколаївська
  { name: 'Очаків', lat: 46.6139, lng: 31.5489, region_id: 11 },
  { name: 'Первомайськ', lat: 48.05, lng: 30.85, region_id: 11 },
  { name: 'Вознесенськ', lat: 47.5667, lng: 31.3333, region_id: 11 },
  // Черкаська
  { name: 'Умань', lat: 48.75, lng: 30.2167, region_id: 20 },
  { name: 'Сміла', lat: 49.2167, lng: 31.8667, region_id: 20 },
  // Волинська
  { name: 'Ковель', lat: 51.2167, lng: 24.7167, region_id: 2 },
  { name: 'Нововолинськ', lat: 50.7333, lng: 24.1667, region_id: 2 },
  // Чернігівська
  { name: 'Ніжин', lat: 51.05, lng: 31.8833, region_id: 22 },
  { name: 'Прилуки', lat: 50.6, lng: 32.3833, region_id: 22 },
  // Житомирська
  { name: 'Бердичів', lat: 49.8833, lng: 28.5833, region_id: 4 },
  { name: 'Коростень', lat: 50.95, lng: 28.6333, region_id: 4 },
  { name: 'Новоград-Волинський', lat: 50.5833, lng: 27.6333, region_id: 4 },
  // Хмельницька
  { name: 'Кам\'янець-Подільський', lat: 48.6833, lng: 26.5833, region_id: 19 },
  { name: 'Шепетівка', lat: 50.1833, lng: 27.0667, region_id: 19 },
  // Рівненська
  { name: 'Дубно', lat: 50.4167, lng: 25.75, region_id: 14 },
  { name: 'Сарни', lat: 51.3333, lng: 26.6, region_id: 14 },
  { name: 'Вараш', lat: 51.35, lng: 25.85, region_id: 14 },
  // Сумська
  { name: 'Конотоп', lat: 51.2333, lng: 33.2, region_id: 15 },
  { name: 'Шостка', lat: 51.8667, lng: 33.4833, region_id: 15 },
  { name: 'Охтирка', lat: 50.3167, lng: 34.9, region_id: 15 },
  // Кіровоградська
  { name: 'Олександрія', lat: 48.6667, lng: 33.1167, region_id: 9 },
  { name: 'Світловодськ', lat: 49.05, lng: 33.2333, region_id: 9 },
];

/**
 * Haversine formula to calculate the great-circle distance between two points on a sphere.
 * 
 * @param {number} lat1 - Latitude of the first point
 * @param {number} lng1 - Longitude of the first point
 * @param {number} lat2 - Latitude of the second point
 * @param {number} lng2 - Longitude of the second point
 * @returns {number} Distance in kilometers, rounded to 1 decimal place
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

// === Ukrainian Raions & Keywords to Oblast Mapping ===
const RAION_TO_OBLAST: Record<string, string> = {
  // Київська
  'обухів': 'Київська', 'бориспіль': 'Київська', 'бучан': 'Київська', 'бровар': 'Київська',
  'фастів': 'Київська', 'білоцерк': 'Київська', 'вишгород': 'Київська', 'києво-святошин': 'Київська',
  'васильків': 'Київська', 'макарів': 'Київська', 'іванків': 'Київська', 'кагарлиц': 'Київська',
  'сквир': 'Київська', 'бородян': 'Київська', 'баришив': 'Київська', 'переяслав': 'Київська',
  'рокитн': 'Київська', 'згурів': 'Київська', 'яготин': 'Київська', 'таращ': 'Київська',
  'богуслав': 'Київська', 'володар': 'Київська', 'ставищ': 'Київська', 'ірпін': 'Київська',
  'ходосів': 'Київська', 'хотянів': 'Київська', 'зазим': 'Київська', 'козин': 'Київська',
  'гнідин': 'Київська', 'вишеньк': 'Київська', 'проців': 'Київська', 'білогород': 'Київська',
  'софіївськ': 'Київська', 'петропавлівськ': 'Київська', 'святопетрівськ': 'Київська',
  'крюківщин': 'Київська', 'гатне': 'Київська', 'хотів': 'Київська', 'чабан': 'Київська',
  'віта-пошт': 'Київська', 'юрівк': 'Київська', 'тарасівк': 'Київська', 'ворзель': 'Київська',
  'гостомель': 'Київська', 'михайлівк.-рубеж': 'Київська', 'дмитрівк': 'Київська',
  // Одеська
  'одеськ': 'Одеська', 'білгород-дністров': 'Одеська', 'ізмаїл': 'Одеська', 'подільськ': 'Одеська',
  'роздільнян': 'Одеська', 'болград': 'Одеська', 'березів': 'Одеська', 'овідіопол': 'Одеська',
  'овидиопол': 'Одеська', 'фонтанк': 'Одеська', 'крижанів': 'Одеська', 'крижанов': 'Одеська',
  'таїров': 'Одеська', 'таиров': 'Одеська', 'совіньйон': 'Одеська', 'совиньон': 'Одеська',
  'заток': 'Одеська', 'кароліно-бугаз': 'Одеська', 'грибівк': 'Одеська', 'санжійк': 'Одеська',
  'чорноморськ': 'Одеська', 'южне': 'Одеська', 'усатов': 'Одеська', 'нерубайськ': 'Одеська',
  // Львівська
  'львівськ': 'Львівська', 'дрогобиц': 'Львівська', 'стрийськ': 'Львівська', 'самбір': 'Львівська',
  'золочів': 'Львівська', 'червоноград': 'Львівська', 'шептицьк': 'Львівська', 'яворів': 'Львівська',
  'брюхович': 'Львівська', 'винник': 'Львівська', 'сокільник': 'Львівська', 'сокольник': 'Львівська',
  'зимн. вод': 'Львівська', 'солонк': 'Львівська', 'пустомит': 'Львівська', 'трускавец': 'Львівська',
  'моршин': 'Львівська', 'славськ': 'Львівська', 'славско': 'Львівська',
  // Харківська
  'харківськ': 'Харківська', 'богодухів': 'Харківська', 'ізюмськ': 'Харківська', 'красноград': 'Харківська',
  'берестин': 'Харківська', 'куп\'янськ': 'Харківська', 'лозівськ': 'Харківська', 'чугуїв': 'Харківська',
  'дергач': 'Харківська', 'бабаї': 'Харківська', 'бабаи': 'Харківська', 'пісочин': 'Харківська',
  'песочин': 'Харківська', 'покотилів': 'Харківська', 'люботин': 'Харківська', 'мереф': 'Харківська',
  // Дніпропетровська
  'дніпровськ': 'Дніпропетровська', 'кам\'янськ': 'Дніпропетровська', 'криворіз': 'Дніпропетровська',
  'нікополь': 'Дніпропетровська', 'новомосков': 'Дніпропетровська', 'самарів': 'Дніпропетровська',
  'павлоград': 'Дніпропетровська', 'синельник': 'Дніпропетровська', 'царичан': 'Дніпропетровська',
  'підгородн': 'Дніпропетровська', 'обухівк': 'Дніпропетровська', 'слобожанськ': 'Дніпропетровська',
  // Закарпатська
  'ужгород': 'Закарпатська', 'мукачів': 'Закарпатська', 'берегів': 'Закарпатська',
  'хустськ': 'Закарпатська', 'тячів': 'Закарпатська', 'рахів': 'Закарпатська', 'перечин': 'Закарпатська',
  'дубринич': 'Закарпатська', 'дубрынич': 'Закарпатська', 'сваляв': 'Закарпатська', 'полян': 'Закарпатська',
  'шаян': 'Закарпатська', 'солотвин': 'Закарпатська', 'іршав': 'Закарпатська', 'воловец': 'Закарпатська',
  // Вінницька
  'вінницьк': 'Вінницька', 'гайсин': 'Вінницька', 'жмерин': 'Вінницька', 'могилів-поділь': 'Вінницька',
  'тульчин': 'Вінницька', 'хмільник': 'Вінницька', 'іллінц': 'Вінницька', 'барськ': 'Вінницька',
  'немирів': 'Вінницька', 'козятин': 'Вінницька', 'ладижин': 'Вінницька', 'калинівк': 'Вінницька',
  // Миколаївська
  'миколаївськ': 'Миколаївська', 'баштан': 'Миколаївська', 'вознесен': 'Миколаївська', 'первомайськ': 'Миколаївська',
  'прибужан': 'Миколаївська', 'южноукраїнськ': 'Миколаївська', 'очаків': 'Миколаївська', 'коблев': 'Миколаївська',
  // Полтавська
  'полтавськ': 'Полтавська', 'кременчуц': 'Полтавська', 'лубенськ': 'Полтавська', 'миргород': 'Полтавська',
  'валок': 'Полтавська', 'горішні плав': 'Полтавська', 'пирятин': 'Полтавська', 'гадяч': 'Полтавська',
  // Черкаська
  'черкаськ': 'Черкаська', 'уманськ': 'Черкаська', 'звенигород': 'Черкаська', 'золотон': 'Черкаська',
  'канів': 'Черкаська', 'канев': 'Черкаська', 'сміл': 'Черкаська', 'смел': 'Черкаська', 'чигирин': 'Черкаська',
  // Житомирська
  'житомирськ': 'Житомирська', 'бердичів': 'Житомирська', 'коростен': 'Житомирська', 'звягель': 'Житомирська',
  'новоград': 'Житомирська', 'брусилів': 'Житомирська', 'брусилов': 'Житомирська', 'малин': 'Житомирська',
  'коростишів': 'Житомирська', 'радомишль': 'Житомирська',
  // Хмельницька
  'хмельницьк': 'Хмельницька', 'кам\'янець-поділь': 'Хмельницька', 'шепетів': 'Хмельницька',
  'нетішин': 'Хмельницька', 'славут': 'Хмельницька', 'старокостянтинів': 'Хмельницька',
  // Тернопільська
  'тернопільськ': 'Тернопільська', 'кременец': 'Тернопільська', 'чортків': 'Тернопільська', 'бережан': 'Тернопільська',
  // Івано-Франківська
  'івано-франківськ': 'Івано-Франківська', 'калуськ': 'Івано-Франківська', 'коломий': 'Івано-Франківська',
  'косівськ': 'Івано-Франківська', 'надвірнян': 'Івано-Франківська', 'верховин': 'Івано-Франківська',
  'яремч': 'Івано-Франківська', 'буковел': 'Івано-Франківська', 'поляниц': 'Івано-Франківська',
  'ворохт': 'Івано-Франківська', 'вербовец': 'Івано-Франківська',
  // Волинська
  'луцьк': 'Волинська', 'володимир': 'Волинська', 'ковель': 'Волинська', 'камінь-кашир': 'Волинська',
  'нововолинськ': 'Волинська', 'шацьк': 'Волинська',
  // Рівненська
  'рівненськ': 'Рівненська', 'вараськ': 'Рівненська', 'дубенськ': 'Рівненська', 'сарнен': 'Рівненська',
  'костопіль': 'Рівненська', 'острог': 'Рівненська',
  // Чернівецька
  'чернівецьк': 'Чернівецька', 'вижниц': 'Чернівецька', 'дністровськ': 'Чернівецька', 'кіцман': 'Чернівецька',
  'сторожинец': 'Чернівецька', 'хотин': 'Чернівецька',
  // Чернігівська
  'чернігівськ': 'Чернігівська', 'корюків': 'Чернігівська', 'ніжинськ': 'Чернігівська',
  'новгород-сівер': 'Чернігівська', 'прилуц': 'Чернігівська', 'бахмач': 'Чернігівська',
  // Сумська
  'сумськ': 'Сумська', 'конотоп': 'Сумська', 'охтир': 'Сумська', 'роменськ': 'Сумська',
  'шосткин': 'Сумська', 'тростянец': 'Сумська', 'лебедин': 'Сумська', 'глухів': 'Сумська',
  // Кіровоградська
  'кропивницьк': 'Кіровоградська', 'голованів': 'Кіровоградська', 'новоукраїн': 'Кіровоградська',
  'олександрій': 'Кіровоградська', 'світловод': 'Кіровоградська', 'знам\'янк': 'Кіровоградська',
  // Запорізька
  'запорізьк': 'Запорізька', 'бердянськ': 'Запорізька', 'василівськ': 'Запорізька',
  'мелітополь': 'Запорізька', 'пологів': 'Запорізька', 'енергодар': 'Запорізька',
  // Херсонська
  'херсонськ': 'Херсонська', 'берислав': 'Херсонська', 'генічеськ': 'Херсонська',
  'каховськ': 'Херсонська', 'скадовськ': 'Херсонська', 'олешк': 'Херсонська',
};

// Common Russian to Ukrainian phonetic map for Ukrainian geographical names
const RU_TO_UA_SETTLEMENTS: Record<string, string> = {
  'ирпень': 'Ірпінь', 'одесса': 'Одеса', 'днепр': 'Дніпро', 'днепропетровск': 'Дніпро',
  'дубрыничи': 'Дубриничі', 'прибужаны': 'Прибужани', 'зазимье': 'Зазимʼя',
  'гнедин': 'Гнідин', 'белогородка': 'Білогородка', 'бабаи': 'Бабаї', 'вербовец': 'Вербовець',
  'валок': 'Валок', 'павлоград': 'Павлоград', 'бровары': 'Бровари', 'киев': 'Київ',
  'винница': 'Вінниця', 'харьков': 'Харків', 'львов': 'Львів', 'запорожье': 'Запоріжжя',
  'житомир': 'Житомир', 'черкассы': 'Черкаси', 'черновцы': 'Чернівці', 'чернигов': 'Чернігів',
  'николаев': 'Миколаїв', 'херсон': 'Херсон', 'полтава': 'Полтава', 'сумы': 'Суми',
  'ровно': 'Рівне', 'луцк': 'Луцьк', 'ужгород': 'Ужгород', 'хмельницкий': 'Хмельницький',
  'тернополь': 'Тернопіль', 'кропивницкий': 'Кропивницький', 'ивано-франковск': 'Івано-Франківськ',
  'жмеринка': 'Жмеринка', 'канев': 'Канів', 'фонтанка': 'Фонтанка', 'троица': 'Трійця',
  'обухов': 'Обухів', 'борисполь': 'Бориспіль', 'буча': 'Буча', 'васильков': 'Васильків',
  'фастов': 'Фастів', 'белая церковь': 'Біла Церква', 'вышгород': 'Вишгород', 'боярка': 'Боярка',
  'вишневое': 'Вишневе', 'гостомель': 'Гостомель', 'ворзель': 'Ворзель', 'ходосовка': 'Ходосівка',
  'гореничи': 'Гореничі', 'лебедевка': 'Лебедівка', 'хотяновка': 'Хотянівка', 'новоселки': 'Новосілки',
  'осещина': 'Осещина', 'новые безрадичи': 'Нові Безрадичі', 'старые петровцы': 'Старі Петрівці',
  'новые петровцы': 'Нові Петрівці', 'лютеж': 'Лютіж', 'козин': 'Козин',
  'петропавловская борщаговка': 'Петропавлівська Борщагівка',
  'софиевская борщаговка': 'Софіївська Борщагівка', 'святопетровское': 'Святопетрівське',
  'крюковщина': 'Крюківщина', 'гатное': 'Гатне', 'хотов': 'Хотів', 'чабаны': 'Чабани',
  'вита-почтовая': 'Віта-Поштова', 'юровка': 'Юрівка', 'тарасовка': 'Тарасівка',
  'дмитровка': 'Дмитрівка', 'милая': 'Мила', 'чайки': 'Чайки', 'княжичи': 'Княжичі',
  'музычи': 'Музичі', 'бобрица': 'Бобриця', 'мархалевка': 'Мархалівка', 'иванковичи': 'Іванковичі',
  'калиновка': 'Калинівка', 'вишенки': 'Вишеньки', 'процев': 'Проців', 'чубинское': 'Чубинське',
  'гора': 'Гора', 'счастливое': 'Щасливе', 'красиловка': 'Красилівка', 'требухов': 'Требухів',
  'скибин': 'Скибин', 'рожевка': 'Рожівка', 'пуховка': 'Пухівка', 'рожны': 'Рожни',
  'подгородное': 'Підгородне', 'обуховка': 'Обухівка', 'слобожанское': 'Слобожанське',
  'новоалександровка': 'Новоолександрівка', 'песчанка': 'Піщанка', 'орловщина': 'Орлівщина',
  'брюховичи': 'Брюховичі', 'винники': 'Винники', 'сокольники': 'Сокільники',
  'покров': 'Покров', 'южный': 'Южне', 'каменец-подольский': 'Кам\'янець-Подільський',
  'шепетовка': 'Шепетівка', 'бердичев': 'Бердичів', 'коростышев': 'Коростишів',
  'нежин': 'Ніжин', 'ахтырка': 'Охтирка', 'ромны': 'Ромни', 'глухов': 'Глухів',
  'александрия': 'Олександрія', 'светловодск': 'Світловодськ', 'знаменка': 'Знам\'янка',
  'бердянск': 'Бердянськ', 'мелитополь': 'Мелітополь', 'энергодар': 'Енергодар',
  'владимировское': 'Володимирівське', 'коломыя': 'Коломия'
};

/**
 * Normalizes settlement names for accurate matching (strips prefixes, standardizes apostrophes, translates Russian spellings).
 */
export function normalizeSettlementName(str: string): string {
  if (!str) return '';
  const cleaned = str
    .replace(/[’‘ʼ`']/g, "'")
    .replace(/^(м\.|с\.|смт\.|с-ще|село|місто|пос\.|поселок|селище)\s+/i, '')
    .trim();
  const lower = cleaned.toLowerCase();
  return RU_TO_UA_SETTLEMENTS[lower] || cleaned;
}

/**
 * Extracts the true Ukrainian Oblast name by analyzing context from title, description, raion names, or URL.
 */
export function extractOblastFromContext(text: string, currentCity?: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase().replace(/[’‘ʼ`']/g, "'");

  // 1. Check direct Oblast keywords in Ukrainian and Russian
  for (const [alias, canonical] of Object.entries(REGION_ALIAS_MAP)) {
    if (lower.includes(alias)) {
      // Avoid false positive: "київський район" in Odesa/Kharkiv is a city district, not Kyiv Oblast
      if ((alias === 'київська' || alias === 'киевская' || alias === 'київський' || alias === 'киевский') && currentCity) {
        const normCity = currentCity.toLowerCase();
        if (normCity.includes('одес') || normCity.includes('харк') || normCity.includes('полтав') || normCity.includes('донец')) {
          continue; // Skip: this is a city district in Odesa/Kharkiv!
        }
      }
      return canonical;
    }
  }

  // 2. Check Raion (район) and Key Settlements mapping
  for (const [pattern, oblast] of Object.entries(RAION_TO_OBLAST)) {
    if (lower.includes(pattern)) {
      return oblast;
    }
  }

  return null;
}

/**
 * Maps both Russian and Ukrainian region names to a canonical Ukrainian oblast name.
 * Returns null if no match is found.
 */
const REGION_ALIAS_MAP: Record<string, string> = {
  // Ukrainian
  'вінницька': 'Вінницька', 'волинська': 'Волинська', 'дніпропетровська': 'Дніпропетровська',
  'житомирська': 'Житомирська', 'закарпатська': 'Закарпатська', 'запорізька': 'Запорізька',
  'івано-франківська': 'Івано-Франківська', 'київська': 'Київська', 'кіровоградська': 'Кіровоградська',
  'львівська': 'Львівська', 'миколаївська': 'Миколаївська', 'одеська': 'Одеська',
  'полтавська': 'Полтавська', 'рівненська': 'Рівненська', 'сумська': 'Сумська',
  'тернопільська': 'Тернопільська', 'харківська': 'Харківська', 'херсонська': 'Херсонська',
  'хмельницька': 'Хмельницька', 'черкаська': 'Черкаська', 'чернівецька': 'Чернівецька',
  'чернігівська': 'Чернігівська', 'луганська': 'Луганська', 'донецька': 'Донецька',
  'м. київ': 'Київська',
  // Russian equivalents
  'киевская': 'Київська', 'одесская': 'Одеська', 'харьковская': 'Харківська',
  'львовская': 'Львівська', 'днепропетровская': 'Дніпропетровська',
  'запорожская': 'Запорізька', 'винницкая': 'Вінницька', 'полтавская': 'Полтавська',
  'черниговская': 'Чернігівська', 'черкасская': 'Черкаська', 'сумская': 'Сумська',
  'житомирская': 'Житомирська', 'кировоградская': 'Кіровоградська',
  'ровенская': 'Рівненська', 'ривненская': 'Рівненська',
  'хмельницкая': 'Хмельницька', 'тернопольская': 'Тернопільська',
  'ивано-франковская': 'Івано-Франківська', 'волынская': 'Волинська',
  'закарпатская': 'Закарпатська', 'николаевская': 'Миколаївська',
  'херсонская': 'Херсонська', 'черновицкая': 'Чернівецька',
  'луганская': 'Луганська', 'донецкая': 'Донецька',
};

export function canonicalRegion(name: string): string | null {
  const lower = name.toLowerCase()
    .replace(/\s*область\s*$/i, '')
    .trim();
  return REGION_ALIAS_MAP[lower] || null;
}

/**
 * Resolves accurate geographical coordinates and oblast region for any Ukrainian settlement or city.
 * Context-aware: leverages title, URL, raion names, and settlements dictionary with multi-level fallbacks.
 */
export function resolveLocationCoords(
  city: string,
  regionName?: string,
  title?: string,
  sourceUrl?: string
): { lat: number; lng: number; region: string } {
  const cleanCity = normalizeSettlementName(city);
  const cleanLower = cleanCity.toLowerCase();

  // Determine the best inferred region using all available context
  const contextString = `${regionName || ''} ${cleanCity} ${title || ''} ${sourceUrl || ''}`;
  const inferredRegion = extractOblastFromContext(contextString, cleanCity) || (regionName ? canonicalRegion(regionName) : null);

  // Helper: check if two region names refer to the same oblast
  const regionsMatch = (a: string, b: string): boolean => {
    if (!a || !b) return false;
    const normA = canonicalRegion(a) || a;
    const normB = canonicalRegion(b) || b;
    if (normA === normB) return true;
    const rootA = normA.toLowerCase().replace(/ська$|зька$|область$/gi, '').trim();
    const rootB = normB.toLowerCase().replace(/ська$|зька$|область$/gi, '').trim();
    return rootA === rootB || rootA.includes(rootB) || rootB.includes(rootA);
  };

  // 1. Check in UKRAINE_SETTLEMENTS dictionary
  const directMatch = UKRAINE_SETTLEMENTS[cleanCity] || UKRAINE_SETTLEMENTS[city];
  if (directMatch) {
    const dictRegionMatches = !inferredRegion || regionsMatch(directMatch.region || '', inferredRegion);
    if (dictRegionMatches) {
      const jitterLat = (Math.random() - 0.5) * 0.012;
      const jitterLng = (Math.random() - 0.5) * 0.012;
      return {
        lat: directMatch.lat + jitterLat,
        lng: directMatch.lng + jitterLng,
        region: directMatch.region || inferredRegion || 'Київська',
      };
    }
  }

  // Case-insensitive dictionary check
  for (const [sName, sInfo] of Object.entries(UKRAINE_SETTLEMENTS)) {
    if (normalizeSettlementName(sName).toLowerCase() === cleanLower) {
      const dictRegionMatches = !inferredRegion || regionsMatch(sInfo.region || '', inferredRegion);
      if (dictRegionMatches) {
        const jitterLat = (Math.random() - 0.5) * 0.012;
        const jitterLng = (Math.random() - 0.5) * 0.012;
        return {
          lat: sInfo.lat + jitterLat,
          lng: sInfo.lng + jitterLng,
          region: sInfo.region || inferredRegion || 'Київська',
        };
      }
    }
  }

  // 2. Check in MAJOR_CITIES
  const matchedCity = MAJOR_CITIES.find(
    c => normalizeSettlementName(c.name).toLowerCase() === cleanLower ||
         cleanLower.includes(normalizeSettlementName(c.name).toLowerCase())
  );
  if (matchedCity) {
    const r = REGIONS.find(reg => reg.id === matchedCity.region_id);
    const cityRegion = r ? r.name : 'Київська';
    const cityRegionMatches = !inferredRegion || regionsMatch(cityRegion, inferredRegion);
    if (cityRegionMatches) {
      const jitterLat = (Math.random() - 0.5) * 0.015;
      const jitterLng = (Math.random() - 0.5) * 0.015;
      return {
        lat: matchedCity.lat + jitterLat,
        lng: matchedCity.lng + jitterLng,
        region: cityRegion,
      };
    }
  }

  // 3. Fallback to Region center if inferred region is known (NEVER default to Kyiv if region is known!)
  if (inferredRegion) {
    const matchedRegion = REGIONS.find(r => regionsMatch(r.name, inferredRegion));
    if (matchedRegion) {
      const jitterLat = (Math.random() - 0.5) * 0.08;
      const jitterLng = (Math.random() - 0.5) * 0.08;
      return {
        lat: matchedRegion.lat + jitterLat,
        lng: matchedRegion.lng + jitterLng,
        region: matchedRegion.name,
      };
    }
  }

  // 4. Ultimate fallback: Center of Ukraine with Kyiv default
  const defaultRegion = REGIONS[7]; // Kyiv
  const jitterLat = (Math.random() - 0.5) * 0.04;
  const jitterLng = (Math.random() - 0.5) * 0.04;
  return {
    lat: defaultRegion.lat + jitterLat,
    lng: defaultRegion.lng + jitterLng,
    region: defaultRegion.name,
  };
}

/**
 * Finds the nearest major city to the given coordinates.
 * Iterates through MAJOR_CITIES using the Haversine formula.
 * 
 * @param {number} lat - Target latitude
 * @param {number} lng - Target longitude
 * @returns {{ city: string, distance: number }} Name of the nearest city and distance in km
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
 * Formats a distance in kilometers for UI display.
 * E.g., distances < 1km are shown as "< 1 км".
 * 
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(km: number): string {
  if (km < 1) return '< 1 км';
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

/**
 * Formats a monetary value for UI display (e.g., "$15K", "₴1.5M").
 * 
 * @param {number | string} price - The raw price number
 * @param {string} currency - 'USD' or 'UAH' (default: 'USD')
 * @returns {string} Formatted price string with currency symbol
 */
export function formatPrice(price: number | string, currency: string = 'USD'): string {
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(/\s+/g, '')) || 0;
  if (currency === 'UAH') {
    if (num >= 1_000_000) return `₴${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `₴${Math.round(num / 1_000).toLocaleString()}`;
    return `₴${num}`;
  }
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${Math.round(num / 1_000).toLocaleString()}`;
  return `$${num}`;
}

/**
 * Minimal price formatter designed specifically for small map marker bubbles.
 * 
 * @param {number | string} price - The raw price number
 * @param {string} currency - 'USD' or 'UAH' (default: 'USD')
 * @returns {string} Compact formatted price string
 */
export function formatPriceBubble(price: number | string, currency: string = 'USD'): string {
  const sym = currency === 'UAH' ? '₴' : '$';
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(/\s+/g, '')) || 0;
  if (num >= 1_000_000) return `${sym}${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${sym}${Math.round(num / 1_000)}K`;
  return `${sym}${num}`;
}

/**
 * Default geographic bounds and center for rendering the map of Ukraine.
 * Used for initializing the Leaflet map view.
 */
export const UKRAINE_BOUNDS = {
  center: [48.9, 31.2] as [number, number],
  zoom: 6,
  sw: [44.3, 22.0] as [number, number],
  ne: [52.4, 40.2] as [number, number],
};
