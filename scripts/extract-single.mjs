/**
 * extract-single.mjs
 *
 * Extracts a recipe from a single Instagram/Facebook URL using
 * Microlink (for caption + image) + Claude Vision (for extraction).
 * No browser, no cookies, no yt-dlp needed.
 *
 * Usage:
 *   node --env-file=.env.local scripts/extract-single.mjs <URL> [output.json]
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CATEGORY_LABELS = {
  starters:    "מנות פתיחה",
  soups:       "מרקים",
  salads:      "סלטים",
  beef:        "מנות בשר בקר",
  chicken:     "מנות עוף",
  fish:        "דגים",
  carbs_sides: "פחמימות ותוספות",
  desserts:    "קינוחים",
  drinks:      "משקאות",
  other:       "אחר",
};

const SUBCATEGORY_LABELS = {
  slow_cooking:      "בישול ארוך",
  stir_fry:          "מוקפצים",
  oven:              "בתנור",
  rice_dishes:       "תבשילי אורז",
  pasta_pizza_dough: "פסטות, פיצות ובצקים",
  cooked_vegetables: "ירקות מבושלים",
  alcoholic:         "אלכוהוליים",
  smoothies:         "שייקים",
  other:             "אחרים",
};

async function fetchViaLink(url) {
  const res = await fetch(
    `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
    { signal: AbortSignal.timeout(10_000) }
  );
  if (!res.ok) return {};
  const data = await res.json();
  return {
    imageUrl: data?.data?.image?.url ?? null,
    title:    data?.data?.title ?? null,
    description: data?.data?.description ?? null,
  };
}

async function extractRecipe(sourceUrl, apiKey) {
  const client = new Anthropic({ apiKey });

  const { imageUrl, title, description } = await fetchViaLink(sourceUrl);
  console.log(`  Microlink: title="${title?.slice(0, 60)}", image=${imageUrl ? "✓" : "✗"}`);

  const textContext = [
    title       ? `כותרת: ${title}` : "",
    description ? `תיאור: ${description}` : "",
    `קישור: ${sourceUrl}`,
  ].filter(Boolean).join("\n");

  const prompt = `אתה מחלץ מידע על מתכונים מפוסטים ברשתות חברתיות.
${textContext}

${imageUrl ? "בחן את התמונה ואת הטקסט ו" : ""}חלץ את פרטי המתכון המלאים.

חוקי קטגוריה (לפי סדר עדיפות):
- כל בשר אדום (בקר/כבש/סטייק/אסאדו) → beef
- כל עוף/הודו/שניצל → chicken
- כל דג/פירות ים → fish
- מתוק (עוגה/עוגייה/גלידה) → desserts
- שתייה/שייק/קוקטייל → drinks
- מרק → soups
- סלט קר → salads
- מנה ראשונה קטנה → starters
- פחמימה/תוספת ללא בשר (פסטה/אורז/פיצה/לחם/ירקות/ביצים/גבינה) → carbs_sides
- אחר → other
חשוב: אם יש בשר + פחמימה (עוף עם אורז, בשר עם פסטה) — השתמש תמיד בקטגוריית הבשר.

החזר JSON בלבד (ללא markdown), כל הטקסט בעברית:
{
  "name": "שם המנה",
  "category": "one of: starters|soups|salads|beef|chicken|fish|carbs_sides|desserts|drinks|other",
  "subcategory": "beef→(slow_cooking|stir_fry|other) | chicken→(stir_fry|oven|other) | carbs_sides→(rice_dishes|pasta_pizza_dough|cooked_vegetables|other) | drinks→(alcoholic|smoothies|other) | others→null",
  "ingredients": ["מצרך 1", "מצרך 2"],
  "instructions": ["שלב 1", "שלב 2"]
}`;

  const content = [];

  // Add image as base64 if available
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8_000) });
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const ct = imgRes.headers.get("content-type") ?? "image/jpeg";
        const mediaType = ["image/jpeg","image/png","image/gif","image/webp"].includes(ct) ? ct : "image/jpeg";
        content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
      }
    } catch { /* skip image, use text only */ }
  }

  content.push({ type: "text", text: prompt });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  });

  const text = response.content.find(b => b.type === "text")?.text?.trim() ?? "";
  const cleaned = text.replace(/^```(?:json)?\s*/,"").replace(/\s*```$/,"");

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.name) return null;
    return { ...parsed, source_url: sourceUrl, image_url: imageUrl };
  } catch {
    console.error("  JSON parse failed:", cleaned.slice(0, 200));
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error("Usage: node extract-single.mjs <URL> [output.json]");
    process.exit(1);
  }

  let url = args[0];
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const outFile = args[1] ?? join(ROOT, "single_recipe_output.json");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

  console.log(`Extracting: ${url}`);
  const recipe = await extractRecipe(url, apiKey);

  if (!recipe) {
    const result = [{ source_url: url, failed: true, error: "Could not extract recipe" }];
    writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
    console.log("✗ Extraction failed");
    process.exit(0);
  }

  // Enrich with Hebrew labels
  recipe.category_he    = CATEGORY_LABELS[recipe.category] ?? "";
  recipe.subcategory_he = recipe.subcategory ? (SUBCATEGORY_LABELS[recipe.subcategory] ?? "") : "";

  writeFileSync(outFile, JSON.stringify([recipe], null, 2), "utf8");
  console.log(`✓ Extracted: ${recipe.name} [${recipe.category_he}]`);
}

main().catch(err => { console.error(err); process.exit(1); });
