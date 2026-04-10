/**
 * sync-recipes.mjs
 *
 * True upsert sync: reads recipes_output.json + recipes_output_2.json and
 * ensures every record exists in Neon DB with all enriched fields.
 *
 * Dedup strategy: match by source_url
 *   → If found: UPDATE only null/empty fields (image_url, etc.)
 *   → If not found: INSERT with deterministic slug (title + hash of source_url)
 *
 * Safe to re-run — idempotent.
 *
 * Usage:
 *   node --env-file=.env.local scripts/sync-recipes.mjs
 */

import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

const VALID_CATEGORIES = [
  "starters", "soups", "salads", "beef", "chicken",
  "fish", "carbs_sides", "desserts", "drinks", "other",
];
const VALID_SUBCATEGORIES = [
  "slow_cooking", "stir_fry", "oven", "rice_dishes",
  "pasta_pizza_dough", "cooked_vegetables", "alcoholic", "smoothies", "other",
];

function deterministicSlug(title, sourceUrl) {
  const key = sourceUrl || title;
  const hash = createHash("md5").update(key).digest("hex").slice(0, 8);
  const ascii = title
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii ? `${ascii}-${hash}` : hash;
}

function loadJsonFile(filename) {
  const path = join(__dirname, "..", filename);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  // Merge both JSON files; deduplicate by source_url (later file wins)
  const file1 = loadJsonFile("recipes_output.json");
  const file2 = loadJsonFile("recipes_output_2.json");

  const byUrl = new Map();
  for (const r of [...file1, ...file2]) {
    if (r.name && typeof r.name === "string") {
      const key = r.source_url || r.name;
      byUrl.set(key, r);
    }
  }

  const records = [...byUrl.values()];
  console.log(
    `Syncing ${records.length} recipes (${file1.length} from recipes_output.json, ${file2.length} from recipes_output_2.json)...\n`
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, item] of records.entries()) {
    const title = item.name;
    const source_url = item.source_url ?? "";
    const category = VALID_CATEGORIES.includes(item.category) ? item.category : "other";
    const subcategory =
      item.subcategory && VALID_SUBCATEGORIES.includes(item.subcategory)
        ? item.subcategory
        : null;
    const ingredients = Array.isArray(item.ingredients)
      ? item.ingredients.join("\n")
      : (item.ingredients ?? null);
    const steps = Array.isArray(item.instructions)
      ? item.instructions.join("\n")
      : (item.instructions ?? null);
    const image_url = item.image_url ?? null;

    process.stdout.write(`[${i + 1}/${records.length}] ${title}...`);

    try {
      // Step 1: find existing by source_url
      let existing = [];
      if (source_url) {
        existing = await sql`
          SELECT id, image_url, ingredients, steps
          FROM recipes WHERE source_url = ${source_url} LIMIT 1
        `;
      }
      if (existing.length === 0) {
        existing = await sql`
          SELECT id, image_url, ingredients, steps
          FROM recipes WHERE title = ${title} LIMIT 1
        `;
      }

      if (existing.length > 0) {
        const row = existing[0];
        const hasNewData =
          (image_url && !row.image_url) ||
          (ingredients && !row.ingredients) ||
          (steps && !row.steps);

        if (!hasNewData) {
          process.stdout.write(" [skipped — already complete]\n");
          skipped++;
          continue;
        }

        await sql`
          UPDATE recipes SET
            image_url   = COALESCE(image_url,   ${image_url}),
            ingredients = COALESCE(ingredients, ${ingredients}),
            steps       = COALESCE(steps,       ${steps}),
            updated_at  = NOW()
          WHERE id = ${row.id}
        `;
        process.stdout.write(" [updated]\n");
        updated++;
      } else {
        // INSERT new
        const slug = deterministicSlug(title, source_url);

        await sql`
          INSERT INTO recipes (
            slug, title, category, subcategory,
            ingredients, steps, source_url, image_url,
            status, created_at, updated_at
          ) VALUES (
            ${slug},
            ${title},
            ${category}::recipe_category,
            ${subcategory}::recipe_subcategory,
            ${ingredients},
            ${steps},
            ${source_url},
            ${image_url},
            'published'::entry_status,
            NOW(),
            NOW()
          )
          ON CONFLICT (slug) DO UPDATE SET
            image_url   = COALESCE(recipes.image_url,   EXCLUDED.image_url),
            ingredients = COALESCE(recipes.ingredients, EXCLUDED.ingredients),
            steps       = COALESCE(recipes.steps,       EXCLUDED.steps),
            updated_at  = NOW()
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
Total    : ${records.length}
`);
}

main().catch(console.error);
