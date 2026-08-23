import db, { setupDb } from './db';
import { findNearestCity } from './geo';

const DOMRIA_API_KEY = process.env.DOMRIA_API_KEY;
const BASE_URL = 'https://developers.ria.com/dom';

/**
 * Check if DOM.RIA integration is configured
 */
export function isDomRiaConfigured(): boolean {
  return !!DOMRIA_API_KEY;
}

/**
 * Synchronizes real estate listings from DOM.RIA via their official REST API.
 * 
 * @param {('sale'|'rent')} dealType - Type of real estate operation to fetch.
 * @param {number} page - Pagination index.
 * @returns {Promise<{success: boolean, count: number, message?: string, totalAdsFound?: number}>}
 */
export async function syncDomRia(dealType: 'sale' | 'rent', page = 0) {
  if (!DOMRIA_API_KEY) {
    return {
      success: false,
      count: 0,
      message: 'DOM.RIA API ключ не налаштований. Встановіть DOMRIA_API_KEY в .env.local',
    };
  }

  const operationType = dealType === 'sale' ? 1 : 3;

  // Search for houses
  const searchUrl = `${BASE_URL}/search?category=4&operation_type=${operationType}&page=${page}&api_key=${DOMRIA_API_KEY}`;

  try {
    console.log(`[DOM.RIA] Fetching search: page ${page}`);
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      if (searchRes.status === 429) {
        return {
          success: false,
          count: 0,
          message: 'DOM.RIA: Досягнуто погодинного ліміту API ключа (HourOverlimit). Спробуйте пізніше або скористайтеся кнопкою «Відновити базу».',
        };
      }
      throw new Error(`DOM.RIA search failed: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    if (searchData.error_type === 'HourOverlimit' || searchData.error) {
      return {
        success: false,
        count: 0,
        message: 'DOM.RIA: Досягнуто погодинного ліміту API ключа (HourOverlimit). Спробуйте пізніше або скористайтеся кнопкою «Відновити базу».',
      };
    }

    const itemIds = (searchData.items || []).slice(0, 20); // Process up to 20 items per page to conserve API key limits

    if (itemIds.length === 0) {
      return { success: true, count: 0, message: 'Більше оголошень не знайдено' };
    }

    const parsedAds = [];

    let processedCount = 0;
    // Process items from the page
    for (const id of itemIds) {
      try {
        const infoUrl = `${BASE_URL}/info/${id}?api_key=${DOMRIA_API_KEY}`;
        let infoRes = await fetch(infoUrl);

        // Handle 429 rate limit with backoff
        if (infoRes.status === 429) {
          console.warn(`[DOM.RIA] Rate limit hit on ${id}, backing off for 2.5s...`);
          await new Promise(resolve => setTimeout(resolve, 2500));
          infoRes = await fetch(infoUrl);
        }

        if (!infoRes.ok) {
          console.warn(`[DOM.RIA] Failed to fetch info for ${id}: ${infoRes.status}`);
          continue;
        }

        const ad = await infoRes.json();

        const external_id = `domria_${ad.realty_id}`;
        const title = `Будинок, ${ad.total_square_meters || '?'} м²`;
        const description = ad.description || '';
        const source_url = `https://dom.ria.com/uk/${ad.beautiful_url}`;

        const buildPhoto = (path: string | null) => {
          if (!path) return null;
          return `https://cdn.riastatic.com/photos/${path}`.replace(/\.(jpg|jpeg|png)$/i, 'b.webp');
        };

        // Photos — real photos from the listing
        const photo_url = buildPhoto(ad.main_photo);
        const photos: string[] = [];
        if (ad.photos) {
          for (const p of Object.values(ad.photos) as { file?: string }[]) {
            if (p.file) {
              const url = buildPhoto(p.file);
              if (url) photos.push(url);
            }
          }
        }

        // Location
        const latitude = ad.latitude || 0;
        const longitude = ad.longitude || 0;
        if (!latitude || !longitude) continue;

        const nearest = findNearestCity(latitude, longitude);

        // Price — parse and normalize numeric values
        const cleanNumber = (val: unknown): number => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          const num = parseFloat(String(val).replace(/\s+/g, '').replace(/,/g, '.'));
          return isNaN(num) ? 0 : num;
        };

        let price = cleanNumber(ad.priceArr?.[1]); // USD price usually at index 1
        let price_uah = cleanNumber(ad.priceArr?.[3]); // UAH price usually at index 3

        if (!price && price_uah) {
          price = Math.round(price_uah / 41.5);
        }
        if (!price_uah && price) {
          price_uah = Math.round(price * 41.5);
        }

        parsedAds.push({
          external_id,
          source: 'domria',
          deal_type: dealType,
          title,
          description,
          price,
          currency: 'USD',
          price_uah,
          latitude,
          longitude,
          region: ad.state_name || nearest.city,
          city: ad.city_name || nearest.city,
          district: ad.district_name || null,
          address: ad.street_name ? `${ad.street_name}, ${ad.city_name}` : nearest.city,
          area_total: ad.total_square_meters || null,
          area_land: ad.land_square_meters || null,
          rooms: ad.rooms_count || null,
          floors: ad.floors_count || null,
          year_built: ad.building_year || null,
          photo_url,
          photos: JSON.stringify(photos.slice(0, 10)),
          source_url,
          nearest_city: nearest.city,
          distance_to_city: nearest.distance,
        });

        processedCount++;
        if (processedCount % 10 === 0) {
          console.log(`[DOM.RIA] Processed ${processedCount}/${itemIds.length} items on page ${page}...`);
        }

        // Rate limit delay — stable 800ms pacing for developer tier
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (e) {
        console.error(`[DOM.RIA] Error parsing item ${id}:`, e);
      }
    }

    await setupDb();
    const sql = `
      INSERT INTO houses (
        external_id, source, deal_type, title, description, price, currency, price_uah,
        latitude, longitude, region, city, district, address,
        area_total, area_land, rooms, floors, year_built,
        photo_url, photos, source_url, nearest_city, distance_to_city
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      ) ON CONFLICT(external_id) DO UPDATE SET
        price = excluded.price,
        price_uah = excluded.price_uah,
        photo_url = excluded.photo_url,
        photos = excluded.photos,
        title = excluded.title,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `;

    const tx = await db.transaction("write");
    let insertedCount = 0;
    for (const ad of parsedAds) {
      try {
        await tx.execute({
          sql,
          args: [
            ad.external_id, ad.source, ad.deal_type, ad.title, ad.description, ad.price, ad.currency, ad.price_uah,
            ad.latitude, ad.longitude, ad.region, ad.city, ad.district, ad.address,
            ad.area_total, ad.area_land, ad.rooms, ad.floors, ad.year_built,
            ad.photo_url, ad.photos, ad.source_url, ad.nearest_city, ad.distance_to_city
          ]
        });
        insertedCount++;
      } catch (e) {
        console.error(`[DOM.RIA] Error inserting ad ${ad.external_id}:`, e);
      }
    }
    await tx.commit();

    return { success: true, count: insertedCount, totalAdsFound: parsedAds.length };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown sync error';
    console.error('[DOM.RIA] Sync error:', error);
    return { success: false, count: 0, message: msg };
  }
}

