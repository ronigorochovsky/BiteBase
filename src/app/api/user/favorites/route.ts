import { db } from "@/db";
import { userFavorites, recipes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  let user: { userId: string };
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const rows = await db
    .select({ recipe: recipes })
    .from(userFavorites)
    .innerJoin(recipes, eq(userFavorites.recipe_id, recipes.id))
    .where(and(eq(userFavorites.user_id, user.userId), eq(recipes.status, "published")));

  return Response.json({ recipes: rows.map((r) => r.recipe) });
}

export async function POST(request: Request) {
  let user: { userId: string };
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { recipeId } = await request.json();
  if (!recipeId) return Response.json({ error: "recipeId required" }, { status: 400 });

  await db
    .insert(userFavorites)
    .values({ user_id: user.userId, recipe_id: recipeId })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  let user: { userId: string };
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { recipeId } = await request.json();
  if (!recipeId) return Response.json({ error: "recipeId required" }, { status: 400 });

  await db
    .delete(userFavorites)
    .where(and(eq(userFavorites.user_id, user.userId), eq(userFavorites.recipe_id, recipeId)));

  return Response.json({ ok: true });
}
