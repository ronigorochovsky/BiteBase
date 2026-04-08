import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

const VALID_CATEGORIES = [
  "starters","soups","salads","beef","chicken",
  "fish","carbs_sides","desserts","drinks","other"
];

const VALID_SUBCATEGORIES = [
  "slow_cooking","stir_fry","oven","rice_dishes",
  "pasta_pizza_dough","cooked_vegetables","alcoholic","smoothies","other"
];

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function generateSlug(title, id) {
  const idPrefix = id.replace(/-/g, "").slice(0, 8);
  const ascii = title
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
    readFileSync(join(__dirname, "../recipes_output.json"), "utf8")
  );

  // Filter out invalid entries
  const valid = data.filter(item => item.name && typeof item.name === "string");
  console.log(`Seeding ${valid.length} recipes (skipped ${data.length - valid.length} invalid)...\n`);

  let inserted = 0;
  let failed = 0;

  for (const [i, item] of valid.entries()) {
    const category = VALID_CATEGORIES.includes(item.category) ? item.category : "other";
    const subcategory = item.subcategory && VALID_SUBCATEGORIES.includes(item.subcategory)
      ? item.subcategory
      : null;

    const ingredients = Array.isArray(item.ingredients)
      ? item.ingredients.join("\n")
      : (item.ingredients ?? null);

    const steps = Array.isArray(item.instructions)
      ? item.instructions.join("\n")
      : (item.instructions ?? null);

    process.stdout.write(`[${i + 1}/${valid.length}] ${item.name} — fetching image...`);
    const image_url = await fetchOgImage(item.source_url);
    console.log(image_url ? " ✓" : " (no image)");

    const id = randomUUID();
    const slug = generateSlug(item.name, id);

    try {
      await sql`
        INSERT INTO recipes (id, slug, title, category, subcategory, ingredients, steps, source_url, image_url, status, created_at, updated_at)
        VALUES (
          ${id}::uuid,
          ${slug},
          ${item.name},
          ${category}::recipe_category,
          ${subcategory}::recipe_subcategory,
          ${ingredients},
          ${steps},
          ${item.source_url},
          ${image_url},
          'published'::entry_status,
          NOW(),
          NOW()
        )
        ON CONFLICT (slug) DO NOTHING
      `;
      inserted++;
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Failed: ${failed}`);
}

main().catch(console.error);
