import { db } from "@/db";
import { recipes, comments } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

async function getRecipeId(slug: string): Promise<string | null> {
  const result = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.status, "published")))
    .limit(1);
  return result[0]?.id ?? null;
}

// GET /api/recipes/[slug]/comments
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const recipeId = await getRecipeId(params.slug);
  if (!recipeId) return Response.json({ comments: [] });

  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.recipe_id, recipeId))
    .orderBy(asc(comments.created_at));

  return Response.json({ comments: rows });
}

// POST /api/recipes/[slug]/comments
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const recipeId = await getRecipeId(params.slug);
  if (!recipeId)
    return Response.json({ error: "Recipe not found" }, { status: 404 });

  const body = await request.json();
  const author_name = body.author_name?.trim();
  const content = body.content?.trim();

  if (!author_name || !content)
    return Response.json({ error: "Name and content required" }, { status: 400 });

  const [comment] = await db
    .insert(comments)
    .values({ recipe_id: recipeId, author_name, content })
    .returning();

  return Response.json({ comment }, { status: 201 });
}
