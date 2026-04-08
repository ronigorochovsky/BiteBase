import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const items = await db
    .select()
    .from(recipes)
    .where(eq(recipes.status, "published"))
    .orderBy(desc(recipes.created_at));

  return Response.json(items);
}
