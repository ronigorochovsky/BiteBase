"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";
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

  // Restore last selected filter when navigating back without URL params
  useEffect(() => {
    if (!currentCategory) {
      const stored = sessionStorage.getItem("bitebase-recipe-cat") ?? "";
      if (stored) {
        const params = new URLSearchParams();
        params.set("category", stored);
        const storedSub = sessionStorage.getItem("bitebase-recipe-sub") ?? "";
        if (storedSub) params.set("subcategory", storedSub);
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setCategory(category: string) {
    sessionStorage.setItem("bitebase-recipe-cat", category);
    sessionStorage.removeItem("bitebase-recipe-sub");
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setSub(sub: string) {
    sessionStorage.setItem("bitebase-recipe-sub", sub);
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
    <div role="navigation" aria-label="קטגוריות מתכונים" className="flex flex-col gap-1">
      {/* "All" pill */}
      <button
        onClick={() => setCategory("")}
        className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors border text-start"
        style={
          !currentCategory
            ? { backgroundColor: "#44403c", color: "#fff", borderColor: "#44403c" }
            : inactiveStyle
        }
      >
        הכל
      </button>

      {/* Favorites pill */}
      <button
        onClick={() => setCategory("favorites")}
        className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors border text-start"
        style={
          currentCategory === "favorites"
            ? { backgroundColor: "#ef4444", color: "#fff", borderColor: "#ef4444" }
            : inactiveStyle
        }
      >
        ❤️ מועדפים
      </button>

      {/* Category pills */}
      {RECIPE_CATEGORIES.map((cat) => {
        const isActive = currentCategory === cat;
        const c = CATEGORY_COLORS[cat];
        const subcategories = CATEGORY_SUBCATEGORIES[cat] ?? [];

        return (
          <div key={cat}>
            <button
              onClick={() => setCategory(cat)}
              className="w-full px-4 py-1.5 rounded-full text-sm font-medium transition-colors border text-start"
              style={
                isActive
                  ? { backgroundColor: c.main, color: c.mainText, borderColor: c.main }
                  : inactiveStyle
              }
            >
              {RECIPE_CATEGORY_LABELS[cat]}
            </button>

            {/* Subcategory pills — expand inline below active category */}
            {isActive && subcategories.length > 0 && (
              <div className="ms-3 mt-1 mb-1 flex flex-col gap-1 border-s-2 ps-2" style={{ borderColor: c.main }}>
                <button
                  onClick={() => setSub("")}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors border text-start"
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
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors border text-start"
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
