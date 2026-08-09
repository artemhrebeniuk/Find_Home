import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { HouseWithCRM } from '@/lib/types';

export async function GET(request: NextRequest) {

  const { searchParams } = request.nextUrl;

  const dealType = searchParams.get('deal_type') || 'sale';
  const region = searchParams.get('region');
  const priceMin = searchParams.get('price_min');
  const priceMax = searchParams.get('price_max');
  const statuses = searchParams.get('status');
  const bounds = searchParams.get('bounds');
  const sort = searchParams.get('sort') || 'price_asc';

  // Build query dynamically
  const conditions: string[] = ['h.is_active = 1', 'h.deal_type = ?'];
  const params: (string | number)[] = [dealType];

  if (region && region !== 'all') {
    conditions.push('h.region = ?');
    params.push(region);
  }

  if (priceMin) {
    conditions.push('h.price >= ?');
    params.push(Number(priceMin));
  }

  if (priceMax) {
    conditions.push('h.price <= ?');
    params.push(Number(priceMax));
  }

  if (statuses) {
    const statusList = statuses.split(',').filter(Boolean);
    if (statusList.length > 0) {
      const placeholders = statusList.map(() => '?').join(',');
      conditions.push(`(c.status IN (${placeholders}) OR (c.status IS NULL AND 'new' IN (${placeholders})))`);
      params.push(...statusList, ...statusList);
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
  let orderBy = 'h.price ASC';
  switch (sort) {
    case 'price_desc': orderBy = 'h.price DESC'; break;
    case 'distance': orderBy = 'h.distance_to_city ASC'; break;
    case 'date': orderBy = 'h.created_at DESC'; break;
    default: orderBy = 'h.price ASC';
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
    const houses = db.prepare(query).all(...params) as HouseWithCRM[];
    return NextResponse.json({ houses, count: houses.length });
  } catch (error) {
    console.error('Error fetching houses:', error);
    return NextResponse.json({ error: 'Failed to fetch houses' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // This wipes the houses table. Due to ON DELETE CASCADE or by clearing both, it will clear everything.
    // In our SQLite setup, house_crm does ON DELETE CASCADE, but let's be safe and clear both.
    db.prepare('DELETE FROM house_crm').run();
    db.prepare('DELETE FROM houses').run();
    
    return NextResponse.json({ success: true, message: 'Усі будинки видалено успішно' });
  } catch (error) {
    console.error('Error clearing database:', error);
    return NextResponse.json({ error: 'Failed to clear database' }, { status: 500 });
  }
}
