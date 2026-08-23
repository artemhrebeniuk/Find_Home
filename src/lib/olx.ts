import db, { setupDb } from './db';
import { findNearestCity, MAJOR_CITIES, REGIONS } from './geo';
import * as cheerio from 'cheerio';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const OLX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
};

const UAH_TO_USD_RATE = 41.5;
const MAX_PAGES = 100;
const DELAY_BETWEEN_PAGES_MS = 1500;

interface ParsedOlxAd {
  external_id: string;
  source: string;
  deal_type: 'sale' | 'rent';
  title: string;
  description: string;
  price: number;
  currency: string;
  price_uah: number;
  latitude: number;
  longitude: number;
  region: string;
  city: string;
  district: string | null;
  address: string;
  area_total: number | null;
  area_land: number | null;
  rooms: number | null;
  floors: number | null;
  year_built: number | null;
  photo_url: string | null;
  photos: string | null;
  source_url: string | null;
  nearest_city: string;
  distance_to_city: number;
}

/**
 * Optimizes an OLX photo URL for 800x600 resolution.
 */
function optimizePhotoUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('no_thumbnail') || url.startsWith('/') || !url.startsWith('http')) return null;
  const cleaned = url.replace(/;s=\d+x\d+.*$/, '');
  return `${cleaned};s=800x600`;
}

/**
 * Parses price text string (e.g. "1 200 000 грн.", "45 000 $") into numeric USD and UAH.
 */
function parsePriceString(str: string | undefined | null): { price: number; price_uah: number; currency: string } {
  if (!str) return { price: 0, price_uah: 0, currency: 'USD' };
  const clean = str.replace(/\s+/g, '').replace(/,/g, '.');
  const num = parseFloat(clean) || 0;

  if (str.includes('$') || str.toLowerCase().includes('usd')) {
    return {
      price: Math.round(num),
      price_uah: Math.round(num * UAH_TO_USD_RATE),
      currency: 'USD',
    };
  } else if (str.includes('€') || str.toLowerCase().includes('eur')) {
    const usd = Math.round(num * 1.08);
    return {
      price: usd,
      price_uah: Math.round(usd * UAH_TO_USD_RATE),
      currency: 'USD',
    };
  } else {
    return {
      price: Math.round(num / UAH_TO_USD_RATE),
      price_uah: Math.round(num),
      currency: 'UAH',
    };
  }
}

/**
 * Strictly verifies whether an OLX offer belongs to 'sale' or 'rent'.
 * Prevents promoted/cross-linked or mislabeled ads from leaking across categories.
 * Uses URL, title keywords, price text, and price magnitude as signals.
 */
