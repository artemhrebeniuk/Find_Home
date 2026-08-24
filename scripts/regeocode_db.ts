import db, { setupDb } from '../src/lib/db';
import { resolveLocationCoords, findNearestCity, normalizeSettlementName } from '../src/lib/geo';

async function regeocodeAll() {
  await setupDb();

  const result = await db.execute(
    'SELECT id, external_id, source, deal_type, title, description, city, region, address, source_url, latitude, longitude FROM houses ORDER BY id'
  );
  const rows = result.rows;
  console.log(`Total listings to re-geocode: ${rows.length}`);

  let updatedCount = 0;
  let regionFixCount = 0;

  for (const row of rows) {
    const id = row.id;
    const rawCity = String(row.city || '');
    const currentRegion = String(row.region || '');
    const title = String(row.title || '');
    const sourceUrl = String(row.source_url || '');
    const desc = String(row.description || '');

    // Resolve with upgraded contextual engine
    const resolved = resolveLocationCoords(rawCity, currentRegion, `${title} ${desc}`, sourceUrl);
    const nearest = findNearestCity(resolved.lat, resolved.lng);
    const cleanCity = normalizeSettlementName(rawCity);

    const regionChanged = resolved.region !== currentRegion;
    if (regionChanged) {
      regionFixCount++;
      console.log(`FIX ID=${id} "${cleanCity}": Region "${currentRegion}" -> "${resolved.region}" | Nearest: ${nearest.city} (${nearest.distance}km) | Title: "${title.substring(0, 50)}"`);
    }

    await db.execute({
      sql: `UPDATE houses SET 
        city = ?,
        region = ?,
        latitude = ?,
        longitude = ?,
        nearest_city = ?,
        distance_to_city = ?,
        address = ?
      WHERE id = ?`,
      args: [
        cleanCity,
        resolved.region,
        resolved.lat,
        resolved.lng,
        nearest.city,
        nearest.distance,
        `${cleanCity}, ${resolved.region}`,
        id
      ]
    });
    updatedCount++;
  }

  console.log(`\n=== RE-GEOCODING COMPLETED ===`);
  console.log(`Total listings processed: ${updatedCount}`);
  console.log(`Region corrections applied: ${regionFixCount}`);
}

regeocodeAll().catch(console.error);
