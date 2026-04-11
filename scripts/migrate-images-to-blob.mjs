/**
 * migrate-images-to-blob.mjs
 * Downloads all existing recipe images from Instagram/FB CDN and re-uploads
 * them to Vercel Blob for permanent storage. Safe to re-run — skips Blob URLs.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-images-to-blob.mjs
 */

import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

const sql = neon(process.env.DATABASE_URL);
const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.error("Missing BLOB_READ_WRITE_TOKEN in .env.local");
  process.exit(1);
}

function isBlobUrl(url) {
  return url.includes(".public.blob.vercel-storage.com");
}

async function uploadImageToBlob(imageUrl, filename) {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "BiteBase/1.0" },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    const { url } = await put(filename, buffer, {
      access: "public",
      contentType,
      token,
    });
    return url;
  } catch {
    return null;
  }
}

const rows = await sql`
  SELECT id, title, image_url
  FROM recipes
  WHERE image_url IS NOT NULL
  ORDER BY created_at ASC
`;

const toMigrate = rows.filter((r) => !isBlobUrl(r.image_url));
console.log(`Found ${rows.length} recipes with images — ${toMigrate.length} need migration, ${rows.length - toMigrate.length} already on Blob.\n`);

let ok = 0, skipped = 0, failed = 0;

for (let i = 0; i < toMigrate.length; i++) {
  const recipe = toMigrate[i];
  const label = `[${i + 1}/${toMigrate.length}] ${recipe.title.slice(0, 50)}`;

  process.stdout.write(`${label}... `);

  const filename = `recipes/${recipe.title.slice(0, 40).replace(/\s+/g, "-")}-${recipe.id.slice(0, 8)}.jpg`;
  const blobUrl = await uploadImageToBlob(recipe.image_url, filename);

  if (blobUrl) {
    await sql`UPDATE recipes SET image_url = ${blobUrl} WHERE id = ${recipe.id}`;
    console.log(`✓`);
    ok++;
  } else {
    console.log(`✗ (image expired or unreachable)`);
    failed++;
  }

  // Small delay to avoid hitting rate limits
  if (i < toMigrate.length - 1) await new Promise((r) => setTimeout(r, 300));
}

console.log(`\n=== Migration complete ===`);
console.log(`  Migrated : ${ok}`);
console.log(`  Failed   : ${failed} (image URLs already expired)`);
console.log(`  Skipped  : ${skipped} (already on Blob)`);
