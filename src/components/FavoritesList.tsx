"use client";
import { useState, useEffect, useCallback } from "react";
import { RecipeCard } from "@/components/RecipeCard";
import type { Recipe } from "@/db/schema";

const KEY = "bitebase_favorites";

function getStoredIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function FavoritesList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const ids = getStoredIds();
    if (ids.length === 0) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/recipes/by-ids?ids=${ids.join(",")}`);
    const data = await res.json();
    setRecipes(data.recipes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("favoritesUpdated", load);
    return () => window.removeEventListener("favoritesUpdated", load);
  }, [load]);

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-400">טוען מועדפים...</div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">🤍</div>
        <p className="text-lg">אין מועדפים עדיין</p>
        <p className="text-sm mt-1">לחץ על הלב על כל מתכון כדי להוסיפו למועדפים</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
