import { db } from "@/db";
import { restaurantRatings, restaurants } from "@/db/schema";
import { eq, and, avg, count } from "drizzle-orm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  let user: { userId: string };
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { restaurantId, rating } = await request.json();
  if (!restaurantId) return Response.json({ error: "restaurantId required" }, { status: 400 });

  if (rating === null || rating === undefined) {
    // Remove rating
    await db
      .delete(restaurantRatings)
      .where(and(eq(restaurantRatings.user_id, user.userId), eq(restaurantRatings.restaurant_id, restaurantId)));
  } else {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return Response.json({ error: "rating must be 1–5" }, { status: 400 });
    }

    await db
      .insert(restaurantRatings)
      .values({ user_id: user.userId, restaurant_id: restaurantId, rating: r })
      .onConflictDoUpdate({
        target: [restaurantRatings.user_id, restaurantRatings.restaurant_id],
        set: { rating: r, updated_at: new Date() },
      });
  }

  // Recompute average + count and update cached column
  const [aggResult] = await db
    .select({ average: avg(restaurantRatings.rating), total: count() })
    .from(restaurantRatings)
    .where(eq(restaurantRatings.restaurant_id, restaurantId));

  const newAverage = aggResult?.average ? Math.round(Number(aggResult.average)) : null;
  const totalRatings = aggResult?.total ?? 0;

  await db
    .update(restaurants)
    .set({ user_rating: newAverage })
    .where(eq(restaurants.id, restaurantId));

  return Response.json({ ok: true, newAverage, userRating: rating ?? null, totalRatings });
}
