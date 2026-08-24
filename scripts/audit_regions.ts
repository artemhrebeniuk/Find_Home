import db, { setupDb } from '../src/lib/db';
import { REGIONS, haversineDistance } from '../src/lib/geo';

// Mapping Russian region names to Ukrainian canonical
const REGION_RU_TO_UA: Record<string, string> = {
  'киевская': 'київська',
  'одесская': 'одеська', 
  'харьковская': 'харківська',
  'львовская': 'львівська',
  'днепропетровская': 'дніпропетровська',
  'запорожская': 'запорізька',
  'винницкая': 'вінницька',
  'полтавская': 'полтавська',
  'черниговская': 'чернігівська',
  'черкасская': 'черкаська',
  'сумская': 'сумська',
  'житомирская': 'житомирська',
  'кировоградская': 'кіровоградська',
  'ровенская': 'рівненська',
  'ривненская': 'рівненська',
  'хмельницкая': 'хмельницька',
  'тернопольская': 'тернопільська',
  'ивано-франковская': 'івано-франківська',
  'волынская': 'волинська',
  'закарпатская': 'закарпатська',
  'николаевская': 'миколаївська',
  'херсонская': 'херсонська',
  'черновицкая': 'чернівецька',
  'луганская': 'луганська',
  'донецкая': 'донецька',
};

function normalizeRegionName(name: string): string {
  const lower = name.toLowerCase().trim()
    .replace(/область$/i, '').trim()
    .replace(/ська$/i, '').replace(/зька$/i, '');
  
  // Try mapping from Russian
  for (const [ru, ua] of Object.entries(REGION_RU_TO_UA)) {
    if (lower.includes(ru.replace(/ская$/i, '').replace(/ая$/i, ''))) {
      return ua.replace(/ська$/i, '').replace(/зька$/i, '');
    }
  }
  return lower;
}

async function audit() {
  await setupDb();

  const result = await db.execute(
    'SELECT id, city, region, address, latitude, longitude, nearest_city, distance_to_city, source_url FROM houses ORDER BY id'
  );
  const rows = result.rows;
  console.log('Total listings:', rows.length);

  // Now let's find REAL mismatches
  // Look for cases where:
  // 1. Region says "Луганська" but coordinates are in completely different part of Ukraine
  // 2. Settlement name matches wrong homonym (e.g., Герасимівка exists in multiple oblasts)
  
  const realMismatches: any[] = [];
  const homonymIssues: any[] = [];

  for (const row of rows) {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    const recordedRegion = String(row.region || '');
    const city = String(row.city || '');

    if (!lat || !lng || !recordedRegion) continue;

    // Find the ACTUAL region from coordinates
    let actualRegion: string | null = null;
    let actualRegionObj: any = null;
    for (const r of REGIONS) {
      const { sw, ne } = r.bounds;
      if (lat >= sw[0] && lat <= ne[0] && lng >= sw[1] && lng <= ne[1]) {
        actualRegion = r.name;
        actualRegionObj = r;
        break;
      }
    }

    if (!actualRegion) continue;

    // Normalize both for real comparison  
    const normRecorded = normalizeRegionName(recordedRegion);
    const normActual = normalizeRegionName(actualRegion);

    // Skip if they're actually the same after normalization
    if (normRecorded === normActual) continue;
    // Skip Kyiv special cases
    if ((normRecorded.includes('київ') || normRecorded.includes('киев')) && 
        (normActual.includes('київ') || normActual.includes('житомир'))) continue;
    if ((normActual.includes('київ') || normRecorded.includes('київ')) && 
        normRecorded.includes('житомир')) continue;

    // This is a REAL mismatch - coordinates place it in a different oblast!
    const distToActualCenter = actualRegionObj ? 
      haversineDistance(lat, lng, actualRegionObj.lat, actualRegionObj.lng) : 0;
    
    // Find which region the recorded name matches
    const matchedRecordedRegion = REGIONS.find(r => {
      const nrr = normalizeRegionName(r.name);
      return nrr === normRecorded || nrr.includes(normRecorded) || normRecorded.includes(nrr);
    });
    
    const distToRecordedCenter = matchedRecordedRegion ?
      haversineDistance(lat, lng, matchedRecordedRegion.lat, matchedRecordedRegion.lng) : 999;

    realMismatches.push({
      id: row.id,
      city,
      recordedRegion,
      actualRegion,
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      nearest_city: row.nearest_city,
      distance_km: row.distance_to_city,
      distToRecordedCenter: distToRecordedCenter.toFixed(0),
      distToActualCenter: distToActualCenter.toFixed(0),
      url: String(row.source_url || '').substring(0, 120),
    });
  }

  console.log('\n=== REAL MISMATCHES: Region label vs actual coordinates ===');
  console.log('Total real mismatches:', realMismatches.length);
  console.log('');

  // Sort by distance to recorded center (furthest = worst)
  realMismatches.sort((a, b) => Number(b.distToRecordedCenter) - Number(a.distToRecordedCenter));

  for (const m of realMismatches.slice(0, 60)) {
    console.log(
      `ID=${m.id} | "${m.city}" | DB says: ${m.recordedRegion} | Coords say: ${m.actualRegion} | dist to DB center: ${m.distToRecordedCenter}km | dist to actual center: ${m.distToActualCenter}km | nearest: ${m.nearest_city} ${m.distance_km}km`
    );
    console.log(`  URL: ${m.url}`);
  }

  // Now specifically search for the user's example: Герасимівка
  console.log('\n=== SPECIFIC: Listings with "Герасимівка" or "Герасимовка" ===');
  const gerasimivka = await db.execute(
    "SELECT id, city, region, address, latitude, longitude, nearest_city, distance_to_city, source_url FROM houses WHERE city LIKE '%ерасим%' OR address LIKE '%ерасим%'"
  );
  for (const row of gerasimivka.rows) {
    console.log(`ID=${row.id} | city="${row.city}" | region="${row.region}" | addr="${row.address}" | coords=${Number(row.latitude).toFixed(4)},${Number(row.longitude).toFixed(4)} | nearest=${row.nearest_city} ${row.distance_to_city}km`);
    console.log(`  URL: ${row.source_url}`);
  }
}

audit().catch(console.error);
