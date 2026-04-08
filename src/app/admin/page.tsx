import Link from "next/link";
import { db } from "@/db";
import { recipes, restaurants } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — BiteBase" };

async function getStats() {
  const [recipeCount, restaurantCount, recentRecipes, recentRestaurants] =
    await Promise.all([
      db.select({ value: count() }).from(recipes).where(eq(recipes.status, "published")),
      db.select({ value: count() }).from(restaurants).where(eq(restaurants.status, "published")),
      db.select({ id: recipes.id, title: recipes.title, slug: recipes.slug, created_at: recipes.created_at })
        .from(recipes)
        .where(eq(recipes.status, "published"))
        .orderBy(desc(recipes.created_at))
        .limit(5),
      db.select({ id: restaurants.id, name: restaurants.name, slug: restaurants.slug, created_at: restaurants.created_at })
        .from(restaurants)
        .where(eq(restaurants.status, "published"))
        .orderBy(desc(restaurants.created_at))
        .limit(5),
    ]);

  return {
    recipeCount: recipeCount[0]?.value ?? 0,
    restaurantCount: restaurantCount[0]?.value ?? 0,
    recentRecipes,
    recentRestaurants,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">דשבורד</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-3xl font-bold text-brand-600">{stats.recipeCount}</p>
          <p className="text-sm text-gray-500 mt-1">מתכונים</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-3xl font-bold text-emerald-600">{stats.restaurantCount}</p>
          <p className="text-sm text-gray-500 mt-1">מסעדות</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/admin/add"
          className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl p-5 transition-colors text-center"
        >
          <div className="text-2xl mb-1">➕</div>
          <p className="font-semibold">הוסף URL חדש</p>
          <p className="text-sm text-brand-100 mt-0.5">הדבק קישור מאינסטגרם / פייסבוק</p>
        </Link>
        <Link
          href="/admin/import"
          className="bg-white hover:bg-stone-50 border border-stone-200 rounded-xl p-5 transition-colors text-center"
        >
          <div className="text-2xl mb-1">📁</div>
          <p className="font-semibold text-gray-900">ייבוא WhatsApp</p>
          <p className="text-sm text-gray-500 mt-0.5">העלה קובץ .txt מייצוא צ׳אט</p>
        </Link>
      </div>

      {/* Recent entries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {stats.recentRecipes.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-700 mb-3">מתכונים אחרונים</h2>
            <ul className="space-y-2">
              {stats.recentRecipes.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/recipes/${r.slug}`}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {stats.recentRestaurants.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-700 mb-3">מסעדות אחרונות</h2>
            <ul className="space-y-2">
              {stats.recentRestaurants.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/restaurants/${r.slug}`}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
