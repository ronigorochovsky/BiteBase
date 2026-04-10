"use client";
import { useState, useEffect } from "react";

const KEY = "bitebase_favorites";

function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

interface FavoriteButtonProps {
  recipeId: string;
  size?: "sm" | "md";
}

export function FavoriteButton({ recipeId, size = "sm" }: FavoriteButtonProps) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(getFavorites().includes(recipeId));
  }, [recipeId]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const favs = getFavorites();
    const next = favs.includes(recipeId)
      ? favs.filter((id) => id !== recipeId)
      : [...favs, recipeId];
    localStorage.setItem(KEY, JSON.stringify(next));
    setIsFav(!isFav);
    window.dispatchEvent(new Event("favoritesUpdated"));
  }

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <button
      onClick={toggle}
      aria-label={isFav ? "הסר ממועדפים" : "הוסף למועדפים"}
      aria-pressed={isFav}
      className="rounded-full transition-all"
      style={{
        padding: size === "sm" ? "6px" : "8px",
        backgroundColor: isFav ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        color: isFav ? "#ef4444" : "#ffffff",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill={isFav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        className={iconSize}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
