"use client";
import { useState } from "react";

interface Props {
  slug: string;
  initialRating: number | null;
}

export function StarRating({ slug, initialRating }: Props) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleRate(n: number) {
    // Toggle off if clicking same star
    const newRating = rating === n ? null : n;
    setSaving(true);
    try {
      await fetch(`/api/restaurants/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_rating: newRating }),
      });
      setRating(newRating);
    } finally {
      setSaving(false);
    }
  }

  const display = hover ?? rating ?? 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 font-medium">הדירוג שלי:</span>
      <div role="group" aria-label="דירוג" className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => handleRate(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            disabled={saving}
            className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
            aria-label={`דרג ${n} מתוך 5`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={n <= display ? "#f59e0b" : "none"}
              stroke={n <= display ? "#f59e0b" : "#d1d5db"}
              strokeWidth="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      {rating !== null && (
        <span className="text-sm font-semibold text-amber-600">{rating}/5</span>
      )}
    </div>
  );
}
