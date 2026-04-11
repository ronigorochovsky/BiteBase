import { db } from "@/db";
import { restaurantRatings, restaurants } from "@/db/schema";
import { eq, and, avg } from "drizzle-orm";
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

  // Recompute average and update cached column
  const [avgResult] = await db
    .select({ average: avg(restaurantRatings.rating) })
    .from(restaurantRatings)
    .where(eq(restaurantRatings.restaurant_id, restaurantId));

  const newAverage = avgResult?.average ? Math.round(Number(avgResult.average)) : null;

  await db
    .update(restaurants)
    .set({ user_rating: newAverage })
    .where(eq(restaurants.id, restaurantId));

  return Response.json({ ok: true, newAverage, userRating: rating ?? null });
}
