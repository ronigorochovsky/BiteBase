"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  RECIPE_CATEGORY_LABELS,
  RECIPE_SUBCATEGORY_LABELS,
  CATEGORY_SUBCATEGORIES,
  CATEGORY_COLORS,
  RECIPE_CATEGORIES,
} from "@/lib/constants";
import type { RecipeCategory } from "@/db/schema";

export function RecipeTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = (searchParams.get("category") ?? "") as RecipeCategory | "favorites" | "";
  const currentSub = searchParams.get("subcategory") ?? "";

  function setCategory(category: string) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setSub(sub: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sub) {
      params.set("subcategory", sub);
    } else {
      params.delete("subcategory");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const inactiveStyle = { backgroundColor: "#fff", color: "#4b5563", borderColor: "#d6d3d1" };

  return (
    <div className="flex flex-col gap-1">
      {/* "All" row */}
      <button
        onClick={() => setCategory("")}
        className="w-full text-start rounded-xl font-medium transition-all px-3 py-2 text-sm border"
        style={
          !currentCategory
            ? { backgroundColor: "#44403c", color: "#fff", borderColor: "#44403c" }
            : inactiveStyle
        }
      >
        הכל
      </button>

      {/* Favorites row */}
      <button
        onClick={() => setCategory("favorites")}
        className="w-full text-start rounded-xl font-medium transition-all px-3 py-2 text-sm border"
        style={
          currentCategory === "favorites"
            ? { backgroundColor: "#ef4444", color: "#fff", borderColor: "#ef4444" }
            : inactiveStyle
        }
      >
        ❤️ מועדפים
      </button>

      {/* Category rows */}
      {RECIPE_CATEGORIES.map((cat) => {
        const isActive = currentCategory === cat;
        const c = CATEGORY_COLORS[cat];
        const subcategories = CATEGORY_SUBCATEGORIES[cat] ?? [];

        return (
          <div key={cat}>
            <button
              onClick={() => setCategory(cat)}
              className="w-full text-start rounded-xl font-medium transition-all px-3 py-2 text-sm border"
              style={
                isActive
                  ? { backgroundColor: c.main, color: c.mainText, borderColor: c.main }
                  : inactiveStyle
              }
            >
              {RECIPE_CATEGORY_LABELS[cat]}
            </button>

            {/* Subcategories — shown inline below when this category is active */}
            {isActive && subcategories.length > 0 && (
              <div
                className="ms-3 mt-1 mb-1 flex flex-col gap-1 border-s-2 ps-2"
                style={{ borderColor: c.main }}
              >
                <button
                  onClick={() => setSub("")}
                  className="text-start rounded-lg font-medium transition-all px-2 py-1 text-xs border"
                  style={
                    !currentSub
                      ? { backgroundColor: c.light, color: c.lightText, borderColor: c.light }
                      : inactiveStyle
                  }
                >
                  הכל
                </button>
                {subcategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSub(sub)}
                    className="text-start rounded-lg font-medium transition-all px-2 py-1 text-xs border"
                    style={
                      currentSub === sub
                        ? { backgroundColor: c.light, color: c.lightText, borderColor: c.light }
                        : inactiveStyle
                    }
                  >
                    {RECIPE_SUBCATEGORY_LABELS[sub]}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
