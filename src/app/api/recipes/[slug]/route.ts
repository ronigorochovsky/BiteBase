import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const JSON_FILES = ["recipes_output_2.json", "recipes_output.json"];

// Only runs in development — Vercel filesystem is read-only
function syncRecipeJson(
  action: "update" | "delete",
  identifier: { source_url: string; title: string },
  updates?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "production") return;

  for (const fileName of JSON_FILES) {
    const jsonPath = join(process.cwd(), fileName);
    if (!existsSync(jsonPath)) continue;
    try {
      const data: Record<string, unknown>[] = JSON.parse(readFileSync(jsonPath, "utf8"));
      const idx = data.findIndex(
        (r) => r.source_url === identifier.source_url || r.name === identifier.title
      );
      if (idx === -1) continue; // not in this file

      if (action === "delete") {
        data.splice(idx, 1);
      } else if (action === "update" && updates) {
        const entry = { ...data[idx] };
        if (updates.title !== undefined)       entry.name         = updates.title;
        if (updates.category !== undefined)    entry.category     = updates.category;
        if (updates.subcategory !== undefined) entry.subcategory  = updates.subcategory;
        if (updates.description !== undefined) entry.description  = updates.description;
        if (updates.ingredients !== undefined) entry.ingredients  = updates.ingredients;
        if (updates.steps !== undefined)       entry.instructions = updates.steps;
        if (updates.tips !== undefined)        entry.tips         = updates.tips;
        if (updates.image_url !== undefined)   entry.image_url    = updates.image_url;
        if (updates.source_url !== undefined)  entry.source_url   = updates.source_url;
        data[idx] = entry;
      }

      writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
      break; // found and updated — no need to check remaining files
    } catch (err) {
      console.error(`[recipe JSON sync error in ${fileName}]`, err);
    }
  }
}

// PATCH /api/recipes/[slug]
export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const body = await request.json();

  const [current] = await db
    .select({ source_url: recipes.source_url, title: recipes.title })
    .from(recipes)
    .where(eq(recipes.slug, params.slug))
    .limit(1);

  await db
    .update(recipes)
    .set({
      title: body.title,
      category: body.category as never,
      subcategory: body.subcategory || null,
      description: body.description || null,
      ingredients: body.ingredients || null,
      steps: body.steps || null,
      tips: body.tips || null,
      source_url: body.source_url || "",
      image_url: body.image_url || null,
      updated_at: new Date(),
    })
    .where(eq(recipes.slug, params.slug));

  if (current) {
    syncRecipeJson("update", current, body);
  }

  return Response.json({ ok: true });
}

// DELETE /api/recipes/[slug]
export async function DELETE(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const [current] = await db
    .select({ source_url: recipes.source_url, title: recipes.title })
    .from(recipes)
    .where(eq(recipes.slug, params.slug))
    .limit(1);

  // Soft delete: mark as rejected so sync scripts don't re-insert it
  await db
    .update(recipes)
    .set({ status: "rejected" as never })
    .where(eq(recipes.slug, params.slug));

  if (current) {
    syncRecipeJson("delete", current);
  }

  return Response.json({ ok: true });
}
