import nextDynamic from "next/dynamic";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מפת מסעדות",
  description: "כל המסעדות המומלצות על המפה",
};

// Dynamic import — Leaflet needs browser globals, cannot SSR
const RestaurantMap = nextDynamic(
  () => import("@/components/RestaurantMap").then((m) => m.RestaurantMap),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-gray-400">טוען מפה...</div> }
);

async function getMapRestaurants() {
  const rows = await db
    .select({
      id: restaurants.id,
      slug: restaurants.slug,
      name: restaurants.name,
      concept: restaurants.concept,
      address: restaurants.address,
      area: restaurants.area,
      lat: restaurants.lat,
      lng: restaurants.lng,
    })
    .from(restaurants)
    .where(
      and(
        eq(restaurants.status, "published"),
        isNotNull(restaurants.lat),
        isNotNull(restaurants.lng)
      )
    );
  return rows as Array<typeof rows[number] & { lat: number; lng: number }>;
}

export default async function RestaurantMapPage() {
  const items = await getMapRestaurants();

  return (
    <>
      <Navbar />
      <div className="px-4 py-4 flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
        {/* Header + tabs */}
        <div className="mb-3 flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">מפת מסעדות</h1>
            <span className="text-sm text-gray-400">{items.length} מסעדות על המפה</span>
          </div>
          <div className="flex gap-2">
            <Link
              href="/restaurants"
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-stone-100 text-gray-600 hover:bg-stone-200 transition-colors"
            >
              רשימה
            </Link>
            <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-600 text-white">מפה</span>
          </div>
        </div>

        {/* Map container — fills remaining height */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-stone-200 shadow-sm min-h-0">
          <RestaurantMap restaurants={items} />
        </div>
      </div>
    </>
  );
}
