import { db } from "@/db";
import { recipes } from "@/db/schema";
import { inArray, eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams
    .get("ids")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  if (ids.length === 0) return Response.json({ recipes: [] });

  const items = await db
    .select()
    .from(recipes)
    .where(and(inArray(recipes.id, ids), eq(recipes.status, "published")));

  return Response.json({ recipes: items });
}
