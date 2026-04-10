/**
 * Patches missing image_url on DB restaurants by matching source_url against
 * restaurant_output.json (which already has image_url from Microlink).
 * No API calls — purely reads from the JSON file.
 *
 * Usage: node --env-file=.env.local scripts/patch-restaurant-images-from-json.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

const json = JSON.parse(readFileSync(join(__dirname, "../restaurant_output.json"), "utf8"));
const imageMap = new Map();
for (const item of json) {
  if (item.source_url && item.image_url) {
    imageMap.set(item.source_url, item.image_url);
  }
}
console.log(`JSON entries with images: ${imageMap.size}`);

const rows = await sql`SELECT id, name, source_url FROM restaurants WHERE image_url IS NULL AND source_url != ''`;
console.log(`DB restaurants missing image: ${rows.length}`);

let updated = 0;
for (const row of rows) {
  const img = imageMap.get(row.source_url);
  if (img) {
    await sql`UPDATE restaurants SET image_url = ${img} WHERE id = ${row.id}`;
    console.log(`✓ ${row.name}`);
    updated++;
  }
}

console.log(`\nDone! Updated: ${updated}, No match in JSON: ${rows.length - updated}`);
