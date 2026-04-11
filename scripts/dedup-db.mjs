/**
 * dedup-db.mjs
 *
 * Cleans duplicate restaurants and recipes from Neon DB.
 *
 * RESTAURANTS:
 *   - Same name, same location (locs=1): keep the most complete record, delete the rest.
 *   - Same name, different locations (chain): keep ONE canonical record, merge extra
 *     locations into its extra_locations JSON field, delete the rest.
 *
 * RECIPES:
 *   - Same title: keep the most complete record (has image_url > has steps > oldest), delete rest.
 *
 * Usage:
 *   node --env-file=.env.local scripts/dedup-db.mjs
 *   node --env-file=.env.local scripts/dedup-db.mjs --dry-run
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const DRY_RUN = process.argv.includes("--dry-run");
if (DRY_RUN) console.log("=== DRY RUN — no changes will be made ===\n");

// How far apart (in degrees) two coordinates must be to count as different locations
// ~0.005° ≈ 500m — smaller than this = same place
const COORD_THRESHOLD = 0.005;

function coordsAreDifferent(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lat2) return false;
  return Math.abs(lat1 - lat2) > COORD_THRESHOLD || Math.abs(lng1 - lng2) > COORD_THRESHOLD;
}

/** Score a restaurant record by completeness — higher = more complete */
function restaurantScore(r) {
  return (r.lat ? 4 : 0) + (r.address ? 3 : 0) + (r.image_url ? 2 : 0) +
    (r.opening_hours ? 1 : 0) + (r.phone ? 1 : 0) + (r.description ? 1 : 0);
}

/** Score a recipe record by completeness */
function recipeScore(r) {
  return (r.image_url ? 4 : 0) + (r.steps ? 3 : 0) + (r.ingredients ? 2 : 0) +
    (r.description ? 1 : 0) + (r.tips ? 1 : 0);
}

async function dedupRestaurants() {
  console.log("=== RESTAURANTS ===\n");

  // Fetch all restaurants grouped by name
  const groups = await sql`
    SELECT name FROM restaurants
    WHERE status = 'published'
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY name
  `;

  let deletedTotal = 0;
  let mergedChains = 0;

  for (const { name } of groups) {
    const records = await sql`
      SELECT id, slug, name, lat, lng, address, area, image_url, opening_hours, phone,
             description, source_url, concept, extra_locations, created_at
      FROM restaurants
      WHERE name = ${name} AND status = 'published'
      ORDER BY created_at ASC
    `;

    if (records.length <= 1) continue;

    // Group records by location cluster
    const clusters = [];
    for (const rec of records) {
      let placed = false;
      for (const cluster of clusters) {
        const ref = cluster[0];
        if (!coordsAreDifferent(ref.lat, ref.lng, rec.lat, rec.lng)) {
          cluster.push(rec);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push([rec]);
    }

    if (clusters.length === 1) {
      // True duplicates — all same location, keep most complete, delete rest
      const sorted = [...records].sort((a, b) => recipeScore(b) - restaurantScore(b) + restaurantScore(a) - recipeScore(a) || 0)
        .sort((a, b) => restaurantScore(b) - restaurantScore(a));
      const keep = sorted[0];
      const deleteIds = sorted.slice(1).map((r) => r.id);

      console.log(`[DUP] ${name} (${records.length}x same location) → keep ${keep.slug}, delete ${deleteIds.length}`);
      if (!DRY_RUN) {
        for (const id of deleteIds) {
          await sql`DELETE FROM restaurants WHERE id = ${id}`;
        }
      }
      deletedTotal += deleteIds.length;
    } else {
      // Chain — different real locations
      // Pick best canonical record from each cluster, then choose overall canonical
      const clusterBests = clusters.map((cluster) =>
        cluster.sort((a, b) => restaurantScore(b) - restaurantScore(a))[0]
      );
      const canonical = clusterBests.sort((a, b) => restaurantScore(b) - restaurantScore(a))[0];

      // Extra locations = all cluster bests except canonical
      const extraLocs = clusterBests
        .filter((r) => r.id !== canonical.id)
        .map((r) => ({ lat: r.lat, lng: r.lng, address: r.address, area: r.area }));

      // All records to delete = everyone except the canonical
      const deleteIds = records.filter((r) => r.id !== canonical.id).map((r) => r.id);

      console.log(`[CHAIN] ${name} (${clusters.length} locations) → canonical: ${canonical.slug} | extra: ${extraLocs.map(l => l.address || `${l.lat?.toFixed(3)},${l.lng?.toFixed(3)}`).join('; ')} | delete ${deleteIds.length}`);

      if (!DRY_RUN) {
        // Save extra locations onto canonical
        await sql`
          UPDATE restaurants
          SET extra_locations = ${JSON.stringify(extraLocs)},
              updated_at = NOW()
          WHERE id = ${canonical.id}
        `;
        for (const id of deleteIds) {
          await sql`DELETE FROM restaurants WHERE id = ${id}`;
        }
      }
      deletedTotal += deleteIds.length;
      mergedChains++;
    }
  }

  console.log(`\nRestaurants: deleted ${deletedTotal}, merged ${mergedChains} chains\n`);
}

async function dedupRecipes() {
  console.log("=== RECIPES ===\n");

  const groups = await sql`
    SELECT title FROM recipes
    WHERE status = 'published'
    GROUP BY title
    HAVING COUNT(*) > 1
    ORDER BY title
  `;

  let deletedTotal = 0;

  for (const { title } of groups) {
    const records = await sql`
      SELECT id, slug, title, image_url, steps, ingredients, description, tips, created_at
      FROM recipes
      WHERE title = ${title} AND status = 'published'
      ORDER BY created_at ASC
    `;

    if (records.length <= 1) continue;

    const sorted = [...records].sort((a, b) => recipeScore(b) - recipeScore(a));
    const keep = sorted[0];
    const deleteIds = sorted.slice(1).map((r) => r.id);

    console.log(`[DUP] ${title} (${records.length}x) → keep ${keep.slug}, delete ${deleteIds.length}`);
    if (!DRY_RUN) {
      for (const id of deleteIds) {
        await sql`DELETE FROM recipes WHERE id = ${id}`;
      }
    }
    deletedTotal += deleteIds.length;
  }

  console.log(`\nRecipes: deleted ${deletedTotal}\n`);
}

async function main() {
  await dedupRestaurants();
  await dedupRecipes();

  // Final count
  const [{ rc }] = await sql`SELECT COUNT(*) as rc FROM restaurants WHERE status='published'`;
  const [{ rcc }] = await sql`SELECT COUNT(*) as rcc FROM recipes WHERE status='published'`;
  console.log(`\n=== FINAL DB STATE ===`);
  console.log(`Restaurants: ${rc}`);
  console.log(`Recipes:     ${rcc}`);
}

main().catch(console.error);
