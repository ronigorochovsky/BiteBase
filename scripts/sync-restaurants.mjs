/**
 * sync-restaurants.mjs
 *
 * True upsert sync: reads restaurant_output.json and ensures every record
 * exists in Neon DB with all enriched fields (lat, lng, address, etc.).
 *
 * Dedup strategy:
 *   1. Match by source_url (if non-empty)
 *   2. Fall back to match by name
 *   → If found: UPDATE only null/empty fields (never overwrite good data)
 *   → If not found: INSERT with deterministic slug (name + hash of source_url)
 *
 * Safe to re-run — idempotent.
 *
 * Usage:
 *   node --env-file=.env.local scripts/sync-restaurants.mjs
 */

import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

const VALID_AREAS = [
  "jerusalem", "tel_aviv", "hasharon", "haifa", "binyamina",
  "north", "south", "shfela", "center", "eilat", "other",
];

function deterministicSlug(name, sourceUrl) {
  const key = sourceUrl || name;
  const hash = createHash("md5").update(key).digest("hex").slice(0, 8);
  const ascii = name
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii ? `${ascii}-${hash}` : hash;
}

async function main() {
  const data = JSON.parse(
    readFileSync(join(__dirname, "../restaurant_output.json"), "utf8")
  );

  const valid = data.filter((r) => r.name && typeof r.name === "string");
  console.log(`Syncing ${valid.length} restaurants to Neon DB...\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, item] of valid.entries()) {
    const name = item.name;
    const source_url = item.source_url ?? "";
    const area = VALID_AREAS.includes(item.area) ? item.area : "other";

    process.stdout.write(`[${i + 1}/${valid.length}] ${name}...`);

    try {
      // Step 1: Find existing record
      let existing = [];
      if (source_url) {
        existing = await sql`
          SELECT id, lat, lng, address, phone, opening_hours, image_url, status
          FROM restaurants WHERE source_url = ${source_url} LIMIT 1
        `;
      }
      if (existing.length === 0) {
        existing = await sql`
          SELECT id, lat, lng, address, phone, opening_hours, image_url, status
          FROM restaurants WHERE name = ${name} LIMIT 1
        `;
      }

      if (existing.length > 0) {
        const row = existing[0];

        // Skip soft-deleted records — never re-publish them
        if (row.status === "rejected") {
          process.stdout.write(" [skipped — deleted]\n");
          skipped++;
          continue;
        }

        // Only update null/empty fields — never overwrite good data
        const hasNewData =
          (item.lat != null && row.lat == null) ||
          (item.lng != null && row.lng == null) ||
          (item.address && !row.address) ||
          (item.phone && !row.phone) ||
          (item.opening_hours && !row.opening_hours) ||
          (item.image_url && !row.image_url);

        if (!hasNewData) {
          process.stdout.write(" [skipped — already complete]\n");
          skipped++;
          continue;
        }

        await sql`
          UPDATE restaurants SET
            lat            = COALESCE(lat,           ${item.lat ?? null}),
            lng            = COALESCE(lng,           ${item.lng ?? null}),
            address        = COALESCE(address,       ${item.address ?? null}),
            phone          = COALESCE(phone,         ${item.phone ?? null}),
            opening_hours  = COALESCE(opening_hours, ${item.opening_hours ?? null}),
            image_url      = COALESCE(image_url,     ${item.image_url ?? null}),
            maps_url       = COALESCE(maps_url,      ${item.maps_url ?? null}),
            website_url    = COALESCE(website_url,   ${item.website_url ?? null}),
            google_score   = COALESCE(google_score,  ${item.google_score ?? null}),
            updated_at     = NOW()
          WHERE id = ${row.id}
        `;
        process.stdout.write(" [updated]\n");
        updated++;
      } else {
        // INSERT new record with deterministic slug
        const slug = deterministicSlug(name, source_url);

        await sql`
          INSERT INTO restaurants (
            slug, name, area, concept, description,
            address, source_url, image_url,
            website_url, maps_url, opening_hours, phone, google_score,
            lat, lng,
            status, created_at, updated_at
          ) VALUES (
            ${slug},
            ${name},
            ${area}::restaurant_area,
            ${item.style ?? null},
            ${item.notes ?? null},
            ${item.address ?? null},
            ${source_url},
            ${item.image_url ?? null},
            ${item.website_url ?? null},
            ${item.maps_url ?? null},
            ${item.opening_hours ?? null},
            ${item.phone ?? null},
            ${item.google_score ?? null},
            ${item.lat ?? null},
            ${item.lng ?? null},
            'published'::entry_status,
            NOW(),
            NOW()
          )
          ON CONFLICT (slug) DO UPDATE SET
            lat           = COALESCE(restaurants.lat,           EXCLUDED.lat),
            lng           = COALESCE(restaurants.lng,           EXCLUDED.lng),
            address       = COALESCE(restaurants.address,       EXCLUDED.address),
            phone         = COALESCE(restaurants.phone,         EXCLUDED.phone),
            opening_hours = COALESCE(restaurants.opening_hours, EXCLUDED.opening_hours),
            image_url     = COALESCE(restaurants.image_url,     EXCLUDED.image_url),
            updated_at    = NOW()
        `;
        process.stdout.write(" [inserted]\n");
        inserted++;
      }
    } catch (err) {
      process.stdout.write(` [FAILED: ${err.message.slice(0, 80)}]\n`);
      failed++;
    }
  }

  console.log(`
=== SYNC COMPLETE ===
Inserted : ${inserted}
Updated  : ${updated}
Skipped  : ${skipped}
Failed   : ${failed}
Total    : ${valid.length}
`);
}

main().catch(console.error);
