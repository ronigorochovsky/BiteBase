"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  RECIPE_CATEGORY_LABELS,
  RECIPE_CATEGORIES,
  RESTAURANT_AREA_LABELS,
  RESTAURANT_AREAS,
} from "@/lib/constants";
import type { RecipeCategory, RestaurantArea } from "@/db/schema";
import type { ExtractionResult } from "@/lib/claude-extractor";
import type { OgData } from "@/lib/og-fetcher";

type Step = "url" | "caption" | "review" | "done";

export default function AdminAddPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [manualCaption, setManualCaption] = useState("");
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Editable form state
  const [formType, setFormType] = useState<"recipe" | "restaurant">("recipe");
  const [recipeForm, setRecipeForm] = useState({
    title: "", category: "other" as RecipeCategory, description: "",
    ingredients: "", steps: "", tips: "",
  });
  const [restaurantForm, setRestaurantForm] = useState({
    name: "", area: "other" as RestaurantArea, concept: "",
    description: "", address: "", price_range: "",
  });

  // Step 1: fetch OG and run extraction
  async function handleFetchAndExtract() {
    if (!url.trim()) return;
    setError("");
    setLoading(true);

    try {
      // 1. Fetch OG metadata
      const ogRes = await fetch("/api/import/fetch-og", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const og: OgData = await ogRes.json();
      setOgData(og);

      if (og.status === "blocked" || og.status === "error") {
        // Need manual caption
        setStep("caption");
        setLoading(false);
        return;
      }

      // 2. Run AI extraction
      await runExtraction(og, "");
    } catch {
      setError("שגיאה בעיבוד הקישור. נסה שוב.");
      setLoading(false);
    }
  }

  async function runExtraction(og: OgData, caption: string) {
    setLoading(true);
    try {
      const extractRes = await fetch("/api/import/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: url,
          og_title: og?.title,
          og_description: og?.description,
          manual_caption: caption || undefined,
        }),
      });
      const result: ExtractionResult = await extractRes.json();
      setExtracted(result);
      populateForm(result, og?.image);
      setStep("review");
    } catch {
      setError("שגיאה בחילוץ המידע. נסה שוב.");
    } finally {
      setLoading(false);
    }
  }

  function populateForm(result: ExtractionResult, imageUrl?: string) {
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
    // Store image from OG
    if (imageUrl) {
      setOgData((prev) => prev ? { ...prev, image: imageUrl } : { status: "ok", image: imageUrl });
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload =
        formType === "recipe"
          ? { type: "recipe", source_url: url, image_url: ogData?.image, recipe: recipeForm }
          : { type: "restaurant", source_url: url, image_url: ogData?.image, restaurant: restaurantForm };

      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setStep("done");

      // Navigate to the saved entry after 1.5s
      setTimeout(() => {
        router.push(`/${formType === "recipe" ? "recipes" : "restaurants"}/${data.slug}`);
      }, 1500);
    } catch {
      setError("שגיאה בשמירה. נסה שוב.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">הוסף URL חדש</h1>

      {/* Step 1: URL input */}
      {step === "url" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <p className="text-gray-600 mb-4">
            הדבק קישור מאינסטגרם או פייסבוק — AI יחלץ את המידע אוטומטית.
          </p>
          <div className="flex gap-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleFetchAndExtract()}
            />
            <Button onClick={handleFetchAndExtract} loading={loading} disabled={!url.trim()}>
              חלץ
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      )}

      {/* Step 2: Manual caption (when Instagram blocks) */}
      {step === "caption" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-start gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 text-sm">
                לא הצלחתי לגשת לתוכן הפוסט
              </p>
              <p className="text-amber-700 text-sm mt-0.5">
                פתח את הפוסט באינסטגרם, העתק את כיתוב הפוסט והדבק אותו כאן.
              </p>
            </div>
          </div>
          <Textarea
            label="כיתוב הפוסט"
            value={manualCaption}
            onChange={(e) => setManualCaption(e.target.value)}
            placeholder="הדבק את הכיתוב המלא של הפוסט כאן..."
            rows={6}
            className="mb-4"
          />
          <div className="flex gap-3">
            <Button onClick={() => runExtraction(ogData ?? { status: "error" }, manualCaption)} loading={loading} disabled={!manualCaption.trim()}>
              חלץ מידע
            </Button>
            <Button variant="ghost" onClick={() => setStep("url")}>
              ביטול
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      )}

      {/* Step 3: Review & edit */}
      {step === "review" && (
        <div>
          {/* OG image preview */}
          {ogData?.image && (
            <div className="mb-4 rounded-xl overflow-hidden h-40 bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ogData.image}
                alt="תמונה מהפוסט"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Type selector */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">סוג:</p>
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => setFormType("recipe")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formType === "recipe"
                    ? "bg-brand-500 text-white"
                    : "bg-stone-100 text-gray-600 hover:bg-stone-200"
                }`}
              >
                🥘 מתכון
              </button>
              <button
                onClick={() => setFormType("restaurant")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formType === "restaurant"
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 text-gray-600 hover:bg-stone-200"
                }`}
              >
                🍴 מסעדה
              </button>
            </div>

            {/* Recipe form */}
            {formType === "recipe" && (
              <div className="flex flex-col gap-4">
                <Input
                  label="שם המתכון"
                  value={recipeForm.title}
                  onChange={(e) => setRecipeForm({ ...recipeForm, title: e.target.value })}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">קטגוריה</label>
                  <select
                    value={recipeForm.category}
                    onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value as RecipeCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {RECIPE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{RECIPE_CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <Textarea
                  label="תיאור קצר"
                  value={recipeForm.description}
                  onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
                  rows={2}
                />
                <Textarea
                  label="מצרכים (שורה לכל מצרך)"
                  value={recipeForm.ingredients}
                  onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: e.target.value })}
                  rows={5}
                />
                <Textarea
                  label="שלבי הכנה (שורה לכל שלב)"
                  value={recipeForm.steps}
                  onChange={(e) => setRecipeForm({ ...recipeForm, steps: e.target.value })}
                  rows={5}
                />
                <Textarea
                  label="טיפים (אופציונלי)"
                  value={recipeForm.tips}
                  onChange={(e) => setRecipeForm({ ...recipeForm, tips: e.target.value })}
                  rows={2}
                />
              </div>
            )}

            {/* Restaurant form */}
            {formType === "restaurant" && (
              <div className="flex flex-col gap-4">
                <Input
                  label="שם המסעדה"
                  value={restaurantForm.name}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">אזור</label>
                  <select
                    value={restaurantForm.area}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, area: e.target.value as RestaurantArea })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {RESTAURANT_AREAS.map((a) => (
                      <option key={a} value={a}>{RESTAURANT_AREA_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="קונספט (סוג המסעדה)"
                  value={restaurantForm.concept}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, concept: e.target.value })}
                  placeholder="למשל: איטלקי, המבורגרים, ים תיכוני..."
                />
                <Textarea
                  label="תיאור"
                  value={restaurantForm.description}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })}
                  rows={3}
                />
                <Input
                  label="כתובת (אופציונלי)"
                  value={restaurantForm.address}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">טווח מחירים (אופציונלי)</label>
                  <select
                    value={restaurantForm.price_range}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, price_range: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="">לא ידוע</option>
                    <option value="₪">₪ — זול</option>
                    <option value="₪₪">₪₪ — בינוני</option>
                    <option value="₪₪₪">₪₪₪ — יקר</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={handleSave} loading={saving} size="lg">
              שמור ופרסם
            </Button>
            <Button variant="secondary" onClick={() => { setStep("url"); setExtracted(null); }}>
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">נשמר בהצלחה!</h2>
          <p className="text-gray-500">מעביר אותך לדף...</p>
        </div>
      )}
    </main>
  );
}
