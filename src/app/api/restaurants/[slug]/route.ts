import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/restaurants/[slug]
export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const body = await request.json();

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
      user_rating: body.user_rating ?? null,
      updated_at: new Date(),
    })
    .where(eq(restaurants.slug, params.slug));

  return Response.json({ ok: true });
}

// DELETE /api/restaurants/[slug]
export async function DELETE(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  await db.delete(restaurants).where(eq(restaurants.slug, params.slug));
  return Response.json({ ok: true });
}
