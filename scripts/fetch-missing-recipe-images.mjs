/**
 * fetch-missing-recipe-images.mjs
 * For recipes with no image (or expired CDN URLs), re-fetches the Instagram/FB
 * thumbnail via Microlink and uploads it permanently to Vercel Blob.
 *
 * Free Microlink tier = 50 req/day, so this script processes up to 50 at a time.
 * Safe to re-run — skips recipes that already have a Blob image.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fetch-missing-recipe-images.mjs
 *   node --env-file=.env.local scripts/fetch-missing-recipe-images.mjs --limit=20
 */

import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

const sql = neon(process.env.DATABASE_URL);
const token = process.env.BLOB_READ_WRITE_TOKEN;
const LIMIT = parseInt(process.argv.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "50");

if (!token) { console.error("Missing BLOB_READ_WRITE_TOKEN"); process.exit(1); }

function isBlobUrl(url) {
  return url && url.includes(".public.blob.vercel-storage.com");
}

async function fetchImageViaLink(sourceUrl) {
  try {
    // Try og:image first (faster, no screenshot rendering)
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(sourceUrl)}&screenshot=false`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "BiteBase/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const imgUrl = data?.data?.image?.url ?? data?.data?.screenshot?.url ?? null;
    return imgUrl || null;
  } catch {
    return null;
  }
}

async function fetchScreenshot(sourceUrl) {
  try {
    // Fallback: request a full page screenshot
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(sourceUrl)}&screenshot=true`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "BiteBase/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.screenshot?.url ?? null;
  } catch {
    return null;
  }
}

async function uploadToBlob(imageUrl, recipeId, title) {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "BiteBase/1.0" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    const filename = `recipes/${title.slice(0, 40).replace(/\s+/g, "-")}-${recipeId.slice(0, 8)}.jpg`;
    const { url } = await put(filename, buffer, { access: "public", contentType, token });
    return url;
  } catch {
    return null;
  }
}

// Get recipes missing a permanent image
const rows = await sql`
  SELECT id, title, source_url, image_url
  FROM recipes
  WHERE source_url IS NOT NULL AND source_url != ''
    AND (
      image_url IS NULL
      OR (image_url NOT LIKE '%blob.vercel-storage.com%' AND image_url NOT LIKE 'data:%')
    )
  ORDER BY created_at DESC
  LIMIT ${LIMIT}
`;

console.log(`Found ${rows.length} recipes needing images (limit: ${LIMIT})\n`);

let ok = 0, failed = 0;

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const label = `[${i + 1}/${rows.length}] ${r.title.slice(0, 50)}`;
  process.stdout.write(`${label}... `);

  // Step 1: try og:image from Microlink
  let imgUrl = await fetchImageViaLink(r.source_url);

  // Step 2: fallback to screenshot
  if (!imgUrl) {
    process.stdout.write(`(screenshot) `);
    imgUrl = await fetchScreenshot(r.source_url);
  }

  if (!imgUrl) {
    console.log(`✗ no image found`);
    failed++;
    await new Promise(r => setTimeout(r, 1000));
    continue;
  }

  // Step 3: upload to Blob
  const blobUrl = await uploadToBlob(imgUrl, r.id, r.title);
  if (blobUrl) {
    await sql`UPDATE recipes SET image_url = ${blobUrl} WHERE id = ${r.id}`;
    console.log(`✓`);
    ok++;
  } else {
    console.log(`✗ upload failed`);
    failed++;
  }

  // Respect Microlink rate limit
  await new Promise(r => setTimeout(r, 1200));
}

console.log(`\n=== Done ===`);
console.log(`  Saved  : ${ok}`);
console.log(`  Failed : ${failed}`);
console.log(`  Remaining: run again to continue`);
