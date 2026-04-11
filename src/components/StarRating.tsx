"use client";
import { useState } from "react";

interface Props {
  restaurantId: string;
  initialRating: number | null;        // this user's rating
  initialAverageRating: number | null; // community average (restaurants.user_rating)
  initialTotalRatings?: number;        // total number of raters
}

export function StarRating({ restaurantId, initialRating, initialAverageRating, initialTotalRatings = 0 }: Props) {
  const [userRating, setUserRating] = useState<number | null>(initialRating);
  const [averageRating, setAverageRating] = useState<number | null>(initialAverageRating);
  const [totalRatings, setTotalRatings] = useState(initialTotalRatings);
  const [hover, setHover] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleRate(n: number) {
    const newRating = userRating === n ? null : n;
    setSaving(true);
    try {
      const res = await fetch("/api/user/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, rating: newRating }),
      });
      const data = await res.json();
      setUserRating(data.userRating);
      setAverageRating(data.newAverage);
      if (data.totalRatings !== undefined) setTotalRatings(data.totalRatings);
    } finally {
      setSaving(false);
    }
  }

  const display = hover ?? userRating ?? 0;

  const StarRow = ({ value }: { value: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={n <= value ? "#f59e0b" : "none"}
          stroke={n <= value ? "#f59e0b" : "#d1d5db"}
          strokeWidth="1.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* User's own rating */}
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
        {userRating !== null && (
          <span className="text-sm font-semibold text-amber-600">{userRating}/5</span>
        )}
      </div>

      {/* Community average — same format as user row */}
      {totalRatings > 0 && averageRating !== null && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-medium">דירוג כולל:</span>
          <StarRow value={averageRating} />
          <span className="text-sm font-semibold text-amber-600">
            {averageRating}/5
          </span>
          <span className="text-xs text-gray-400">
            ({totalRatings} {totalRatings === 1 ? "דירוג" : "דירוגים"})
          </span>
        </div>
      )}
    </div>
  );
}
