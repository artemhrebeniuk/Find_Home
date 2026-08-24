import { NextRequest, NextResponse } from 'next/server';
import db, { setupDb } from '@/lib/db';
import { fetchListingDetail } from '@/lib/olx';

/**
 * GET /api/houses/[id]/photos
 * Returns the full high-resolution photo gallery for a house.
 * If only 1 preview photo exists in the database, it automatically scrapes
 * and caches all 5-30 photos from the original listing page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const houseId = parseInt(id, 10);

    if (!houseId || isNaN(houseId)) {
      return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });
    }

    await setupDb();
    const result = await db.execute({
      sql: 'SELECT id, source, source_url, photo_url, photos, description FROM houses WHERE id = ?',
      args: [houseId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 });
    }

    const house = result.rows[0];
    let photos: string[] = [];

    if (typeof house.photos === 'string' && house.photos.trim()) {
      try {
        photos = JSON.parse(house.photos);
      } catch {
        photos = house.photo_url ? [String(house.photo_url)] : [];
      }
    } else if (house.photo_url) {
      photos = [String(house.photo_url)];
    }

    // If we already have multiple photos cached, return immediately
    if (photos.length > 1) {
      return NextResponse.json({
        success: true,
        photos,
        description: house.description,
        count: photos.length,
        cached: true,
      });
    }

    // If only 1 photo or no photos, fetch the full gallery from source URL
    const sourceUrl = house.source_url ? String(house.source_url) : '';
    if (sourceUrl && (house.source === 'olx' || sourceUrl.includes('olx.ua'))) {
      console.log(`[PHOTOS-API] 🔍 Fetching full gallery for house #${houseId}: ${sourceUrl}`);
      const detail = await fetchListingDetail(sourceUrl);

      if (detail.photos.length > 0) {
        photos = detail.photos;
        const newDescription = detail.description || house.description;

        // Cache in SQLite/Turso database
        await db.execute({
          sql: `
            UPDATE houses 
            SET photos = ?,
                description = CASE WHEN LENGTH(COALESCE(?, '')) > LENGTH(COALESCE(description, '')) THEN ? ELSE description END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [JSON.stringify(photos), newDescription, newDescription, houseId],
        });

        console.log(`[PHOTOS-API] 💾 Cached ${photos.length} photos for house #${houseId}`);

        return NextResponse.json({
          success: true,
          photos,
          description: newDescription,
          count: photos.length,
          cached: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      photos,
      description: house.description,
      count: photos.length,
      cached: true,
    });
  } catch (error) {
    console.error('[PHOTOS-API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
