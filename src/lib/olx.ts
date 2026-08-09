import db from './db';
import { findNearestCity } from './geo';

const OLX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
};

const UAH_TO_USD_RATE = 41.5; // Approximate exchange rate

const MAX_PAGES = 50; // Up to ~2000 listings
const DELAY_BETWEEN_PAGES_MS = 2000; // 2 seconds between pages to avoid bans

/**
 * Optimize OLX photo URL — replace small thumbnails with larger images
 * OLX CDN supports size parameter: ;s=WIDTHxHEIGHT
 */
function optimizePhotoUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  // Remove existing size parameter and add a better one
  const cleaned = url.replace(/;s=\d+x\d+/, '');
  return `${cleaned};s=800x600`;
}

/**
 * Parse a single OLX page and return parsed ads
 */
async function parseOLXPage(dealType: 'sale' | 'rent', page: number): Promise<{
  ads: any[];
  hasMore: boolean;
  error?: string;
}> {
  const categoryPath = dealType === 'sale'
    ? '/uk/nedvizhimost/doma/prodazha-domov/'
    : '/uk/nedvizhimost/doma/arenda-domov/';
  const url = `https://www.olx.ua${categoryPath}?page=${page}`;

  console.log(`[OLX] Fetching page ${page}: ${url}`);

  const response = await fetch(url, { headers: OLX_HEADERS });
  if (!response.ok) {
    throw new Error(`OLX fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Extract __PRERENDERED_STATE__
  const match = html.match(/__PRERENDERED_STATE__\s*=\s*(\".*?\");/);
  if (!match) {
    console.warn('[OLX] __PRERENDERED_STATE__ not found. Anti-bot might be active.');
    return { ads: [], hasMore: false, error: 'Anti-bot active or page structure changed' };
  }

  const jsonStr = JSON.parse(match[1]); // unescape JS string
  const state = JSON.parse(jsonStr);

  if (!state.listing?.listing?.ads) {
    return { ads: [], hasMore: false, error: 'No ads found in state' };
  }

  const rawAds = state.listing.listing.ads;
  const parsedAds: any[] = [];

  for (const ad of rawAds) {
    if (ad.isBusiness === undefined) continue; // Skip non-ad items (banners, etc)

    const external_id = `olx_${ad.id}`;
    const title = ad.title || '';
    const description = ad.description || '';
    const source_url = ad.url;

    // Optimize photos — use larger resolution
    const rawPhotos: string[] = ad.photos || [];
    const optimizedPhotos = rawPhotos.map((p: string) => optimizePhotoUrl(p)).filter(Boolean);
    const photo_url = optimizedPhotos.length > 0 ? optimizedPhotos[0] : null;
    const photos = optimizedPhotos.length > 0 ? JSON.stringify(optimizedPhotos) : null;

    // Location
    const latitude = ad.map?.lat || 0;
    const longitude = ad.map?.lon || 0;
    if (!latitude || !longitude) continue; // Skip if no coords

    const nearest = findNearestCity(latitude, longitude);

    // Price — preserve original price from listing
    let price = 0;
    let currency = 'USD';
    let price_uah = 0;

    if (ad.price?.regularPrice) {
      const rp = ad.price.regularPrice;
      if (rp.currencyCode === 'UAH') {
        price_uah = rp.value;
        price = Math.round(rp.value / UAH_TO_USD_RATE);
        currency = 'USD'; // Normalize to USD for filtering
      } else if (rp.currencyCode === 'USD') {
        price = rp.value;
        price_uah = Math.round(rp.value * UAH_TO_USD_RATE);
        currency = 'USD';
      } else {
        price = rp.value;
        currency = rp.currencyCode;
      }
    }

    // Params (Area, Rooms, etc)
    let area_total: number | null = null;
    let area_land: number | null = null;
    let rooms: number | null = null;
    let floors: number | null = null;
    const year_built: number | null = null;
    let address = nearest.city;
    let region = '';
    let city = nearest.city;

    if (ad.location) {
      city = ad.location.cityName || city;
      region = ad.location.regionName || region;
      address = `${city}, ${region}`;
    }

    if (ad.params) {
      for (const p of ad.params) {
        if (p.key === 'total_area') area_total = parseFloat(p.normalizedValue);
        if (p.key === 'land_area') area_land = parseFloat(p.normalizedValue);
        if (p.key === 'number_of_rooms') rooms = parseInt(p.normalizedValue, 10);
        if (p.key === 'number_of_floors') floors = parseInt(p.normalizedValue, 10);
      }
    }

    parsedAds.push({
      external_id,
      source: 'olx',
      deal_type: dealType,
      title,
      description,
      price,
      currency,
      price_uah,
      latitude,
      longitude,
      region,
      city,
      district: null,
      address,
      area_total,
      area_land,
      rooms,
      floors,
      year_built,
      photo_url,
      photos,
      source_url,
      nearest_city: nearest.city,
      distance_to_city: nearest.distance,
    });
  }

  // Determine if there are more pages
  const totalPages = state.listing?.listing?.totalPages || 0;
  const hasMore = page < totalPages && parsedAds.length > 0;

  return { ads: parsedAds, hasMore };
}

/**
 * Insert parsed ads into the database
 */
function insertAds(ads: any[]): number {
  if (ads.length === 0) return 0;

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
        console.error(`[OLX] Error inserting ad ${ad.external_id}:`, e);
      }
    }
    return count;
  });

  return insertAll(ads);
}

/**
 * Sync a single page of OLX listings
 */
export async function syncOLX(dealType: 'sale' | 'rent', page = 1) {
  try {
    const { ads, hasMore, error } = await parseOLXPage(dealType, page);

    if (error && ads.length === 0) {
      return { success: false, count: 0, message: error };
    }

    const insertedCount = insertAds(ads);

    return { success: true, count: insertedCount, totalAdsFound: ads.length, hasMore };
  } catch (error: any) {
    console.error('[OLX] Sync error:', error);
    return { success: false, count: 0, message: error.message };
  }
}

/**
 * Sync ALL pages of OLX listings (up to MAX_PAGES).
 * Returns progress updates via optional callback.
 */
export async function syncOLXAllPages(
  dealType: 'sale' | 'rent',
  maxPages = MAX_PAGES
): Promise<{
  success: boolean;
  totalInserted: number;
  totalFound: number;
  pagesScraped: number;
  message: string;
}> {
  let totalInserted = 0;
  let totalFound = 0;
  let pagesScraped = 0;
  let consecutiveErrors = 0;

  console.log(`[OLX] Starting full sync: ${dealType}, max ${maxPages} pages`);

  for (let page = 1; page <= maxPages; page++) {
    try {
      const { ads, hasMore, error } = await parseOLXPage(dealType, page);

      if (error && ads.length === 0) {
        consecutiveErrors++;
        console.warn(`[OLX] Page ${page} error: ${error}`);

        // If 3 consecutive errors, likely blocked — stop
        if (consecutiveErrors >= 3) {
          console.error('[OLX] Too many consecutive errors, stopping.');
          break;
        }

        // Wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PAGES_MS * 3));
        continue;
      }

      consecutiveErrors = 0; // Reset on success
      const insertedCount = insertAds(ads);
      totalInserted += insertedCount;
      totalFound += ads.length;
      pagesScraped++;

      console.log(`[OLX] Page ${page}: found ${ads.length}, inserted ${insertedCount} (total: ${totalInserted})`);

      if (!hasMore) {
        console.log(`[OLX] No more pages after page ${page}.`);
        break;
      }

      // Delay between pages to avoid getting banned
      if (page < maxPages) {
        const delay = DELAY_BETWEEN_PAGES_MS + Math.random() * 1000; // 2-3 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error: any) {
      consecutiveErrors++;
      console.error(`[OLX] Page ${page} exception:`, error.message);

      if (consecutiveErrors >= 3) {
        console.error('[OLX] Too many consecutive errors, stopping.');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PAGES_MS * 2));
    }
  }

  const message = `Зібрано ${totalFound} оголошень з ${pagesScraped} сторінок, додано/оновлено ${totalInserted}`;
  console.log(`[OLX] Sync complete: ${message}`);

  return {
    success: totalInserted > 0 || pagesScraped > 0,
    totalInserted,
    totalFound,
    pagesScraped,
    message,
  };
}
