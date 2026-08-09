import db from './db';
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
      throw new Error(`DOM.RIA search failed: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const itemIds = searchData.items || [];

    if (itemIds.length === 0) {
      return { success: true, count: 0, message: 'Більше оголошень не знайдено' };
    }

    const parsedAds = [];

    // Process ALL items from the page (no artificial limit)
    for (const id of itemIds) {
      try {
        const infoUrl = `${BASE_URL}/info?realty_id=${id}&api_key=${DOMRIA_API_KEY}`;
        const infoRes = await fetch(infoUrl);
        if (!infoRes.ok) {
          console.warn(`[DOM.RIA] Failed to fetch info for ${id}: ${infoRes.status}`);
          continue;
        }

        const ad = await infoRes.json();

        const external_id = `domria_${ad.realty_id}`;
        const title = `Будинок, ${ad.total_square_meters || '?'} м²`;
        const description = ad.description || '';
        const source_url = `https://dom.ria.com/uk/${ad.beautiful_url}`;

        // Photos — real photos from the listing
        const photo_url = ad.main_photo ? `https://cdn.riastatic.com/photosnew${ad.main_photo}` : null;
        const photos: string[] = [];
        if (ad.photos) {
          for (const p of Object.values(ad.photos) as any[]) {
            if (p.file) photos.push(`https://cdn.riastatic.com/photosnew${p.file}`);
          }
        }

        // Location
        const latitude = ad.latitude || 0;
        const longitude = ad.longitude || 0;
        if (!latitude || !longitude) continue;

        const nearest = findNearestCity(latitude, longitude);

        // Price — preserve original price from listing
        let price = ad.priceArr?.[1] || 0; // USD price usually at index 1
        let price_uah = ad.priceArr?.[3] || 0; // UAH price usually at index 3

        if (!price && price_uah) {
          price = Math.round(price_uah / 41.5);
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

        // Rate limit delay — DOM.RIA free tier is limited
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.error(`[DOM.RIA] Error parsing item ${id}:`, e);
      }
    }

    const insertStmt = db.prepare(`
      INSERT INTO houses (
        external_id, source, deal_type, title, description, price, currency, price_uah,
        latitude, longitude, region, city, district, address,
        area_total, area_land, rooms, floors, year_built,
        photo_url, photos, source_url, nearest_city, distance_to_city
      ) VALUES (
        @external_id, @source, @deal_type, @title, @description, @price, @currency, @price_uah,
        @latitude, @longitude, @region, @city, @district, @address,
        @area_total, @area_land, @rooms, @floors, @year_built,
        @photo_url, @photos, @source_url, @nearest_city, @distance_to_city
      ) ON CONFLICT(external_id) DO UPDATE SET
        price = excluded.price,
        price_uah = excluded.price_uah,
        photo_url = excluded.photo_url,
        photos = excluded.photos,
        title = excluded.title,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `);

    const insertAll = db.transaction((adsToInsert: any[]) => {
      let count = 0;
      for (const ad of adsToInsert) {
        try {
          insertStmt.run(ad);
          count++;
        } catch (e) {
          console.error(`[DOM.RIA] Error inserting ad ${ad.external_id}:`, e);
        }
      }
      return count;
    });

    const insertedCount = insertAll(parsedAds);

    return { success: true, count: insertedCount, totalAdsFound: parsedAds.length };
  } catch (error: any) {
    console.error('[DOM.RIA] Sync error:', error);
    return { success: false, count: 0, message: error.message };
  }
}
