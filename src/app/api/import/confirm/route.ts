import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/auth";
import { db } from "@/db";
import { recipes, restaurants } from "@/db/schema";
import { generateSlug } from "@/lib/utils";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, source_url, image_url, recipe, restaurant } = body;

    if (type === "recipe" && recipe) {
      const id = randomUUID();
      const slug = generateSlug(recipe.title, id);

      await db.insert(recipes).values({
        id,
        slug,
        title: recipe.title,
        category: recipe.category ?? "other",
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tips: recipe.tips,
        source_url,
        image_url: image_url ?? null,
        status: "published",
      });

      return Response.json({ ok: true, type: "recipe", slug });
    }

    if (type === "restaurant" && restaurant) {
      const id = randomUUID();
      const slug = generateSlug(restaurant.name, id);

      await db.insert(restaurants).values({
        id,
        slug,
        name: restaurant.name,
        area: restaurant.area ?? "other",
        concept: restaurant.concept,
        description: restaurant.description,
        address: restaurant.address,
        price_range: restaurant.price_range,
        source_url,
        image_url: image_url ?? null,
        status: "published",
      });

      return Response.json({ ok: true, type: "restaurant", slug });
    }

    return Response.json({ error: "Invalid payload" }, { status: 400 });
  } catch (err) {
    console.error("Confirm error:", err);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
}
