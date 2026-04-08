import type { MetadataRoute } from "next";
import { db } from "@/db";
import { recipes, restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allRecipes, allRestaurants] = await Promise.all([
    db.select({ slug: recipes.slug, updated_at: recipes.updated_at })
      .from(recipes)
      .where(eq(recipes.status, "published")),
    db.select({ slug: restaurants.slug, updated_at: restaurants.updated_at })
      .from(restaurants)
      .where(eq(restaurants.status, "published")),
  ]);

  const recipeEntries: MetadataRoute.Sitemap = allRecipes.map((r) => ({
    url: `${BASE_URL}/recipes/${r.slug}`,
    lastModified: r.updated_at,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const restaurantEntries: MetadataRoute.Sitemap = allRestaurants.map((r) => ({
    url: `${BASE_URL}/restaurants/${r.slug}`,
    lastModified: r.updated_at,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/recipes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/restaurants`, changeFrequency: "daily", priority: 0.9 },
    ...recipeEntries,
    ...restaurantEntries,
  ];
}
