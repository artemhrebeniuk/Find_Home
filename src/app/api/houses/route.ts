import { NextRequest, NextResponse } from 'next/server';
import db, { setupDb } from '@/lib/db';
import type { HouseWithCRM } from '@/lib/types';

/**
 * GET /api/houses
 * 
 * Fetches houses from the local SQLite database based on various filters.
 * Returns joined data including CRM status and notes.
 * 
 * Query Parameters:
 * - deal_type: 'sale' or 'rent' (default: 'sale')
 * - region: Filter by specific region (default: all)
 * - price_min, price_max: Filter by USD price
 * - status: Comma-separated list of CRM statuses to include
 * - bounds: Geographical map boundaries (swLat,swLng,neLat,neLng)
 * - sort: 'price_asc', 'price_desc', 'distance', 'date'
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const dealType = searchParams.get('deal_type') || 'sale';
  const region = searchParams.get('region');
  const city = searchParams.get('city');
  const priceMin = searchParams.get('price_min');
  const priceMax = searchParams.get('price_max');
  const statuses = searchParams.get('status');
  const bounds = searchParams.get('bounds');
  const sort = searchParams.get('sort') || 'price_asc';

  // Build query dynamically
  const conditions: string[] = ['h.is_active = 1', 'h.deal_type = ?'];
  const params: (string | number)[] = [dealType];

  // Determine price column based on deal type (UAH for rent, USD for sale)
  const isRent = dealType === 'rent';
  const priceCol = isRent ? "CAST(COALESCE(h.price_uah, h.price * 41.5) AS REAL)" : "CAST(h.price AS REAL)";

  if (region && region !== 'all') {
    conditions.push('h.region = ?');
    params.push(region);
  }

  if (city && city !== 'all') {
    conditions.push('(h.city = ? COLLATE NOCASE OR h.city LIKE ? OR h.address LIKE ?)');
    params.push(city, `%${city}%`, `%${city}%`);
  }

  if (priceMin) {
    conditions.push(`${priceCol} >= ?`);
    params.push(Number(priceMin));
  }

  if (priceMax) {
    conditions.push(`${priceCol} <= ?`);
    params.push(Number(priceMax));
  }

  if (statuses) {
    const statusList = statuses.split(',').filter(Boolean);
    if (statusList.length > 0) {
      const placeholders = statusList.map(() => '?').join(',');
      if (statusList.includes('new')) {
        conditions.push(`(c.status IN (${placeholders}) OR c.status IS NULL)`);
      } else {
        conditions.push(`c.status IN (${placeholders})`);
      }
      params.push(...statusList);
    }
  }

  if (bounds) {
    const [swLat, swLng, neLat, neLng] = bounds.split(',').map(Number);
    if (!isNaN(swLat) && !isNaN(swLng) && !isNaN(neLat) && !isNaN(neLng)) {
      conditions.push('h.latitude BETWEEN ? AND ?');
      conditions.push('h.longitude BETWEEN ? AND ?');
      params.push(swLat, neLat, swLng, neLng);
    }
  }

  // Sort
  let orderBy = `${priceCol} ASC`;
  switch (sort) {
    case 'price_desc': orderBy = `${priceCol} DESC`; break;
    case 'distance': orderBy = 'h.distance_to_city ASC'; break;
    case 'date': orderBy = 'h.created_at DESC'; break;
    default: orderBy = `${priceCol} ASC`;
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      h.*,
      COALESCE(c.status, 'new') as crm_status,
      COALESCE(c.notes, '') as crm_notes
    FROM houses h
    LEFT JOIN house_crm c ON h.id = c.house_id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
  `;

  try {
    await setupDb();
    const result = await db.execute({ sql: query, args: params });
    const houses = result.rows as unknown as HouseWithCRM[];
    return NextResponse.json({ houses, count: houses.length });
  } catch (error) {
    console.error('Error fetching houses:', error);
    return NextResponse.json({ error: 'Failed to fetch houses' }, { status: 500 });
  }
}

/**
 * DELETE /api/houses
 * 
 * Performs smart database cleanup.
 * By default, preserves houses that have custom CRM statuses (favorite, call, viewing)
 * or personal notes so user shortlisted properties are never lost.
 * Pass ?all=true to perform a complete wipe.
 */
export async function DELETE(request: NextRequest) {
  try {
    await setupDb();
    const { searchParams } = request.nextUrl;
    const forceAll = searchParams.get('all') === 'true';

    if (forceAll) {
      await db.execute('DELETE FROM house_crm');
      await db.execute('DELETE FROM houses');
      return NextResponse.json({ success: true, message: 'Повністю очищено всю базу даних.' });
    }

    // Smart cleanup: delete only unstarred 'new' houses without personal notes
    await db.execute(`
      DELETE FROM houses 
      WHERE id NOT IN (
        SELECT house_id FROM house_crm 
        WHERE status IN ('favorite', 'call', 'viewing', 'archived') 
           OR (notes IS NOT NULL AND length(trim(notes)) > 0)
      )
    `);

    // Clean up orphan 'new' crm records without notes
    await db.execute(`
      DELETE FROM house_crm 
      WHERE status NOT IN ('favorite', 'call', 'viewing', 'archived') 
        AND (notes IS NULL OR length(trim(notes)) = 0)
    `);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Базу оновлено (ваші збережені будинки та нотатки збережено!)' 
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    return NextResponse.json({ error: 'Failed to clear database' }, { status: 500 });
  }
}
