import Link from "next/link";
import Image from "next/image";
import type { Recipe } from "@/db/schema";
import { RECIPE_CATEGORY_LABELS, RECIPE_SUBCATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/FavoriteButton";

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group block bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative h-48 bg-stone-100">
        {recipe.image_url ? (
          recipe.image_url.startsWith("data:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🥘
          </div>
        )}
        {/* Favorite heart */}
        <div className="absolute top-2 start-2">
          <FavoriteButton recipeId={recipe.id} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge style={{ backgroundColor: CATEGORY_COLORS[recipe.category].light, color: CATEGORY_COLORS[recipe.category].lightText }}>
            {RECIPE_CATEGORY_LABELS[recipe.category]}
          </Badge>
          {recipe.subcategory && (
            <Badge style={{ backgroundColor: CATEGORY_COLORS[recipe.category].lighter, color: CATEGORY_COLORS[recipe.category].lighterText }}>
              {RECIPE_SUBCATEGORY_LABELS[recipe.subcategory]}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {recipe.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-3 min-h-[3.75rem] flex-1">
          {recipe.description ?? ""}
        </p>
      </div>
    </Link>
  );
}
