import Link from "next/link";
import { db } from "@/db";
import { recipes, restaurants } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { AddRecipeSection } from "@/components/AddRecipeSection";
import { AddRestaurantSection } from "@/components/AddRestaurantSection";

export const dynamic = "force-dynamic";

async function getCounts() {
  const [recipeCount, restaurantCount] = await Promise.all([
    db
      .select({ value: count() })
      .from(recipes)
      .where(eq(recipes.status, "published")),
    db
      .select({ value: count() })
      .from(restaurants)
      .where(eq(restaurants.status, "published")),
  ]);
  return {
    recipes: recipeCount[0]?.value ?? 0,
    restaurants: restaurantCount[0]?.value ?? 0,
  };
}

export default async function HomePage() {
  const counts = await getCounts();

  return (
    <main id="main-content" className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-600 to-brand-700 text-white py-20 px-4 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight">🍽 BiteBase</h1>
        <p className="text-xl text-brand-100 max-w-md mx-auto">
          האוסף האישי שלי — מתכונים ומסעדות אהובות
        </p>
      </section>

      {/* Two columns: tiles + add sections */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Recipes column */}
          <div className="flex flex-col gap-4">
            <Link
              href="/recipes"
              className="group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-shadow border border-stone-200"
            >
              <div className="bg-purple-50 p-5 md:p-8 text-center">
                <div className="text-6xl mb-4">🥘</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">מתכונים</h2>
                <p className="text-gray-500 mb-4">
                  {counts.recipes > 0 ? `${counts.recipes} מתכונים` : "מתכונים שאוהבים לבשל"}
                </p>
                <span className="inline-block bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-medium group-hover:bg-purple-700 transition-colors">
                  ← לצפייה במתכונים
                </span>
              </div>
            </Link>
            <AddRecipeSection className="" />
          </div>

          {/* Restaurants column */}
          <div className="flex flex-col gap-4">
            <Link
              href="/restaurants"
              className="group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-shadow border border-stone-200"
            >
              <div className="bg-emerald-50 p-5 md:p-8 text-center">
                <div className="text-6xl mb-4">🍴</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">מסעדות</h2>
                <p className="text-gray-500 mb-4">
                  {counts.restaurants > 0 ? `${counts.restaurants} מסעדות` : "מסעדות שממליצים עליהן"}
                </p>
                <span className="inline-block bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-medium group-hover:bg-emerald-700 transition-colors">
                  ← לצפייה במסעדות
                </span>
              </div>
            </Link>
            <AddRestaurantSection className="" />
          </div>

        </div>
      </section>
    </main>
  );
}
