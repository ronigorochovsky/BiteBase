import { db } from "@/db";
import { recipes } from "@/db/schema";
import { generateSlug } from "@/lib/utils";
import { RECIPE_CATEGORY_LABELS, RECIPE_SUBCATEGORY_LABELS } from "@/lib/constants";
import { extractFromUrl } from "@/lib/claude-extractor";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const maxDuration = 60;

const JSON_PATH = join(process.cwd(), "recipes_output.json");

function readJson(): object[] {
  try { return JSON.parse(readFileSync(JSON_PATH, "utf8")); } catch { return []; }
}

async function saveRecipe(entry: {
  name: string;
  category: string;
  subcategory?: string | null;
  ingredients?: string;
  steps?: string;
  source_url: string;
  image_url?: string | null;
}): Promise<string> {
  const id = randomUUID();
  const slug = generateSlug(entry.name, id);

  await db.insert(recipes).values({
    id,
    slug,
    title: entry.name,
    category: (entry.category ?? "other") as never,
    subcategory: (entry.subcategory ?? null) as never,
    ingredients: entry.ingredients || null,
    steps: entry.steps || null,
    source_url: entry.source_url,
    image_url: entry.image_url ?? null,
    status: "published",
  });

  // Append to JSON file (best-effort — Vercel has a read-only filesystem so this may fail)
  try {
    const cat = entry.category as keyof typeof RECIPE_CATEGORY_LABELS;
    const sub = entry.subcategory as keyof typeof RECIPE_SUBCATEGORY_LABELS | undefined;
    const existing = readJson();
    writeFileSync(JSON_PATH, JSON.stringify([
      ...existing,
      {
        name: entry.name,
        category: entry.category,
        subcategory: entry.subcategory ?? null,
        ingredients: entry.ingredients ? entry.ingredients.split("\n").filter(Boolean) : [],
        instructions: entry.steps ? entry.steps.split("\n").filter(Boolean) : [],
        source_url: entry.source_url,
        image_url: entry.image_url ?? null,
        category_he: RECIPE_CATEGORY_LABELS[cat] ?? "",
        subcategory_he: sub ? (RECIPE_SUBCATEGORY_LABELS[sub] ?? "") : "",
        sentAt: new Date().toLocaleString("he-IL"),
      },
    ], null, 2), "utf8");
  } catch {
    // Silently skip — DB insert above already succeeded
  }

  return slug;
}

// POST /api/add-recipe
// Auto mode: { url } → Microlink + Claude Vision extracts everything, saves, returns { ok, slug }
// Manual mode: { url, manual: true, title, category, subcategory, ingredients, steps }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    // ── Manual save ──
    if (body.manual) {
      const { title, category, subcategory, ingredients, steps, image_url } = body;
      if (!title) return Response.json({ error: "Title required" }, { status: 400 });

      const slug = await saveRecipe({
        name: title,
        category: category ?? "other",
        subcategory: subcategory || null,
        ingredients: ingredients || null,
        steps: steps || null,
        source_url: url || "",
        image_url: image_url || null,
      });
      return Response.json({ ok: true, slug });
    }

    if (!url) return Response.json({ error: "URL required" }, { status: 400 });

    // ── Auto extract via Microlink + Claude Vision ──
    const result = await extractFromUrl(url);

    if (result.type !== "recipe" || !result.recipe?.title) {
      return Response.json({ ok: false, failed: true });
    }

    const { recipe, imageUrl } = result;

    const slug = await saveRecipe({
      name: recipe.title,
      category: recipe.category ?? "other",
      subcategory: recipe.subcategory ?? null,
      ingredients: recipe.ingredients ?? undefined,
      steps: recipe.steps ?? undefined,
      source_url: url,
      image_url: imageUrl ?? null,
    });

    return Response.json({ ok: true, slug, title: recipe.title });
  } catch (err) {
    console.error("add-recipe error:", err);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
}
