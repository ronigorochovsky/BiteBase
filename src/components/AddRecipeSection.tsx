"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  RECIPE_CATEGORY_LABELS,
  RECIPE_CATEGORIES,
  CATEGORY_SUBCATEGORIES,
  RECIPE_SUBCATEGORY_LABELS,
} from "@/lib/constants";
import type { RecipeCategory, RecipeSubcategory } from "@/db/schema";

type Step = "idle" | "loading" | "manual" | "manual-direct" | "saving" | "done";

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 900;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AddRecipeSection({ className }: { className?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isManualStep = step === "manual" || step === "manual-direct" || step === "saving";

  // Global paste listener — catches Ctrl+V anywhere on page when form is open
  useEffect(() => {
    if (!isManualStep) return;
    async function onWindowPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { await handleImageFile(file); break; }
        }
      }
    }
    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManualStep]);

  async function handleImageFile(file: File) {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)/)) return;
    const dataUrl = await compressImageFile(file);
    setForm((prev) => ({ ...prev, image_url: dataUrl }));
  }

  // Manual form — only shown when auto-extract fails
  const [form, setForm] = useState({
    title: "",
    category: "other" as RecipeCategory,
    subcategory: "" as RecipeSubcategory | "",
    ingredients: "",
    steps: "",
    image_url: "",
  });

  const subcategories = CATEGORY_SUBCATEGORIES[form.category] ?? [];

  async function handleSubmit() {
    if (!url.trim()) return;
    setError("");
    setStep("loading");

    try {
      const res = await fetch("/api/add-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (data.ok && data.slug) {
        setStep("done");
        setTimeout(() => router.push(`/recipes/${data.slug}`), 1500);
        return;
      }

      if (data.failed) {
        // Auto-extract failed — show manual form
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
    if (!form.title.trim()) return;
    setStep("saving");
    setError("");

    try {
      const res = await fetch("/api/add-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || "",
          manual: true,
          title: form.title,
          category: form.category,
          subcategory: form.subcategory || null,
          ingredients: form.ingredients,
          steps: form.steps,
          image_url: form.image_url.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok && data.slug) {
        setStep("done");
        setTimeout(() => router.push(`/recipes/${data.slug}`), 1500);
      } else {
        setError("שגיאה בשמירה. נסה שוב.");
        setStep("manual");
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
    setForm({ title: "", category: "other", subcategory: "", ingredients: "", steps: "", image_url: "" });
  }

  function reset() {
    setStep("idle");
    setUrl("");
    setError("");
    setForm({ title: "", category: "other", subcategory: "", ingredients: "", steps: "", image_url: "" });
  }

  return (
    <section className={className ?? "max-w-4xl mx-auto px-4 pb-16"}>
      <div className="border border-stone-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-800 text-lg">+ הוסף מתכון חדש</h2>
            <p className="text-sm text-gray-500 mt-0.5">הדבק קישור מאינסטגרם או פייסבוק — המתכון יתווסף אוטומטית</p>
          </div>
          {(step === "idle" || step === "loading") && (
            <button
              onClick={openManualDirect}
              className="flex-shrink-0 text-sm text-purple-600 hover:text-purple-800 font-medium underline underline-offset-2 transition-colors"
            >
              הוסף ידנית
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          <div className="transition-all duration-300">

          {/* ── URL input ── */}
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
                <Button variant="purple" onClick={handleSubmit} loading={step === "loading"} disabled={!url.trim()} className="flex-shrink-0">
                  {step === "loading" ? "מנתח..." : "הוסף"}
                </Button>
              </div>
              {step === "loading" && (
                <p className="text-sm text-gray-500 mt-3 text-center animate-pulse">
                  מנתח את הפוסט ומחלץ מידע... זה יכול לקחת כ-30 שניות
                </p>
              )}
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          )}

          {/* ── Manual form — shown as fallback OR direct ── */}
          {(step === "manual" || step === "manual-direct" || step === "saving") && (
            <div className="flex flex-col gap-4">
              {step === "manual" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start">
                  <span className="text-lg mt-0.5">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-amber-800">לא הצלחתי לחלץ את המתכון אוטומטית</p>
                    <p className="text-sm text-amber-700 mt-0.5">מלא את הפרטים ידנית:</p>
                  </div>
                </div>
              )}

              <Input
                label="שם המתכון"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="שם המנה..."
              />

              {/* Image upload */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">תמונה (אופציונלי)</label>
                {form.image_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.image_url} alt="תצוגה מקדימה" className="w-full h-44 object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: "" })}
                      className="absolute top-2 end-2 bg-white/90 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-500 shadow transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) await handleImageFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors select-none ${
                      isDragging
                        ? "border-purple-400 bg-purple-50"
                        : "border-stone-300 hover:border-stone-400 bg-stone-50"
                    }`}
                  >
                    <div className="text-3xl mb-2">📷</div>
                    <p className="text-sm text-gray-500">
                      גרור לכאן, הדבק <kbd className="text-xs bg-stone-200 px-1 rounded">Ctrl+V</kbd> או{" "}
                      <span className="text-purple-600 underline underline-offset-2">בחר קובץ</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPEG</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleImageFile(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium text-gray-700">קטגוריה</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as RecipeCategory, subcategory: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {RECIPE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{RECIPE_CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                {subcategories.length > 0 && (
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm font-medium text-gray-700">תת-קטגוריה</label>
                    <select
                      value={form.subcategory}
                      onChange={(e) => setForm({ ...form, subcategory: e.target.value as RecipeSubcategory | "" })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="">— בחר —</option>
                      {subcategories.map((s) => (
                        <option key={s} value={s}>{RECIPE_SUBCATEGORY_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <Textarea
                label="מצרכים (שורה לכל מצרך)"
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                rows={5}
              />
              <Textarea
                label="שלבי הכנה (שורה לכל שלב)"
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                rows={5}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <Button variant="purple" onClick={handleManualSave} loading={step === "saving"} disabled={!form.title.trim()}>
                  שמור ופרסם
                </Button>
                <Button variant="ghost" onClick={reset}>ביטול</Button>
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-gray-800">המתכון נוסף בהצלחה!</p>
              <p className="text-sm text-gray-500 mt-1">מעביר אותך למתכון...</p>
            </div>
          )}

          </div>
        </div>
      </div>
    </section>
  );
}
