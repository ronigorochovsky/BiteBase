import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { restaurants, restaurantRatings } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { RESTAURANT_AREA_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { EditRestaurantButton } from "@/components/EditRestaurantButton";
import { DeleteRestaurantButton } from "@/components/DeleteRestaurantButton";
import { StarRating } from "@/components/StarRating";
import { Navbar } from "@/components/Navbar";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

async function getRestaurant(slug: string) {
  const result = await db
    .select()
    .from(restaurants)
    .where(and(eq(restaurants.slug, slug), eq(restaurants.status, "published")))
    .limit(1);
  return result[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const restaurant = await getRestaurant(params.slug);
  if (!restaurant) return {};
  return {
    title: restaurant.name,
    description:
      restaurant.description ?? `${restaurant.name} — ${restaurant.concept ?? "מסעדה מומלצת"}`,
    openGraph: {
      images: restaurant.image_url ? [restaurant.image_url] : [],
    },
  };
}

export default async function RestaurantPage({ params }: Props) {
  const restaurant = await getRestaurant(params.slug);

  if (!restaurant) {
    notFound();
  }

  // Load user's own rating + total rating count
  const session = await getSession();
  let userRating: number | null = null;
  let totalRatings = 0;

  const [countRow] = await db
    .select({ total: count() })
    .from(restaurantRatings)
    .where(eq(restaurantRatings.restaurant_id, restaurant.id));
  totalRatings = countRow?.total ?? 0;

  if (session.userId) {
    const [row] = await db
      .select({ rating: restaurantRatings.rating })
      .from(restaurantRatings)
      .where(and(eq(restaurantRatings.user_id, session.userId), eq(restaurantRatings.restaurant_id, restaurant.id)))
      .limit(1);
    userRating = row?.rating ?? null;
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Back */}
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          → חזרה למסעדות
        </Link>

        {/* Image */}
        {restaurant.image_url && (
          <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
            <Image
              src={restaurant.image_url}
              alt={restaurant.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Badge variant="green">
              {RESTAURANT_AREA_LABELS[restaurant.area]}
            </Badge>
            <div className="ms-auto flex items-center gap-2">
              <EditRestaurantButton restaurant={restaurant} />
              <DeleteRestaurantButton slug={restaurant.slug} name={restaurant.name} />
            </div>
            {restaurant.price_range && (
              <span className="text-sm text-gray-500 font-medium">
                {restaurant.price_range}
              </span>
            )}
            {restaurant.google_score && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-0.5">
                ⭐ {restaurant.google_score}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {restaurant.name}
          </h1>
          {restaurant.concept && (
            <p className="text-brand-600 font-medium mb-2">{restaurant.concept}</p>
          )}
          {restaurant.description && (
            <p className="text-gray-600 text-base leading-relaxed">{restaurant.description}</p>
          )}
        </div>

        {/* Star rating */}
        <div className="mb-6">
          <StarRating
            restaurantId={restaurant.id}
            initialRating={userRating}
            initialAverageRating={restaurant.user_rating ?? null}
            initialTotalRatings={totalRatings}
          />
        </div>

        {/* Show on map */}
        {restaurant.lat && restaurant.lng && (
          <div className="mb-6">
            <Link
              href={`/restaurants/map?highlight=${restaurant.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              🗺️ הצג במפה
            </Link>
          </div>
        )}

        {/* Info grid */}
        <div className="space-y-3 mb-8">
          {restaurant.address && (
            <InfoRow icon="📍" label="כתובת">
              {restaurant.maps_url ? (
                <a
                  href={restaurant.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {restaurant.address}
                </a>
              ) : (
                restaurant.address
              )}
            </InfoRow>
          )}

          {/* Branch locations for chains */}
          {(() => {
            if (!restaurant.extra_locations) return null;
            try {
              const branches = JSON.parse(restaurant.extra_locations) as Array<{ lat?: number; lng?: number; address?: string | null }>;
              if (!branches.length) return null;
              return (
                <InfoRow icon="🏪" label="סניפים נוספים">
                  <ul className="space-y-1">
                    {branches.map((b, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        {b.address ? (
                          b.lat && b.lng ? (
                            <a
                              href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {b.address}
                            </a>
                          ) : b.address
                        ) : b.lat && b.lng ? (
                          <a
                            href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </InfoRow>
              );
            } catch { return null; }
          })()}
          {restaurant.phone && (
            <InfoRow icon="📞" label="טלפון">
              <a href={`tel:${restaurant.phone}`} className="text-blue-600 hover:underline">
                {restaurant.phone}
              </a>
            </InfoRow>
          )}
          {restaurant.opening_hours && (
            <InfoRow icon="🕐" label="שעות פתיחה">
              <span className="whitespace-pre-line">{restaurant.opening_hours}</span>
            </InfoRow>
          )}
          {restaurant.website_url && (
            <InfoRow icon="🌐" label="אתר">
              <a
                href={restaurant.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {restaurant.website_url}
              </a>
            </InfoRow>
          )}
          {restaurant.maps_url && !restaurant.address && (
            <InfoRow icon="🗺️" label="גוגל מפות">
              <a
                href={restaurant.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                פתח במפות
              </a>
            </InfoRow>
          )}
        </div>

        {/* Source link */}
        {restaurant.source_url && (
          <a
            href={restaurant.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            📎 הפוסט המקורי
          </a>
        )}
      </main>
    </>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-stone-50 rounded-xl px-4 py-3 flex items-start gap-3 border border-stone-200">
      <span className="text-lg mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        <div className="text-gray-700 text-sm">{children}</div>
      </div>
    </div>
  );
}
