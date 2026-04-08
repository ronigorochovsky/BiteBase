import type { RecipeCategory, RecipeSubcategory, RestaurantArea } from "@/db/schema";

export const RECIPE_CATEGORY_LABELS: Record<RecipeCategory, string> = {
  starters: "מנות פתיחה",
  soups: "מרקים",
  salads: "סלטים",
  beef: "מנות בשר בקר",
  chicken: "מנות עוף",
  fish: "דגים",
  carbs_sides: "פחמימות ותוספות",
  desserts: "קינוחים",
  drinks: "משקאות",
  other: "אחר",
};

export const RECIPE_SUBCATEGORY_LABELS: Record<RecipeSubcategory, string> = {
  slow_cooking: "בישול ארוך",
  stir_fry: "מוקפצים",
  oven: "בתנור",
  rice_dishes: "תבשילי אורז",
  pasta_pizza_dough: "פסטות, פיצות ובצקים",
  cooked_vegetables: "ירקות מבושלים",
  alcoholic: "אלכוהוליים",
  smoothies: "שייקים",
  other: "אחרים",
};

/** Which subcategories are valid for each category */
export const CATEGORY_SUBCATEGORIES: Partial<Record<RecipeCategory, RecipeSubcategory[]>> = {
  beef: ["slow_cooking", "stir_fry", "other"],
  chicken: ["stir_fry", "oven", "other"],
  carbs_sides: ["rice_dishes", "pasta_pizza_dough", "cooked_vegetables", "other"],
  drinks: ["alcoholic", "smoothies", "other"],
};

export const RESTAURANT_AREA_LABELS: Record<RestaurantArea, string> = {
  jerusalem: "ירושלים וסביבה",
  tel_aviv: "תל אביב וסביבה",
  hasharon: "השרון",
  haifa: "חיפה וסביבה",
  binyamina: "בנימינה וסביבה",
  north: "צפון",
  south: "דרום",
  shfela: "השפלה",
  center: "מרכז",
  eilat: "אילת",
  other: "אחר",
};

/** Per-category color palette using hex values (avoids Tailwind purge of dynamic class names). */
export const CATEGORY_COLORS: Record<
  RecipeCategory,
  { main: string; mainText: string; light: string; lightText: string; lighter: string; lighterText: string }
> = {
  starters:    { main: "#f97316", mainText: "#fff", light: "#fed7aa", lightText: "#7c2d12", lighter: "#fff7ed", lighterText: "#c2410c" },
  soups:       { main: "#d97706", mainText: "#fff", light: "#fde68a", lightText: "#78350f", lighter: "#fffbeb", lighterText: "#b45309" },
  salads:      { main: "#16a34a", mainText: "#fff", light: "#bbf7d0", lightText: "#14532d", lighter: "#f0fdf4", lighterText: "#15803d" },
  beef:        { main: "#dc2626", mainText: "#fff", light: "#fecaca", lightText: "#7f1d1d", lighter: "#fff1f1", lighterText: "#b91c1c" },
  chicken:     { main: "#ca8a04", mainText: "#fff", light: "#fef08a", lightText: "#713f12", lighter: "#fefce8", lighterText: "#a16207" },
  fish:        { main: "#2563eb", mainText: "#fff", light: "#bfdbfe", lightText: "#1e3a8a", lighter: "#eff6ff", lighterText: "#1d4ed8" },
  carbs_sides: { main: "#65a30d", mainText: "#fff", light: "#d9f99d", lightText: "#365314", lighter: "#f7fee7", lighterText: "#4d7c0f" },
  desserts:    { main: "#db2777", mainText: "#fff", light: "#fbcfe8", lightText: "#831843", lighter: "#fdf2f8", lighterText: "#be185d" },
  drinks:      { main: "#0891b2", mainText: "#fff", light: "#a5f3fc", lightText: "#164e63", lighter: "#ecfeff", lighterText: "#0e7490" },
  other:       { main: "#57534e", mainText: "#fff", light: "#d6d3d1", lightText: "#1c1917", lighter: "#fafaf9", lighterText: "#44403c" },
};

export const RECIPE_CATEGORIES = Object.keys(
  RECIPE_CATEGORY_LABELS
) as RecipeCategory[];

export const RESTAURANT_AREAS = Object.keys(
  RESTAURANT_AREA_LABELS
) as RestaurantArea[];

/** Map a restaurant's concept/style text to an emoji marker for the map */
export function getConceptEmoji(concept: string | null | undefined): string {
  if (!concept) return "🍴";
  const c = concept;
  if (/בורגר|המבורגר/.test(c)) return "🍔";
  if (/פיצה/.test(c)) return "🍕";
  if (/שווארמה|פלאפל|שאוורמה/.test(c)) return "🌯";
  if (/סושי|יפני|תאי|אסיאתי|ראמן|נודל|סינ|וייטנמ/.test(c)) return "🍜";
  if (/בשר|אנטריקוט|סטייק|גריל|BBQ/.test(c)) return "🥩";
  if (/דגים|ים תיכוני|פירות ים|שרימפס/.test(c)) return "🐟";
  if (/קפה|בראנץ|מאפה|עוגיות|פטיסרי/.test(c)) return "☕";
  if (/בר|יין|קוקטייל|ביירה/.test(c)) return "🍷";
  if (/עוגה|קינוח|גלידה|מתוק/.test(c)) return "🍰";
  if (/סלט|ירקות|בריאות|טבעוני|צמחוני/.test(c)) return "🥗";
  if (/מקסיקני|טאקו|בוריטו/.test(c)) return "🌮";
  if (/כנפיים|עוף/.test(c)) return "🍗";
  if (/שוק|רחוב|סנדוויץ|כריך/.test(c)) return "🥙";
  return "🍴";
}

/** Concept/style filter options for restaurant listing */
export const CONCEPT_FILTER_OPTIONS = [
  { value: "burger",   label: "🍔 בורגר",       patterns: ["בורגר", "המבורגר"] },
  { value: "pizza",    label: "🍕 פיצה",         patterns: ["פיצה"] },
  { value: "steak",    label: "🥩 בשרייה",       patterns: ["בשר", "אנטריקוט", "סטייק", "גריל", "BBQ"] },
  { value: "fish",     label: "🐟 דגים/ים",      patterns: ["דגים", "ים תיכוני", "פירות ים", "שרימפס"] },
  { value: "asian",    label: "🍜 אסיאתי",       patterns: ["סושי", "יפני", "תאי", "אסיאתי", "ראמן", "נודל", "סינ", "וייטנמ"] },
  { value: "cafe",     label: "☕ קפה/בראנץ",    patterns: ["קפה", "בראנץ", "מאפה", "פטיסרי"] },
  { value: "bar",      label: "🍷 בר/יין",       patterns: ["בר", "יין", "קוקטייל", "ביירה"] },
  { value: "dessert",  label: "🍰 קינוח",        patterns: ["עוגה", "קינוח", "גלידה", "מתוק"] },
  { value: "salad",    label: "🥗 סלט/טבעוני",  patterns: ["סלט", "טבעוני", "צמחוני", "בריאות"] },
  { value: "shawarma", label: "🌯 שווארמה",      patterns: ["שווארמה", "פלאפל", "שאוורמה"] },
  { value: "mexican",  label: "🌮 מקסיקני",      patterns: ["מקסיקני", "טאקו", "בוריטו"] },
  { value: "chicken",  label: "🍗 עוף",           patterns: ["כנפיים", "עוף"] },
] as const;
