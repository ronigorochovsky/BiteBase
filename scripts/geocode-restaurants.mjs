/**
 * Geocodes all restaurants that have an address but no lat/lng.
 * Uses Nominatim (OpenStreetMap) — free, no API key needed.
 * Rate-limited to 1 req/sec per Nominatim policy.
 *
 * Usage: node --env-file=.env.local scripts/geocode-restaurants.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const UA = "BiteBase/1.0 (personal food site)";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=il`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "he,en" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function main() {
  const rows = await sql`
    SELECT id, name, address
    FROM restaurants
    WHERE address IS NOT NULL AND (lat IS NULL OR lng IS NULL)
    ORDER BY created_at
  `;

  console.log(`Found ${rows.length} restaurants to geocode...\n`);

  let success = 0;
  let failed = 0;

  for (const [i, row] of rows.entries()) {
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.name} (${row.address})... `);
    await sleep(1100); // Nominatim: max 1 req/sec
    const coords = await geocode(row.address);
    if (coords) {
      await sql`UPDATE restaurants SET lat = ${coords.lat}, lng = ${coords.lng} WHERE id = ${row.id}`;
      console.log(`✓ (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      success++;
    } else {
      console.log("✗ (not found)");
      failed++;
    }
  }

  console.log(`\nDone! Geocoded: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
