"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Input } from "@/components/ui/Input";
import {
  RECIPE_CATEGORY_LABELS,
  RECIPE_CATEGORIES,
  RESTAURANT_AREA_LABELS,
  RESTAURANT_AREAS,
} from "@/lib/constants";
import type { RecipeCategory, RestaurantArea } from "@/db/schema";
import type { ExtractionResult } from "@/lib/claude-extractor";
import type { OgData } from "@/lib/og-fetcher";
import type { ParsedUrl } from "@/lib/whatsapp-parser";

interface UrlReviewItemProps {
  parsedUrl: ParsedUrl;
  onSave: () => void;
  onSkip: () => void;
}

type ItemStep = "fetching" | "caption" | "reviewing" | "saved" | "skipped";

export function UrlReviewItem({ parsedUrl, onSave, onSkip }: UrlReviewItemProps) {
  const [step, setStep] = useState<ItemStep>("fetching");
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [manualCaption, setManualCaption] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formType, setFormType] = useState<"recipe" | "restaurant">("recipe");
  const [recipeForm, setRecipeForm] = useState({
    title: "", category: "other" as RecipeCategory, description: "",
    ingredients: "", steps: "", tips: "",
  });
  const [restaurantForm, setRestaurantForm] = useState({
    name: "", area: "other" as RestaurantArea, concept: "",
    description: "", address: "", price_range: "",
  });

  // Auto-fetch on mount
  useState(() => {
    void fetchAndExtract();
  });

  async function fetchAndExtract(caption?: string) {
    setError("");
    try {
      let og = ogData;
      if (!og) {
        const ogRes = await fetch("/api/import/fetch-og", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: parsedUrl.url }),
        });
        og = await ogRes.json();
        setOgData(og!);
      }

      if ((og!.status === "blocked" || og!.status === "error") && !caption) {
        setStep("caption");
        return;
      }

      const extractRes = await fetch("/api/import/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: parsedUrl.url,
          og_title: og?.title,
          og_description: og?.description,
          manual_caption: caption,
        }),
      });
      const result: ExtractionResult = await extractRes.json();
      setExtraction(result);
      populateForm(result);
      setStep("reviewing");
    } catch {
      setError("שגיאה בעיבוד");
      setStep("caption");
    }
  }

  function populateForm(result: ExtractionResult) {
    if (result.type === "recipe" && result.recipe) {
      setFormType("recipe");
      setRecipeForm({
        title: result.recipe.title ?? "",
        category: result.recipe.category ?? "other",
        description: result.recipe.description ?? "",
        ingredients: result.recipe.ingredients ?? "",
        steps: result.recipe.steps ?? "",
        tips: result.recipe.tips ?? "",
      });
    } else if (result.type === "restaurant" && result.restaurant) {
      setFormType("restaurant");
      setRestaurantForm({
        name: result.restaurant.name ?? "",
        area: result.restaurant.area ?? "other",
        concept: result.restaurant.concept ?? "",
        description: result.restaurant.description ?? "",
        address: result.restaurant.address ?? "",
        price_range: result.restaurant.price_range ?? "",
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload =
        formType === "recipe"
          ? { type: "recipe", source_url: parsedUrl.url, image_url: ogData?.image, recipe: recipeForm }
          : { type: "restaurant", source_url: parsedUrl.url, image_url: ogData?.image, restaurant: restaurantForm };

      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setStep("saved");
      setTimeout(onSave, 600);
    } catch {
      setError("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  if (step === "fetching") {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center text-gray-400">
        <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin mb-2" />
        <p className="text-sm">מנתח {parsedUrl.url.slice(0, 50)}...</p>
      </div>
    );
  }

  if (step === "saved") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-emerald-700">
        ✅ נשמר בהצלחה
      </div>
    );
  }

  if (step === "skipped") {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center text-gray-400 text-sm">
        דולג
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      {/* URL badge */}
      <a
        href={parsedUrl.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:underline truncate block mb-4"
      >
        {parsedUrl.url}
      </a>

      {/* OG image */}
      {ogData?.image && (
        <div className="h-32 rounded-xl overflow-hidden bg-stone-100 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ogData.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Caption needed */}
      {step === "caption" && (
        <div className="mb-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3 text-sm text-amber-800">
            לא הצלחתי לגשת לתוכן — הדבק את כיתוב הפוסט ידנית
          </div>
          <Textarea
            value={manualCaption}
            onChange={(e) => setManualCaption(e.target.value)}
            placeholder="הדבק כיתוב..."
            rows={4}
            className="mb-3"
          />
          <Button onClick={() => fetchAndExtract(manualCaption)} disabled={!manualCaption.trim()} size="sm">
            חלץ מידע
          </Button>
        </div>
      )}

      {/* Review form */}
      {step === "reviewing" && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFormType("recipe")}
              className={`px-3 py-1 rounded-full text-xs font-medium ${formType === "recipe" ? "bg-brand-500 text-white" : "bg-stone-100 text-gray-600"}`}
            >
              🥘 מתכון
            </button>
            <button
              onClick={() => setFormType("restaurant")}
              className={`px-3 py-1 rounded-full text-xs font-medium ${formType === "restaurant" ? "bg-emerald-600 text-white" : "bg-stone-100 text-gray-600"}`}
            >
              🍴 מסעדה
            </button>
          </div>

          {formType === "recipe" ? (
            <div className="flex flex-col gap-3">
              <Input label="שם" value={recipeForm.title} onChange={(e) => setRecipeForm({ ...recipeForm, title: e.target.value })} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-700">קטגוריה</label>
                <select value={recipeForm.category} onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value as RecipeCategory })} className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm">
                  {RECIPE_CATEGORIES.map((c) => <option key={c} value={c}>{RECIPE_CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <Textarea label="מצרכים" value={recipeForm.ingredients} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: e.target.value })} rows={3} />
              <Textarea label="הכנה" value={recipeForm.steps} onChange={(e) => setRecipeForm({ ...recipeForm, steps: e.target.value })} rows={3} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Input label="שם" value={restaurantForm.name} onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-700">אזור</label>
                <select value={restaurantForm.area} onChange={(e) => setRestaurantForm({ ...restaurantForm, area: e.target.value as RestaurantArea })} className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm">
                  {RESTAURANT_AREAS.map((a) => <option key={a} value={a}>{RESTAURANT_AREA_LABELS[a]}</option>)}
                </select>
              </div>
              <Input label="קונספט" value={restaurantForm.concept} onChange={(e) => setRestaurantForm({ ...restaurantForm, concept: e.target.value })} />
              <Textarea label="תיאור" value={restaurantForm.description} onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })} rows={2} />
              <Input label="כתובת" value={restaurantForm.address} onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })} />
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} loading={saving} size="sm">שמור</Button>
            <Button variant="secondary" size="sm" onClick={() => { setStep("skipped"); onSkip(); }}>דלג</Button>
          </div>
        </div>
      )}
    </div>
  );
}
