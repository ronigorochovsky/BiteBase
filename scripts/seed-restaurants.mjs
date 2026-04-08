import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

const VALID_AREAS = [
  "jerusalem", "tel_aviv", "hasharon", "haifa", "binyamina",
  "north", "south", "shfela", "center", "eilat", "other",
];

function generateSlug(name, id) {
  const idPrefix = id.replace(/-/g, "").slice(0, 8);
  const ascii = name
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii ? `${ascii}-${idPrefix}` : idPrefix;
}

async function main() {
  const data = JSON.parse(
    readFileSync(join(__dirname, "../restaurant_output.json"), "utf8")
  );

  const valid = data.filter((item) => item.name && typeof item.name === "string");
  console.log(`Seeding ${valid.length} restaurants (skipped ${data.length - valid.length} invalid)...\n`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, item] of valid.entries()) {
    const area = VALID_AREAS.includes(item.area) ? item.area : "other";
    const id = randomUUID();
    const slug = generateSlug(item.name, id);

    process.stdout.write(`[${i + 1}/${valid.length}] ${item.name}...`);

    try {
      const result = await sql`
        INSERT INTO restaurants (
          id, slug, name, area, concept, description,
          address, source_url, image_url,
          website_url, maps_url, opening_hours, phone, google_score,
          status, created_at, updated_at
        )
        VALUES (
          ${id}::uuid,
          ${slug},
          ${item.name},
          ${area}::restaurant_area,
          ${item.style ?? null},
          ${item.notes ?? null},
          ${item.address ?? null},
          ${item.source_url ?? ""},
          ${item.image_url ?? null},
          ${item.website_url ?? null},
          ${item.maps_url ?? null},
          ${item.opening_hours ?? null},
          ${item.phone ?? null},
          ${item.google_score ?? null},
          'published'::entry_status,
          NOW(),
          NOW()
        )
        ON CONFLICT (slug) DO NOTHING
      `;
      if (result.count === 0) {
        console.log(" (slug conflict, skipped)");
        skipped++;
      } else {
        console.log(" ✓");
        inserted++;
      }
    } catch (err) {
      console.error(` ✗ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
