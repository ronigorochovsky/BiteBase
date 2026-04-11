import { db } from "@/db";
import { restaurantRatings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  _request: Request,
  { params }: { params: { restaurantId: string } }
) {
  let user: { userId: string };
  try {
    user = await requireUser();
  } catch {
    return Response.json({ userRating: null });
  }

  const [row] = await db
    .select({ rating: restaurantRatings.rating })
    .from(restaurantRatings)
    .where(
      and(
        eq(restaurantRatings.user_id, user.userId),
        eq(restaurantRatings.restaurant_id, params.restaurantId)
      )
    )
    .limit(1);

  return Response.json({ userRating: row?.rating ?? null });
}
