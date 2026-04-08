"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RESTAURANT_AREA_LABELS, RESTAURANT_AREAS } from "@/lib/constants";
import type { RestaurantArea } from "@/db/schema";

type Step = "idle" | "loading" | "manual" | "manual-direct" | "saving" | "done";

export function AddRestaurantSection({ className }: { className?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    area: "other" as RestaurantArea,
    concept: "",
    description: "",
    address: "",
  });

  async function handleSubmit() {
    if (!url.trim()) return;
    setError("");
    setStep("loading");

    try {
      const res = await fetch("/api/add-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (data.ok && data.slug) {
        setStep("done");
        setTimeout(() => router.push(`/restaurants/${data.slug}`), 1500);
        return;
      }

      if (data.failed) {
        setStep("manual");
        return;
      }

      setError("שגיאה בעיבוד הקישור. נסה שוב.");
      setStep("idle");
    } catch {
      setError("שגיאה בעיבוד הקישור. נסה שוב.");
      setStep("idle");
    }
  }

  async function handleManualSave() {
    if (!form.name.trim()) return;
    setStep("saving");
    setError("");

    try {
      const res = await fetch("/api/add-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || "",
          manual: true,
          name: form.name,
          area: form.area,
          concept: form.concept || null,
          description: form.description || null,
          address: form.address || null,
        }),
      });
      const data = await res.json();
      if (data.ok && data.slug) {
        setStep("done");
        setTimeout(() => router.push(`/restaurants/${data.slug}`), 1500);
      } else {
        setError("שגיאה בשמירה. נסה שוב.");
        setStep(step === "saving" ? "manual" : step);
      }
    } catch {
      setError("שגיאה בשמירה. נסה שוב.");
      setStep("manual");
    }
  }

  function openManualDirect() {
    setStep("manual-direct");
    setUrl("");
    setError("");
    setForm({ name: "", area: "other", concept: "", description: "", address: "" });
  }

  function reset() {
    setStep("idle");
    setUrl("");
    setError("");
    setForm({ name: "", area: "other", concept: "", description: "", address: "" });
  }

  return (
    <section className={className ?? "max-w-4xl mx-auto px-4 pb-16"}>
      <div className="border border-stone-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-800 text-lg">+ הוסף מסעדה חדשה</h2>
            <p className="text-sm text-gray-500 mt-0.5">הדבק קישור מאינסטגרם או פייסבוק — המסעדה תתווסף אוטומטית</p>
          </div>
          {(step === "idle" || step === "loading") && (
            <button
              onClick={openManualDirect}
              className="flex-shrink-0 text-sm text-emerald-600 hover:text-emerald-800 font-medium underline underline-offset-2 transition-colors"
            >
              הוסף ידנית
            </button>
          )}
        </div>

        <div className="px-6 py-5">

          {/* URL input */}
          {(step === "idle" || step === "loading") && (
            <div>
              <div className="flex gap-3">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <Button variant="green" onClick={handleSubmit} loading={step === "loading"} disabled={!url.trim()}>
                  {step === "loading" ? "מנתח..." : "הוסף"}
                </Button>
              </div>
              {step === "loading" && (
                <p className="text-sm text-gray-500 mt-3 text-center animate-pulse">
                  מנתח את הפוסט ומחלץ פרטי מסעדה... זה יכול לקחת כ-30 שניות
                </p>
              )}
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          )}

          {/* Manual form */}
          {(step === "manual" || step === "manual-direct" || step === "saving") && (
            <div className="flex flex-col gap-4">
              {step === "manual" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start">
                  <span className="text-lg mt-0.5">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-amber-800">לא הצלחתי לחלץ פרטי מסעדה אוטומטית</p>
                    <p className="text-sm text-amber-700 mt-0.5">מלא את הפרטים ידנית:</p>
                  </div>
                </div>
              )}

              <Input
                label="שם המסעדה"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="שם המסעדה..."
              />

              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium text-gray-700">אזור</label>
                  <select
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value as RestaurantArea })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {RESTAURANT_AREAS.map((a) => (
                      <option key={a} value={a}>{RESTAURANT_AREA_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium text-gray-700">סגנון / מטבח</label>
                  <Input
                    value={form.concept}
                    onChange={(e) => setForm({ ...form, concept: e.target.value })}
                    placeholder="בשרייה, פיצה, ים תיכוני..."
                  />
                </div>
              </div>

              <Input
                label="כתובת"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="רחוב, עיר..."
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">תיאור / הערות</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="מה לנסות, מה מיוחד, המלצות..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <Button variant="green" onClick={handleManualSave} loading={step === "saving"} disabled={!form.name.trim()}>
                  שמור ופרסם
                </Button>
                <Button variant="ghost" onClick={reset}>ביטול</Button>
              </div>
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-gray-800">המסעדה נוספה בהצלחה!</p>
              <p className="text-sm text-gray-500 mt-1">מעביר אותך לדף המסעדה...</p>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
