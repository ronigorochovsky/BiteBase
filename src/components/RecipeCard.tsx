import Link from "next/link";
import type { Recipe } from "@/db/schema";
import { RECIPE_CATEGORY_LABELS, RECIPE_SUBCATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RecipeImageWithFallback } from "@/components/RecipeImageWithFallback";

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow h-full"
    >
      {/* Image */}
      <div className="relative h-48 bg-stone-100">
        {recipe.image_url ? (
          <RecipeImageWithFallback src={recipe.image_url} alt={recipe.title} />
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
      <div className="p-4 flex flex-col flex-1">
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[1.5rem]">
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
