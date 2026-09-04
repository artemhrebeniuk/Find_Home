import { NextRequest, NextResponse } from 'next/server';
import db, { setupDb } from '@/lib/db';
import { UKRAINE_SETTLEMENTS } from '@/lib/settlementsData';
import { MAJOR_CITIES, REGIONS, canonicalRegion } from '@/lib/geo';

export interface SettlementResult {
  name: string;
  region: string;
  count: number;
  lat: number;
  lng: number;
}

/**
 * GET /api/settlements
 * 
 * Returns settlements (cities, towns, villages) for filtering.
 * Merges active listings counts from the database with the comprehensive
 * UKRAINE_SETTLEMENTS dictionary.
 * 
 * Query Parameters:
 * - region: Optional filter by oblast name (e.g. 'Черкаська', 'Київська' or 'all')
 * - deal_type: Optional 'sale' | 'rent' to count houses for specific deal type
 * - q: Optional search substring for auto-completion
 */
export async function GET(request: NextRequest) {
  try {
    await setupDb();
    const { searchParams } = request.nextUrl;
    const regionParam = searchParams.get('region');
    const dealTypeParam = searchParams.get('deal_type');
    const queryParam = (searchParams.get('q') || '').trim().toLowerCase();

    const filterRegion = regionParam && regionParam !== 'all' ? canonicalRegion(regionParam) || regionParam : null;

    // 1. Fetch distinct settlements with house counts from DB
    const conditions: string[] = ['h.is_active = 1', 'h.city IS NOT NULL', 'LENGTH(TRIM(h.city)) > 0'];
    const params: (string | number)[] = [];

    if (dealTypeParam && (dealTypeParam === 'sale' || dealTypeParam === 'rent')) {
      conditions.push('h.deal_type = ?');
      params.push(dealTypeParam);
    }

    if (filterRegion) {
      conditions.push('h.region = ?');
      params.push(filterRegion);
    }

    const dbQuery = `
      SELECT 
        h.city as name,
        h.region,
        COUNT(*) as count,
        AVG(h.latitude) as lat,
        AVG(h.longitude) as lng
      FROM houses h
      WHERE ${conditions.join(' AND ')}
      GROUP BY h.city, h.region
      ORDER BY count DESC
    `;

    const dbResult = await db.execute({ sql: dbQuery, args: params });
    const settlementsMap = new Map<string, SettlementResult>();

    for (const row of dbResult.rows) {
      const name = String(row.name || '').trim();
      if (!name) continue;
      const key = `${name.toLowerCase()}__${String(row.region || '').toLowerCase()}`;
      settlementsMap.set(key, {
        name,
        region: String(row.region || ''),
        count: Number(row.count) || 0,
        lat: Number(row.lat) || 0,
        lng: Number(row.lng) || 0,
      });
    }

    // 2. Add settlements from MAJOR_CITIES
    for (const city of MAJOR_CITIES) {
      const rObj = REGIONS.find(r => r.id === city.region_id);
      const cityRegion = rObj ? rObj.name : '';
      if (filterRegion && cityRegion !== filterRegion) continue;

      const key = `${city.name.toLowerCase()}__${cityRegion.toLowerCase()}`;
      if (!settlementsMap.has(key)) {
        settlementsMap.set(key, {
          name: city.name,
          region: cityRegion,
          count: 0,
          lat: city.lat,
          lng: city.lng,
        });
      }
    }

    // 3. Add settlements from UKRAINE_SETTLEMENTS dictionary (870+ towns & villages)
    for (const [sName, sInfo] of Object.entries(UKRAINE_SETTLEMENTS)) {
      const normRegion = canonicalRegion(sInfo.region) || sInfo.region;
      if (filterRegion && normRegion !== filterRegion) continue;

      const key = `${sName.toLowerCase()}__${normRegion.toLowerCase()}`;
      if (!settlementsMap.has(key)) {
        settlementsMap.set(key, {
          name: sName,
          region: normRegion,
          count: 0,
          lat: sInfo.lat,
          lng: sInfo.lng,
        });
      }
    }

    // 4. Filter by search query if present
    let results = Array.from(settlementsMap.values());
    if (queryParam) {
      results = results.filter(s => 
        s.name.toLowerCase().includes(queryParam) ||
        s.region.toLowerCase().includes(queryParam)
      );
    }

    // 5. Sort: active listings first (by count DESC), then alphabetically by name
    results.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name, 'uk');
    });

    // Limit output to top 150 items to keep payload snappy
    const limitedResults = results.slice(0, 150);

    return NextResponse.json({
      settlements: limitedResults,
      total: results.length,
      hasActiveHouses: results.some(s => s.count > 0),
    });
  } catch (error) {
    console.error('Error in /api/settlements:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}