/**
 * Synchronizes ALL available pages from DOM.RIA without limits.
 * 
 * @param {('sale'|'rent')} dealType - Type of real estate operation to fetch.
 */
export async function syncDomRiaAllPages(dealType: 'sale' | 'rent') {
  if (!DOMRIA_API_KEY) {
    return {
      success: false,
      message: 'DOM.RIA API ключ не налаштований. Встановіть DOMRIA_API_KEY в .env.local',
      totalInserted: 0,
      totalFound: 0,
      pagesScraped: 0,
    };
  }

  const MAX_PAGES = 999;
  let page = 0;
  let hasMore = true;
  let totalInserted = 0;
  let totalFound = 0;

  console.log(`[DOM.RIA] === Запуск повної синхронізації DOM.RIA для '${dealType}' ===`);

  while (hasMore && page < MAX_PAGES) {
    console.log(`[DOM.RIA] ---> Запит сторінки ${page}...`);
    const result = await syncDomRia(dealType, page);
    
    if (!result.success) {
      console.warn(`[DOM.RIA] Помилка на сторінці ${page}: ${result.message}`);
      break; 
    }

    if (result.count === 0 && (!result.totalAdsFound || result.totalAdsFound === 0)) {
      console.log(`[DOM.RIA] На сторінці ${page} не знайдено нових оголошень. Завершення синхронізації.`);
      hasMore = false;
    } else {
      totalInserted += result.count;
      totalFound += result.totalAdsFound || 0;
      page++;
      
      console.log(`[DOM.RIA] <--- Сторінка ${page-1} успішно оброблена. Додано/Оновлено: ${result.count}. Всього: ${totalInserted}`);
      // Small delay between pages
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log(`[DOM.RIA] === Повна синхронізація DOM.RIA завершена! Оброблено сторінок: ${page}, Всього збережено: ${totalInserted} ===`);
  
  return {
    success: true,
    message: `Повна синхронізація DOM.RIA завершена. Зібрано ${page} сторінок.`,
    totalInserted,
    totalFound,
    pagesScraped: page,
  };
}
