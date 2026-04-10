"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function DeleteRestaurantButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  // step: null = closed, "warn" = first modal, "confirm" = second modal
  const [step, setStep] = useState<null | "warn" | "confirm">(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (step) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [step]);

  // Focus input when confirm step opens
  useEffect(() => {
    if (step === "confirm") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step]);

  function close() {
    setStep(null);
    setTyped("");
    setError("");
  }

  async function handleDelete() {
    if (typed !== name) {
      setError("השם שהקלדת אינו תואם");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/restaurants/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקה");
      router.push("/restaurants");
      router.refresh();
    } catch {
      setError("המחיקה נכשלה. נסה שוב.");
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setStep("warn")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
        מחיקה
      </button>

      {/* Step 1 — Warning modal */}
      {step === "warn" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + title */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">מחיקת מסעדה</h2>
              <p className="text-gray-500 mt-1 text-sm">
                פעולה זו אינה ניתנת לביטול
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-800 text-center">
              אתה עומד למחוק לצמיתות את<br />
              <span className="font-bold text-base">&ldquo;{name}&rdquo;</span><br />
              וכל הנתונים המשויכים אליה.
            </div>

            <div className="flex gap-3">
              <button
                onClick={close}
                className="flex-1 px-4 py-2 rounded-xl border border-stone-300 text-sm font-medium text-gray-700 hover:bg-stone-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                המשך למחיקה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Type-to-confirm modal */}
      {step === "confirm" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">אישור סופי</h2>
            <p className="text-sm text-gray-500 mb-5">
              כדי לאשר, הקלד את שם המסעדה בדיוק:
            </p>

            <p className="text-sm font-semibold text-gray-800 mb-2 bg-stone-100 rounded-lg px-3 py-2 text-center select-all">
              {name}
            </p>

            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && !deleting && handleDelete()}
              placeholder="הקלד את שם המסעדה..."
              className="w-full px-3 py-2 mb-1 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />

            {error && (
              <p className="text-xs text-red-600 mb-3">{error}</p>
            )}
            {!error && <div className="mb-3" />}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("warn")}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl border border-stone-300 text-sm font-medium text-gray-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                חזרה
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || typed !== name}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "מוחק..." : "מחק לצמיתות"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
