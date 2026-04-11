import { Suspense } from "react";
import { db } from "@/db";
import { recipes, userFavorites } from "@/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import type { RecipeCategory, RecipeSubcategory } from "@/db/schema";
import { RECIPE_CATEGORY_LABELS, RECIPE_CATEGORIES } from "@/lib/constants";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeTabs } from "@/components/RecipeTabs";
import { FavoritesList } from "@/components/FavoritesList";
import { SearchBar } from "@/components/SearchBar";
import { Navbar } from "@/components/Navbar";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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

  const [items, session] = await Promise.all([
    db.select().from(recipes).where(and(...conditions)).orderBy(desc(recipes.created_at)),
    getSession(),
  ]);

  // Load user's favorite IDs
  let favIds = new Set<string>();
  if (session.userId) {
    const favRows = await db
      .select({ recipe_id: userFavorites.recipe_id })
      .from(userFavorites)
      .where(eq(userFavorites.user_id, session.userId));
    favIds = new Set(favRows.map((r) => r.recipe_id));
  }

  const rowPad = items.length === 0 ? 3 : (3 - (items.length % 3)) % 3;
  const minPad = Math.max(0, 6 - items.length);
  const padCount = Math.max(rowPad, minPad);

  return (
    <div className="relative">
      {items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-10 py-20">
          <div className="text-5xl mb-4">🥘</div>
          <p className="text-lg">אין מתכונים עדיין בקטגוריה זו</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} initialIsFav={favIds.has(recipe.id)} />
        ))}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-${i}`} className="flex flex-col rounded-2xl bg-white border border-stone-200 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
            <div className="h-48 bg-stone-100" />
            <div className="p-4 flex-1" />
          </div>
        ))}
      </div>
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
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-10 flex-1">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{categoryLabel ?? "מתכונים"}</h1>
          <p className="text-gray-500">
            {categoryLabel ? `מתכונים בקטגוריית ${categoryLabel}` : "כל המתכונים שלנו"}
          </p>
        </div>

        <div className="grid gap-8 items-start lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* ── Sticky right sidebar (filters) ── */}
          <aside className="hidden lg:block sticky top-[72px] self-start">
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">סינון</p>
              <Suspense>
                <RecipeTabs />
              </Suspense>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="min-w-0">
            <Suspense>
              <MobileFilterDrawer label="סינון לפי קטגוריה">
                <RecipeTabs />
              </MobileFilterDrawer>
            </Suspense>
            <div className="mb-6">
              <Suspense>
                <SearchBar placeholder="חיפוש לפי שם, מצרכים..." />
              </Suspense>
            </div>
            {category === "favorites" ? (
              <FavoritesList />
            ) : (
              <Suspense
                fallback={
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="rounded-2xl bg-white border border-stone-200 overflow-hidden animate-pulse">
                        <div className="h-48 bg-stone-200" />
                        <div className="p-4 flex flex-col gap-2">
                          <div className="h-3 bg-stone-200 rounded w-1/3" />
                          <div className="h-5 bg-stone-200 rounded w-3/4" />
                          <div className="h-3 bg-stone-200 rounded w-full" />
                          <div className="h-3 bg-stone-200 rounded w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
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
