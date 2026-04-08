import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const items = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.status, "published"))
    .orderBy(desc(restaurants.created_at));

  return Response.json(items);
}
