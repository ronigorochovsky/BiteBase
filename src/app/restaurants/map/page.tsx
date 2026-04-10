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

interface MapRestaurant {
  id: string;
  slug: string;
  name: string;
  concept: string | null;
  address: string | null;
  area: string;
  lat: number;
  lng: number;
  branchIndex?: number; // 0 = primary, 1+ = extra location
}

async function getMapRestaurants(): Promise<MapRestaurant[]> {
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
      extra_locations: restaurants.extra_locations,
    })
    .from(restaurants)
    .where(
      and(
        eq(restaurants.status, "published"),
        isNotNull(restaurants.lat),
        isNotNull(restaurants.lng)
      )
    );

  // Expand chains: one pin per location
  const pins: MapRestaurant[] = [];
  for (const row of rows) {
    const lat = row.lat as number;
    const lng = row.lng as number;
    pins.push({ id: row.id, slug: row.slug, name: row.name, concept: row.concept, address: row.address, area: row.area, lat, lng, branchIndex: 0 });

    if (row.extra_locations) {
      try {
        const extras = JSON.parse(row.extra_locations) as Array<{ lat: number; lng: number; address: string | null; area: string }>;
        extras.forEach((loc, i) => {
          if (loc.lat && loc.lng) {
            pins.push({
              id: `${row.id}-extra-${i}`,
              slug: row.slug,
              name: row.name,
              concept: row.concept,
              address: loc.address ?? null,
              area: loc.area ?? row.area,
              lat: loc.lat,
              lng: loc.lng,
              branchIndex: i + 1,
            });
          }
        });
      } catch { /* ignore malformed JSON */ }
    }
  }
  return pins;
}

interface Props {
  searchParams: { highlight?: string };
}

export default async function RestaurantMapPage({ searchParams }: Props) {
  const items = await getMapRestaurants();
  const highlightedSlug = searchParams.highlight;
  const highlightedRestaurant = highlightedSlug
    ? items.find((r) => r.slug === highlightedSlug) ?? null
    : null;

  return (
    <>
      <Navbar />
      <div className="px-4 py-4 flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
        {/* Header + tabs */}
        <div className="mb-3 flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">מפת מסעדות</h1>
          </div>
          <div className="flex gap-2">
            {/* Back to restaurant — shown only when arriving via "הצג במפה" */}
            {highlightedRestaurant && (
              <Link
                href={`/restaurants/${highlightedRestaurant.slug}`}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-stone-100 text-gray-600 hover:bg-stone-200 transition-colors"
              >
                → {highlightedRestaurant.name}
              </Link>
            )}
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
          <RestaurantMap restaurants={items} highlighted={highlightedSlug} />
        </div>
      </div>
    </>
  );
}
