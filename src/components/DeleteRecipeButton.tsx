"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteRecipeButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/recipes/${slug}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/recipes");
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600">למחוק את המתכון לצמיתות?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {deleting ? "מוחק..." : "כן, מחק"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm px-3 py-1 bg-stone-200 text-gray-700 rounded-lg hover:bg-stone-300 transition-colors"
        >
          ביטול
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
      מחק מתכון
    </button>
  );
}
