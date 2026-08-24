import db, { setupDb } from '../src/lib/db';
import { fetchListingDetail } from '../src/lib/olx';

async function populateAllGalleries() {
  await setupDb();

  const res = await db.execute(
    `SELECT id, source, source_url, photos, photo_url, title FROM houses WHERE source = 'olx' ORDER BY id DESC`
  );
  const houses = res.rows;
  console.log(`Total OLX houses to process: ${houses.length}`);

  let updatedCount = 0;
  for (let i = 0; i < houses.length; i++) {
    const h = houses[i];
    let existingCount = 0;
    try {
      const parsed = JSON.parse(String(h.photos || '[]'));
      existingCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      existingCount = h.photo_url ? 1 : 0;
    }

    if (existingCount > 1) {
      // Already has full gallery
      continue;
    }

    const sourceUrl = String(h.source_url || '');
    if (!sourceUrl || !sourceUrl.startsWith('http')) continue;

    console.log(`[${i + 1}/${houses.length}] Fetching gallery for #${h.id} "${String(h.title).substring(0, 45)}"...`);
    try {
      const detail = await fetchListingDetail(sourceUrl);
      if (detail.photos.length > 0) {
        await db.execute({
          sql: `
            UPDATE houses 
            SET photos = ?,
                description = CASE WHEN LENGTH(COALESCE(?, '')) > LENGTH(COALESCE(description, '')) THEN ? ELSE description END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [JSON.stringify(detail.photos), detail.description, detail.description, h.id],
        });
        updatedCount++;
        console.log(`  ✅ Saved ${detail.photos.length} photos for #${h.id}`);
      } else {
        console.log(`  ⚠️ No photos extracted for #${h.id}`);
      }
    } catch (e) {
      console.warn(`  ❌ Failed for #${h.id}:`, e);
    }
  }

  console.log(`\n🎉 Gallery population complete! Updated ${updatedCount} houses.`);
}

populateAllGalleries().catch(console.error);
