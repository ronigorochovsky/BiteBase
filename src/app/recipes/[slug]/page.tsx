import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { RECIPE_CATEGORY_LABELS, RECIPE_SUBCATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { EditRecipeButton } from "@/components/EditRecipeButton";
import { CommentsSection } from "@/components/CommentsSection";
import { Navbar } from "@/components/Navbar";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

async function getRecipe(slug: string) {
  const result = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.status, "published")))
    .limit(1);
  return result[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe(params.slug);
  if (!recipe) return {};
  return {
    title: recipe.title,
    description: recipe.description ?? `מתכון ל${recipe.title}`,
    openGraph: {
      images: recipe.image_url ? [recipe.image_url] : [],
    },
  };
}

export default async function RecipePage({ params }: Props) {
  const recipe = await getRecipe(params.slug);

  if (!recipe) {
    notFound();
  }

  const ingredientLines = recipe.ingredients?.split("\n").filter(Boolean) ?? [];
  const stepLines = recipe.steps?.split("\n").filter(Boolean) ?? [];

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Back */}
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          ← חזרה למתכונים
        </Link>

        {/* Image */}
        {recipe.image_url && (
          <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
            {recipe.image_url.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" priority />
            )}
          </div>
        )}

        {/* Title & meta */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge style={{ backgroundColor: CATEGORY_COLORS[recipe.category].light, color: CATEGORY_COLORS[recipe.category].lightText }}>
              {RECIPE_CATEGORY_LABELS[recipe.category]}
            </Badge>
            {recipe.subcategory && (
              <Badge style={{ backgroundColor: CATEGORY_COLORS[recipe.category].lighter, color: CATEGORY_COLORS[recipe.category].lighterText }}>
                {RECIPE_SUBCATEGORY_LABELS[recipe.subcategory]}
              </Badge>
            )}
            <div className="ms-auto flex items-center gap-2">
              <EditRecipeButton recipe={recipe} />
              <FavoriteButton recipeId={recipe.id} size="md" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-gray-600 text-lg">{recipe.description}</p>
          )}
        </div>

        {/* Ingredients */}
        {ingredientLines.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-stone-200">
              מצרכים
            </h2>
            <ul className="space-y-1.5">
              {ingredientLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Steps */}
        {stepLines.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-stone-200">
              אופן הכנה
            </h2>
            <ol className="space-y-3">
              {stepLines.map((step, i) => (
                <li key={i} className="flex gap-3 text-gray-700">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">
                    {step.replace(/^\d+[\.\)]\s*/, "")}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Tips */}
        {recipe.tips && (
          <section className="mb-8">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-800 mb-1">💡 טיפים</h3>
              <p className="text-amber-700 text-sm">{recipe.tips}</p>
            </div>
          </section>
        )}

        {/* Source link + delete */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {recipe.source_url && recipe.source_url !== "" ? (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              📎 מקור המתכון
            </a>
          ) : (
            <span />
          )}
          <DeleteRecipeButton slug={recipe.slug} />
        </div>

        {/* Comments */}
        <CommentsSection recipeSlug={recipe.slug} />
      </main>
    </>
  );
}
