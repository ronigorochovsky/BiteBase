import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Only runs in development — Vercel filesystem is read-only
function syncRestaurantJson(
  action: "update" | "delete",
  identifier: { source_url: string; name: string },
  updates?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "production") return;
  const jsonPath = join(process.cwd(), "restaurant_output.json");
  if (!existsSync(jsonPath)) return;
  try {
    const data: Record<string, unknown>[] = JSON.parse(readFileSync(jsonPath, "utf8"));
    const idx = data.findIndex(
      (r) => r.source_url === identifier.source_url || r.name === identifier.name
    );
    if (idx === -1) return;

    if (action === "delete") {
      data.splice(idx, 1);
    } else if (action === "update" && updates) {
      const entry = { ...data[idx] };
      // Map DB field names → JSON field names (only update fields present in body)
      if (updates.name !== undefined)          entry.name          = updates.name;
      if (updates.concept !== undefined)        entry.style         = updates.concept; // JSON uses 'style'
      if (updates.description !== undefined)    entry.notes         = updates.description;
      if (updates.address !== undefined)        entry.address       = updates.address;
      if (updates.phone !== undefined)          entry.phone         = updates.phone;
      if (updates.opening_hours !== undefined)  entry.opening_hours = updates.opening_hours;
      if (updates.website_url !== undefined)    entry.website_url   = updates.website_url;
      if (updates.maps_url !== undefined)       entry.maps_url      = updates.maps_url;
      if (updates.image_url !== undefined)      entry.image_url     = updates.image_url;
      if (updates.google_score !== undefined)   entry.google_score  = updates.google_score;
      // user_rating is now managed by /api/user/ratings — not synced from PATCH
      data[idx] = entry;
    }

    writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[restaurant JSON sync error]", err);
  }
}

// PATCH /api/restaurants/[slug]
export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const body = await request.json();

  // Fetch current record before update (needed for JSON sync identifier)
  const [current] = await db
    .select({ source_url: restaurants.source_url, name: restaurants.name })
    .from(restaurants)
    .where(eq(restaurants.slug, params.slug))
    .limit(1);

  await db
    .update(restaurants)
    .set({
      name: body.name,
      area: body.area as never,
      concept: body.concept || null,
      description: body.description || null,
      address: body.address || null,
      phone: body.phone || null,
      opening_hours: body.opening_hours || null,
      website_url: body.website_url || null,
      maps_url: body.maps_url || null,
      google_score: body.google_score || null,
      price_range: body.price_range || null,
      source_url: body.source_url || "",
      image_url: body.image_url || null,
      updated_at: new Date(),
    })
    .where(eq(restaurants.slug, params.slug));

  if (current) {
    syncRestaurantJson("update", current, body);
  }

  // Auto-geocode when address is updated
  if (body.address) {
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(body.address)}&format=json&limit=1`,
        { headers: { "User-Agent": "BiteBase/1.0" } }
      );
      const results = await geo.json();
      if (results[0]) {
        await db
          .update(restaurants)
          .set({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) })
          .where(eq(restaurants.slug, params.slug));
      }
    } catch { /* non-fatal — geocode failure shouldn't block the save */ }
  }

  return Response.json({ ok: true });
}

// DELETE /api/restaurants/[slug]
export async function DELETE(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const [current] = await db
    .select({ source_url: restaurants.source_url, name: restaurants.name })
    .from(restaurants)
    .where(eq(restaurants.slug, params.slug))
    .limit(1);

  // Soft delete: mark as rejected so sync scripts don't re-insert it
  await db
    .update(restaurants)
    .set({ status: "rejected" as never })
    .where(eq(restaurants.slug, params.slug));

  if (current) {
    syncRestaurantJson("delete", current);
  }

  return Response.json({ ok: true });
}
