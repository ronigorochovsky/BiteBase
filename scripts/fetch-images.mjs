import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function fetchImageViaLink(url) {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.image?.url ?? null;
  } catch {
    return null;
  }
}

async function main() {
  // Get all recipes with no image
  const rows = await sql`SELECT id, title, source_url FROM recipes WHERE image_url IS NULL ORDER BY created_at`;
  console.log(`Found ${rows.length} recipes without images.\n`);

  let updated = 0;
  let failed = 0;

  for (const [i, row] of rows.entries()) {
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.title} — `);
    const imageUrl = await fetchImageViaLink(row.source_url);

    if (imageUrl) {
      await sql`UPDATE recipes SET image_url = ${imageUrl}, updated_at = NOW() WHERE id = ${row.id}`;
      console.log("✓ got image");
      updated++;
    } else {
      console.log("✗ no image");
      failed++;
    }

    // Small delay to avoid rate limiting microlink.io (free tier: 50 req/day)
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone! Updated: ${updated}, No image found: ${failed}`);
}

main().catch(console.error);
