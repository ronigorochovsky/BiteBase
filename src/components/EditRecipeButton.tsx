"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RECIPE_CATEGORY_LABELS,
  RECIPE_CATEGORIES,
  CATEGORY_SUBCATEGORIES,
  RECIPE_SUBCATEGORY_LABELS,
} from "@/lib/constants";
import type { Recipe, RecipeCategory, RecipeSubcategory } from "@/db/schema";

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

export function EditRecipeButton({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: recipe.title,
    category: recipe.category as RecipeCategory,
    subcategory: (recipe.subcategory ?? "") as RecipeSubcategory | "",
    description: recipe.description ?? "",
    ingredients: recipe.ingredients ?? "",
    steps: recipe.steps ?? "",
    tips: recipe.tips ?? "",
    source_url: recipe.source_url ?? "",
    image_url: recipe.image_url ?? "",
  });

  const validSubcategories = CATEGORY_SUBCATEGORIES[form.category] ?? [];

  // Global paste listener for image
  useEffect(() => {
    if (!open) return;
    async function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { await handleImageFile(file); break; }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleImageFile(file: File) {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)/)) return;
    const dataUrl = await compressImageFile(file);
    setForm((prev) => ({ ...prev, image_url: dataUrl }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/recipes/${recipe.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          subcategory: form.subcategory || null,
          description: form.description.trim() || null,
          ingredients: form.ingredients.trim() || null,
          steps: form.steps.trim() || null,
          tips: form.tips.trim() || null,
          source_url: form.source_url.trim() || "",
          image_url: form.image_url.trim() || null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError("שגיאה בשמירה. נסה שוב.");
      }
    } catch {
      setError("שגיאה בשמירה. נסה שוב.");
    }
    setSaving(false);
  }

  function textareaField(label: string, key: keyof typeof form, rows: number, placeholder?: string) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <textarea
          value={form[key] as string}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
      </div>
    );
  }

  return (
    <>
      {/* Edit button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors border border-stone-200 rounded-lg px-3 py-1.5 hover:border-brand-300 bg-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        עריכה
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Sheet */}
          <div className="relative z-10 w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden sm:m-4 sm:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 flex-shrink-0">
              <h2 className="font-semibold text-gray-900 text-lg">עריכת מתכון</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

              {/* Image upload */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">תמונה</label>
                {form.image_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.image_url} alt="תצוגה מקדימה" className="w-full h-44 object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: "" })}
                      className="absolute top-2 end-2 bg-white/90 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-500 shadow transition-colors"
                    >✕</button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={async (e) => {
                      e.preventDefault(); setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) await handleImageFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors select-none ${
                      isDragging ? "border-brand-400 bg-brand-50" : "border-stone-300 hover:border-stone-400 bg-stone-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">📷</div>
                    <p className="text-xs text-gray-500">
                      גרור, הדבק <kbd className="bg-stone-200 px-1 rounded">Ctrl+V</kbd> או{" "}
                      <span className="text-brand-600 underline">בחר קובץ</span>
                    </p>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleImageFile(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Title (required) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">שם המתכון *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              {/* Category + Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">קטגוריה</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as RecipeCategory, subcategory: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {RECIPE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{RECIPE_CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                {validSubcategories.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">תת-קטגוריה</label>
                    <select
                      value={form.subcategory}
                      onChange={(e) => setForm({ ...form, subcategory: e.target.value as RecipeSubcategory | "" })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      <option value="">— ללא —</option>
                      {validSubcategories.map((s) => (
                        <option key={s} value={s}>{RECIPE_SUBCATEGORY_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Description */}
              {textareaField("תיאור קצר", "description", 2, "במה המתכון מיוחד...")}

              {/* Ingredients */}
              {textareaField("מצרכים (שורה אחת לכל מצרך)", "ingredients", 5, "2 כפות שמן זית\n1 בצל קצוץ\n...")}

              {/* Steps */}
              {textareaField("שלבי הכנה (שורה אחת לכל שלב)", "steps", 5, "1. לחמם מחבת...\n2. להוסיף את הבצל...")}

              {/* Tips */}
              {textareaField("טיפים", "tips", 2, "ניתן להחליף את... / מומלץ להכין מראש...")}

              {/* Source URL */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">קישור מקור (אינסטגרם / פייסבוק)</label>
                <input
                  type="url"
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  placeholder="https://www.instagram.com/reel/..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-stone-200 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || saving}
                className="px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "שומר..." : "שמור שינויים"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-stone-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