function classifyAndValidateDealType(
  requestedDealType: 'sale' | 'rent',
  url: string | null,
  title: string,
  priceText?: string,
  priceUsd?: number,
  priceUah?: number
): 'sale' | 'rent' {
  const lowerUrl = (url || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  const lowerPriceText = (priceText || '').toLowerCase();

  // 1. Explicit URL check from OLX routing (strongest signal)
  const isUrlRent = lowerUrl.includes('arenda-domov') || lowerUrl.includes('posutochno-pochasovo') || lowerUrl.includes('/arenda/');
  const isUrlSale = lowerUrl.includes('prodazha-domov') || lowerUrl.includes('/prodazha/');

  if (isUrlRent && !isUrlSale) return 'rent';
  if (isUrlSale && !isUrlRent) return 'sale';

  // 2. Keyword check in title
  const rentKeywordRegex = /(?:оренда|здам\b|здається|здаю|подобово|подобова|довготривал|в оренду|помісячно|сдам в аренду|сдаю|аренда)/i;
  const saleKeywordRegex = /(?:продам\b|продаж|продається|продается|купівля|купить)/i;
  const hasRentKeywords = rentKeywordRegex.test(lowerTitle);
  const hasSaleKeywords = saleKeywordRegex.test(lowerTitle);
  const hasMonthlyPrice = lowerPriceText.includes('міс') || lowerPriceText.includes('мес') || lowerPriceText.includes('/м');

  if (hasRentKeywords && !hasSaleKeywords) return 'rent';
  if (hasSaleKeywords && !hasRentKeywords) return 'sale';
  if (hasMonthlyPrice) return 'rent';

  // 3. Price-magnitude heuristic (when URL is ambiguous / promoted ad)
  const usd = priceUsd || 0;
  const uah = priceUah || 0;
  if (usd > 0) {
    // Real house sale prices in Ukraine are almost always > $5,000
    // Rental prices converted to USD are typically < $3,000/month
    if (requestedDealType === 'sale' && usd < 800 && uah > 0 && uah < 50000) {
      // Suspiciously low for a sale — likely a monthly rent that leaked in
      return 'rent';
    }
    if (requestedDealType === 'rent' && usd > 15000) {
      // Suspiciously high for monthly rent — likely a sale price
      return 'sale';
    }
  }

  // 4. Fallback to requested deal type
  return requestedDealType;
}

/**
 * Resolves approximate geographical coordinates for a city or region name.
 */
function resolveLocationCoords(city: string, regionName?: string): { lat: number; lng: number; region: string } {
  const cleanCity = city.trim().toLowerCase();
  const matchedCity = MAJOR_CITIES.find(
    c => c.name.toLowerCase() === cleanCity || cleanCity.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(cleanCity)
  );
  if (matchedCity) {
    const r = REGIONS.find(reg => reg.id === matchedCity.region_id);
    // Add micro-jitter so multiple ads in the same city don't overlap on exact same pixel
    const jitterLat = (Math.random() - 0.5) * 0.04;
    const jitterLng = (Math.random() - 0.5) * 0.04;
    return {
      lat: matchedCity.lat + jitterLat,
      lng: matchedCity.lng + jitterLng,
      region: r ? r.name : 'Київська',
    };
  }

  // Check regions
  if (regionName) {
    const matchedRegion = REGIONS.find(
      r => r.name.toLowerCase().includes(regionName.toLowerCase()) || regionName.toLowerCase().includes(r.name.toLowerCase())
    );
    if (matchedRegion) {
      const jitterLat = (Math.random() - 0.5) * 0.06;
      const jitterLng = (Math.random() - 0.5) * 0.06;
      return {
        lat: matchedRegion.lat + jitterLat,
        lng: matchedRegion.lng + jitterLng,
        region: matchedRegion.name,
      };
    }
  }

  // Default to Kyiv region
  const defaultRegion = REGIONS[7]; // Kyiv
  return {
    lat: defaultRegion.lat + (Math.random() - 0.5) * 0.05,
    lng: defaultRegion.lng + (Math.random() - 0.5) * 0.05,
    region: 'Київська',
  };
}

/**
 * Fetches HTML from OLX using Headless Chrome or fetch.
 */
async function fetchOlxHtml(url: string): Promise<string> {
  // Try Headless Chrome on Mac
  try {
    const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --no-sandbox --window-size=1920,20000 --user-agent="${OLX_HEADERS['User-Agent']}" --dump-dom "${url}"`;
    const { stdout } = await execPromise(cmd, { maxBuffer: 25 * 1024 * 1024 });
    if (stdout && stdout.length > 5000) {
      return stdout;
    }
  } catch (e: unknown) {
    console.warn('[OLX] Headless Chrome fetch fallback failed, trying direct fetch...', e);
  }

  // Fallback to fetch
  const response = await fetch(url, { headers: OLX_HEADERS });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(`OLX: Доступ обмежено захистом Cloudflare (403). На серверах Vercel діє блокування дата-центрів. Скористайтеся кнопкою «Відновити базу» або запустіть синхронізацію локально на комп'ютері.`);
    }
    throw new Error(`OLX fetch failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Parses a page of OLX listings.
 */
async function parseOLXPage(dealType: 'sale' | 'rent', page: number): Promise<{
  ads: ParsedOlxAd[];
  hasMore: boolean;
  error?: string;
}> {
  const categoryPath = dealType === 'sale'
    ? '/uk/nedvizhimost/doma/prodazha-domov/'
    : '/uk/nedvizhimost/doma/arenda-domov/';
  const url = `https://www.olx.ua${categoryPath}?page=${page}`;

  const startFetchTime = Date.now();
  console.log(`[OLX-SYSTEM] 🌐 ПАРСИНГ СТОРІНКИ: ${page} -> ${url}`);

  try {
    const html = await fetchOlxHtml(url);
    const $ = cheerio.load(html);

    // 1. Try extracting __PRERENDERED_STATE__
    let prerenderedAds: any[] = [];
    $('script').each((_, el) => {
      const text = $(el).html() || '';
      if (text.includes('__PRERENDERED_STATE__')) {
        const match = text.match(/__PRERENDERED_STATE__\s*=\s*(".*?");/);
        if (match) {
          try {
            const jsonStr = JSON.parse(match[1]);
            const state = JSON.parse(jsonStr);
            if (state.listing?.listing?.ads) {
              prerenderedAds = state.listing.listing.ads;
            }
          } catch {
            // Ignore JSON parse error and fallback to DOM
          }
        }
      }
    });

    const parsedAds: ParsedOlxAd[] = [];

    if (prerenderedAds.length > 0) {
      for (const ad of prerenderedAds) {
        if (ad.isBusiness === undefined) continue;

        const external_id = `olx_${ad.id}`;
        const title = ad.title || '';
        const description = ad.description || '';
        const source_url = ad.url || null;

        const rawPhotos: string[] = ad.photos || [];
        const optimizedPhotos = rawPhotos.map((p: string) => optimizePhotoUrl(p)).filter(Boolean) as string[];
        const photo_url = optimizedPhotos.length > 0 ? optimizedPhotos[0] : null;
        const photos = optimizedPhotos.length > 0 ? JSON.stringify(optimizedPhotos) : null;

        let latitude = ad.map?.lat || 0;
        let longitude = ad.map?.lon || 0;
        let city = ad.location?.cityName || 'Київ';
        let region = ad.location?.regionName || 'Київська';

        if (!latitude || !longitude) {
          const resolved = resolveLocationCoords(city, region);
          latitude = resolved.lat;
          longitude = resolved.lng;
          region = resolved.region;
        }

        const nearest = findNearestCity(latitude, longitude);

        let price = 0;
        let currency = 'USD';
        let price_uah = 0;

        if (ad.price?.regularPrice) {
          const rp = ad.price.regularPrice;
          const rawVal = parseFloat(String(rp.value)) || 0;
          if (rp.currencyCode === 'UAH') {
            price_uah = rawVal;
            price = Math.round(rawVal / UAH_TO_USD_RATE);
            currency = 'UAH';
          } else if (rp.currencyCode === 'USD') {
            price = rawVal;
            price_uah = Math.round(rawVal * UAH_TO_USD_RATE);
            currency = 'USD';
          } else {
            price = rawVal;
            price_uah = Math.round(rawVal * UAH_TO_USD_RATE);
            currency = rp.currencyCode;
          }
        }

        let area_total: number | null = null;
        let area_land: number | null = null;
        let rooms: number | null = null;
        let floors: number | null = null;

        if (ad.params) {
          for (const p of ad.params) {
            if (p.key === 'total_area') area_total = parseFloat(p.normalizedValue);
            if (p.key === 'land_area') area_land = parseFloat(p.normalizedValue);
            if (p.key === 'number_of_rooms') rooms = parseInt(p.normalizedValue, 10);
            if (p.key === 'number_of_floors') floors = parseInt(p.normalizedValue, 10);
          }
        }

        const verifiedDealType = classifyAndValidateDealType(dealType, source_url, title, undefined, price, price_uah);

        // STRICT FILTER: skip ads that don't match the requested deal type
        if (verifiedDealType !== dealType) {
          console.log(`[OLX-FILTER] ❌ Відкинуто: "${title.substring(0, 60)}" (визначено як ${verifiedDealType}, очікувалось ${dealType}) URL: ${source_url}`);
          continue;
        }

        parsedAds.push({
          external_id,
          source: 'olx',
          deal_type: verifiedDealType,
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
          address: `${city}, ${region}`,
          area_total,
          area_land,
          rooms,
          floors,
          year_built: null,
          photo_url,
          photos,
          source_url,
          nearest_city: nearest.city,
          distance_to_city: nearest.distance,
        });
      }
    } else {
      // 2. DOM Parser Fallback (from rendered cards)
      $('[data-cy="l-card"]').each((_, el) => {
        const card = $(el);
        const title = card.find('h4, h6').text().trim();
        const priceText = card.find('[data-testid="ad-price"]').text().trim();
        const locationDate = card.find('[data-testid="location-date"]').text().trim();
        const href = card.find('a').attr('href') || '';
        const rawPhoto = card.find('img').attr('src');
        const photo_url = optimizePhotoUrl(rawPhoto);

        if (!title || !priceText) return;

        const idMatch = href.match(/ID([a-zA-Z0-9]+)\.html/) || card.attr('id')?.match(/(\d+)/);
        const external_id = idMatch ? `olx_${idMatch[1]}` : `olx_${Math.random().toString(36).substring(2, 9)}`;

        const locationParts = locationDate.split(' - ')[0].split(',').map(s => s.trim());
        const city = locationParts[0] || 'Київ';
        const district = locationParts[1] || null;

        const { price, price_uah, currency } = parsePriceString(priceText);
        const source_url = href ? (href.startsWith('http') ? href : `https://www.olx.ua${href}`) : null;

        const resolved = resolveLocationCoords(city);
        const nearest = findNearestCity(resolved.lat, resolved.lng);

        // Try extracting square meters or rooms from title
        let area_total: number | null = null;
        let rooms: number | null = null;
        const areaMatch = title.match(/(\d+)\s*(?:м²|кв\.?\s*м|м2)/i);
        if (areaMatch) area_total = parseFloat(areaMatch[1]);
        const roomsMatch = title.match(/(\d+)\s*кімн/i);
        if (roomsMatch) rooms = parseInt(roomsMatch[1], 10);

        const verifiedDealType = classifyAndValidateDealType(dealType, source_url, title, priceText, price, price_uah);

        // STRICT FILTER: skip ads that don't match the requested deal type
        if (verifiedDealType !== dealType) {
          console.log(`[OLX-FILTER] ❌ Відкинуто: "${title.substring(0, 60)}" (визначено як ${verifiedDealType}, очікувалось ${dealType}) URL: ${source_url}`);
          return; // skip this card in .each()
        }

        parsedAds.push({
          external_id,
          source: 'olx',
          deal_type: verifiedDealType,
          title,
          description: title,
          price,
          currency,
          price_uah,
          latitude: resolved.lat,
          longitude: resolved.lng,
          region: resolved.region,
          city,
          district,
          address: `${city}, ${resolved.region}`,
          area_total,
          area_land: null,
          rooms,
          floors: null,
          year_built: null,
          photo_url,
          photos: photo_url ? JSON.stringify([photo_url]) : null,
          source_url,
          nearest_city: nearest.city,
          distance_to_city: nearest.distance,
        });
      });
    }

    const duration = ((Date.now() - startFetchTime) / 1000).toFixed(2);
    console.log(`[OLX-SYSTEM] ✅ Оброблено сторінку ${page} за ${duration}s. Знайдено об'єктів: ${parsedAds.length}`);

    const hasMore = parsedAds.length > 0;
    return { ads: parsedAds, hasMore };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown OLX error';
    console.error(`[OLX] Error scraping page ${page}:`, msg);
    return { ads: [], hasMore: false, error: msg };
  }
}

/**
 * Inserts or updates a batch of parsed ads into the local SQLite database.
 */
async function insertAds(ads: ParsedOlxAd[]): Promise<number> {
  if (ads.length === 0) return 0;

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
      deal_type = excluded.deal_type,
      updated_at = CURRENT_TIMESTAMP
  `;

  const tx = await db.transaction('write');
  let insertedCount = 0;
  for (const ad of ads) {
    try {
      await tx.execute({
        sql,
        args: [
          ad.external_id, ad.source, ad.deal_type, ad.title, ad.description, ad.price, ad.currency, ad.price_uah,
          ad.latitude, ad.longitude, ad.region, ad.city, ad.district, ad.address,
          ad.area_total, ad.area_land, ad.rooms, ad.floors, ad.year_built,
          ad.photo_url, ad.photos, ad.source_url, ad.nearest_city, ad.distance_to_city,
        ],
      });
      insertedCount++;
    } catch (e) {
      console.error(`[OLX] Error inserting ad ${ad.external_id}:`, e);
    }
  }
  await tx.commit();

  return insertedCount;
}

/**
 * Synchronizes a single page of OLX listings.
 */
export async function syncOLX(dealType: 'sale' | 'rent', page = 1) {
  try {
    const { ads, hasMore, error } = await parseOLXPage(dealType, page);

    if (error && ads.length === 0) {
      return { success: false, count: 0, totalAdsFound: 0, hasMore: false, message: error };
    }

    if (ads.length === 0) {
      return { success: true, count: 0, totalAdsFound: 0, hasMore: false, message: 'Більше оголошень не знайдено' };
    }

    const insertedCount = await insertAds(ads);

    return {
      success: true,
      count: insertedCount,
      totalAdsFound: ads.length,
      hasMore,
      message: `Успішно зібрано ${insertedCount} будинків з OLX (стор. ${page})`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OLX] Sync error:', error);
    return { success: false, count: 0, totalAdsFound: 0, hasMore: false, message: msg };
  }
}

/**
 * Synchronizes all available pages of OLX listings.
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

  console.log(`[OLX] Starting full sync: ${dealType}, max ${maxPages} pages`);

  for (let page = 1; page <= maxPages; page++) {
    try {
      const { ads, hasMore, error } = await parseOLXPage(dealType, page);

      if (error && ads.length === 0) {
        console.warn(`[OLX] Page ${page} stopped: ${error}`);
        break;
      }

      if (ads.length === 0) {
        break;
      }

      const insertedCount = await insertAds(ads);
      totalInserted += insertedCount;
      totalFound += ads.length;
      pagesScraped++;

      console.log(`[OLX-SYSTEM] 💾 Збережено: ${insertedCount} з ${ads.length} на сторінці ${page}. Всього: ${totalInserted}`);

      if (!hasMore) {
        break;
      }

      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PAGES_MS));
      }
    } catch (error: unknown) {
      console.error(`[OLX] Page ${page} exception:`, error);
      break;
    }
  }

  const success = totalInserted > 0 || pagesScraped > 0;
  const message = success
    ? `Зібрано ${totalFound} оголошень з ${pagesScraped} сторінок OLX, додано/оновлено ${totalInserted}`
    : `Не вдалося отримати оголошення з OLX. Спробуйте пізніше або скористайтеся кнопкою «Відновити базу».`;

  console.log(`[OLX-SYSTEM] 🎉 СИНХРОНІЗАЦІЯ ЗАВЕРШЕНА! ${message}`);

  return {
    success,
    totalInserted,
    totalFound,
    pagesScraped,
    message,
  };
}

/**
 * Synchronizes ALL OLX listings for BOTH sale and rent categories.
 * First scrapes all sale pages, then all rent pages, for maximum coverage.
 */
export async function syncOLXBothCategories(
  maxPages = MAX_PAGES
): Promise<{
  success: boolean;
  sale: { inserted: number; found: number; pages: number };
  rent: { inserted: number; found: number; pages: number };
  message: string;
}> {
  console.log(`[OLX] 🚀 Starting FULL sync: Sale + Rent, max ${maxPages} pages each`);

  // 1. Sync all Sale pages
  const saleResult = await syncOLXAllPages('sale', maxPages);

  // Small pause between categories
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 2. Sync all Rent pages
  const rentResult = await syncOLXAllPages('rent', maxPages);

  const totalInserted = saleResult.totalInserted + rentResult.totalInserted;
  const totalFound = saleResult.totalFound + rentResult.totalFound;
  const success = saleResult.success || rentResult.success;

  const message = success
    ? `OLX: Купівля — ${saleResult.totalFound} знайдено (${saleResult.pagesScraped} стор.), Оренда — ${rentResult.totalFound} знайдено (${rentResult.pagesScraped} стор.). Всього додано: ${totalInserted}`
    : 'Не вдалося отримати оголошення з OLX.';

  console.log(`[OLX-SYSTEM] 🎉 ПОВНА СИНХРОНІЗАЦІЯ ЗАВЕРШЕНА! ${message}`);

  return {
    success,
    sale: { inserted: saleResult.totalInserted, found: saleResult.totalFound, pages: saleResult.pagesScraped },
    rent: { inserted: rentResult.totalInserted, found: rentResult.totalFound, pages: rentResult.pagesScraped },
    message,
  };
}
