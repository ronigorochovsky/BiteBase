import { Suspense } from "react";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq, and, desc, or, ilike, gte, isNotNull } from "drizzle-orm";
import type { RestaurantArea } from "@/db/schema";
import { RESTAURANT_AREA_LABELS, RESTAURANT_AREAS, CONCEPT_FILTER_OPTIONS } from "@/lib/constants";
import { RestaurantCard } from "@/components/RestaurantCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchBar } from "@/components/SearchBar";
import { Navbar } from "@/components/Navbar";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מסעדות",
  description: "המלצות על מסעדות — ממויינות לפי אזור",
};

interface Props {
  searchParams: { area?: string; q?: string; concept?: string; minRating?: string };
}

async function RestaurantList({ area, q, concept, minRating }: { area?: string; q?: string; concept?: string; minRating?: string }) {
  const conditions = [eq(restaurants.status, "published")];

  if (area && RESTAURANT_AREAS.includes(area as RestaurantArea)) {
    conditions.push(eq(restaurants.area, area as RestaurantArea));
  }

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(restaurants.name, term),
        ilike(restaurants.concept, term),
        ilike(restaurants.description, term),
        ilike(restaurants.address, term)
      )!
    );
  }

  if (concept) {
    const option = CONCEPT_FILTER_OPTIONS.find((o) => o.value === concept);
    if (option) {
      conditions.push(
        or(...option.patterns.map((p) => ilike(restaurants.concept, `%${p}%`)))!
      );
    }
  }

  if (minRating) {
    const rating = parseInt(minRating, 10);
    if (!isNaN(rating)) {
      conditions.push(isNotNull(restaurants.user_rating));
      conditions.push(gte(restaurants.user_rating, rating));
    }
  }

  const items = await db
    .select()
    .from(restaurants)
    .where(and(...conditions))
    .orderBy(desc(restaurants.created_at));

  const padCount = items.length === 0 ? 3 : (3 - (items.length % 3)) % 3;

  return (
    <div className="relative">
      {items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-10 py-20">
          <div className="text-5xl mb-4">🍴</div>
          <p className="text-lg">לא נמצאו מסעדות</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
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

export default function RestaurantsPage({ searchParams }: Props) {
  const area = searchParams.area;
  const q = searchParams.q;
  const concept = searchParams.concept;
  const minRating = searchParams.minRating;

  const areaLabel = area ? RESTAURANT_AREA_LABELS[area as RestaurantArea] : null;

  const areaFilterOptions = RESTAURANT_AREAS.map((a) => ({
    value: a,
    label: RESTAURANT_AREA_LABELS[a],
  }));

  const conceptFilterOptions = CONCEPT_FILTER_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  const ratingFilterOptions = [
    { value: "3", label: "⭐ 3+" },
    { value: "4", label: "⭐ 4+" },
    { value: "5", label: "⭐ 5" },
  ];

  return (
    <>
      <Navbar />
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-10 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {areaLabel ? areaLabel : "מסעדות"}
            </h1>
            <p className="text-gray-500">
              {areaLabel ? `מסעדות ב${areaLabel}` : "כל המסעדות המומלצות שלנו"}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-600 text-white">רשימה</span>
            <Link
              href="/restaurants/map"
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-stone-100 text-gray-600 hover:bg-stone-200 transition-colors"
            >
              🗺️ מפה
            </Link>
          </div>
        </div>

        <div className="grid gap-8 items-start lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* ── Sticky right sidebar (filters) ── */}
          <aside className="hidden lg:block sticky top-[72px] self-start">
            <div className="flex flex-col gap-5 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">אזורים</p>
                <Suspense>
                  <CategoryFilter
                    options={areaFilterOptions}
                    paramName="area"
                    allLabel="כל האזורים"
                    activeClass="bg-emerald-600 text-white"
                  />
                </Suspense>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">סגנון מטבח</p>
                <Suspense>
                  <CategoryFilter
                    options={conceptFilterOptions}
                    paramName="concept"
                    allLabel="כל הסגנונות"
                    activeClass="bg-emerald-600 text-white"
                  />
                </Suspense>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">דירוג</p>
                <Suspense>
                  <CategoryFilter
                    options={ratingFilterOptions}
                    paramName="minRating"
                    allLabel="כל הדירוגים"
                    activeClass="bg-emerald-600 text-white"
                  />
                </Suspense>
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="min-w-0">
            <Suspense>
              <MobileFilterDrawer label="סינון">
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">אזורים</p>
                    <CategoryFilter
                      options={areaFilterOptions}
                      paramName="area"
                      allLabel="כל האזורים"
                      activeClass="bg-emerald-600 text-white"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">סגנון מטבח</p>
                    <CategoryFilter
                      options={conceptFilterOptions}
                      paramName="concept"
                      allLabel="כל הסגנונות"
                      activeClass="bg-emerald-600 text-white"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">דירוג</p>
                    <CategoryFilter
                      options={ratingFilterOptions}
                      paramName="minRating"
                      allLabel="כל הדירוגים"
                      activeClass="bg-emerald-600 text-white"
                    />
                  </div>
                </div>
              </MobileFilterDrawer>
            </Suspense>
            <div className="mb-6">
              <Suspense>
                <SearchBar placeholder="חיפוש לפי שם, סגנון, כתובת..." />
              </Suspense>
            </div>
            <Suspense
              fallback={<div className="text-center py-10 text-gray-400">טוען מסעדות...</div>}
            >
              <RestaurantList area={area} q={q} concept={concept} minRating={minRating} />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Floating sticky map button — stays visible while scrolling */}
      <Link
        href="/restaurants/map"
        className="fixed bottom-6 start-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-stone-200 text-gray-700 text-sm font-semibold shadow-lg hover:bg-emerald-600 hover:text-white active:bg-emerald-700 active:text-white transition-colors"
        aria-label="עבור למפת המסעדות"
      >
        🗺️ מפה
      </Link>
    </>
  );
}
