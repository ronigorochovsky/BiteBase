/**
 * extract-from-text.mjs
 *
 * Extracts structured recipe or restaurant data from raw pasted text,
 * without any URL or Microlink call needed.
 *
 * Usage:
 *   node --env-file=.env.local scripts/extract-from-text.mjs --text="<paste text here>"
 *   node --env-file=.env.local scripts/extract-from-text.mjs --file=path/to/text.txt
 *
 * Writes to single_recipe_output.json or single_restaurant_output.json
 * depending on what Claude detects.
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const AREA_LABELS = {
  jerusalem: "ירושלים וסביבה",
  tel_aviv:  "תל אביב וסביבה",
  hasharon:  "השרון",
  haifa:     "חיפה וסביבה",
  binyamina: "בנימינה וסביבה",
  north:     "צפון",
  south:     "דרום",
  shfela:    "השפלה",
  center:    "מרכז",
  eilat:     "אילת",
  other:     "אחר",
};

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

function extractFirstJson(text) {
  let start = -1;
  let openChar = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") { start = i; openChar = text[i]; break; }
  }
  if (start === -1) return null;
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === '"') inStr = false;
    } else {
      if (c === '"') { inStr = true; continue; }
      if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
        }
      }
    }
  }
  return null;
}

async function extractFromText(inputText, apiKey) {
  const client = new Anthropic({ apiKey });

  const prompt = `אתה מחלץ מידע מטקסט חופשי על אוכל.

הטקסט הבא:
${inputText}

קבע האם מדובר במתכון לבישול או תיאור מסעדה/מסעדות, ואז חלץ את המידע.

אם זה מתכון — החזר אובייקט JSON:
{
  "type": "recipe",
  "name": "שם המנה בעברית",
  "category": "one of: starters|soups|salads|beef|chicken|fish|carbs_sides|desserts|drinks|other",
  "subcategory": "beef→(slow_cooking|stir_fry|other) | chicken→(stir_fry|oven|other) | carbs_sides→(rice_dishes|pasta_pizza_dough|cooked_vegetables|other) | drinks→(alcoholic|smoothies|other) | שאר→null",
  "ingredients": ["מצרך 1", "מצרך 2"],
  "instructions": ["שלב 1", "שלב 2"]
}
חוקי קטגוריה: בשר אדום→beef | עוף/הודו→chicken | דג/פירות ים→fish | מתוק→desserts | שתייה→drinks | מרק→soups | סלט→salads | מנה ראשונה קטנה→starters | פחמימה ללא בשר (פסטה/אורז/לחם/ירקות/גריסים/פטריות/ביצים/גבינה)→carbs_sides | אחר→other. בשר+פחמימה = תמיד קטגוריית הבשר.

אם זו מסעדה/מסעדות — החזר מערך JSON:
[
  {
    "type": "restaurant",
    "name": "שם המסעדה",
    "address": "כתובת מדויקת כולל עיר, או null",
    "area": "one of: jerusalem|tel_aviv|hasharon|haifa|binyamina|north|south|shfela|center|eilat|other",
    "style": "סגנון האוכל",
    "notes": "כל המידע הרלוונטי מהטקסט על המסעדה (תיאור, שעות, מה מיוחד, דילים וכו') או null",
    "website_url": null,
    "maps_url": null,
    "opening_hours": "שעות פתיחה אם מופיעות, או null",
    "phone": "טלפון אם מופיע, או null",
    "google_score": null
  }
]
חוקי אזור: ירושלים/בית שמש→jerusalem | תל אביב/רמת גן/גבעתיים/בני ברק/חולון/בת ים→tel_aviv | הרצליה/רעננה/כפר סבא/הוד השרון/רמת השרון/נתניה דרום→hasharon | חיפה/קריות/עכו/נשר→haifa | בנימינה/זכרון/פרדס חנה/קיסריה→binyamina | גליל/טבריה/נצרת/נהריה→north | באר שבע/אשדוד/אשקלון/נגב→south | רחובות/נס ציונה/ראשון לציון/לוד/מודיעין→shfela | פתח תקווה/ראש העין/שוהם/יהוד→center | אילת→eilat | לא ברור→other.

החזר JSON בלבד (ללא markdown ללא טקסט נוסף).`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content.find(b => b.type === "text")?.text?.trim() ?? "";
  return extractFirstJson(raw);
}

async function main() {
  const args = process.argv.slice(2);
  const textArg  = args.find(a => a.startsWith("--text="));
  const fileArg  = args.find(a => a.startsWith("--file="));
  const outArg   = args.find(a => a.startsWith("--output="));

  let inputText = "";
  if (textArg) {
    inputText = textArg.slice("--text=".length);
  } else if (fileArg) {
    const filePath = fileArg.slice("--file=".length);
    inputText = readFileSync(filePath, "utf8");
  } else {
    console.error("Usage: extract-from-text.mjs --text=\"<text>\" | --file=<path>");
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

  console.log(`Extracting from text (${inputText.length} chars)...`);
  const parsed = await extractFromText(inputText, apiKey);

  if (!parsed) {
    console.error("✗ Could not extract structured data from text");
    process.exit(1);
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];

  const recipes     = [];
  const restaurants = [];

  for (const item of items) {
    const t = item.type ?? (item.ingredients ? "recipe" : "restaurant");

    if (t === "recipe") {
      const recipe = {
        ...item,
        type: "recipe",
        source_url: null,
        image_url:  null,
        category_he:    CATEGORY_LABELS[item.category]    ?? "",
        subcategory_he: item.subcategory ? (SUBCATEGORY_LABELS[item.subcategory] ?? "") : "",
      };
      recipes.push(recipe);
      console.log(`  ✓ מתכון: ${recipe.name} [${recipe.category_he}]`);

    } else {
      const q = encodeURIComponent([item.name, item.address].filter(Boolean).join(" "));
      const restaurant = {
        ...item,
        type: "restaurant",
        source_url: null,
        image_url:  null,
        area_he: AREA_LABELS[item.area] ?? "",
        maps_url: item.maps_url ?? `https://www.google.com/maps/search/${q}`,
      };
      restaurants.push(restaurant);
      console.log(`  ✓ מסעדה: ${restaurant.name} [${restaurant.area_he}]`);
    }
  }

  // Determine output file(s)
  if (outArg) {
    // Custom output: write everything to one file
    const outPath = outArg.slice("--output=".length);
    writeFileSync(outPath, JSON.stringify([...recipes, ...restaurants], null, 2), "utf8");
    console.log(`Written to ${outPath}`);
  } else if (recipes.length > 0 && restaurants.length === 0) {
    const outFile = join(ROOT, "single_recipe_output.json");
    writeFileSync(outFile, JSON.stringify(recipes, null, 2), "utf8");
    console.log(`Written to single_recipe_output.json`);
  } else if (restaurants.length > 0 && recipes.length === 0) {
    const outFile = join(ROOT, "single_restaurant_output.json");
    writeFileSync(outFile, JSON.stringify(restaurants, null, 2), "utf8");
    console.log(`Written to single_restaurant_output.json`);
  } else {
    // Mixed: write each to its own file
    if (recipes.length > 0) {
      writeFileSync(join(ROOT, "single_recipe_output.json"),     JSON.stringify(recipes,     null, 2), "utf8");
      console.log(`Written ${recipes.length} recipe(s) to single_recipe_output.json`);
    }
    if (restaurants.length > 0) {
      writeFileSync(join(ROOT, "single_restaurant_output.json"), JSON.stringify(restaurants, null, 2), "utf8");
      console.log(`Written ${restaurants.length} restaurant(s) to single_restaurant_output.json`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
