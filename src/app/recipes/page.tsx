import { Suspense } from "react";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import type { RecipeCategory, RecipeSubcategory } from "@/db/schema";
import { RECIPE_CATEGORY_LABELS, RECIPE_CATEGORIES } from "@/lib/constants";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeTabs } from "@/components/RecipeTabs";
import { FavoritesList } from "@/components/FavoritesList";
import { SearchBar } from "@/components/SearchBar";
import { Navbar } from "@/components/Navbar";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מתכונים",
  description: "כל המתכונים — ממויינים לפי קטגוריה",
};

interface Props {
  searchParams: { category?: string; subcategory?: string; q?: string };
}

async function RecipeList({ category, subcategory, q }: { category?: string; subcategory?: string; q?: string }) {
  const conditions = [eq(recipes.status, "published")];

  if (category && RECIPE_CATEGORIES.includes(category as RecipeCategory)) {
    conditions.push(eq(recipes.category, category as RecipeCategory));
  }

  if (subcategory) {
    conditions.push(eq(recipes.subcategory, subcategory as RecipeSubcategory));
  }

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(recipes.title, term),
        ilike(recipes.description, term),
        ilike(recipes.ingredients, term)
      )!
    );
  }

  const items = await db
    .select()
    .from(recipes)
    .where(and(...conditions))
    .orderBy(desc(recipes.created_at));

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">🥘</div>
        <p className="text-lg">אין מתכונים עדיין בקטגוריה זו</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {items.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}

export default function RecipesPage({ searchParams }: Props) {
  const category = searchParams.category;
  const subcategory = searchParams.subcategory;
  const q = searchParams.q;
  const categoryLabel =
    category === "favorites"
      ? "מועדפים"
      : category
      ? RECIPE_CATEGORY_LABELS[category as RecipeCategory]
      : null;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-10 flex-1">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{categoryLabel ?? "מתכונים"}</h1>
          <p className="text-gray-500">
            {categoryLabel ? `מתכונים בקטגוריית ${categoryLabel}` : "כל המתכונים שלנו"}
          </p>
        </div>

        <div className="flex gap-8 items-start">
          {/* ── Sticky right sidebar (filters) ── */}
          <aside className="w-60 flex-shrink-0 hidden lg:block sticky top-[72px] self-start">
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">סינון</p>
              <Suspense>
                <RecipeTabs />
              </Suspense>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <Suspense>
                <SearchBar placeholder="חיפוש לפי שם, מצרכים..." />
              </Suspense>
            </div>
            {category === "favorites" ? (
              <FavoritesList />
            ) : (
              <Suspense
                fallback={<div className="text-center py-10 text-gray-400">טוען מתכונים...</div>}
              >
                <RecipeList category={category} subcategory={subcategory} q={q} />
              </Suspense>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
