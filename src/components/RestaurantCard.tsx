import Link from "next/link";
import Image from "next/image";
import type { Restaurant } from "@/db/schema";
import { RESTAURANT_AREA_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const isNew = Date.now() - new Date(restaurant.created_at).getTime() < ONE_WEEK_MS;
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow h-full"
    >
      {/* Image */}
      <div className="relative h-48 bg-stone-100">
        {restaurant.image_url ? (
          <Image
            src={restaurant.image_url}
            alt={restaurant.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍴
          </div>
        )}
        {/* Badges top-right */}
        <div className="absolute top-2 end-2 flex flex-col gap-1 items-end">
          {isNew && (
            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              חדש
            </span>
          )}
          {restaurant.user_rating !== null && restaurant.user_rating !== undefined && (
            <div className="bg-amber-400/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-0.5 text-xs font-semibold text-white shadow">
              {"★".repeat(restaurant.user_rating)}{"☆".repeat(5 - restaurant.user_rating)}
            </div>
          )}
          {restaurant.google_score && (
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 text-xs font-semibold text-gray-800 shadow">
              ⭐ {restaurant.google_score}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="green">
            {RESTAURANT_AREA_LABELS[restaurant.area]}
          </Badge>
          {restaurant.price_range && (
            <span className="text-xs text-gray-500">{restaurant.price_range}</span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{restaurant.name}</h3>
        {restaurant.concept && (
          <p className="text-xs text-brand-600 font-medium mb-1">
            {restaurant.concept}
          </p>
        )}
        <p className="text-sm text-gray-500 line-clamp-3 min-h-[3.75rem] flex-1">
          {restaurant.description ?? ""}
        </p>
        {restaurant.address && (
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <span>📍</span>
            <span className="line-clamp-1">{restaurant.address}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
