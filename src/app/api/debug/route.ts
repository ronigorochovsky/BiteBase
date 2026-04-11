import { db } from "@/db";
import { recipes, restaurants } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const [recipeCount] = await db.select({ value: count() }).from(recipes).where(eq(recipes.status, "published"));
  const [restaurantCount] = await db.select({ value: count() }).from(restaurants).where(eq(restaurants.status, "published"));

  return Response.json({
    recipes: recipeCount.value,
    restaurants: restaurantCount.value,
    db: process.env.DATABASE_URL?.slice(0, 60) + "...",
  });
}
