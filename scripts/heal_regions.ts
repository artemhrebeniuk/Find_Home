/**
 * Healing script: fix existing DB records where region is in Russian
 * or where region doesn't match the coordinates (homonym bug).
 */
import db, { setupDb } from '../src/lib/db';
import { REGIONS, haversineDistance, canonicalRegion } from '../src/lib/geo';

async function heal() {
  await setupDb();

  const result = await db.execute(
    'SELECT id, city, region, latitude, longitude FROM houses ORDER BY id'
  );
  const rows = result.rows;
  console.log(`Total listings to check: ${rows.length}`);

  let fixedRussianCount = 0;
  let fixedMismatchCount = 0;

  for (const row of rows) {
    const id = row.id;
    const region = String(row.region || '');
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);

    // 1. Normalize Russian → Ukrainian
    const canonical = canonicalRegion(region);
    if (canonical && canonical !== region) {
      await db.execute({
        sql: 'UPDATE houses SET region = ? WHERE id = ?',
        args: [canonical, id],
      });
      fixedRussianCount++;
      continue; // Don't double-check after normalization
    }

    // 2. Check if region matches coordinates
    if (!lat || !lng || !region) continue;

    let actualRegion: string | null = null;
    for (const r of REGIONS) {
      const { sw, ne } = r.bounds;
      if (lat >= sw[0] && lat <= ne[0] && lng >= sw[1] && lng <= ne[1]) {
        actualRegion = r.name;
        break;
      }
    }

    if (!actualRegion) continue;

    const normRecorded = canonicalRegion(region) || region;
    if (normRecorded !== actualRegion) {
      // Only fix if the distance suggests a real mismatch
      const matchedRecordedRegion = REGIONS.find(r => r.name === normRecorded);
      if (matchedRecordedRegion) {
        const distToRecorded = haversineDistance(lat, lng, matchedRecordedRegion.lat, matchedRecordedRegion.lng);
        const actualRegionObj = REGIONS.find(r => r.name === actualRegion);
        const distToActual = actualRegionObj ? haversineDistance(lat, lng, actualRegionObj.lat, actualRegionObj.lng) : 999;
        
        // If coordinates are significantly closer to the actual region center, fix it
        if (distToActual < distToRecorded * 0.7) {
          console.log(
            `FIX ID=${id}: "${row.city}" ${region} → ${actualRegion} (dist to old: ${distToRecorded.toFixed(0)}km, dist to new: ${distToActual.toFixed(0)}km)`
          );
          await db.execute({
            sql: 'UPDATE houses SET region = ? WHERE id = ?',
            args: [actualRegion, id],
          });
          fixedMismatchCount++;
        }
      }
    }
  }

  console.log(`\n=== HEALING COMPLETE ===`);
  console.log(`Russian → Ukrainian name fixes: ${fixedRussianCount}`);
  console.log(`Coordinate mismatch fixes: ${fixedMismatchCount}`);
  console.log(`Total fixed: ${fixedRussianCount + fixedMismatchCount}`);
}

heal().catch(console.error);
